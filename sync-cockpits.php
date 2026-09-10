<?php
/**
 * Sync Cockpits: Google Sheets → Supabase
 * Execute: http://localhost/kloweekpipefy/sync-cockpits.php
 */
header('Content-Type: application/json; charset=utf-8');

$env = [];
$lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    $line = trim($line);
    if (strpos($line, '#') === 0 || $line === '') continue;
    if (strpos($line, '=') !== false) {
        list($key, $val) = explode('=', $line, 2);
        $env[trim($key)] = trim($val, "\"' ");
    }
}

$supabaseUrl = $env['SUPABASE_URL'] ?? '';
$supabaseKey = $env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
$googleApiKey = $env['GOOGLE_SHEETS_API_KEY'] ?? '';

if (!$supabaseUrl || !$supabaseKey) {
    echo json_encode(['error' => 'Supabase não configurado']);
    exit;
}

$COCKPITS = [
    ['id' => '1zMpTklO0jLCZcMFan_KKTctbgMySRqd_pVxsrHdsz5U', 'title' => '[Cockpit - Teste]', 'squad' => 'wall-street', 'nome' => 'Wall Street'],
    ['id' => '1U7ciY_zNsbb6esFMMgwSOC-R16kFO5Z4ddACdBNhDtA', 'title' => '[Cockpit - Teste]', 'squad' => 'romans', 'nome' => 'Romans'],
    ['id' => '17y3rdmRMO3moQP9haBJOg5Z8bv-4T4BVtfvMowm3jv8', 'title' => '[ Cockpit ]', 'squad' => 'legacy', 'nome' => 'Legacy'],
    ['id' => '1Oj971TOsgJQ_3A5sBRGHcEgx53y2r-PuZeOd_E002Ao', 'title' => '[COCKPIT]', 'squad' => 'monsters-sa', 'nome' => 'Monsters S/A']
];

function supabaseUpsert($table, $rows) {
    global $supabaseUrl, $supabaseKey;
    $url = "{$supabaseUrl}/rest/v1/{$table}";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "apikey: {$supabaseKey}",
            "Authorization: Bearer {$supabaseKey}",
            "Content-Type: application/json",
            "Prefer: resolution=merge-duplicates"
        ],
        CURLOPT_POSTFIELDS => json_encode($rows),
        CURLOPT_TIMEOUT => 60
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code >= 400) {
        $decoded = json_decode($resp, true);
        throw new Exception("Supabase {$table}: HTTP {$code} - " . ($decoded['message'] ?? $resp));
    }
    return $code;
}

function fetchGoogleSheet($spreadsheetId, $title, $apiKey, $retry = 3) {
    for ($attempt = 1; $attempt <= $retry; $attempt++) {
        $range = rawurlencode($title . '!A1:Z500');
        $url = "https://sheets.googleapis.com/v4/spreadsheets/{$spreadsheetId}/values/{$range}?key={$apiKey}";
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'Referer: http://localhost/kloweekpipefy/',
                'Origin: http://localhost'
            ]
        ]);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code === 200) {
            $data = json_decode($resp, true);
            return $data['values'] ?? [];
        }
        if ($code === 429 || $code === 403) {
            $wait = $attempt * 10;
            echo "  Rate limit (HTTP {$code}), aguardando {$wait}s...\n";
            sleep($wait);
            continue;
        }
        throw new Exception("Google Sheets HTTP {$code}");
    }
    throw new Exception("Google Sheets: {$retry} tentativas falharam");
}

function findCol($headers, ...$candidates) {
    foreach ($candidates as $c) {
        $re = '/\b' . preg_quote(strtolower($c), '/') . '\b/';
        foreach ($headers as $idx => $h) {
            if ($h && preg_match($re, strtolower($h))) return $idx;
        }
    }
    return -1;
}

// ─── Main ──────────────────────────────────────────────────
$results = ['tasks' => [], 'errors' => [], 'start' => date('c')];

// Limpar tabela cockpits primeiro
echo "Limpando tabela cockpits...\n";
$delUrl = "{$supabaseUrl}/rest/v1/cockpits?id=neq.00000000-0000-0000-0000-000000000000";
$delCh = curl_init($delUrl);
curl_setopt_array($delCh, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'DELETE',
    CURLOPT_HTTPHEADER => [
        "apikey: {$supabaseKey}",
        "Authorization: Bearer {$supabaseKey}"
    ],
    CURLOPT_TIMEOUT => 30
]);
curl_exec($delCh);
curl_close($delCh);

$totalRows = 0;

foreach ($COCKPITS as $cockpit) {
    echo "Sync: {$cockpit['nome']}...\n";
    try {
        $srcRows = fetchGoogleSheet($cockpit['id'], $cockpit['title'], $googleApiKey);
        if (count($srcRows) < 2) {
            echo "  {$cockpit['nome']}: sem dados\n";
            continue;
        }

        $headers = $srcRows[0];
        $rows = [];

        for ($i = 1; $i < count($srcRows); $i++) {
            $row = $srcRows[$i];
            $nameIdx = findCol($headers, 'name', 'nome do projeto', 'cliente');
            $name = $nameIdx >= 0 ? ($row[$nameIdx] ?? '') : '';
            if (!$name) continue;

            $churnIdx = findCol($headers, 'churn');
            $churnRaw = strtolower(trim($churnIdx >= 0 ? ($row[$churnIdx] ?? '') : ''));
            $isChurn = $churnRaw && !in_array($churnRaw, ['não', 'nao', 'n', '']);

            $feeIdx = findCol($headers, 'fee');
            $fee = 0;
            if ($feeIdx >= 0) {
                $fee = floatval(preg_replace('/[R$\s.]/', '', str_replace(',', '.', $row[$feeIdx] ?? '0')));
                if (is_nan($fee)) $fee = 0;
            }

            $client_id = $cockpit['squad'] . '-' . md5(strtoupper(trim($name)) . $cockpit['squad']);

            $rows[] = [
                'id' => $client_id,
                'nome' => strtoupper(trim($name)),
                'squad' => $cockpit['squad'],
                'coordenador' => (findCol($headers, 'coordenador', 'coodernador') >= 0) ? ($row[findCol($headers, 'coordenador', 'coodernador')] ?? '') : '',
                'account' => (findCol($headers, 'account') >= 0) ? ($row[findCol($headers, 'account')] ?? '') : '',
                'gt' => (findCol($headers, 'gt') >= 0) ? ($row[findCol($headers, 'gt')] ?? '') : '',
                'fee' => $fee,
                'flag' => (findCol($headers, 'flag calculada', 'flag') >= 0) ? ($row[findCol($headers, 'flag calculada', 'flag')] ?? '') : '',
                'health' => (findCol($headers, 'health', 'pontuação') >= 0) ? ($row[findCol($headers, 'health', 'pontuação')] ?? '') : '',
                'customer_care_status' => (findCol($headers, 'customer care status') >= 0) ? ($row[findCol($headers, 'customer care status')] ?? '') : '',
                'data_atualizacao' => (findCol($headers, 'data de atualização', 'data atualização', 'atualizado') >= 0) ? ($row[findCol($headers, 'data de atualização', 'data atualização', 'atualizado')] ?? '') : '',
                'churn' => $isChurn
            ];
        }

        echo "  {$cockpit['nome']}: " . count($rows) . " clientes\n";

        // Enviar em batches de 100
        $batches = array_chunk($rows, 100);
        foreach ($batches as $batch) {
            supabaseUpsert('cockpits', $batch);
        }

        $totalRows += count($rows);
        $results['tasks'][] = ['name' => $cockpit['nome'], 'count' => count($rows), 'status' => 'ok'];

        // Delay entre squads
        sleep(2);

    } catch (Exception $e) {
        $msg = $e->getMessage();
        echo "  {$cockpit['nome']}: ERRO - {$msg}\n";
        $results['errors'][] = "{$cockpit['nome']}: {$msg}";
        $results['tasks'][] = ['name' => $cockpit['nome'], 'count' => 0, 'status' => 'erro', 'error' => $msg];
    }
}

// Log
$results['end'] = date('c');
$results['total'] = $totalRows;

supabaseUpsert('sync_log', [[
    'origem' => 'sync-cockpits',
    'acao' => 'cockpit-sync',
    'registros' => $totalRows,
    'status' => empty($results['errors']) ? 'OK' : 'ERRO',
    'detalhes' => implode('; ', $results['errors'] ?: ['Cockpits sincronizados com sucesso'])
]]);

echo "\n=== Sync Cockpits completo: {$totalRows} clientes ===\n";
echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

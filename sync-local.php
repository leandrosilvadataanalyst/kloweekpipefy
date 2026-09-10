<?php
/**
 * Sync Pipefy → Supabase (executar manualmente uma vez)
 * Acesse: http://localhost/kloweekpipefy/sync-local.php
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
$pipefyToken = $env['PIPEFY_TOKEN'] ?? '';

if (!$supabaseUrl || !$supabaseKey) {
    echo json_encode(['error' => 'Supabase não configurado']);
    exit;
}

function supabaseRequest($method, $path, $body = null) {
    global $supabaseUrl, $supabaseKey;
    $url = $supabaseUrl . '/rest/v1/' . $path;
    $ch = curl_init($url);
    $headers = [
        "apikey: {$supabaseKey}",
        "Authorization: Bearer {$supabaseKey}",
        "Content-Type: application/json",
        "Prefer: resolution=merge-duplicates"
    ];
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 60
    ]);
    if ($body) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'data' => json_decode($resp, true)];
}

function pipefyQuery($query) {
    global $pipefyToken;
    $ch = curl_init('https://api.pipefy.com/graphql');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            "Authorization: Bearer {$pipefyToken}"
        ],
        CURLOPT_POSTFIELDS => json_encode(['query' => $query]),
        CURLOPT_TIMEOUT => 60
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);
    $data = json_decode($resp, true);
    if (isset($data['errors'])) throw new Exception($data['errors'][0]['message']);
    return $data['data'];
}

function getAllCards($pipeId) {
    $allCards = [];
    $cursor = null;
    $hasNext = true;
    while ($hasNext) {
        $after = $cursor ? ", after: \"{$cursor}\"" : '';
        $q = "{ cards(pipe_id: \"{$pipeId}\", first: 50{$after}) { edges { node { id title current_phase { id name } createdAt fields { name value float_value datetime_value } } } pageInfo { hasNextPage endCursor } } }";
        $r = pipefyQuery($q);
        if (empty($r['cards']['edges'])) break;
        $allCards = array_merge($allCards, $r['cards']['edges']);
        $hasNext = $r['cards']['pageInfo']['hasNextPage'];
        $cursor = $r['cards']['pageInfo']['endCursor'];
        if (count($allCards) > 5000) break;
    }
    return $allCards;
}

function extractField($node, $name) {
    $lower = strtolower($name);
    foreach ($node['fields'] as $f) {
        if (strpos(strtolower($f['name']), $lower) !== false || strpos($lower, strtolower($f['name'])) !== false) {
            return $f['value'] ?? null;
        }
    }
    return null;
}

function extractFloat($node, $name) {
    $lower = strtolower($name);
    foreach ($node['fields'] as $f) {
        if (strpos(strtolower($f['name']), $lower) !== false || strpos($lower, strtolower($f['name'])) !== false) {
            if (isset($f['float_value']) && $f['float_value'] !== null) return floatval($f['float_value']);
            $val = $f['value'] ?? '0';
            return floatval(preg_replace('/[R$\s.]/', '', str_replace(',', '.', $val)));
        }
    }
    return 0;
}

function parseDate($value) {
    if (!$value) return null;
    $str = trim(strval($value));
    if (!$str || $str === 'null') return null;
    if (strpos($str, '-') !== false) {
        $d = new DateTime($str . (strlen($str) === 10 ? 'T00:00:00' : ''));
        return $d->format('Y-m-d');
    }
    $p = explode('/', $str);
    if (count($p) === 3) {
        return sprintf('%04d-%02d-%02d', $p[2], $p[1], $p[0]);
    }
    return null;
}

// ─── Sync Cockpits from Google Sheets ──────────────────────
$googleApiKey = $env['GOOGLE_SHEETS_API_KEY'] ?? '';
$cockpitConfigs = [
    ['id' => '1zMpTklO0jLCZcMFan_KKTctbgMySRqd_pVxsrHdsz5U', 'title' => '[Cockpit - Teste]', 'gid' => '330387776', 'squad' => 'wall-street', 'nome' => 'Wall Street'],
    ['id' => '1U7ciY_zNsbb6esFMMgwSOC-R16kFO5Z4ddACdBNhDtA', 'title' => '[Cockpit - Teste]', 'gid' => '330387776', 'squad' => 'romans', 'nome' => 'Romans'],
    ['id' => '17y3rdmRMO3moQP9haJOg5Z8bv-4T4BVtfvMowm3jv8', 'title' => '[ Cockpit ]', 'gid' => '330387776', 'squad' => 'legacy', 'nome' => 'Legacy'],
    ['id' => '1Oj971TOsgJQ_3A5sBRGHcEgx53y2r-PuZeOd_E002Ao', 'title' => '[COCKPIT]', 'gid' => '330387776', 'squad' => 'monsters-sa', 'nome' => 'Monsters S/A']
];

if ($googleApiKey) {
    try {
        echo "Sync: Cockpits (via proxy local)...\n";
        $allCockpitRows = [];
        foreach ($cockpitConfigs as $cockpit) {
            $proxyUrl = "http://localhost/kloweekpipefy/sheets-proxy.php?id={$cockpit['id']}&title=" . rawurlencode($cockpit['title']) . "&gid={$cockpit['gid']}";
            $ch = curl_init($proxyUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            $sheetResp = curl_exec($ch);
            $sheetCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($sheetCode !== 200) { echo "  {$cockpit['nome']}: proxy HTTP {$sheetCode} - pulando\n"; continue; }
            $sheetData = json_decode($sheetResp, true);
            $srcRows = $sheetData['rows'] ?? [];
            if (count($srcRows) < 2) continue;
            $headers = $srcRows[0];
            $findCol = function() use ($headers) {
                $candidates = func_get_args();
                foreach ($candidates as $c) {
                    $re = '/\b' . preg_quote(strtolower($c), '/') . '\b/';
                    foreach ($headers as $idx => $h) {
                        if ($h && preg_match($re, strtolower($h))) return $idx;
                    }
                }
                return -1;
            };
            for ($i = 1; $i < count($srcRows); $i++) {
                $row = $srcRows[$i];
                $nameIdx = $findCol('name', 'nome do projeto', 'cliente');
                $name = $nameIdx >= 0 ? ($row[$nameIdx] ?? '') : '';
                if (!$name) continue;
                $churnIdx = $findCol('churn');
                $churnRaw = strtolower(trim($churnIdx >= 0 ? ($row[$churnIdx] ?? '') : ''));
                $isChurn = $churnRaw && !in_array($churnRaw, ['não', 'nao', 'n', '']);
                $feeIdx = $findCol('fee');
                $fee = 0;
                if ($feeIdx >= 0) {
                    $fee = floatval(preg_replace('/[R$\s.]/', '', str_replace(',', '.', $row[$feeIdx] ?? '0')));
                    if (is_nan($fee)) $fee = 0;
                }
                $allCockpitRows[] = [
                    'id' => ($findCol('id') >= 0 ? ($row[$findCol('id')] ?? '') : '') ?: $cockpit['squad'] . '-' . $i,
                    'nome' => strtoupper(trim($name)),
                    'squad' => $cockpit['squad'],
                    'coordenador' => ($findCol('coordenador', 'coodernador') >= 0 ? ($row[$findCol('coordenador', 'coodernador')] ?? '') : ''),
                    'account' => ($findCol('account') >= 0 ? ($row[$findCol('account')] ?? '') : ''),
                    'gt' => ($findCol('gt') >= 0 ? ($row[$findCol('gt')] ?? '') : ''),
                    'fee' => $fee,
                    'flag' => ($findCol('flag calculada', 'flag') >= 0 ? ($row[$findCol('flag calculada', 'flag')] ?? '') : ''),
                    'health' => ($findCol('health', 'pontuação') >= 0 ? ($row[$findCol('health', 'pontuação')] ?? '') : ''),
                    'customer_care_status' => ($findCol('customer care status') >= 0 ? ($row[$findCol('customer care status')] ?? '') : ''),
                    'data_atualizacao' => ($findCol('data de atualização', 'data atualização', 'atualizado') >= 0 ? ($row[$findCol('data de atualização', 'data atualização', 'atualizado')] ?? '') : ''),
                    'churn' => $isChurn
                ];
            }
            echo "  {$cockpit['nome']}: " . (count($srcRows) - 1) . " linhas\n";
            usleep(1000000);
        }
        if (!empty($allCockpitRows)) {
            supabaseRequest('POST', 'cockpits', $allCockpitRows);
            $results['tasks'][] = ['name' => 'Cockpits', 'count' => count($allCockpitRows), 'status' => 'ok'];
            echo "Cockpits: " . count($allCockpitRows) . " clientes\n";
        }
    } catch (Exception $e) {
        $results['errors'][] = $e->getMessage();
        echo "Cockpits ERRO: " . $e->getMessage() . "\n";
    }
} else {
    echo "Sync: GOOGLE_SHEETS_API_KEY não configurada, pulando cockpits\n";
}

// ─── Sync ROI Week ─────────────────────────────────────────
$results = ['tasks' => [], 'errors' => []];

try {
    echo "Sync: ROI Week...\n";
    $edges = getAllCards('303444567');
    $rows = [];
    foreach ($edges as $e) {
        $n = $e['node'];
        $dataRaw = extractField($n, 'Data de Atualização') ?: $n['createdAt'];
        $rows[] = [
            'id' => $n['id'],
            'cliente_nome' => $n['title'],
            'projeto' => extractField($n, 'Projeto [USAR ESTE]') ?: '',
            'investimento' => extractFloat($n, 'Investimento em mídia no mês'),
            'mc' => extractFloat($n, 'Margem de contribuição'),
            'faturamento' => extractFloat($n, 'Faturamento (vendas V4)'),
            'vendas' => extractFloat($n, 'Vendas realizadas (apenas geradas pela V4)'),
            'data_atualizacao' => $dataRaw ?: '',
            'data_obj' => parseDate($dataRaw),
            'phase_id' => $n['current_phase']['id'] ?? '',
            'phase_name' => $n['current_phase']['name'] ?? '',
            'card_url' => 'https://app.pipefy.com/open-cards/' . $n['id'],
            'pipefy_created_at' => $n['createdAt'],
            'raw_fields' => []
        ];
    }
    $r = supabaseRequest('POST', 'roi_week', $rows);
    $results['tasks'][] = ['name' => 'ROI Week', 'count' => count($rows), 'status' => 'ok'];
    echo "ROI Week: " . count($rows) . " cards\n";
} catch (Exception $e) {
    $results['errors'][] = $e->getMessage();
    echo "ROI Week ERRO: " . $e->getMessage() . "\n";
}

// ─── Sync Database Clientes ────────────────────────────────
try {
    echo "Sync: DATABASE_CLIENTES...\n";
    $edges = getAllCards('301753761');
    $rows = [];
    foreach ($edges as $e) {
        $n = $e['node'];
        $rows[] = [
            'id' => $n['id'],
            'nome' => $n['title'],
            'fee' => extractFloat($n, 'Valor do Fee'),
            'produto' => extractField($n, 'Produto') ?: '',
            'data_assinatura' => extractField($n, 'Data da assinatura do contrato') ?: '',
            'phase_id' => $n['current_phase']['id'] ?? '',
            'phase_name' => $n['current_phase']['name'] ?? '',
            'raw_fields' => []
        ];
    }
    $r = supabaseRequest('POST', 'database_clientes', $rows);
    $results['tasks'][] = ['name' => 'DATABASE_CLIENTES', 'count' => count($rows), 'status' => 'ok'];
    echo "DATABASE_CLIENTES: " . count($rows) . " registros\n";
} catch (Exception $e) {
    $results['errors'][] = $e->getMessage();
    echo "DATABASE_CLIENTES ERRO: " . $e->getMessage() . "\n";
}

// ─── Sync Database Projeto ─────────────────────────────────
try {
    echo "Sync: DATABASE_PROJETO...\n";
    $edges = getAllCards('305733459');
    $rows = [];
    foreach ($edges as $e) {
        $n = $e['node'];
        $rows[] = [
            'id' => $n['id'],
            'nome' => $n['title'],
            'status' => '',
            'fase' => extractField($n, 'Fase') ?: '',
            'produto' => extractField($n, 'Produto') ?: '',
            'phase_id' => $n['current_phase']['id'] ?? '',
            'phase_name' => $n['current_phase']['name'] ?? '',
            'raw_fields' => []
        ];
    }
    $r = supabaseRequest('POST', 'database_projeto', $rows);
    $results['tasks'][] = ['name' => 'DATABASE_PROJETO', 'count' => count($rows), 'status' => 'ok'];
    echo "DATABASE_PROJETO: " . count($rows) . " registros\n";
} catch (Exception $e) {
    $results['errors'][] = $e->getMessage();
    echo "DATABASE_PROJETO ERRO: " . $e->getMessage() . "\n";
}

// ─── Log ───────────────────────────────────────────────────
$total = array_sum(array_column($results['tasks'], 'count'));
supabaseRequest('POST', 'sync_log', [
    'origem' => 'sync-local',
    'acao' => 'full-sync',
    'registros' => $total,
    'status' => empty($results['errors']) ? 'OK' : 'ERRO',
    'detalhes' => implode('; ', $results['errors'] ?: ['Todas as fontes sincronizadas'])
]);

$results['total'] = $total;
echo "\n=== Sync completo: {$total} registros ===\n";
echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

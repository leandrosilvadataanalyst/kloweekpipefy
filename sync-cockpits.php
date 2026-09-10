<?php
/**
 * Sync Cockpits: Google Sheets + Pipefy → Supabase (deduplicado)
 *
 * Estratégia:
 *   1. Lê todos os cockpits de todas as planilhas (Google Sheets)
 *   2. Lê cards ROI_WEEK do Pipefy (mais recente)
 *   3. Deduplica por nome do cliente, mantendo o registro mais recente
 *   4. Cruza dados: metadados do cockpit (squad/coordenador/account/GT)
 *      + dados financeiros do Pipefy (investimento/mc/faturamento/vendas)
 *
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
$pipefyToken = $env['PIPEFY_TOKEN'] ?? '';

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

// ─── Helpers ───────────────────────────────────────────────

function supabaseRequest($method, $path, $body = null) {
    global $supabaseUrl, $supabaseKey;
    $url = "{$supabaseUrl}/rest/v1/{$path}";
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
    if ($body) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code >= 400) {
        $decoded = json_decode($resp, true);
        throw new Exception("Supabase {$path}: HTTP {$code} - " . ($decoded['message'] ?? $resp));
    }
    return json_decode($resp, true);
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
    if (isset($data['errors'])) throw new Exception("Pipefy: " . $data['errors'][0]['message']);
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
    if (count($p) === 3) return sprintf('%04d-%02d-%02d', $p[2], $p[1], $p[0]);
    return null;
}

function normalizeClientName($name) {
    $clean = preg_replace('/[^\w\s]/', '', strtoupper(trim($name)));
    return preg_replace('/\s+/', ' ', $clean);
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

// ─── FASE 1: Ler todos os cockpits de todas as planilhas ──
echo "=== FASE 1: Lendo cockpits das planilhas ===\n";
$allCockpitRows = [];

foreach ($COCKPITS as $cockpit) {
    echo "  {$cockpit['nome']}...\n";
    try {
        $srcRows = fetchGoogleSheet($cockpit['id'], $cockpit['title'], $googleApiKey);
        if (count($srcRows) < 2) {
            echo "    sem dados\n";
            continue;
        }

        $headers = $srcRows[0];

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

            $dataIdx = findCol($headers, 'data de atualização', 'data atualização', 'atualizado', 'data atualizacao dos dados');
            $dataAtualizacao = $dataIdx >= 0 ? trim($row[$dataIdx] ?? '') : '';

            $allCockpitRows[] = [
                'nome' => strtoupper(trim($name)),
                'squad' => $cockpit['squad'],
                'coordenador' => (findCol($headers, 'coordenador', 'coodernador') >= 0) ? trim($row[findCol($headers, 'coordenador', 'coodernador')] ?? '') : '',
                'account' => (findCol($headers, 'account') >= 0) ? trim($row[findCol($headers, 'account')] ?? '') : '',
                'gt' => (findCol($headers, 'gt') >= 0) ? trim($row[findCol($headers, 'gt')] ?? '') : '',
                'fee' => $fee,
                'flag' => (findCol($headers, 'flag calculada', 'flag') >= 0) ? trim($row[findCol($headers, 'flag calculada', 'flag')] ?? '') : '',
                'health' => (findCol($headers, 'health', 'pontuação', 'pontuacao') >= 0) ? trim($row[findCol($headers, 'health', 'pontuação', 'pontuacao')] ?? '') : '',
                'customer_care_status' => (findCol($headers, 'customer care status') >= 0) ? trim($row[findCol($headers, 'customer care status')] ?? '') : '',
                'data_atualizacao' => $dataAtualizacao,
                'data_atualizacao_obj' => parseDate($dataAtualizacao),
                'churn' => $isChurn
            ];
        }
        echo "    " . count($allCockpitRows) . " registros totais até agora\n";
        sleep(2);
    } catch (Exception $e) {
        $msg = $e->getMessage();
        echo "    ERRO: {$msg}\n";
        $results['errors'][] = "{$cockpit['nome']}: {$msg}";
    }
}

echo "\nTotal bruto lido: " . count($allCockpitRows) . " registros\n";

// ─── FASE 2: Deduplicar por nome (usar data mais recente) ─
echo "\n=== FASE 2: Deduplicando por cliente ===\n";
$grouped = [];
foreach ($allCockpitRows as $row) {
    $key = normalizeClientName($row['nome']);
    if (!isset($grouped[$key])) {
        $grouped[$key] = [];
    }
    $grouped[$key][] = $row;
}

$deduped = [];
$dupesRemoved = 0;
foreach ($grouped as $key => $rows) {
    if (count($rows) === 1) {
        $deduped[] = $rows[0];
        continue;
    }

    // Múltiplos registros: ordenar por data_atualizacao_obj (mais recente primeiro)
    usort($rows, function ($a, $b) {
        $da = $a['data_atualizacao_obj'] ?? '0000-00-00';
        $db = $b['data_atualizacao_obj'] ?? '0000-00-00';
        return strcmp($db, $da);
    });

    $winner = $rows[0];
    $dupesRemoved += count($rows) - 1;

    echo "  DUPE: {$winner['nome']}\n";
    foreach ($rows as $r) {
        $mark = ($r === $winner) ? '✓ MANTIDO' : '✗ REMOVIDO';
        echo "    {$mark} squad={$r['squad']} data={$r['data_atualizacao']}\n";
    }

    $deduped[] = $winner;
}

echo "\nDeduplicados: " . count($deduped) . " clientes únicos ({$dupesRemoved} duplicatas removidas)\n";

// ─── FASE 3: Buscar dados mais recentes do Pipefy ─────────
echo "\n=== FASE 3: Cruzando com Pipefy ROI_WEEK ===\n";
$pipefyCards = [];
try {
    $edges = getAllCards('303444567');
    foreach ($edges as $e) {
        $n = $e['node'];
        $clienteNome = extractField($n, 'Cliente [USAR ESTE]') ?: $n['title'];
        $projeto = extractField($n, 'Projeto [USAR ESTE]') ?: '';
        $dataRaw = extractField($n, 'Data de Atualização') ?: $n['createdAt'];

        $pipefyCards[] = [
            'card_id' => $n['id'],
            'cliente_nome' => $clienteNome,
            'projeto' => $projeto,
            'investimento' => extractFloat($n, 'Investimento em mídia no mês'),
            'mc' => extractFloat($n, 'Margem de contribuição'),
            'faturamento' => extractFloat($n, 'Faturamento (vendas V4)'),
            'vendas' => extractFloat($n, 'Vendas realizadas (apenas geradas pela V4)'),
            'data_atualizacao' => $dataRaw,
            'data_obj' => parseDate($dataRaw),
            'phase_id' => $n['current_phase']['id'] ?? '',
            'phase_name' => $n['current_phase']['name'] ?? '',
        ];
    }
    echo "  Pipefy ROI_WEEK: " . count($pipefyCards) . " cards\n";
} catch (Exception $e) {
    echo "  ERRO Pipefy: " . $e->getMessage() . "\n";
}

// Indexar Pipefy por nome normalizado
$pipefyByName = [];
foreach ($pipefyCards as $card) {
    $key = normalizeClientName($card['cliente_nome']);
    if (!isset($pipefyByName[$key])) $pipefyByName[$key] = [];
    $pipefyByName[$key][] = $card;
}

// ─── FASE 4: Montar registros finais (cockpit + pipefy) ───
echo "\n=== FASE 4: Montando registros consolidados ===\n";
$finalRows = [];
$matched = 0;
$unmatched = 0;
$pipefyEnriched = 0;

foreach ($deduped as $cockpit) {
    $cKey = normalizeClientName($cockpit['nome']);
    $pipefyMatches = $pipefyByName[$cKey] ?? [];

    $bestCard = null;
    if (!empty($pipefyMatches)) {
        // Pegar card com data mais recente
        usort($pipefyMatches, function ($a, $b) {
            return strcmp($b['data_obj'] ?? '0000-00-00', $a['data_obj'] ?? '0000-00-00');
        });
        $bestCard = $pipefyMatches[0];
        $matched++;

        // Enriquecer cockpit com dados do Pipefy
        if ($bestCard['data_obj'] && (!$cockpit['data_atualizacao_obj'] || $bestCard['data_obj'] > $cockpit['data_atualizacao_obj'])) {
            $cockpit['data_atualizacao'] = $bestCard['data_atualizacao'];
            $cockpit['data_atualizacao_obj'] = $bestCard['data_obj'];
            $pipefyEnriched++;
        }
    } else {
        $unmatched++;
    }

    $clientId = md5($cKey);
    $finalRows[] = [
        'id' => $clientId,
        'nome' => $cockpit['nome'],
        'squad' => $cockpit['squad'],
        'coordenador' => $cockpit['coordenador'],
        'account' => $cockpit['account'],
        'gt' => $cockpit['gt'],
        'fee' => $cockpit['fee'],
        'flag' => $cockpit['flag'],
        'health' => $cockpit['health'],
        'customer_care_status' => $cockpit['customer_care_status'],
        'data_atualizacao' => $cockpit['data_atualizacao'],
        'churn' => $cockpit['churn']
    ];
}

echo "  Clientes com match Pipefy: {$matched}\n";
echo "  Clientes sem match Pipefy: {$unmatched}\n";
echo "  Enriquecidos com dados Pipefy: {$pipefyEnriched}\n";

// ─── FASE 5: Salvar no Supabase ────────────────────────────
echo "\n=== FASE 5: Salvando no Supabase ===\n";

// Limpar tabela
supabaseRequest('DELETE', 'cockpits?id=neq.00000000-0000-0000-0000-000000000000');
echo "  Tabela limpa\n";

// Salvar em batches de 100
$batches = array_chunk($finalRows, 100);
foreach ($batches as $batch) {
    supabaseRequest('POST', 'cockpits', $batch);
}
echo "  " . count($finalRows) . " clientes salvos\n";

// ─── FASE 6: Log ───────────────────────────────────────────
$results['end'] = date('c');
$results['total'] = count($finalRows);
$results['dupes_removed'] = $dupesRemoved;
$results['pipefy_matched'] = $matched;
$results['pipefy_enriched'] = $pipefyEnriched;

supabaseRequest('POST', 'sync_log', [[
    'origem' => 'sync-cockpits-v2',
    'acao' => 'smart-sync',
    'registros' => count($finalRows),
    'status' => empty($results['errors']) ? 'OK' : 'ERRO',
    'detalhes' => json_encode([
        'dupes_removed' => $dupesRemoved,
        'pipefy_matched' => $matched,
        'pipefy_enriched' => $pipefyEnriched
    ])
]]);

echo "\n=== Sync completo: " . count($finalRows) . " clientes ===\n";
echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

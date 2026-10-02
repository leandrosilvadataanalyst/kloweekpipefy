<?php
/**
 * Local proxy para /api/dashboard (XAMPP)
 * Redireciona para o backend Supabase local ou remoto
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/api/match-cliente.php';
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$months = isset($_GET['months']) ? intval($_GET['months']) : 3;

// Ler variáveis do .env
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

if (!$supabaseUrl || !$supabaseKey) {
    http_response_code(500);
    echo json_encode(['error' => 'Supabase não configurado no .env']);
    exit;
}

function supabaseGet($path) {
    global $supabaseUrl, $supabaseKey;
    $ch = curl_init("{$supabaseUrl}/rest/v1/{$path}");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "apikey: {$supabaseKey}",
            "Authorization: Bearer {$supabaseKey}",
            "Content-Type: application/json"
        ],
        CURLOPT_TIMEOUT => 30
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code !== 200) return null;
    return json_decode($resp, true);
}

// Buscar cockpits
$cockpits = supabaseGet('cockpits?churn=eq.false&select=*');
if ($cockpits === null) {
    http_response_code(502);
    echo json_encode(['error' => 'Falha ao buscar cockpits']);
    exit;
}

// Buscar ROI Week
$dataLimite = date('Y-m-d', strtotime("-{$months} months"));
$roiWeek = supabaseGet("roi_week?data_obj=gte.{$dataLimite}&order=data_obj.desc&select=*");
if ($roiWeek === null) {
    http_response_code(502);
    echo json_encode(['error' => 'Falha ao buscar ROI Week']);
    exit;
}

// ─── Montar clientes consolidados ──────────────────────────
$clientes = [];
// Vínculos manuais da tela Ajustes (cliente → título do card); tabela ausente = sem vínculos
$vinculosPorChave = [];
foreach (supabaseGet('vinculo_card?select=cliente_chave,card_titulo') ?: [] as $v) {
    $vinculosPorChave[$v['cliente_chave']][] = $v['card_titulo'];
}

foreach ($cockpits as $c) {
    $c['vinculos'] = $vinculosPorChave[mc_normalizar_nome($c['nome'])] ?? [];
    // Razão social do cockpit é a chave principal; ver api/match-cliente.php
    $matches = mc_encontrar_cards($c, $roiWeek);

    if (empty($matches)) {
        $clientes[] = [
            'id' => $c['id'], 'nome' => $c['nome'], 'squad' => $c['squad'],
            'coordenador' => $c['coordenador'] ?? '', 'account' => $c['account'] ?? '',
            'gt' => $c['gt'] ?? '', 'fee' => $c['fee'] ?? 0,
            'flag' => $c['flag'] ?? '', 'health' => $c['health'] ?? '',
            'customer_care_status' => $c['customer_care_status'] ?? '',
            'data_atualizacao' => $c['data_atualizacao'] ?? '',
            'razao_social' => $c['razao_social'] ?? '', 'cnpj' => $c['cnpj'] ?? '',
            'roi' => null, 'preenchido' => false
        ];
        continue;
    }

    $roi = $matches[0];
    $investimento = floatval($roi['investimento'] ?? 0);
    $faturamento = floatval($roi['faturamento'] ?? 0);
    $mcRaw = floatval($roi['mc'] ?? 0);
    $mcDec = $mcRaw > 1 ? $mcRaw / 100 : $mcRaw;
    $vendas = floatval($roi['vendas'] ?? 0);

    $clientes[] = [
        'id' => $c['id'], 'nome' => $c['nome'], 'squad' => $c['squad'],
        'coordenador' => $c['coordenador'] ?? '', 'account' => $c['account'] ?? '',
        'gt' => $c['gt'] ?? '', 'fee' => $c['fee'] ?? 0,
        'flag' => $c['flag'] ?? '', 'health' => $c['health'] ?? '',
        'customer_care_status' => $c['customer_care_status'] ?? '',
        'data_atualizacao' => $c['data_atualizacao'] ?? '',
        'razao_social' => $c['razao_social'] ?? '', 'cnpj' => $c['cnpj'] ?? '',
        'roi' => [
            'id' => $roi['id'], 'projeto' => $roi['projeto'] ?? '',
            'investimento' => $investimento, 'mc' => $mcRaw,
            'faturamento' => $faturamento, 'vendas' => $vendas,
            'data_atualizacao' => $roi['data_atualizacao'] ?? '',
            'data_obj' => $roi['data_obj'] ?? null,
            'card_url' => $roi['card_url'] ?? '',
            'roi_calculado' => $investimento > 0 ? ($faturamento * $mcDec) / $investimento : 0,
            'roas' => $investimento > 0 ? $faturamento / $investimento : 0,
            'cac' => $vendas > 0 ? $investimento / $vendas : 0
        ],
        'preenchido' => true
    ];
}

echo json_encode([
    'clientes' => $clientes,
    'cockpits_count' => count($cockpits),
    'roi_count' => count($roiWeek),
    'months' => $months
]);

<?php
/**
 * Local proxy para /api/dashboard (XAMPP)
 * Redireciona para o backend Supabase local ou remoto
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
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

// Buscar cockpits
$ch = curl_init("{$supabaseUrl}/rest/v1/cockpits?churn=eq.false&select=*");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "apikey: {$supabaseKey}",
        "Authorization: Bearer {$supabaseKey}",
        "Content-Type: application/json"
    ],
    CURLOPT_TIMEOUT => 30
]);
$cockpitsResp = curl_exec($ch);
$cockpitsCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($cockpitsCode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => "Supabase cockpits: HTTP {$cockpitsCode}"]);
    exit;
}

$cockpits = json_decode($cockpitsResp, true);

// Buscar ROI Week
$dataLimite = date('Y-m-d', strtotime("-{$months} months"));
$ch2 = curl_init("{$supabaseUrl}/rest/v1/roi_week?data_obj=gte.{$dataLimite}&order=data_obj.desc&select=*");
curl_setopt_array($ch2, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "apikey: {$supabaseKey}",
        "Authorization: Bearer {$supabaseKey}",
        "Content-Type: application/json"
    ],
    CURLOPT_TIMEOUT => 30
]);
$roiResp = curl_exec($ch2);
$roiCode = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
curl_close($ch2);

if ($roiCode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => "Supabase roi_week: HTTP {$roiCode}"]);
    exit;
}

$roiWeek = json_decode($roiResp, true);

function normalizeName($name) {
    $clean = preg_replace('/[^\w\s]/', '', strtoupper(trim($name)));
    $clean = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $clean);
    return preg_replace('/\s+/', ' ', trim($clean));
}

// Carregar aliases de nomes
$aliasesFile = __DIR__ . '/data/client-aliases.json';
$aliases = [];
if (file_exists($aliasesFile)) {
    $aliasesData = json_decode(file_get_contents($aliasesFile), true);
    $aliases = $aliasesData['razao_to_fantasia'] ?? [];
}

// Montar clientes consolidados
$clientes = [];
foreach ($cockpits as $c) {
    $matches = [];
    $cLower = strtolower($c['nome']);
    $cClean = preg_replace('/[^\w\s]/', '', $cLower);

    // Buscar aliases para este cliente
    $cNorm = normalizeName($c['nome']);
    $aliasNames = $aliases[$cNorm] ?? [];

    foreach ($roiWeek as $r) {
        $rNome = strtolower(trim($r['cliente_nome'] ?? ''));
        $rProj = strtolower(trim($r['projeto'] ?? ''));
        $rProjClean = preg_replace('/[\[\]"\']/', '', $rProj);
        $rProjClean = trim($rProjClean);

        // Match direto por nome
        if ($rNome && (strpos($rNome, $cLower) !== false || strpos($cLower, $rNome) !== false)) {
            $matches[] = $r;
            continue;
        }
        // Match por projeto (normalizado)
        if ($rProjClean && (strpos($rProjClean, $cLower) !== false || strpos($cLower, $rProjClean) !== false)) {
            $matches[] = $r;
            continue;
        }
        // Match via aliases (nome fantasia)
        if (!empty($aliasNames)) {
            $rNomeUpper = strtoupper($rNome);
            $rProjUpper = strtoupper($rProjClean);
            foreach ($aliasNames as $alias) {
                $aliasUpper = strtoupper(trim($alias));
                if ($rNomeUpper === $aliasUpper || $rProjUpper === $aliasUpper ||
                    strpos($rNomeUpper, $aliasUpper) !== false || strpos($aliasUpper, $rNomeUpper) !== false ||
                    strpos($rProjUpper, $aliasUpper) !== false || strpos($aliasUpper, $rProjUpper) !== false) {
                    $matches[] = $r;
                    continue 2;
                }
            }
        }
        // Match sem pontuação
        $rNomeClean = preg_replace('/[^\w\s]/', '', $rNome);
        $rProjClean2 = preg_replace('/[^\w\s]/', '', $rProjClean);
        if (($rNomeClean && (strpos($rNomeClean, $cClean) !== false || strpos($cClean, $rNomeClean) !== false)) ||
            ($rProjClean2 && (strpos($rProjClean2, $cClean) !== false || strpos($cClean, $rProjClean2) !== false))) {
            $matches[] = $r;
        }
    }

    if (empty($matches)) {
        $clientes[] = [
            'id' => $c['id'], 'nome' => $c['nome'], 'squad' => $c['squad'],
            'coordenador' => $c['coordenador'] ?? '', 'account' => $c['account'] ?? '',
            'gt' => $c['gt'] ?? '', 'fee' => $c['fee'] ?? 0,
            'flag' => $c['flag'] ?? '', 'health' => $c['health'] ?? '',
            'customer_care_status' => $c['customer_care_status'] ?? '',
            'data_atualizacao' => $c['data_atualizacao'] ?? '',
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

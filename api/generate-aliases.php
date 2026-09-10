<?php
/**
 * Gerar e salvar mapeamento de aliases como JSON
 * Execute: http://localhost/kloweekpipefy/api/generate-aliases.php
 */
header('Content-Type: application/json; charset=utf-8');

$env = [];
$lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    $line = trim($line);
    if (strpos($line, '#') === 0 || $line === '') continue;
    if (strpos($line, '=') !== false) {
        list($key, $val) = explode('=', $line, 2);
        $env[trim($key)] = trim($val, "\"' ");
    }
}

$pipefyToken = $env['PIPEFY_TOKEN'] ?? '';
$supabaseUrl = $env['SUPABASE_URL'] ?? '';
$supabaseKey = $env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

function getAllCards($pipeId, $token) {
    $all = []; $cursor = null; $hasNext = true;
    while ($hasNext) {
        $after = $cursor ? ", after: \"{$cursor}\"" : '';
        $q = "{ cards(pipe_id: \"{$pipeId}\", first: 50{$after}) { edges { node { id title fields { name value } } } pageInfo { hasNextPage endCursor } } }";
        $ch = curl_init('https://api.pipefy.com/graphql');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', "Authorization: Bearer {$token}"],
            CURLOPT_POSTFIELDS => json_encode(['query' => $q]),
            CURLOPT_TIMEOUT => 60
        ]);
        $resp = json_decode(curl_exec($ch), true);
        curl_close($ch);
        if (empty($resp['data']['cards']['edges'])) break;
        $all = array_merge($all, $resp['data']['cards']['edges']);
        $hasNext = $resp['data']['cards']['pageInfo']['hasNextPage'];
        $cursor = $resp['data']['cards']['pageInfo']['endCursor'];
        if (count($all) > 1000) break;
    }
    return $all;
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

function normalize($name) {
    $clean = preg_replace('/[^\w\s]/', '', strtoupper(trim($name)));
    $clean = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $clean);
    return preg_replace('/\s+/', ' ', trim($clean));
}

// 1. Buscar dados
$clientesCards = getAllCards('301753761', $pipefyToken);
$projetoCards = getAllCards('305733459', $pipefyToken);

// 2. Construir mapeamento
$aliases = []; // normalizado → [original]
$razaoToFantasia = []; // razão normalizada → [fantasia normalizada]
$fantasiaToRazao = []; // fantasia normalizada → razão normalizada

// De DATABASE_CLIENTES
foreach ($clientesCards as $card) {
    $n = $card['node'];
    $razaoSocial = $n['title'];
    $nomeFantasia = extractField($n, 'Nome Fantasia') ?? '';

    if (!$razaoSocial || !$nomeFantasia) continue;

    $razaoNorm = normalize($razaoSocial);
    $fantasiaNorm = normalize($nomeFantasia);

    if (!$razaoNorm || !$fantasiaNorm || $razaoNorm === $fantasiaNorm) continue;

    // Razão → Fantasia
    if (!isset($razaoToFantasia[$razaoNorm])) $razaoToFantasia[$razaoNorm] = [];
    $razaoToFantasia[$razaoNorm][] = $fantasiaNorm;

    // Fantasia → Razão
    $fantasiaToRazao[$fantasiaNorm] = $razaoNorm;
}

// De DATABASE_PROJETO: projeto → cliente
foreach ($projetoCards as $card) {
    $n = $card['node'];
    $projetoTitle = $n['title'];
    $clienteName = extractField($n, 'Cliente') ?? '';

    if (!$projetoTitle || !$clienteName) continue;

    $clienteName = preg_replace('/[\[\]"]/', '', $clienteName);
    $clienteName = trim($clienteName);

    $projetoNorm = normalize($projetoTitle);
    $clienteNorm = normalize($clienteName);

    if (!$projetoNorm || !$clienteNorm || $projetoNorm === $clienteNorm) continue;

    if (!isset($razaoToFantasia[$clienteNorm])) $razaoToFantasia[$clienteNorm] = [];
    $razaoToFantasia[$clienteNorm][] = $projetoNorm;

    $fantasiaToRazao[$projetoNorm] = $clienteNorm;
}

// 3. Buscar cockpits para verificar matches
$ch = curl_init("{$supabaseUrl}/rest/v1/cockpits?select=nome");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ["apikey: {$supabaseKey}", "Authorization: Bearer {$supabaseKey}"],
    CURLOPT_TIMEOUT => 30
]);
$cockpits = json_decode(curl_exec($ch), true);
curl_close($ch);

// 4. Verificar matches
$matchResults = [];
foreach ($cockpits as $c) {
    $cNorm = normalize($c['nome']);
    $hasMatch = isset($razaoToFantasia[$cNorm]);

    // Busca parcial
    $partialMatch = null;
    if (!$hasMatch) {
        foreach ($razaoToFantasia as $razao => $fantasias) {
            if (strpos($razao, $cNorm) !== false || strpos($cNorm, $razao) !== false) {
                $partialMatch = $razao;
                break;
            }
        }
    }

    $matchResults[] = [
        'cockpit' => $c['nome'],
        'normalized' => $cNorm,
        'hasExactMatch' => $hasMatch,
        'aliases' => $hasMatch ? $razaoToFantasia[$cNorm] : null,
        'partialMatch' => $partialMatch
    ];
}

// 5. Salvar JSON
$output = [
    'generated_at' => date('c'),
    'stats' => [
        'clientes' => count($clientesCards),
        'projetos' => count($projetoCards),
        'razao_mappings' => count($razaoToFantasia),
        'fantasia_mappings' => count($fantasiaToRazao)
    ],
    'razao_to_fantasia' => $razaoToFantasia,
    'fantasia_to_razao' => $fantasiaToRazao,
    'match_results' => $matchResults
];

$jsonFile = __DIR__ . '/../data/client-aliases.json';
if (!is_dir(__DIR__ . '/../data')) mkdir(__DIR__ . '/../data', 0755, true);
file_put_contents($jsonFile, json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode([
    'success' => true,
    'file' => $jsonFile,
    'stats' => $output['stats'],
    'unmatched' => count(array_filter($matchResults, fn($m) => !$m['hasExactMatch'] && !$m['partialMatch']))
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

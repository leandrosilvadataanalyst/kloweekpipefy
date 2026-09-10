<?php
/**
 * Mapeamento de nomes: razão social ↔ nome fantasia
 * Busca DATABASE_CLIENTES e DATABASE_PROJETO do Pipefy
 * e retorna um mapa para enriquecimento do matching
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
    return preg_replace('/[^\w\s]/', '', strtoupper(trim($name)));
}

// 1. Buscar DATABASE_CLIENTES
$clientesCards = getAllCards('301753761', $pipefyToken);

// Mapear: nome fantasia → razão social e vice-versa
$nameMap = []; // normalizado → [nomes originais]
$razaoToFantasia = []; // razão social normalizada → [nome fantasia]
$fantasiaToRazao = []; // nome fantasia normalizada → razão social

foreach ($clientesCards as $card) {
    $n = $card['node'];
    $razaoSocial = $n['title']; // Nome da empresa
    $nomeFantasia = extractField($n, 'Nome Fantasia') ?? '';

    if (!$razaoSocial || !$nomeFantasia) continue;

    $razaoNorm = normalize($razaoSocial);
    $fantasiaNorm = normalize($nomeFantasia);

    if (!$razaoNorm || !$fantasiaNorm) continue;

    // Razão social → Nome fantasia
    if (!isset($razaoToFantasia[$razaoNorm])) $razaoToFantasia[$razaoNorm] = [];
    $razaoToFantasia[$razaoNorm][] = ['original' => $nomeFantasia, 'normalizado' => $fantasiaNorm];

    // Nome fantasia → Razão social
    if (!isset($fantasiaToRazao[$fantasiaNorm])) $fantasiaToRazao[$fantasiaNorm] = ['original' => $razaoSocial, 'normalizado' => $razaoNorm];

    // Indexar por palavras-chave também
    $words = array_filter(explode(' ', $fantasiaNorm));
    foreach ($words as $w) {
        if (strlen($w) > 3) {
            if (!isset($nameMap[$w])) $nameMap[$w] = [];
            $nameMap[$w][] = $razaoNorm;
        }
    }
}

// 2. Buscar DATABASE_PROJETO
$projetoCards = getAllCards('305733459', $pipefyToken);

// Mapear: título do projeto → nome fantasia do projeto
$projetoMap = []; // normalizado → título original

foreach ($projetoCards as $card) {
    $n = $card['node'];
    $projetoTitle = $n['title'];
    $projetoNorm = normalize($projetoTitle);
    if ($projetoNorm) {
        $projetoMap[$projetoNorm] = $projetoTitle;
    }
}

echo json_encode([
    'razao_to_fantasia' => $razaoToFantasia,
    'fantasia_to_razao' => $fantasiaToRazao,
    'projeto_map' => $projetoMap,
    'name_map' => $nameMap,
    'stats' => [
        'clientes' => count($clientesCards),
        'projetos' => count($projetoCards),
        'razao_mappings' => count($razaoToFantasia),
        'fantasia_mappings' => count($fantasiaToRazao)
    ]
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

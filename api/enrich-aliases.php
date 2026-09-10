<?php
/**
 * Enriquecer aliases: cruza DATABASE_CLIENTES ↔ cockpit
 * Popula tabela client_aliases no Supabase
 *
 * Execute: http://localhost/kloweekpipefy/api/enrich-aliases.php
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

$supabaseUrl = $env['SUPABASE_URL'] ?? '';
$supabaseKey = $env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
$pipefyToken = $env['PIPEFY_TOKEN'] ?? '';

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

echo "=== Enriquecendo aliases ===\n";

// 1. Buscar DATABASE_CLIENTES
echo "Buscando DATABASE_CLIENTES...\n";
$clientesCards = getAllCards('301753761', $pipefyToken);
echo "  " . count($clientesCards) . " cards\n";

// 2. Buscar cockpits do Supabase
echo "Buscando cockpits...\n";
$cockpits = supabaseRequest('GET', 'cockpits?select=nome,squad');
echo "  " . count($cockpits) . " cockpits\n";

// 3. Buscar DATABASE_PROJETO
echo "Buscando DATABASE_PROJETO...\n";
$projetoCards = getAllCards('305733459', $pipefyToken);
echo "  " . count($projetoCards) . " cards\n";

// 4. Construir mapeamento
$aliases = [];

// De DATABASE_CLIENTES:razão social → nome fantasia
foreach ($clientesCards as $card) {
    $n = $card['node'];
    $razaoSocial = $n['title'];
    $nomeFantasia = extractField($n, 'Nome Fantasia') ?? '';

    if (!$razaoSocial || !$nomeFantasia) continue;

    $razaoNorm = normalize($razaoSocial);
    $fantasiaNorm = normalize($nomeFantasia);

    if (!$razaoNorm || !$fantasiaNorm || $razaoNorm === $fantasiaNorm) continue;

    $aliases[] = [
        'cockpit_name' => strtoupper(trim($razaoSocial)),
        'pipefy_name' => strtoupper(trim($nomeFantasia)),
        'source' => 'auto'
    ];
}

// De DATABASE_PROJETO: projeto título → cliente
foreach ($projetoCards as $card) {
    $n = $card['node'];
    $projetoTitle = $n['title'];
    $clienteName = extractField($n, 'Cliente') ?? '';

    if (!$projetoTitle || !$clienteName) continue;

    // Limpar aspas do campo Cliente
    $clienteName = preg_replace('/[\[\]"]/', '', $clienteName);
    $clienteName = trim($clienteName);

    $projetoNorm = normalize($projetoTitle);
    $clienteNorm = normalize($clienteName);

    if (!$projetoNorm || !$clienteNorm || $projetoNorm === $clienteNorm) continue;

    $aliases[] = [
        'cockpit_name' => strtoupper(trim($clienteName)),
        'pipefy_name' => strtoupper(trim($projetoTitle)),
        'source' => 'auto'
    ];
}

echo "Aliases gerados: " . count($aliases) . "\n";

// 5. Salvar no Supabase
if (!empty($aliases)) {
    echo "Salvando no Supabase...\n";
    // Limpar aliases antigos
    supabaseRequest('DELETE', 'client_aliases?source=eq.auto');

    // Salvar em batches
    $batches = array_chunk($aliases, 100);
    foreach ($batches as $batch) {
        supabaseRequest('POST', 'client_aliases', $batch);
    }
    echo "  " . count($aliases) . " aliases salvos\n";
}

// 6. Verificar matches
echo "\n=== Verificando matches ===\n";
$aliasMap = [];
foreach ($aliases as $a) {
    $key = normalize($a['cockpit_name']);
    if (!isset($aliasMap[$key])) $aliasMap[$key] = [];
    $aliasMap[$key][] = $a['pipefy_name'];
}

$matched = 0;
$unmatched = 0;
foreach ($cockpits as $c) {
    $cNorm = normalize($c['nome']);
    if (isset($aliasMap[$cNorm])) {
        $matched++;
    } else {
        $unmatched++;
    }
}
echo "Cockpits com alias: {$matched}\n";
echo "Cockpits sem alias: {$unmatched}\n";

echo "\n=== Concluído ===\n";
echo json_encode([
    'aliases' => count($aliases),
    'matched' => $matched,
    'unmatched' => $unmatched
], JSON_PRETTY_PRINT);

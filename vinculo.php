<?php
/**
 * Vínculo manual cliente (cockpit) → título do card do ROI Week (XAMPP) — espelho de api/vinculo.js.
 * Usado pela tela Ajustes.
 *   GET                                               → { rows: [{ cliente_chave, cliente_nome, squad, card_titulo, card_id, updated_at }] }
 *   POST { cliente_chave, cliente_nome, squad, card_titulo, card_id } → grava (1 vínculo por cliente)
 *   DELETE ?cliente_chave=...                         → remove o vínculo
 * Tabela: vinculo_card (schema.sql). Sem a tabela, GET devolve rows=[] (cruzamento automático segue normal).
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$env = [];
foreach (file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
    list($k, $v) = explode('=', $line, 2);
    $env[trim($k)] = trim($v, "\"' ");
}
$supabaseUrl = $env['SUPABASE_URL'] ?? '';
$supabaseKey = $env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

function falhar($code, $msg) {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

if (!$supabaseUrl || !$supabaseKey) falhar(500, 'Supabase não configurado no .env');

function supabase($method, $path, $body = null) {
    global $supabaseUrl, $supabaseKey;
    $ch = curl_init("{$supabaseUrl}/rest/v1/{$path}");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => [
            "apikey: {$supabaseKey}",
            "Authorization: Bearer {$supabaseKey}",
            'Content-Type: application/json',
            'Prefer: resolution=merge-duplicates,return=representation'
        ]
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code, json_decode($resp, true)];
}

function tabelaAusente($resp) {
    return is_array($resp) && in_array($resp['code'] ?? '', ['42P01', 'PGRST205'], true);
}

function texto($v, $max) {
    return mb_substr(trim((string)$v), 0, $max);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    list($code, $resp) = supabase('GET', 'vinculo_card?select=cliente_chave,cliente_nome,squad,card_titulo,card_id,updated_at&order=cliente_nome');
    if ($code === 200) { echo json_encode(['rows' => $resp]); exit; }
    if (tabelaAusente($resp)) { echo json_encode(['rows' => [], 'aviso' => 'Tabela vinculo_card ausente: rode a migração do schema.sql']); exit; }
    falhar(502, 'Falha ao ler vinculo_card: ' . ($resp['message'] ?? "HTTP {$code}"));
}

if ($method === 'POST') {
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $row = [
        'cliente_chave' => texto($in['cliente_chave'] ?? '', 200),
        'cliente_nome'  => texto($in['cliente_nome'] ?? '', 200),
        'squad'         => texto($in['squad'] ?? '', 50),
        'card_titulo'   => texto($in['card_titulo'] ?? '', 300),
        'card_id'       => preg_replace('/\D/', '', (string)($in['card_id'] ?? '')),
        'updated_at'    => date('c')
    ];
    if ($row['cliente_chave'] === '' || $row['card_titulo'] === '') falhar(400, 'cliente_chave e card_titulo são obrigatórios');
    list($code, $resp) = supabase('POST', 'vinculo_card?on_conflict=cliente_chave', [$row]);
    if ($code >= 200 && $code < 300) { echo json_encode(['ok' => true, 'row' => $resp[0] ?? $row]); exit; }
    if (tabelaAusente($resp)) falhar(409, 'Tabela vinculo_card ausente: rode a migração do schema.sql no Supabase');
    falhar(502, 'Falha ao gravar: ' . ($resp['message'] ?? "HTTP {$code}"));
}

if ($method === 'DELETE') {
    $chave = texto($_GET['cliente_chave'] ?? '', 200);
    if ($chave === '') falhar(400, 'cliente_chave é obrigatório');
    list($code, $resp) = supabase('DELETE', 'vinculo_card?cliente_chave=eq.' . rawurlencode($chave));
    if ($code >= 200 && $code < 300) { echo json_encode(['ok' => true]); exit; }
    falhar(502, 'Falha ao remover: ' . ($resp['message'] ?? "HTTP {$code}"));
}

falhar(405, 'Método não permitido');

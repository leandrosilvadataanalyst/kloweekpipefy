<?php
/**
 * Janela de preenchimento do ROI Week (XAMPP) — espelho de api/janela.js (Vercel).
 *   GET                         → { rows: [{ chave, dia_inicio, dia_fim, motivo, updated_at }] }
 *   POST { chave, dia_inicio, dia_fim, motivo }  → grava ('padrao' ou 'YYYY-MM')
 *   DELETE ?chave=YYYY-MM       → remove a exceção do mês (o padrão não pode ser removido)
 * Tabela: config_janela (schema.sql). Sem a tabela, GET devolve rows=[] e as telas usam 01 a 03.
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

function validar($chave, $ini, $fim) {
    if ($chave !== 'padrao' && !preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $chave)) return 'Chave inválida (use "padrao" ou AAAA-MM)';
    if (!is_int($ini) || $ini < 1 || $ini > 31) return 'Dia de início inválido (1 a 31)';
    if (!is_int($fim) || $fim < 1 || $fim > 31) return 'Dia de fim inválido (1 a 31)';
    if ($fim < $ini) return 'O dia de fim deve ser igual ou posterior ao de início';
    return '';
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    list($code, $resp) = supabase('GET', 'config_janela?select=chave,dia_inicio,dia_fim,motivo,updated_at&order=chave');
    if ($code === 200) { echo json_encode(['rows' => $resp]); exit; }
    if (tabelaAusente($resp)) { echo json_encode(['rows' => [], 'aviso' => 'Tabela config_janela ausente: rode a migração do schema.sql']); exit; }
    falhar(502, 'Falha ao ler config_janela: ' . ($resp['message'] ?? "HTTP {$code}"));
}

if ($method === 'POST') {
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $chave = trim((string)($in['chave'] ?? ''));
    $ini = filter_var($in['dia_inicio'] ?? null, FILTER_VALIDATE_INT);
    $fim = filter_var($in['dia_fim'] ?? null, FILTER_VALIDATE_INT);
    $erro = validar($chave, $ini === false ? null : $ini, $fim === false ? null : $fim);
    if ($erro) falhar(400, $erro);
    $row = ['chave' => $chave, 'dia_inicio' => $ini, 'dia_fim' => $fim, 'motivo' => mb_substr(trim((string)($in['motivo'] ?? '')), 0, 200), 'updated_at' => date('c')];
    list($code, $resp) = supabase('POST', 'config_janela?on_conflict=chave', [$row]);
    if ($code >= 200 && $code < 300) { echo json_encode(['ok' => true, 'row' => $resp[0] ?? $row]); exit; }
    if (tabelaAusente($resp)) falhar(409, 'Tabela config_janela ausente: rode a migração do schema.sql no Supabase');
    falhar(502, 'Falha ao gravar: ' . ($resp['message'] ?? "HTTP {$code}"));
}

if ($method === 'DELETE') {
    $chave = trim((string)($_GET['chave'] ?? ''));
    if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $chave)) falhar(400, 'Só exceções de mês (AAAA-MM) podem ser removidas');
    list($code, $resp) = supabase('DELETE', 'config_janela?chave=eq.' . rawurlencode($chave));
    if ($code >= 200 && $code < 300) { echo json_encode(['ok' => true]); exit; }
    falhar(502, 'Falha ao remover: ' . ($resp['message'] ?? "HTTP {$code}"));
}

falhar(405, 'Método não permitido');

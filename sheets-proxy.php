<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function sheetsFail($code, $message) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

function loadApiKey() {
    $apiKey = getenv('GOOGLE_SHEETS_API_KEY');
    if ($apiKey) return $apiKey;

    $envFile = __DIR__ . '/.env';
    if (!file_exists($envFile)) return null;

    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, 'GOOGLE_SHEETS_API_KEY=') === 0) {
            $apiKey = substr($line, strlen('GOOGLE_SHEETS_API_KEY='));
            return trim($apiKey, "\"'");
        }
    }
    return null;
}

$id = trim($_GET['id'] ?? '');
$title = trim($_GET['title'] ?? '');
$gid = trim($_GET['gid'] ?? '');

if (!$id || $title === '' || $gid === '') {
    sheetsFail(400, 'Parâmetros id, title e gid são obrigatórios');
}

if (!preg_match('/^[a-zA-Z0-9_-]+$/', $id)) {
    sheetsFail(400, 'ID de planilha inválido');
}

$apiKey = loadApiKey();
if (!$apiKey) {
    sheetsFail(401, 'GOOGLE_SHEETS_API_KEY não configurada no .env');
}

$range = rawurlencode($title . '!A1:Z500');
$url = "https://sheets.googleapis.com/v4/spreadsheets/{$id}/values/{$range}?key=" . rawurlencode($apiKey);

error_log("SheetsProxy REQ: id={$id} title={$title} gid={$gid}");

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTPHEADER => ['Accept: application/json']
]);
$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
$curlErrno = curl_errno($ch);
curl_close($ch);

if ($curlError) {
    error_log("SheetsProxy CURL_ERR: {$curlError} (errno={$curlErrno})");
    sheetsFail(502, 'Erro de rede ao acessar Google Sheets: ' . $curlError);
}

if ($httpCode !== 200) {
    error_log("SheetsProxy FAIL: {$id} title={$title} gid={$gid} http={$httpCode} resp=" . substr($resp ?? '', 0, 500));
    $googleError = '';
    $decoded = json_decode($resp ?? '', true);
    if (isset($decoded['error']['message'])) {
        $googleError = ': ' . $decoded['error']['message'];
    }
    sheetsFail(502, "Google Sheets retornou HTTP {$httpCode}{$googleError}. Dados da planilha indisponíveis.");
}

$data = json_decode($resp, true);
$rows = $data['values'] ?? [];

error_log("SheetsProxy OK: {$id} title={$title} rows=" . count($rows));

echo json_encode([
    'id' => $id,
    'title' => $title,
    'gid' => $gid,
    'rows' => $rows,
    'total_rows' => count($rows)
]);
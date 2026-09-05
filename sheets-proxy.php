<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
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

$id = trim($_GET['id'] ?? '');
$title = trim($_GET['title'] ?? '');
$gid = trim($_GET['gid'] ?? '');

if (!$id || $title === '' || $gid === '') {
    sheetsFail(400, 'Parâmetros id, title e gid são obrigatórios');
}

$apiKey = getenv('GOOGLE_SHEETS_API_KEY');
if (!$apiKey) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), 'GOOGLE_SHEETS_API_KEY=') === 0) {
            $apiKey = substr(trim($line), strlen('GOOGLE_SHEETS_API_KEY='));
            $apiKey = trim($apiKey, "\"'");
            break;
        }
    }
}
if (!$apiKey) {
    sheetsFail(401, 'GOOGLE_SHEETS_API_KEY não configurada no .env');
}

$range = rawurlencode($title . '!A1:Z500');
$url = "https://sheets.googleapis.com/v4/spreadsheets/{$id}/values/{$range}?key=" . rawurlencode($apiKey);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_FOLLOWLOCATION => true
]);
$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    sheetsFail(502, 'Erro de rede ao acessar Google Sheets: ' . $curlError);
}

if ($httpCode !== 200) {
    error_log("SheetsProxy FAIL: {$id} title={$title} gid={$gid} http=" . $httpCode . ' resp=' . substr($resp ?? '', 0, 300));
    $googleError = '';
    $decoded = json_decode($resp ?? '', true);
    if (isset($decoded['error']['message'])) {
        $googleError = ': ' . $decoded['error']['message'];
    }
    sheetsFail(502, "Google Sheets retornou HTTP {$httpCode}{$googleError}. Dados da planilha indisponíveis.");
}

$data = json_decode($resp, true);
$rows = $data['values'] ?? [];

echo json_encode([
    'id' => $id,
    'title' => $title,
    'gid' => $gid,
    'rows' => $rows,
    'total_rows' => count($rows)
]);
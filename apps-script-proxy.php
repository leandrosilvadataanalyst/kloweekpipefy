<?php
/**
 * Proxy para Google Apps Script Web App
 * Envia dados para a planilha de backup via Apps Script
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function fail($code, $msg) {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

$appsScriptUrl = getenv('GOOGLE_APPS_SCRIPT_URL');
if (!$appsScriptUrl) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, 'GOOGLE_APPS_SCRIPT_URL=') === 0) {
            $appsScriptUrl = substr($line, strlen('GOOGLE_APPS_SCRIPT_URL='));
            $appsScriptUrl = trim($appsScriptUrl, "\"'");
            break;
        }
    }
}
if (!$appsScriptUrl) {
    fail(401, 'GOOGLE_APPS_SCRIPT_URL não configurada no .env');
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sheet = $_GET['sheet'] ?? '';
    $url = $appsScriptUrl . '?sheet=' . urlencode($sheet);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT => 30
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);
    echo $resp;
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail(405, 'Método não permitido');
}

$body = file_get_contents('php://input');
if (!$body) {
    fail(400, 'Body vazio');
}

$ch = curl_init($appsScriptUrl);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json']
]);
$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    fail(502, 'Erro de rede: ' . $curlError);
}

http_response_code($httpCode);
echo $resp;

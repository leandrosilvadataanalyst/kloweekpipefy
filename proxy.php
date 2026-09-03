<?php
/**
 * Proxy PHP para XAMPP
 * Redireciona chamadas API para o Flask backend (porta 5000)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$FLASK_BASE_URL = 'http://localhost:5000';

$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);

$path = preg_replace('#^/kloweekpipefy/proxy\.php#', '', $path);
$path = preg_replace('#^/kloweekpipefy#', '', $path);

if (empty($path) || $path === '/') {
    $path = '/';
}

$apiUrl = $FLASK_BASE_URL . $path;

$queryString = $_SERVER['QUERY_STRING'];
if ($queryString) {
    $apiUrl .= '?' . $queryString;
}

$ch = curl_init();

curl_setopt_array($ch, [
    CURLOPT_URL => $apiUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CUSTOMREQUEST => $_SERVER['REQUEST_METHOD'],
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'Content-Type: application/json'
    ],
]);

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'HEAD') {
    $body = file_get_contents('php://input');
    if ($body) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
$curlErrno = curl_errno($ch);

curl_close($ch);

if ($curlErrno) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Backend indisponível',
        'message' => $curlError,
        'flask_url' => $apiUrl
    ]);
    exit();
}

http_response_code($httpCode);
echo $response;

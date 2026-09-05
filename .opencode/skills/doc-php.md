# Skill: Documentação PHP

## Descrição
Referência de PHP para o projeto kloweekpipefy. Foco em proxy, cURL, headers HTTP, e boas práticas para XAMPP e Vercel.

## Quando Usar
- Quando modificar `proxy.php`
- Quando criar novos endpoints PHP
- Quando tratar erros HTTP/cURL
- Quando configurar headers CORS

## Sintaxe Básica

### Variáveis
```php
$variavel = "valor";
$array = ['chave' => 'valor'];
```

### Condicionais
```php
if ($condicao) {
    // ...
} elseif ($outra_condicao) {
    // ...
} else {
    // ...
}
```

### Loops
```php
foreach ($array as $key => $value) {
    // ...
}

for ($i = 0; $i < 10; $i++) {
    // ...
}
```

### Funções
```php
function nomeFuncao($parametro1, $parametro2 = 'default') {
    return $resultado;
}
```

### Classes
```php
class MinhaClasse {
    public $propriedade;
    
    public function __construct($valor) {
        $this->propriedade = $valor;
    }
    
    public function metodo() {
        return $this->propriedade;
    }
}
```

## Headers HTTP

### Headers CORS
```php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');
```

### Handle Preflight
```php
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
```

### Retornar JSON
```php
header('Content-Type: application/json; charset=utf-8');
http_response_code(200);
echo json_encode($dados);

// Erro
http_response_code(400);
echo json_encode(['error' => 'Mensagem de erro']);
```

## cURL

### Requisição GET
```php
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 60,
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
$curlErrno = curl_errno($ch);
curl_close($ch);
```

### Requisição POST
```php
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'POST',
    CURLOPT_POSTFIELDS => json_encode($data),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $token
    ],
]);
$response = curl_exec($ch);
curl_close($ch);
```

### Tratamento de Erros
```php
if ($curlErrno) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Backend indisponível',
        'message' => $curlError
    ]);
    exit();
}
```

## Superglobais

### Request
```php
// Método HTTP
$_SERVER['REQUEST_METHOD']

// URL
$_SERVER['REQUEST_URI']

// Query string
$_SERVER['QUERY_STRING']

// Headers
$_SERVER['HTTP_AUTHORIZATION']

// Body (POST/PUT)
$body = file_get_contents('php://input');
$json = json_decode($body, true);
```

### Response
```php
http_response_code(200);
header('Content-Type: application/json');
echo json_encode($data);
```

## Boas Práticas

### Segurança
- Nunca confiar em input do usuário
- Validar e sanitizar dados
- Usar `json_decode` com `true` para arrays
- Tratar erros de JSON

### Performance
- Usar `CURLOPT_TIMEOUT` para evitar hanging
- Fechar conexões cURL sempre
- Usar `CURLOPT_FOLLOWLOCATION` com cuidado

### Debug
```php
error_log('Mensagem de debug');
var_dump($variavel);
print_r($array);
```

## Exemplo Completo - Proxy
```php
<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$FLASK_BASE_URL = 'http://localhost:5000';
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^/kloweekpipefy/proxy\.php#', '', $path);

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
]);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    $body = file_get_contents('php://input');
    if ($body) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'Backend indisponível', 'message' => $curlError]);
    exit();
}

http_response_code($httpCode);
echo $response;
```

## Referências
- PHP Manual: https://www.php.net/docs.php
- cURL PHP: https://www.php.net/curl

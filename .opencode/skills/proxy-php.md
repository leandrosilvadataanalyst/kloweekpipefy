# Skill: Proxy PHP - Proteção de Chaves

## Descrição
Configuração do proxy PHP para proteger chaves de API no XAMPP e garantir compatibilidade com deploy na Vercel. Nunca expor chaves no frontend.

## Quando Usar
- Quando precisar fazer chamadas API que requerem chaves secretas
- Quando precisar configurar o proxy para novos endpoints
- Quando houver problemas de CORS ou autenticação
- Antes de fazer deploy na Vercel

## Arquitetura
```
Frontend (JS) → proxy.php → Flask Backend (porta 5000) → Pipefy API
                ↑
         Protege chaves
```

## Regras de Segurança

### NUNCA fazer:
- ❌ Expor `PIPEFY_CLIENT_SECRET` no HTML/JS
- ❌ Chamar API do Pipefy diretamente do frontend
- ❌ Colocar chaves em arquivos estáticos
- ❌ Committar `.env` no repositório (usar `.gitignore`)

### SEMPRE fazer:
- ✅ Usar proxy.php para todas as chamadas API
- ✅ Ler chaves de variáveis de ambiente
- ✅ Validar método HTTP antes de proxy
- ✅ Tratar erros de CORS adequadamente

## Configuração do .htaccess
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ proxy.php/api/$1 [L,QSA]
```

## Estrutura do proxy.php
```php
<?php
// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// URL do Flask backend
$FLASK_BASE_URL = 'http://localhost:5000';

// Extrair path da requisição
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^/kloweekpipefy/proxy\.php#', '', $path);

// Construir URL do backend
$apiUrl = $FLASK_BASE_URL . $path;

// Adicionar query string
$queryString = $_SERVER['QUERY_STRING'];
if ($queryString) {
    $apiUrl .= '?' . $queryString;
}

// Fazer requisição via cURL
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $apiUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CUSTOMREQUEST => $_SERVER['REQUEST_METHOD'],
]);

// Forward body para POST/PUT
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    $body = file_get_contents('php://input');
    if ($body) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($httpCode);
echo $response;
```

## Deploy na Vercel

### vercel.json
```json
{
  "version": 2,
  "builds": [
    {"src": "api/index.py", "use": "@vercel/python"},
    {"src": "static/**", "use": "@vercel/static"}
  ],
  "routes": [
    {"src": "/api/(.*)", "dest": "api/index.py"},
    {"src": "/static/(.*)", "dest": "/static/$1"},
    {"src": "/(.*)", "dest": "/"}
  ]
}
```

### Variáveis de Ambiente na Vercel
Configurar no painel da Vercel:
- `PIPEFY_CLIENT_ID`
- `PIPEFY_CLIENT_SECRET`
- `PIPEFY_REDIRECT_URI`
- `FLASK_SECRET_KEY`

## Checklist de Segurança
- [ ] `.env` está no `.gitignore`
- [ ] Chaves não aparecem no HTML fonte
- [ ] Proxy valida método HTTP
- [ ] CORS configurado corretamente
- [ ] Timeout configurado para evitar hanging
- [ ] Erros são tratados adequadamente

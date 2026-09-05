# Skill: Documentação Python/Flask

## Descrição
Referência de Python e Flask para o backend do projeto kloweekpipefy. Foco em rotas, controllers, services, models, e boas práticas MVC.

## Quando Usar
- Quando criar/modificar rotas Flask
- Quando criar controllers ou services
- Quando manipular dados do Pipefy
- Quando configurar o app Flask

## Estrutura do Projeto (MVC)
```
kloweekpipefy/
├── app.py              # Rotas Flask (entry point)
├── config.py           # Configurações centralizadas
├── controllers/        # Lógica de controle
│   ├── dashboard_controller.py
│   ├── pipefy_controller.py
│   └── roi_report_controller.py
├── models/             # Modelos de dados
│   ├── cliente.py
│   ├── projeto.py
│   └── saude_cliente.py
├── services/           # Serviços/lógica de negócio
│   ├── pipefy_service.py
│   └── normalizer_service.py
├── templates/          # Templates Jinja2
│   ├── base.html
│   ├── index.html
│   └── roi.html
└── static/             # Arquivos estáticos
    ├── css/
    └── js/
```

## Flask Básico

### Rotas
```python
from flask import Flask, render_template, jsonify, request, session

app = Flask(__name__)

# Rota simples
@app.route('/')
def index():
    return render_template('index.html')

# Rota com parâmetro
@app.route('/cliente/<id>')
def cliente(id):
    return jsonify({'id': id})

# Rota com query params
@app.route('/api/buscar')
def buscar():
    termo = request.args.get('q', '')
    return jsonify({'termo': termo})

# Rota POST
@app.route('/api/salvar', methods=['POST'])
def salvar():
    dados = request.get_json()
    return jsonify({'sucesso': True})
```

### Templates Jinja2
```python
# Renderizar template com dados
@app.route('/dashboard')
def dashboard():
    dados = {'clientes': [...], 'metricas': {...}}
    return render_template('index.html', data=dados)
```

### Sessão
```python
from flask import session

# Salvar na sessão
session['chave'] = valor

# Ler da sessão
valor = session.get('chave', default)

# Remover
session.pop('chave', None)
```

### Respostas JSON
```python
from flask import jsonify

# Sucesso
return jsonify(dados)

# Com status code
return jsonify({'erro': 'mensagem'}), 400

# Lista
return jsonify({'clientes': [c.to_dict() for c in clientes]})
```

## Models

### Modelo Simples
```python
class Cliente:
    def __init__(self, id, nome_fantasia, squad=None, dupla=None):
        self.id = id
        self.nome_fantasia = nome_fantasia
        self.squad = squad
        self.dupla = dupla
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome_fantasia': self.nome_fantasia,
            'squad': self.squad,
            'dupla': self.dupla
        }
```

### Modelo com Lógica
```python
class SaudeCliente:
    def __init__(self, cliente_id, investimento_midia=0, mc=0, faturamento=0):
        self.cliente_id = cliente_id
        self.investimento_midia = investimento_midia
        self.mc = mc
        self.faturamento = faturamento
    
    def calcular_roi(self):
        if self.investimento_midia == 0:
            return 0
        return ((self.faturamento - self.investimento_midia) / self.investimento_midia) * 100
    
    def classificar_status(self):
        roi = self.calcular_roi()
        if roi >= 50:
            return 'safe'
        elif roi >= 0:
            return 'care'
        else:
            return 'danger'
    
    def to_dict(self):
        return {
            'cliente_id': self.cliente_id,
            'investimento_midia': self.investimento_midia,
            'roi': self.calcular_roi(),
            'status': self.classificar_status()
        }
```

## Services

### Service com Injeção de Dependência
```python
class PipefyService:
    def __init__(self, access_token=None):
        self.access_token = access_token
        self.api_url = Config.PIPEFY_API_URL
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}' if access_token else None
        }
    
    def execute_query(self, query, variables=None):
        payload = {'query': query}
        if variables:
            payload['variables'] = variables
        
        response = requests.post(
            self.api_url,
            json=payload,
            headers=self.headers
        )
        
        if response.status_code == 200:
            return response.json()
        return {'errors': [{'message': f'HTTP {response.status_code}'}]}
```

## Controllers

### Controller Estático
```python
class DashboardController:
    @staticmethod
    def get_dashboard_data(pipe_id=None):
        access_token = session.get('pipefy_access_token')
        
        if not access_token:
            return DashboardController._dados_demo()
        
        pipefy_service = PipefyService(access_token)
        # ... lógica
        
        return {'metricas': metricas, 'clientes': clientes}
```

## Configuração

### config.py
```python
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key')
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    PIPEFY_CLIENT_ID = os.getenv('PIPEFY_CLIENT_ID')
    PIPEFY_CLIENT_SECRET = os.getenv('PIPEFY_CLIENT_SECRET')
    PIPEFY_API_URL = 'https://api.pipefy.com/graphql'
```

### .env
```env
PIPEFY_CLIENT_ID=seu_id
PIPEFY_CLIENT_SECRET=seu_secret
FLASK_SECRET_KEY=sua_chave
FLASK_DEBUG=True
```

## Deploy Vercel

### api/index.py
```python
from flask import Flask
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

from app import app as application
```

## Boas Práticas

### Separar Responsabilidades
- **Model:** estrutura de dados e lógica pura
- **Service:** comunicação externa (API, banco)
- **Controller:** orquestração e regras de negócio
- **Route:** apenas definir endpoints

### Tratar Erros
```python
try:
    dados = pipefy_service.get_cards(pipe_id)
except Exception as e:
    return jsonify({'erro': str(e)}), 500
```

### Usar Type Hints
```python
def calcular_roi(investimento: float, faturamento: float) -> float:
    if investimento == 0:
        return 0.0
    return ((faturamento - investimento) / investimento) * 100
```

### Evitar Lógica nos Templates
- Processar dados no controller
- Template apenas para renderizar
- Usar filtros Jinja2 para formatação

## Referências
- Flask: https://flask.palletsprojects.com/
- Jinja2: https://jinja.palletsprojects.com/
- Python: https://docs.python.org/3/

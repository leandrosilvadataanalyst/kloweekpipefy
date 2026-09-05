# Skill: Testes Unitários

## Descrição
Workflow de testes unitários usando pytest. Antes de cada implementação, rodar testes existentes e criar novos para validar a hipótese. Garante previsibilidade e evita bugs em funcionalidades validadas.

## Quando Usar
- ANTES de implementar qualquer nova feature
- ANTES de modificar código existente
- APÓS corrigir um bug (criar teste que reproduz o bug)
- Para validar lógica de negócio complexa

## Fluxo Obrigatório

```
1. Rodar testes existentes → garantir que passam
2. Criar teste para a nova feature (TDD)
3. Implementar feature
4. Rodar testes novamente → todos devem passar
5. Registrar no context-log
```

## Comandos

### Rodar todos os testes
```bash
pytest
```

### Rodar com verbose
```bash
pytest -v
```

### Rodar com cobertura
```bash
pytest --cov=models --cov=services --cov=controllers
```

### Rodar teste específico
```bash
pytest tests/test_saude_cliente.py -v
```

### Rodar teste que falhou
```bash
pytest -x  # Para no primeiro erro
```

## Estrutura de Testes
```
tests/
├── __init__.py
├── conftest.py          # Fixtures compartilhadas
├── test_models/
│   ├── __init__.py
│   ├── test_cliente.py
│   ├── test_saude_cliente.py
│   └── test_projeto.py
├── test_services/
│   ├── __init__.py
│   ├── test_pipefy_service.py
│   └── test_normalizer_service.py
└── test_controllers/
    ├── __init__.py
    ├── test_dashboard_controller.py
    └── test_roi_report_controller.py
```

## Fixtures (conftest.py)
```python
import pytest
from models.cliente import Cliente
from models.saude_cliente import SaudeCliente

@pytest.fixture
def cliente_exemplo():
    return Cliente(
        id="123",
        nome_fantasia="Empresa Teste",
        squad="Drakkar",
        dupla="Dupla A"
    )

@pytest.fixture
def saude_cliente_exemplo():
    return SaudeCliente(
        cliente_id="123",
        investimento_midia=5000.0,
        mc=15.0,
        faturamento=20000.0,
        fee_atualizado=3000.0
    )

@pytest.fixture
def dados_pipefy_mock():
    return {
        'data': {
            'cards': {
                'edges': [
                    {
                        'node': {
                            'id': '123',
                            'title': 'Empresa Teste',
                            'fields': [
                                {'name': 'nome_fantasia', 'value': 'Empresa Teste'},
                                {'name': 'squad', 'value': 'Drakkar'},
                                {'name': 'investimento_midia', 'value': '5000'},
                                {'name': 'faturamento', 'value': '20000'}
                            ]
                        }
                    }
                ]
            }
        }
    }
```

## Exemplo de Teste - Model
```python
# tests/test_models/test_saude_cliente.py
from models.saude_cliente import SaudeCliente

def test_calcular_roi_faturamento_positivo():
    saude = SaudeCliente(
        cliente_id="1",
        investimento_midia=1000,
        faturamento=5000
    )
    assert saude.calcular_roi() == 400.0

def test_calcular_roi_investimento_zero():
    saude = SaudeCliente(
        cliente_id="1",
        investimento_midia=0,
        faturamento=5000
    )
    assert saude.calcular_roi() == 0

def test_classificar_status_safe():
    saude = SaudeCliente(
        cliente_id="1",
        investimento_midia=1000,
        faturamento=5000
    )
    assert saude.classificar_status() == 'safe'

def test_classificar_status_danger():
    saude = SaudeCliente(
        cliente_id="1",
        investimento_midia=5000,
        faturamento=0
    )
    assert saude.classificar_status() == 'danger'
```

## Exemplo de Teste - Service
```python
# tests/test_services/test_normalizer_service.py
from services.normalizer_service import NormalizerService

def test_parse_currency_with_symbol():
    assert NormalizerService._parse_currency('R$ 1.500,50') == 1500.50

def test_parse_currency_plain_number():
    assert NormalizerService._parse_currency('1500.50') == 1500.50

def test_parse_percentage():
    assert NormalizerService._parse_percentage('15,5%') == 15.5

def test_normalize_pipefy_data_vazio():
    result = NormalizerService.normalize_pipefy_data(None)
    assert result == []

def test_normalize_pipefy_data_com_dados(dados_pipefy_mock):
    clientes = NormalizerService.normalize_pipefy_data(dados_pipefy_mock)
    assert len(clientes) == 1
    assert clientes[0].nome_fantasia == 'Empresa Teste'
```

## Exemplo de Teste - Controller
```python
# tests/test_controllers/test_roi_report_controller.py
from controllers.roi_report_controller import RoiReportController

def test_cruzar_clientes_com_saude():
    clientes = [
        {'id': '1', 'nome_fantasia': 'Cliente A', 'squad': 'Drakkar'},
        {'id': '2', 'nome_fantasia': 'Cliente B', 'squad': 'Eagle'}
    ]
    saude = [
        {'cliente_id': '1', 'investimento_midia': 5000, 'faturamento': 20000}
    ]
    
    preenchidos, faltantes = RoiReportController.cruzar_dados(clientes, saude)
    
    assert len(preenchidos) == 1
    assert len(faltantes) == 1
    assert faltantes[0]['nome_fantasia'] == 'Cliente B'
```

## Regras
1. **NUNCA** pular testes antes de implementar
2. **SEMPRE** criar teste que reproduce o bug antes de corrigir
3. Testes devem ser independentes (não depender de ordem)
4. Usar nomes descritivos: `test_[o_que_testa]_[cenario]`
5. Cobertura mínima: 80% para models e services

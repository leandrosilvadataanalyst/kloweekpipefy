import pytest
from services.normalizer_service import NormalizerService


def test_parse_currency_com_simbolo():
    assert NormalizerService._parse_currency('R$ 1.500,50') == 1500.50


def test_parse_currency_numero_simples():
    assert NormalizerService._parse_currency('1500,50') == 1500.50


def test_parse_currency_zero():
    assert NormalizerService._parse_currency('0') == 0.0


def test_parse_currency_valor_invalido():
    assert NormalizerService._parse_currency('abc') == 0.0


def test_parse_currency_none():
    assert NormalizerService._parse_currency(None) == 0.0


def test_parse_currency_numero():
    assert NormalizerService._parse_currency(1500) == 1500.0


def test_parse_percentage_com_simbolo():
    assert NormalizerService._parse_percentage('15,5%') == 15.5


def test_parse_percentage_numero_simples():
    assert NormalizerService._parse_percentage('15.5') == 15.5


def test_parse_percentage_zero():
    assert NormalizerService._parse_percentage('0') == 0.0


def test_parse_percentage_invalido():
    assert NormalizerService._parse_percentage('abc') == 0.0


def test_normalize_pipefy_data_vazio():
    resultado = NormalizerService.normalize_pipefy_data(None)
    assert resultado == []


def test_normalize_pipefy_data_sem_data():
    resultado = NormalizerService.normalize_pipefy_data({})
    assert resultado == []


def test_normalize_pipefy_data_com_dados():
    dados = {
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
                                {'name': 'dupla', 'value': 'Dupla A'}
                            ]
                        }
                    }
                ]
            }
        }
    }
    
    clientes = NormalizerService.normalize_pipefy_data(dados)
    
    assert len(clientes) == 1
    assert clientes[0].id == '123'
    assert clientes[0].nome_fantasia == 'Empresa Teste'
    assert clientes[0].squad == 'Drakkar'
    assert clientes[0].dupla == 'Dupla A'


def test_normalize_saude_cliente_vazio():
    resultado = NormalizerService.normalize_saude_cliente(None)
    assert resultado == []


def test_normalize_saude_cliente_com_dados():
    dados = {
        'data': {
            'cards': {
                'edges': [
                    {
                        'node': {
                            'id': '456',
                            'title': 'Cliente Health',
                            'fields': [
                                {'name': 'investimento_midia', 'value': '5000'},
                                {'name': 'mc', 'value': '15'},
                                {'name': 'faturamento', 'value': '20000'},
                                {'name': 'fee_atualizado', 'value': '3000'}
                            ]
                        }
                    }
                ]
            }
        }
    }
    
    saude = NormalizerService.normalize_saude_cliente(dados)
    
    assert len(saude) == 1
    assert saude[0].cliente_id == '456'
    assert saude[0].investimento_midia == 5000.0
    assert saude[0].mc == 15.0
    assert saude[0].faturamento == 20000.0
    assert saude[0].fee_atualizado == 3000.0


def test_calcular_metricas_vazio():
    metricas = NormalizerService.calcular_metricas([], [])
    assert metricas['total_clientes_ativos'] == 0


def test_calcular_metricas_com_dados():
    from models.cliente import Cliente
    from models.saude_cliente import SaudeCliente
    
    clientes = [
        Cliente(id="1", nome_fantasia="A", squad="Drakkar"),
        Cliente(id="2", nome_fantasia="B", squad="Eagle")
    ]
    
    saude = [
        SaudeCliente(cliente_id="1", investimento_midia=1000, faturamento=5000, fee_atualizado=500),
        SaudeCliente(cliente_id="2", investimento_midia=2000, faturamento=3000, fee_atualizado=300)
    ]
    
    metricas = NormalizerService.calcular_metricas(clientes, saude)
    
    assert metricas['total_clientes_ativos'] == 2
    assert metricas['total_investimento'] == 3000
    assert metricas['total_faturamento'] == 8000
    assert metricas['status_count']['safe'] > 0

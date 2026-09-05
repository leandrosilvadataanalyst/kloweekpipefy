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


@pytest.fixture
def lista_clientes():
    return [
        Cliente(id="1", nome_fantasia="Cliente A", squad="Drakkar", dupla="Dupla A"),
        Cliente(id="2", nome_fantasia="Cliente B", squad="Eagle", dupla="Dupla B"),
        Cliente(id="3", nome_fantasia="Cliente C", squad="Growth", dupla="Dupla C"),
    ]


@pytest.fixture
def lista_saude():
    return [
        SaudeCliente(cliente_id="1", investimento_midia=5000, faturamento=20000, fee_atualizado=3000),
        SaudeCliente(cliente_id="2", investimento_midia=0, faturamento=0, fee_atualizado=0),
    ]

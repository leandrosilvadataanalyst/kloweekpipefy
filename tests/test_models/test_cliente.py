import pytest
from models.cliente import Cliente


def test_cliente_criacao():
    cliente = Cliente(id="1", nome_fantasia="Empresa Teste", squad="Drakkar", dupla="Dupla A")
    assert cliente.id == "1"
    assert cliente.nome_fantasia == "Empresa Teste"
    assert cliente.squad == "Drakkar"
    assert cliente.dupla == "Dupla A"


def test_cliente_valores_padrao():
    cliente = Cliente(id="2", nome_fantasia="Outra Empresa")
    assert cliente.squad is None
    assert cliente.dupla is None


def test_cliente_to_dict():
    cliente = Cliente(id="3", nome_fantasia="Teste Corp", squad="Eagle", dupla="Dupla B")
    resultado = cliente.to_dict()
    
    assert resultado == {
        'id': '3',
        'nome_fantasia': 'Teste Corp',
        'squad': 'Eagle',
        'dupla': 'Dupla B'
    }


def test_cliente_to_dict_sem_opcionais():
    cliente = Cliente(id="4", nome_fantasia="Sem Opcionais")
    resultado = cliente.to_dict()
    
    assert resultado['squad'] is None
    assert resultado['dupla'] is None

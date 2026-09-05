import pytest
from models.projeto import Projeto


def test_criacao_projeto():
    projeto = Projeto(id="1", nome="Projeto Alpha", squad="Drakkar", status="ativo")
    assert projeto.id == "1"
    assert projeto.nome == "Projeto Alpha"
    assert projeto.squad == "Drakkar"
    assert projeto.status == "ativo"


def test_valores_padrao():
    projeto = Projeto(id="2", nome="Projeto Beta", squad="Eagle")
    assert projeto.status is None


def test_to_dict():
    projeto = Projeto(id="3", nome="Projeto Gamma", squad="Growth", status="concluido")
    resultado = projeto.to_dict()
    
    assert resultado == {
        'id': '3',
        'nome': 'Projeto Gamma',
        'squad': 'Growth',
        'status': 'concluido'
    }

import pytest
from controllers.dashboard_controller import DashboardController


def test_dados_demo():
    data = DashboardController._dados_demo()
    assert 'metricas' in data
    assert 'clientes' in data
    assert 'saude_clientes' in data
    assert data['metricas']['total_clientes_ativos'] == 24


def test_dados_demo_metricas():
    data = DashboardController._dados_demo()
    metricas = data['metricas']
    
    assert metricas['total_investimento'] == 45000.00
    assert metricas['total_faturamento'] == 125000.00
    assert 'safe' in metricas['status_count']
    assert 'care' in metricas['status_count']
    assert 'danger' in metricas['status_count']


def test_dados_demo_clientes():
    data = DashboardController._dados_demo()
    clientes = data['clientes']
    
    assert len(clientes) > 0
    assert 'id' in clientes[0]
    assert 'nome_fantasia' in clientes[0]
    assert 'squad' in clientes[0]

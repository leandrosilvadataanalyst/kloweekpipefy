import pytest
from controllers.roi_report_controller import RoiReportController


def test_cruzar_dados_completo():
    from models.cliente import Cliente
    from models.saude_cliente import SaudeCliente
    
    clientes = [
        Cliente(id="1", nome_fantasia="Cliente A", squad="Drakkar"),
        Cliente(id="2", nome_fantasia="Cliente B", squad="Eagle"),
        Cliente(id="3", nome_fantasia="Cliente C", squad="Growth")
    ]
    
    saude = [
        SaudeCliente(cliente_id="1", investimento_midia=5000, faturamento=20000, fee_atualizado=3000)
    ]
    
    preenchidos, faltantes = RoiReportController._cruzar_dados(clientes, saude)
    
    assert len(preenchidos) == 1
    assert len(faltantes) == 2
    assert preenchidos[0]['nome_fantasia'] == 'Cliente A'


def test_cruzar_dados_todos_preenchidos():
    from models.cliente import Cliente
    from models.saude_cliente import SaudeCliente
    
    clientes = [
        Cliente(id="1", nome_fantasia="A", squad="Drakkar"),
        Cliente(id="2", nome_fantasia="B", squad="Eagle")
    ]
    
    saude = [
        SaudeCliente(cliente_id="1", investimento_midia=1000, faturamento=5000),
        SaudeCliente(cliente_id="2", investimento_midia=2000, faturamento=8000)
    ]
    
    preenchidos, faltantes = RoiReportController._cruzar_dados(clientes, saude)
    
    assert len(preenchidos) == 2
    assert len(faltantes) == 0


def test_cruzar_dados_nenhum_preenchido():
    from models.cliente import Cliente
    
    clientes = [
        Cliente(id="1", nome_fantasia="A", squad="Drakkar"),
        Cliente(id="2", nome_fantasia="B", squad="Eagle")
    ]
    
    preenchidos, faltantes = RoiReportController._cruzar_dados(clientes, [])
    
    assert len(preenchidos) == 0
    assert len(faltantes) == 2


def test_tem_dados_roi_com_dados():
    saude = {'investimento_midia': 5000, 'faturamento': 20000}
    assert RoiReportController._tem_dados_roi(saude) is True


def test_tem_dados_roi_sem_dados():
    saude = {'investimento_midia': 0, 'mc': 0, 'faturamento': 0, 'fee_atualizado': 0}
    assert RoiReportController._tem_dados_roi(saude) is False


def test_gerar_mensagem_padrao_demo():
    data = RoiReportController._dados_demo()
    faltantes = data['faltantes']
    assert len(faltantes) > 0
    assert faltantes[0]['nome_fantasia'] == 'MOTIVE SALES LLC'


def test_gerar_mensagem_padrao_filtro_squad():
    data = RoiReportController._dados_demo()
    faltantes_drakkar = [f for f in data['faltantes'] if f.get('squad') == 'Drakkar']
    assert len(faltantes_drakkar) == 2
    assert faltantes_drakkar[0]['nome_fantasia'] == 'MOTIVE SALES LLC'


def test_dados_demo():
    data = RoiReportController._dados_demo()
    assert 'metricas' in data
    assert 'preenchidos' in data
    assert 'faltantes' in data
    assert data['metricas']['total_clientes'] == 8

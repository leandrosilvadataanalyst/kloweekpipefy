import pytest
from models.saude_cliente import SaudeCliente


def test_criacao_saude_cliente():
    saude = SaudeCliente(
        cliente_id="1",
        investimento_midia=5000.0,
        mc=15.0,
        faturamento=20000.0,
        fee_atualizado=3000.0
    )
    assert saude.cliente_id == "1"
    assert saude.investimento_midia == 5000.0
    assert saude.mc == 15.0
    assert saude.faturamento == 20000.0
    assert saude.fee_atualizado == 3000.0


def test_valores_padrao():
    saude = SaudeCliente(cliente_id="2")
    assert saude.investimento_midia == 0
    assert saude.mc == 0
    assert saude.faturamento == 0
    assert saude.fee_atualizado == 0


def test_calcular_roi_positivo():
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


def test_calcular_roi_negativo():
    saude = SaudeCliente(
        cliente_id="1",
        investimento_midia=5000,
        faturamento=1000
    )
    assert saude.calcular_roi() == -80.0


def test_calcular_mmf():
    saude = SaudeCliente(
        cliente_id="1",
        faturamento=10000,
        fee_atualizado=2000
    )
    assert saude.calcular_mmf() == 0.2


def test_calcular_mmf_faturamento_zero():
    saude = SaudeCliente(
        cliente_id="1",
        faturamento=0,
        fee_atualizado=2000
    )
    assert saude.calcular_mmf() == 0


def test_classificar_status_safe():
    saude = SaudeCliente(
        cliente_id="1",
        investimento_midia=1000,
        faturamento=5000
    )
    assert saude.classificar_status() == 'safe'


def test_classificar_status_care():
    saude = SaudeCliente(
        cliente_id="1",
        investimento_midia=1000,
        faturamento=1200
    )
    assert saude.classificar_status() == 'care'


def test_classificar_status_danger():
    saude = SaudeCliente(
        cliente_id="1",
        investimento_midia=5000,
        faturamento=0
    )
    assert saude.classificar_status() == 'danger'


def test_to_dict():
    saude = SaudeCliente(
        cliente_id="1",
        investimento_midia=5000,
        mc=15,
        faturamento=20000,
        fee_atualizado=3000
    )
    resultado = saude.to_dict()
    
    assert resultado['cliente_id'] == "1"
    assert resultado['investimento_midia'] == 5000
    assert resultado['mc'] == 15
    assert resultado['faturamento'] == 20000
    assert resultado['fee_atualizado'] == 3000
    assert resultado['roi'] == 300.0
    assert resultado['status'] == 'safe'

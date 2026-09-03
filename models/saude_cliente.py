class SaudeCliente:
    def __init__(self, cliente_id, investimento_midia=0, mc=0, faturamento=0, fee_atualizado=0):
        self.cliente_id = cliente_id
        self.investimento_midia = investimento_midia
        self.mc = mc
        self.faturamento = faturamento
        self.fee_atualizado = fee_atualizado
    
    def calcular_roi(self):
        if self.investimento_midia == 0:
            return 0
        return ((self.faturamento - self.investimento_midia) / self.investimento_midia) * 100
    
    def calcular_mmf(self):
        if self.faturamento == 0:
            return 0
        return self.fee_atualizado / self.faturamento
    
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
            'mc': self.mc,
            'faturamento': self.faturamento,
            'fee_atualizado': self.fee_atualizado,
            'roi': self.calcular_roi(),
            'mmf': self.calcular_mmf(),
            'status': self.classificar_status()
        }

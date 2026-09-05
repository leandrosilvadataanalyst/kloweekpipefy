export class Cliente {
    constructor(id, nome, squad, dupla) {
        this.id = id;
        this.nome = nome;
        this.squad = squad;
        this.dupla = dupla;
    }
}

export class SaudeCliente {
    constructor(clienteId, investimento, mc, faturamento, fee) {
        this.clienteId = clienteId;
        this.investimento = investimento;
        this.mc = mc;
        this.faturamento = faturamento;
        this.fee = fee;
    }

    calcularROI() {
        if (this.investimento === 0) return 0;
        return ((this.faturamento - this.investimento) / this.investimento) * 100;
    }

    classificarStatus() {
        const roi = this.calcularROI();
        if (roi >= 50) return 'safe';
        if (roi >= 0) return 'care';
        return 'danger';
    }
}

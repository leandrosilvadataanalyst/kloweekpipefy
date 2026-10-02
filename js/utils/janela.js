// Janela de preenchimento do ROI Week (dias do mês em que os GTs preenchem o card).
// Fonte: tabela config_janela no Supabase — linha 'padrao' + exceções por mês ('YYYY-MM').
// Sem configuração (ou tabela ausente) vale o padrão histórico 01 a 03.

export const JANELA_PADRAO = Object.freeze({ inicio: 1, fim: 3 });

const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

function diaValido(d) {
    return Number.isInteger(d) && d >= 1 && d <= 31;
}

export function validarJanela({ inicio, fim } = {}) {
    const i = Number(inicio), f = Number(fim);
    if (!diaValido(i)) return 'Dia de início inválido (1 a 31)';
    if (!diaValido(f)) return 'Dia de fim inválido (1 a 31)';
    if (f < i) return 'O dia de fim deve ser igual ou posterior ao de início';
    return '';
}

export function normalizarConfig(rows) {
    const config = { padrao: { ...JANELA_PADRAO, motivo: '' }, excecoes: {} };
    (rows || []).forEach(r => {
        const j = { inicio: Number(r?.dia_inicio), fim: Number(r?.dia_fim), motivo: r?.motivo || '' };
        if (validarJanela(j)) return;
        if (r.chave === 'padrao') config.padrao = j;
        else if (RE_MES.test(r.chave)) config.excecoes[r.chave] = j;
    });
    return config;
}

function ultimoDia(key) {
    const [ano, mes] = key.split('-').map(Number);
    return new Date(ano, mes, 0).getDate();
}

// key = 'YYYY-MM' do ROI Week (mês da coleta)
export function resolverJanela(config, key) {
    const cfg = config || normalizarConfig(null);
    const exc = cfg.excecoes?.[key];
    const base = exc || cfg.padrao || JANELA_PADRAO;
    const max = key && RE_MES.test(key) ? ultimoDia(key) : 31;
    return {
        inicio: Math.min(base.inicio, max),
        fim: Math.min(base.fim, max),
        origem: exc ? 'excecao' : 'padrao',
        motivo: base.motivo || ''
    };
}

// mesIndex 0-based, como em Date
export function estaNaJanela(data, janela, ano, mesIndex) {
    if (!(data instanceof Date) || isNaN(data)) return false;
    const ini = new Date(ano, mesIndex, janela.inicio, 0, 0, 0);
    const fim = new Date(ano, mesIndex, janela.fim, 23, 59, 59, 999);
    return data >= ini && data <= fim;
}

const dd = n => String(n).padStart(2, '0');

export function rotuloJanela(janela) {
    return `${dd(janela.inicio)} a ${dd(janela.fim)}`;
}

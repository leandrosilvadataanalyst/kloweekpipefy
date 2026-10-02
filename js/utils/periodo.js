import { resolverJanela, estaNaJanela, rotuloJanela } from './janela.js';

function fmtMesAno(d) {
    const mes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(d);
    return `${mes.charAt(0).toUpperCase()}${mes.slice(1)}/${d.getFullYear()}`;
}

function fmtMesCurto(d) {
    let m = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', '');
    return `${m.charAt(0).toUpperCase()}${m.slice(1)}/${d.getFullYear()}`;
}

function fmtData(d) {
    return new Intl.DateTimeFormat('pt-BR').format(d);
}

function ehVigente(mes) {
    const agora = new Date();
    return mes.getFullYear() === agora.getFullYear() && mes.getMonth() === agora.getMonth();
}

// Janela de preenchimento configurável (Supabase config_janela). Os controllers chamam
// definirConfigJanelas() após carregar; até lá vale o padrão 01 a 03.
let configJanelas = null;

export function definirConfigJanelas(config) {
    configJanelas = config;
}

export function getConfigJanelas() {
    return configJanelas;
}

function montarPeriodo(ano, mesIndex) {
    const mes = new Date(ano, mesIndex, 1);
    const agora = new Date();
    const vigente = ehVigente(mes);
    const fim = vigente ? agora : new Date(ano, mesIndex + 1, 0, 23, 59, 59);
    const referencia = new Date(ano, mesIndex - 1, 1);
    const key = `${ano}-${String(mesIndex + 1).padStart(2, '0')}`;
    const janela = resolverJanela(configJanelas, key);
    return Object.freeze({
        key,
        ano,
        mes: mesIndex,
        inicio: mes,
        fim,
        roiWeek: fmtMesAno(mes),
        referencia: fmtMesAno(referencia),
        roiWeekCurto: fmtMesCurto(mes),
        referenciaCurta: fmtMesCurto(referencia),
        opcao: `${fmtMesCurto(mes)} · Ref: ${fmtMesCurto(referencia)}${vigente ? ' (atual)' : ''}`,
        dataAtual: fmtData(agora),
        vigente,
        janela,                                   // { inicio, fim, origem: 'padrao'|'excecao', motivo }
        janelaRotulo: rotuloJanela(janela),       // "01 a 03"
        dentroJanela: vigente && estaNaJanela(agora, janela, ano, mesIndex),
        noPrazo: (d) => estaNaJanela(d, janela, ano, mesIndex),
        ehDoPeriodo: (d) => d instanceof Date && !isNaN(d) && d >= mes && d <= fim
    });
}

export function getPeriodoRoiWeek() {
    const agora = new Date();
    return montarPeriodo(agora.getFullYear(), agora.getMonth());
}

export function periodoDoMesOffset(offset) {
    const agora = new Date();
    return montarPeriodo(agora.getFullYear(), agora.getMonth() + offset);
}

export function periodoPorChave(chave) {
    const [ano, mes] = chave.split('-').map(Number);
    return montarPeriodo(ano, mes - 1);
}

export function periodosDisponiveis(roiLista) {
    const map = new Map();
    (roiLista || []).forEach(r => {
        const d = r?.data_obj;
        if (!d || !(d instanceof Date) || isNaN(d)) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        map.set(key, true);
    });
    const opts = [...map.keys()].sort().reverse().map(periodoPorChave);
    return opts.length ? opts : [getPeriodoRoiWeek()];
}

// Todas as telas abrem SEMPRE no ROI Week vigente, mesmo sem nenhum card ainda (início da janela).
// Consulta/exibição de histórico será redesenhada depois; `options` mantido por compatibilidade.
export function periodoPadrao(options) { // eslint-disable-line no-unused-vars
    return getPeriodoRoiWeek();
}

export function ehDoRoiWeekAtual(dataObj) {
    return getPeriodoRoiWeek().ehDoPeriodo(dataObj);
}
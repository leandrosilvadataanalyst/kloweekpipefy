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

function montarPeriodo(ano, mesIndex) {
    const mes = new Date(ano, mesIndex, 1);
    const agora = new Date();
    const vigente = ehVigente(mes);
    const fim = vigente ? agora : new Date(ano, mesIndex + 1, 0, 23, 59, 59);
    const referencia = new Date(ano, mesIndex - 1, 1);
    return Object.freeze({
        key: `${ano}-${String(mesIndex + 1).padStart(2, '0')}`,
        ano,
        mes: mesIndex,
        inicio: mes,
        fim,
        roiWeek: fmtMesAno(mes),
        referencia: fmtMesAno(referencia),
        opcao: `${fmtMesCurto(mes)} · Ref: ${fmtMesCurto(referencia)}${vigente ? ' (atual)' : ''}`,
        dataAtual: fmtData(agora),
        vigente,
        dentroJanela: vigente && agora.getDate() >= 1 && agora.getDate() <= 3,
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

export function periodoPadrao(options) {
    const vigente = getPeriodoRoiWeek();
    return options.find(o => o.key === vigente.key) || options[0] || vigente;
}

export function ehDoRoiWeekAtual(dataObj) {
    return getPeriodoRoiWeek().ehDoPeriodo(dataObj);
}
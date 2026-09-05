import { DashboardView } from '../views/dashboard-view.js';
import { PipefyService } from '../services/pipefy-service.js';
import { fetchAllCockpits } from '../sheets-service.js';
import { ExportService } from '../services/export-service.js';
import { getPeriodoRoiWeek, periodoPorChave, periodosDisponiveis, periodoPadrao } from '../utils/periodo.js';

let CLIENTES_ELEGIVEIS = [];
let roiDataStore = [];
let clientesConsolidados = [];
let metricas = {};
let topGTs = [];
let squadStats = [];
let chartData = {};
let mesesRetroativos = 3;
let periodoSelecionado = getPeriodoRoiWeek();

function testeMatch(cliente, r) {
    if (!r) return false;
    const cNomeLower = cliente.nome.toLowerCase();
    const projetoLower = (r.projeto || '').toLowerCase();
    const nomeLower = (r.cliente_nome || '').toLowerCase();
    return nomeLower.includes(cNomeLower) ||
        cNomeLower.includes(nomeLower) ||
        projetoLower.includes(cNomeLower) ||
        cNomeLower.includes(projetoLower);
}

function encontrarRoi(cliente, roiLista, periodo) {
    const matches = (roiLista || []).filter(r => testeMatch(cliente, r));
    return matches.find(r => periodo.ehDoPeriodo(r?.data_obj)) || matches[0] || undefined;
}

function calcularMetricasCliente(roi) {
    const faturamento = roi.faturamento || 0;
    const investimento = roi.investimento || 0;
    const mcRaw = roi.mc || 0;
    const vendas = roi.vendas || 0;
    const mcDec = mcRaw > 1 ? mcRaw / 100 : mcRaw;
    const roiVal = investimento > 0 ? (faturamento * mcDec) / investimento : 0;
    const roasVal = investimento > 0 ? faturamento / investimento : 0;
    const cacVal = vendas > 0 ? investimento / vendas : 0;
    return { roiVal, roasVal, cacVal, faturamento, investimento, mcRaw, vendas };
}

export function formatarMc(mc) {
    if (!mc || isNaN(mc)) return 0;
    return mc > 1 ? mc : mc * 100;
}

function calcularPrazo(dataObj, preenchido, periodo) {
    if (!preenchido || !dataObj || isNaN(dataObj)) return { status: 'Pendente', label: 'Pendente', classe: 'pendente' };
    const inicio = new Date(periodo.ano, periodo.mes, 1);
    const fim = new Date(periodo.ano, periodo.mes, 3, 23, 59, 59);
    if (dataObj >= inicio && dataObj <= fim) return { status: 'No prazo', label: 'No prazo', classe: 'prazo' };
    return { status: 'Fora do prazo', label: 'Fora do prazo', classe: 'fora' };
}

function processarDados(roiData, periodo) {
    return CLIENTES_ELEGIVEIS.map(c => {
        const roi = encontrarRoi(c, roiData, periodo);
        const temValores = !!(roi && (roi.investimento > 0 || roi.faturamento > 0 || roi.mc > 0));
        const preenchido = temValores && periodo.ehDoPeriodo(roi.data_obj);
        if (preenchido) {
            const { roiVal, roasVal, cacVal, faturamento, investimento } = calcularMetricasCliente(roi);
            const prazo = calcularPrazo(roi.data_obj, true, periodo);
            return {
                ...c,
                faturamento, investimento, mc: roi.mc, vendas: roi.vendas,
                roi: roiVal, roas: roasVal, cac: cacVal,
                preenchido: true,
                prazo: prazo.status,
                prazoClasse: prazo.classe,
                prazoLabel: prazo.label,
                card_url: roi.card_url || `https://app.pipefy.com/open-cards/${roi.cliente_id}`,
                data_obj: roi.data_obj,
                data_str: roi.data_atualizacao
            };
        }
        return {
            ...c,
            faturamento: 0, investimento: 0, mc: 0, vendas: 0, roi: 0, roas: 0, cac: 0,
            preenchido: false,
            prazo: 'Pendente', prazoClasse: 'pendente', prazoLabel: 'Pendente',
            card_url: '', data_obj: null, data_str: ''
        };
    });
}

function calcularMetricasGerais(lista) {
    const total = CLIENTES_ELEGIVEIS.length;
    const preenchidos = lista.filter(c => c.preenchido);
    const p = preenchidos.length;
    const f = total - p;
    const roiMaior1 = preenchidos.filter(c => c.roi > 1).length;
    const noPrazo = lista.filter(c => c.prazo === 'No prazo').length;
    const foraPrazo = preenchidos.filter(c => c.prazo === 'Fora do prazo').length;
    const roasMedio = p > 0 ? preenchidos.reduce((a, c) => a + c.roas, 0) / p : 0;
    const cacList = preenchidos.filter(c => c.cac > 0);
    const cacMedio = cacList.length > 0 ? cacList.reduce((a, c) => a + c.cac, 0) / cacList.length : 0;
    const roiMedio = p > 0 ? preenchidos.reduce((a, c) => a + c.roi, 0) / p : 0;
    const faturamentoTotal = preenchidos.reduce((a, c) => a + c.faturamento, 0);
    const investimentoTotal = preenchidos.reduce((a, c) => a + c.investimento, 0);
    const hoje = new Date();
    const dia = hoje.getDate();
    const dentroJanela = dia >= 1 && dia <= 3;
    const alertaPrazo = !dentroJanela && f > 0 ? `${f} cliente(s) pendente(s) fora da janela 01-03` : dentroJanela && f > 0 ? `Janela aberta (01-03): ${f} pendente(s)` : '';
    return {
        total_elegiveis: total, total_preenchidos: p, total_faltantes: f,
        pct_preenchimento: total > 0 ? (p / total) * 100 : 0,
        total_roi_maior_1: roiMaior1, pct_roi_maior_1: p > 0 ? (roiMaior1 / p) * 100 : 0,
        roas_medio: roasMedio, cac_medio: cacMedio, roi_medio: roiMedio,
        faturamento_total: faturamentoTotal, investimento_total: investimentoTotal,
        no_prazo: noPrazo, fora_prazo: foraPrazo,
        dia_atual: dia, dentro_janela: dentroJanela, alerta_prazo: alertaPrazo
    };
}

function calcularTopGTs(lista) {
    const preenchidos = lista.filter(c => c.preenchido && c.gt);
    const map = {};
    preenchidos.forEach(c => {
        const key = c.gt.trim();
        if (!map[key]) map[key] = { nome: c.gt, squad: c.squad, clientes: [], faturamento: 0 };
        map[key].clientes.push(c);
        map[key].faturamento += c.faturamento;
    });
    const gtLista = Object.values(map).map(g => {
        const avgRoi = g.clientes.reduce((a, c) => a + c.roi, 0) / g.clientes.length;
        const avgRoas = g.clientes.reduce((a, c) => a + c.roas, 0) / g.clientes.length;
        return { nome: g.nome, squad: g.squad, totalClientes: g.clientes.length, roiMedio: avgRoi, roasMedio: avgRoas, faturamento: g.faturamento };
    });
    return gtLista.sort((a, b) => b.roiMedio - a.roiMedio).slice(0, 5);
}

function calcularSquadStats(lista) {
    const squads = [...new Set(CLIENTES_ELEGIVEIS.map(c => c.squad))].filter(Boolean);
    return squads.map(squad => {
        const todos = lista.filter(c => c.squad === squad);
        const preenchidos = todos.filter(c => c.preenchido);
        const total = todos.length;
        const p = preenchidos.length;
        const roiMedio = p > 0 ? preenchidos.reduce((a, c) => a + c.roi, 0) / p : 0;
        const roasMedio = p > 0 ? preenchidos.reduce((a, c) => a + c.roas, 0) / p : 0;
        const faturamento = preenchidos.reduce((a, c) => a + c.faturamento, 0);
        const investimento = preenchidos.reduce((a, c) => a + c.investimento, 0);
        return { nome: squad, total, preenchidos: p, pctPreenchimento: total > 0 ? (p / total) * 100 : 0, roiMedio, roasMedio, faturamento, investimento };
    }).sort((a, b) => b.roiMedio - a.roiMedio);
}

function calcularCharts(lista, stats) {
    const preenchidos = lista.filter(c => c.preenchido);
    const porMes = {};
    preenchidos.forEach(c => {
        if (!c.data_obj) return;
        const key = `${c.data_obj.getFullYear()}-${String(c.data_obj.getMonth() + 1).padStart(2, '0')}`;
        if (!porMes[key]) porMes[key] = { roiSum: 0, roasSum: 0, count: 0, faturamento: 0, investimento: 0 };
        porMes[key].roiSum += c.roi;
        porMes[key].roasSum += c.roas;
        porMes[key].count += 1;
        porMes[key].faturamento += c.faturamento;
        porMes[key].investimento += c.investimento;
    });
    const mesesOrdenados = Object.keys(porMes).sort();
    const temporal = {
        labels: mesesOrdenados,
        roiMedio: mesesOrdenados.map(k => porMes[k].count ? porMes[k].roiSum / porMes[k].count : 0),
        roasMedio: mesesOrdenados.map(k => porMes[k].count ? porMes[k].roasSum / porMes[k].count : 0),
        faturamento: mesesOrdenados.map(k => porMes[k].faturamento)
    };
    const ordenados = [...preenchidos].sort((a, b) => b.roi - a.roi);
    const totalRoi = ordenados.reduce((a, c) => a + c.roi, 0) || 1;
    let acum = 0;
    const pareto = ordenados.map(c => {
        acum += c.roi;
        return { nome: c.nome, roi: c.roi, acumulado: (acum / totalRoi) * 100 };
    });
    const rois = preenchidos.map(c => c.roi).sort((a, b) => a - b);
    const n = rois.length;
    const mean = n ? rois.reduce((a, b) => a + b, 0) / n : 0;
    const median = n ? (n % 2 === 1 ? rois[Math.floor(n / 2)] : (rois[n / 2 - 1] + rois[n / 2]) / 2) : 0;
    const min = n ? rois[0] : 0;
    const max = n ? rois[n - 1] : 0;
    const variance = n ? rois.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / n : 0;
    const std = Math.sqrt(variance);
    const descritiva = { n, mean, median, min, max, std };
    const pizza = stats.map(s => ({ label: s.nome, value: s.preenchidos }));
    const barras = {
        labels: stats.map(s => s.nome.toUpperCase()),
        faturamento: stats.map(s => s.faturamento),
        investimento: stats.map(s => s.investimento)
    };
    return { temporal, pareto, descritiva, pizza, barras };
}

function gerarMensagemGTs(lista) {
    const faltantes = lista.filter(c => !c.preenchido);
    if (faltantes.length === 0) return 'Todos os clientes já preencheram o ROI Week!';
    const vigente = getPeriodoRoiWeek();
    const porGT = {};
    faltantes.forEach(c => {
        const gt = (c.gt || 'Sem GT').trim();
        if (!porGT[gt]) porGT[gt] = [];
        porGT[gt].push(c.nome);
    });
    let msg = `Olá! \n\nOs seguintes clientes ainda não preencheram o ROI Week ${vigente.roiWeek} (Ref: ${vigente.referencia}; janela 01-03):\n\n`;
    for (const [gt, nomes] of Object.entries(porGT).sort((a, b) => a[0].localeCompare(b[0]))) {
        msg += `${gt}:\n`;
        nomes.forEach(n => msg += `- ${n}\n`);
        msg += '\n';
    }
    msg += 'Por favor, preencham o mais breve possível.\n\nObrigado!';
    return msg;
}

function aplicarFiltros() {
    const busca = (document.getElementById('filtro-busca')?.value || '').toLowerCase().trim();
    const squad = document.getElementById('filtro-squad')?.value || '';
    const gt = document.getElementById('filtro-gt')?.value || '';
    const status = document.getElementById('filtro-status')?.value || '';
    const roiFiltro = document.getElementById('filtro-roi')?.value || '';
    const prazoFiltro = document.getElementById('filtro-prazo')?.value || '';
    return clientesConsolidados.filter(c => {
        if (busca && !c.nome.toLowerCase().includes(busca)) return false;
        if (squad && c.squad !== squad) return false;
        if (gt && c.gt !== gt) return false;
        if (status === 'preenchido' && !c.preenchido) return false;
        if (status === 'pendente' && c.preenchido) return false;
        if (roiFiltro === 'maior1' && !(c.preenchido && c.roi > 1)) return false;
        if (roiFiltro === 'menor1' && !(c.preenchido && c.roi <= 1)) return false;
        if (prazoFiltro === 'noprazo' && c.prazo !== 'No prazo') return false;
        if (prazoFiltro === 'fora' && c.prazo !== 'Fora do prazo') return false;
        if (prazoFiltro === 'pendente' && c.prazo !== 'Pendente') return false;
        return true;
    });
}

function render() {
    clientesConsolidados = processarDados(roiDataStore, periodoSelecionado);
    metricas = calcularMetricasGerais(clientesConsolidados);
    topGTs = calcularTopGTs(clientesConsolidados);
    squadStats = calcularSquadStats(clientesConsolidados);
    chartData = calcularCharts(clientesConsolidados, squadStats);

    const vigente = getPeriodoRoiWeek();
    const vigentes = processarDados(roiDataStore, vigente);
    const mensagem = gerarMensagemGTs(vigentes);
    const faltantesCount = vigentes.filter(c => !c.preenchido).length;

    const gtsList = [...new Set(clientesConsolidados.map(c => c.gt).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const squadsList = [...new Set(clientesConsolidados.map(c => c.squad).filter(Boolean))].sort();
    const periodoOptions = periodosDisponiveis(roiDataStore);

    const data = {
        metricas, topGTs, squadStats, squadsList, gtsList,
        mensagemGTs: mensagem, clientes: clientesConsolidados, faltantesCount,
        chartData,
        periodo: periodoSelecionado, periodoVigente: vigente,
        periodoOptions, periodoKey: periodoSelecionado.key
    };
    document.getElementById('app').innerHTML = DashboardView.render(data, mesesRetroativos);
    DashboardView.initCharts(chartData);
    const tbody = document.getElementById('tabela-resumo-body');
    const atualizarTabela = () => {
        const filtrados = aplicarFiltros();
        if (tbody) tbody.innerHTML = DashboardView.renderTabelaResumo(filtrados);
    };
    document.getElementById('filtro-busca')?.addEventListener('input', atualizarTabela);
    document.getElementById('filtro-squad')?.addEventListener('change', atualizarTabela);
    document.getElementById('filtro-gt')?.addEventListener('change', atualizarTabela);
    document.getElementById('filtro-status')?.addEventListener('change', atualizarTabela);
    document.getElementById('filtro-roi')?.addEventListener('change', atualizarTabela);
    document.getElementById('filtro-prazo')?.addEventListener('change', atualizarTabela);
    document.getElementById('filtro-periodo')?.addEventListener('change', e => {
        periodoSelecionado = periodoPorChave(e.target.value);
        render();
    });
    document.getElementById('btn-copiar')?.addEventListener('click', async () => {
        await navigator.clipboard.writeText(mensagem);
        const btn = document.getElementById('btn-copiar');
        const original = btn.innerHTML;
        btn.innerHTML = 'Copiado!';
        setTimeout(() => { btn.innerHTML = original; }, 2000);
    });
    document.getElementById('btn-recarregar')?.addEventListener('click', () => {
        const select = document.getElementById('filtro-meses');
        mesesRetroativos = parseInt(select.value);
        carregarDados(mesesRetroativos);
    });
    const getFiltradosExport = () => aplicarFiltros();
    document.getElementById('btn-export-json')?.addEventListener('click', () => ExportService.exportToJSON(getFiltradosExport(), 'relatorio_roi.json'));
    document.getElementById('btn-export-csv')?.addEventListener('click', () => ExportService.exportToCSV(getFiltradosExport(), 'relatorio_roi.csv'));
    document.getElementById('btn-export-excel')?.addEventListener('click', () => ExportService.exportToExcel(getFiltradosExport(), 'relatorio_roi.xls'));
}

async function carregarDados(meses = 3) {
    document.getElementById('app').innerHTML = `
        <div class="card card-pad max-w-xl mx-auto mt-8">
            <div class="flex items-center gap-4">
                <span class="spinner"></span>
                <div>
                    <p class="section-title">Carregando dashboard completo...</p>
                    <p class="section-sub mt-1">Buscando cockpits dos squads e ROI Week do Pipefy</p>
                    <p id="progresso" class="text-xs mt-2 mb-0" style="color:var(--faint)"></p>
                </div>
            </div>
        </div>
    `;
    try {
        const progressEl = document.getElementById('progresso');
        progressEl.textContent = 'Etapa 1/2: Buscando cockpits dos squads...';
        CLIENTES_ELEGIVEIS = await fetchAllCockpits(progressEl);
        progressEl.textContent = `Etapa 2/2: Buscando ROI Week (${meses} meses)...`;
        roiDataStore = await PipefyService.getRoiWeek(progressEl, meses);
        periodoSelecionado = periodoPadrao(periodosDisponiveis(roiDataStore));
        render();
    } catch (e) {
        console.error('Erro:', e);
        document.getElementById('app').innerHTML = `
            <div class="card card-pad max-w-xl mx-auto mt-8" style="border-color:var(--red-line);background:var(--red-bg)">
                <div class="flex items-center gap-4">
                    <span class="stat-icon" style="background:var(--red-bg);color:var(--red)"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg></span>
                    <div>
                        <p class="text-sm font-bold" style="color:var(--red)">Erro ao carregar dados</p>
                        <p class="text-xs mt-1" style="color:var(--muted)">${e.message}</p>
                        <button id="btn-tentar-novamente" class="btn btn-primary btn-sm mt-3">Tentar novamente</button>
                    </div>
                </div>
            </div>`;
        document.getElementById('btn-tentar-novamente')?.addEventListener('click', () => carregarDados(mesesRetroativos));
    }
}

async function init() { await carregarDados(mesesRetroativos); }
init();

window.addEventListener('theme-changed', () => DashboardView.refreshCharts());
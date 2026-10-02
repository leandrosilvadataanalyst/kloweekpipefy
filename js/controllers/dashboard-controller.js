import { DashboardView } from '../views/dashboard-view.js';
import { PipefyService } from '../services/pipefy-service.js';
import { fetchAllCockpits } from '../sheets-service.js';
import { ExportService } from '../services/export-service.js';
import { getPeriodoRoiWeek, periodoPorChave, periodosDisponiveis, periodoPadrao } from '../utils/periodo.js';
import { fetchDashboardFromSupabase } from '../supabase-service.js';
import { encontrarCards, cardPreenchido, cardComValores } from '../utils/match-cliente.js';
import { gerarMensagemCobranca, naoIdentificados } from '../utils/cobranca.js';
import { validarJanela } from '../utils/janela.js';
import { JanelaService } from '../services/janela-service.js';

let CLIENTES_ELEGIVEIS = [];
let roiDataStore = [];
let clientesConsolidados = [];
let metricas = {};
let topGTs = [];
let squadStats = [];
let chartData = {};
let mesesRetroativos = 3;
let periodoSelecionado = getPeriodoRoiWeek();

// Card do período tem prioridade; razão social (cockpit) é a chave mais confiável — ver utils/match-cliente.js
function encontrarRoi(cliente, roiLista, periodo) {
    const doPeriodo = (roiLista || []).filter(r => periodo.ehDoPeriodo(r?.data_obj));
    return encontrarCards(cliente, doPeriodo)[0] || encontrarCards(cliente, roiLista)[0] || undefined;
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

// "No prazo" = card dentro da janela configurada do mês (config_janela; padrão 01 a 03)
function calcularPrazo(dataObj, preenchido, periodo) {
    if (!preenchido || !dataObj || isNaN(dataObj)) return { status: 'Pendente', label: 'Pendente', classe: 'pendente' };
    if (periodo.noPrazo(dataObj)) return { status: 'No prazo', label: 'No prazo', classe: 'prazo' };
    return { status: 'Fora do prazo', label: 'Fora do prazo', classe: 'fora' };
}

function processarDados(roiData, periodo) {
    return CLIENTES_ELEGIVEIS.map(c => {
        const roi = encontrarRoi(c, roiData, periodo);
        // Card enviado no período = preenchido (sai da cobrança), mesmo zerado; médias usam só `comValores`
        const preenchido = cardPreenchido(roi) && periodo.ehDoPeriodo(roi.data_obj);
        if (preenchido) {
            const { roiVal, roasVal, cacVal, faturamento, investimento } = calcularMetricasCliente(roi);
            const prazo = calcularPrazo(roi.data_obj, true, periodo);
            return {
                ...c,
                faturamento, investimento, mc: roi.mc, vendas: roi.vendas,
                roi: roiVal, roas: roasVal, cac: cacVal,
                preenchido: true,
                comValores: cardComValores(roi),
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
            comValores: false,
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
    // Médias só sobre cards com valores (card zerado, ex.: projeto em Implementação, não puxa a média)
    const comValores = preenchidos.filter(c => c.comValores);
    const pv = comValores.length;
    const roiMaior1 = comValores.filter(c => c.roi > 1).length;
    const noPrazo = lista.filter(c => c.prazo === 'No prazo').length;
    const foraPrazo = preenchidos.filter(c => c.prazo === 'Fora do prazo').length;
    const roasMedio = pv > 0 ? comValores.reduce((a, c) => a + c.roas, 0) / pv : 0;
    const cacList = comValores.filter(c => c.cac > 0);
    const cacMedio = cacList.length > 0 ? cacList.reduce((a, c) => a + c.cac, 0) / cacList.length : 0;
    const roiMedio = pv > 0 ? comValores.reduce((a, c) => a + c.roi, 0) / pv : 0;
    const faturamentoTotal = preenchidos.reduce((a, c) => a + c.faturamento, 0);
    const investimentoTotal = preenchidos.reduce((a, c) => a + c.investimento, 0);
    const vigente = getPeriodoRoiWeek();
    const dia = new Date().getDate();
    const dentroJanela = vigente.dentroJanela;
    const alertaPrazo = !dentroJanela && f > 0 ? `${f} cliente(s) pendente(s) fora da janela ${vigente.janelaRotulo}` : dentroJanela && f > 0 ? `Janela aberta (${vigente.janelaRotulo}): ${f} pendente(s)` : '';
    return {
        total_elegiveis: total, total_preenchidos: p, total_faltantes: f,
        pct_preenchimento: total > 0 ? (p / total) * 100 : 0,
        total_roi_maior_1: roiMaior1, pct_roi_maior_1: pv > 0 ? (roiMaior1 / pv) * 100 : 0,
        roas_medio: roasMedio, cac_medio: cacMedio, roi_medio: roiMedio,
        faturamento_total: faturamentoTotal, investimento_total: investimentoTotal,
        no_prazo: noPrazo, fora_prazo: foraPrazo,
        dia_atual: dia, dentro_janela: dentroJanela, alerta_prazo: alertaPrazo
    };
}

function calcularTopGTs(lista) {
    // Lista do GT mostra todos que enviaram o card (inclusive zerados, ex.: Implementação);
    // só o ROI/ROAS médio do GT ignora os zerados.
    const preenchidos = lista.filter(c => c.preenchido && c.gt);
    const map = {};
    preenchidos.forEach(c => {
        const key = c.gt.trim();
        if (!map[key]) map[key] = { nome: c.gt, squad: c.squad, clientes: [], faturamento: 0 };
        map[key].clientes.push(c);
        map[key].faturamento += c.faturamento;
    });
    const gtLista = Object.values(map).map(g => {
        const comValores = g.clientes.filter(c => c.comValores);
        const avgRoi = comValores.length ? comValores.reduce((a, c) => a + c.roi, 0) / comValores.length : 0;
        const avgRoas = comValores.length ? comValores.reduce((a, c) => a + c.roas, 0) / comValores.length : 0;
        const clientesSorted = g.clientes
            .map(c => ({
                nome: c.nome,
                faturamento: c.faturamento,
                investimento: c.investimento,
                mc: c.mc,
                roas: c.roas,
                roi: c.roi
            }))
            .sort((a, b) => b.roi - a.roi);
        return { nome: g.nome, squad: g.squad, totalClientes: g.clientes.length, roiMedio: avgRoi, roasMedio: avgRoas, faturamento: g.faturamento, clientes: clientesSorted };
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
        const comValores = preenchidos.filter(c => c.comValores);
        const pv = comValores.length;
        const roiMedio = pv > 0 ? comValores.reduce((a, c) => a + c.roi, 0) / pv : 0;
        const roasMedio = pv > 0 ? comValores.reduce((a, c) => a + c.roas, 0) / pv : 0;
        const faturamento = preenchidos.reduce((a, c) => a + c.faturamento, 0);
        const investimento = preenchidos.reduce((a, c) => a + c.investimento, 0);
        return { nome: squad, total, preenchidos: p, pctPreenchimento: total > 0 ? (p / total) * 100 : 0, roiMedio, roasMedio, faturamento, investimento };
    }).sort((a, b) => b.roiMedio - a.roiMedio);
}

function calcularCharts(lista, stats) {
    const preenchidos = lista.filter(c => c.comValores); // séries/Pareto/estatística: só cards com valores
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

// ─── Cobrança ao vivo ─────────────────────────────────────
// A cobrança lista só os clientes ainda não identificados no Pipefy (ROI Week vigente).
// A cada 2 min buscamos direto do Pipefy os cards alterados no mês vigente e re-renderizamos
// só o bloco #cobranca: quem o GT acabou de preencher sai da lista sem recarregar a página.
const INTERVALO_COBRANCA_MS = 2 * 60 * 1000;
let cobrancaTimer = null;
let cobrancaAtualizadaEm = null;
let cobrancaErro = '';
let cobrancaEmAndamento = false;

function dadosCobranca() {
    const vigente = getPeriodoRoiWeek();
    const vigentes = processarDados(roiDataStore, vigente);
    return {
        mensagem: gerarMensagemCobranca(vigentes),
        faltantesCount: naoIdentificados(vigentes).length,
        totalClientes: vigentes.length,
        periodoVigente: vigente
    };
}

function mesclarCards(atualizados) {
    const porId = new Map(roiDataStore.map(r => [String(r.cliente_id), r]));
    atualizados.forEach(r => porId.set(String(r.cliente_id), r));
    roiDataStore = [...porId.values()];
}

function bindCobranca(mensagem) {
    document.getElementById('btn-copiar')?.addEventListener('click', async () => {
        await navigator.clipboard.writeText(mensagem);
        const btn = document.getElementById('btn-copiar');
        const original = btn.innerHTML;
        btn.innerHTML = 'Copiado!';
        setTimeout(() => { btn.innerHTML = original; }, 2000);
    });
    document.getElementById('btn-atualizar-cobranca')?.addEventListener('click', () => atualizarCobranca());
}

// ─── Ajuste da janela de preenchimento ────────────────────
// Padrão (todos os meses) + exceção por mês, salvos no Supabase (config_janela) via JanelaService.
let janelaConfig = null;
let janelaAviso = '';
let janelaPainelAberto = false;

function valorCampo(id) {
    return document.getElementById(id)?.value ?? '';
}

function mostrarMsgJanela(texto, erro = false) {
    const el = document.getElementById('janela-msg');
    if (!el) return;
    el.textContent = texto;
    el.style.color = erro ? 'var(--red)' : 'var(--green)';
}

async function aplicarJanela(acao) {
    try {
        await acao();
        ({ config: janelaConfig, aviso: janelaAviso } = await JanelaService.carregar());
        periodoSelecionado = getPeriodoRoiWeek();
        renderPreservandoFiltros();
        mostrarMsgJanela('Janela atualizada.');
    } catch (e) {
        mostrarMsgJanela(e.message, true);
    }
}

function bindJanela() {
    document.getElementById('btn-ajustar-janela')?.addEventListener('click', () => {
        janelaPainelAberto = !janelaPainelAberto;
        document.getElementById('painel-janela')?.classList.toggle('hidden', !janelaPainelAberto);
    });
    document.getElementById('btn-salvar-padrao')?.addEventListener('click', () => {
        const j = { inicio: valorCampo('janela-padrao-inicio'), fim: valorCampo('janela-padrao-fim') };
        const erro = validarJanela(j);
        if (erro) return mostrarMsgJanela(erro, true);
        aplicarJanela(() => JanelaService.salvar({ chave: 'padrao', ...j }));
    });
    document.getElementById('btn-salvar-excecao')?.addEventListener('click', () => {
        const j = { inicio: valorCampo('janela-exc-inicio'), fim: valorCampo('janela-exc-fim') };
        const erro = validarJanela(j);
        if (erro) return mostrarMsgJanela(erro, true);
        aplicarJanela(() => JanelaService.salvar({ chave: valorCampo('janela-exc-mes'), ...j, motivo: valorCampo('janela-exc-motivo') }));
    });
    document.querySelectorAll('[data-remover-excecao]').forEach(btn => {
        btn.addEventListener('click', () => aplicarJanela(() => JanelaService.removerExcecao(btn.dataset.removerExcecao)));
    });
}

// A tela inteira mostra o ROI Week vigente: a atualização ao vivo re-renderiza tudo (quadros, tabela
// e cobrança), preservando os filtros que o usuário escolheu na tabela.
const FILTROS_TABELA = ['filtro-busca', 'filtro-squad', 'filtro-gt', 'filtro-status', 'filtro-roi', 'filtro-prazo'];

function renderPreservandoFiltros() {
    const valores = Object.fromEntries(FILTROS_TABELA.map(id => [id, document.getElementById(id)?.value || '']));
    render();
    FILTROS_TABELA.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = valores[id];
    });
    document.getElementById('filtro-busca')?.dispatchEvent(new Event('input'));
}

async function atualizarCobranca() {
    if (cobrancaEmAndamento) return;
    cobrancaEmAndamento = true;
    const btn = document.getElementById('btn-atualizar-cobranca');
    if (btn) { btn.disabled = true; btn.textContent = 'Atualizando...'; }
    try {
        const vigente = getPeriodoRoiWeek();
        mesclarCards(await PipefyService.getRoiWeekAtualizadosDesde(vigente.inicio));
        cobrancaAtualizadaEm = new Date();
        cobrancaErro = '';
    } catch (e) {
        console.warn('[Cobrança] Falha ao atualizar do Pipefy:', e.message);
        cobrancaErro = e.message;
    } finally {
        cobrancaEmAndamento = false;
        renderPreservandoFiltros();
    }
}

function iniciarCobrancaAoVivo(atualizarAgora) {
    if (cobrancaTimer) clearInterval(cobrancaTimer);
    cobrancaTimer = setInterval(() => {
        if (!document.hidden) atualizarCobranca();
    }, INTERVALO_COBRANCA_MS);
    if (atualizarAgora) atualizarCobranca();
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
    const { mensagem, faltantesCount, totalClientes } = dadosCobranca();

    const gtsList = [...new Set(clientesConsolidados.map(c => c.gt).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const squadsList = [...new Set(clientesConsolidados.map(c => c.squad).filter(Boolean))].sort();
    const periodoOptions = periodosDisponiveis(roiDataStore);

    const data = {
        metricas, topGTs, squadStats, squadsList, gtsList,
        mensagemGTs: mensagem, clientes: clientesConsolidados, faltantesCount,
        totalVigente: totalClientes, cobrancaAtualizadaEm, cobrancaErro,
        janelaConfig, janelaAviso, janelaPainelAberto,
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
    bindCobranca(mensagem);
    bindJanela();
    document.getElementById('btn-recarregar')?.addEventListener('click', () => {
        const select = document.getElementById('filtro-meses');
        mesesRetroativos = parseInt(select.value);
        carregarDados(mesesRetroativos);
    });
    const getFiltradosExport = () => aplicarFiltros();
    document.getElementById('btn-export-json')?.addEventListener('click', () => ExportService.exportToJSON(getFiltradosExport(), 'relatorio_roi.json'));
    document.getElementById('btn-export-csv')?.addEventListener('click', () => ExportService.exportToCSV(getFiltradosExport(), 'relatorio_roi.csv'));
    document.getElementById('btn-export-excel')?.addEventListener('click', () => ExportService.exportToExcel(getFiltradosExport(), 'relatorio_roi.xls'));

    document.querySelectorAll('.gt-row-clickable').forEach(row => {
        row.addEventListener('click', () => {
            const idx = row.dataset.gt;
            const expand = document.getElementById(`gt-expand-${idx}`);
            const chevron = row.querySelector('.gt-chevron');
            if (!expand) return;
            const isHidden = expand.classList.contains('hidden');
            expand.classList.toggle('hidden');
            if (chevron) chevron.style.transform = isHidden ? 'rotate(180deg)' : '';
        });
    });
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

        // Janela de preenchimento configurada (padrão + exceção do mês) antes de montar qualquer período
        progressEl.textContent = 'Carregando janela de preenchimento...';
        ({ config: janelaConfig, aviso: janelaAviso } = await JanelaService.carregar());

        // Tentar Supabase primeiro
        try {
            progressEl.textContent = 'Carregando dados do Supabase...';
            const data = await fetchDashboardFromSupabase(meses);
            CLIENTES_ELEGIVEIS = data.clientes.filter(c => !c.roi || c.preenchido);
            roiDataStore = data.clientes
                .filter(c => c.roi)
                .map(c => ({
                    cliente_id: c.roi.id,
                    cliente_nome: c.nome,
                    projeto: c.roi.projeto,
                    investimento: c.roi.investimento,
                    mc: c.roi.mc,
                    faturamento: c.roi.faturamento,
                    vendas: c.roi.vendas,
                    data_atualizacao: c.roi.data_atualizacao,
                    data_obj: c.roi.data_obj ? new Date(c.roi.data_obj) : null,
                    card_url: c.roi.card_url,
                    created_at: c.roi.data_atualizacao
                }));
            periodoSelecionado = periodoPadrao(periodosDisponiveis(roiDataStore));
            render();
            // Supabase só muda quando o sync roda: completa já com o Pipefy ao vivo
            iniciarCobrancaAoVivo(true);
            return;
        } catch (supabaseErr) {
            console.warn('Supabase indisponível, usando método direto:', supabaseErr.message);
        }

        // Fallback: método original (Google Sheets + Pipefy)
        progressEl.textContent = 'Etapa 1/2: Buscando cockpits dos squads...';
        CLIENTES_ELEGIVEIS = await fetchAllCockpits(progressEl);
        progressEl.textContent = `Etapa 2/2: Buscando ROI Week (${meses} meses)...`;
        roiDataStore = await PipefyService.getRoiWeek(progressEl, meses);
        cobrancaAtualizadaEm = new Date();
        periodoSelecionado = periodoPadrao(periodosDisponiveis(roiDataStore));
        render();
        iniciarCobrancaAoVivo(false);
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
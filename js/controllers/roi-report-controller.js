import { RoiReportView } from '../views/roi-report-view.js';
import { PipefyService } from '../services/pipefy-service.js';
import { fetchAllCockpits } from '../sheets-service.js';
import { encontrarCards, cardPreenchido } from '../utils/match-cliente.js';
import { JanelaService } from '../services/janela-service.js';
import { getPeriodoRoiWeek, periodoPorChave, periodoPadrao } from '../utils/periodo.js';

// Cobrança ao vivo: a cada 2 min busca no Pipefy os cards alterados no mês vigente;
// clientes recém-preenchidos saem da lista de faltantes sem recarregar a página.
const INTERVALO_COBRANCA_MS = 2 * 60 * 1000;

let elegiveis = [];
let roiLista = [];
let preenchidosPorKey = {};
let faltantesPorKey = {};
let keysOrder = [];
let filtroSquad = '';
let periodoKey = '';
let atualizadoEm = null;
let erroAtualizacao = '';
let atualizando = false;

function chaveDeData(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function calcularMetricas(p, f) {
    const total = p.length + f.length;
    return { total_clientes: total, total_preenchidos: p.length, total_faltantes: f.length };
}

function classificar() {
    const grupos = {};
    roiLista.forEach(x => {
        const d = new Date(x.data_obj);
        if (isNaN(d)) return;
        const k = chaveDeData(d);
        if (!grupos[k]) grupos[k] = [];
        grupos[k].push(x);
    });
    // O ROI Week vigente sempre existe, mesmo sem nenhum card ainda (início da janela):
    // sem isso a cobrança ficava vazia e a tela dizia "todos preencheram".
    const vigenteKey = getPeriodoRoiWeek().key;
    keysOrder = [...new Set([vigenteKey, ...Object.keys(grupos)])].sort().reverse();

    preenchidosPorKey = {};
    faltantesPorKey = {};
    keysOrder.forEach(k => {
        const grupo = grupos[k] || [];
        preenchidosPorKey[k] = [];
        faltantesPorKey[k] = [];
        elegiveis.forEach(c => {
            const base = { id: c.id, nome_fantasia: c.nome, squad: c.squad, gt: c.gt, coordenador: c.coordenador, razaoSocial: c.razaoSocial };
            const r = encontrarCards(c, grupo)[0];
            if (cardPreenchido(r)) {
                const roiPercent = r.investimento > 0 ? ((r.faturamento - r.investimento) / r.investimento) * 100 : 0;
                preenchidosPorKey[k].push({
                    ...base,
                    saude: { roi: roiPercent, status: roiPercent >= 50 ? 'safe' : roiPercent >= 0 ? 'care' : 'danger' }
                });
            } else {
                faltantesPorKey[k].push(base);
            }
        });
    });
}

function render() {
    const vigente = getPeriodoRoiWeek();
    const preenchidos = preenchidosPorKey[periodoKey] || [];
    const faltantes = faltantesPorKey[periodoKey] || [];
    const fp = filtroSquad ? preenchidos.filter(c => c.squad === filtroSquad) : preenchidos;
    const ff = filtroSquad ? faltantes.filter(c => c.squad === filtroSquad) : faltantes;
    const vigenteFaltantes = faltantesPorKey[vigente.key] || [];
    const data = {
        preenchidos: fp,
        faltantes: ff,
        metricas: calcularMetricas(preenchidos, faltantes),
        periodo: periodoPorChave(periodoKey),
        periodoVigente: vigente,
        periodoOptions: keysOrder.map(periodoPorChave),
        periodoKey,
        vigenteFaltantes,
        atualizadoEm,
        erroAtualizacao
    };
    document.getElementById('app').innerHTML = RoiReportView.render(data);
    if (document.getElementById('filtro-squad')) {
        document.getElementById('filtro-squad').value = filtroSquad;
        document.getElementById('filtro-squad').addEventListener('change', e => { filtroSquad = e.target.value; render(); });
    }
    document.getElementById('filtro-periodo')?.addEventListener('change', e => { periodoKey = e.target.value; render(); });
    document.getElementById('btn-copiar')?.addEventListener('click', async () => {
        const msg = RoiReportView.gerarMensagem(vigenteFaltantes);
        await navigator.clipboard.writeText(msg);
        const btn = document.getElementById('btn-copiar');
        btn.textContent = 'Copiado!';
        setTimeout(() => btn.textContent = 'Copiar mensagem', 2000);
    });
    document.getElementById('btn-atualizar-cobranca')?.addEventListener('click', () => atualizarAoVivo());
}

async function atualizarAoVivo() {
    if (atualizando) return;
    atualizando = true;
    const btn = document.getElementById('btn-atualizar-cobranca');
    if (btn) { btn.disabled = true; btn.textContent = 'Atualizando...'; }
    try {
        const atualizados = await PipefyService.getRoiWeekAtualizadosDesde(getPeriodoRoiWeek().inicio);
        const porId = new Map(roiLista.map(r => [String(r.cliente_id), r]));
        atualizados.forEach(r => porId.set(String(r.cliente_id), r));
        roiLista = [...porId.values()];
        classificar();
        atualizadoEm = new Date();
        erroAtualizacao = '';
    } catch (e) {
        console.warn('[Cobrança] Falha ao atualizar do Pipefy:', e.message);
        erroAtualizacao = e.message;
    } finally {
        atualizando = false;
        render();
    }
}

async function init() {
    document.getElementById('app').innerHTML = `
        <div class="card card-pad max-w-xl mx-auto mt-8">
            <div class="flex items-center gap-4">
                <span class="spinner"></span>
                <div>
                    <p class="section-title">Carregando relatório ROI...</p>
                    <p class="section-sub mt-1">Cruzando planilhas com o ROI Week do Pipefy</p>
                    <p id="progresso" class="text-xs mt-2 mb-0" style="color:var(--faint)"></p>
                </div>
            </div>
        </div>
    `;

    try {
        const progressEl = document.getElementById('progresso');
        await JanelaService.carregar(); // janela de preenchimento configurada (padrão 01 a 03 se indisponível)
        const [cockpits, roi] = await Promise.all([
            fetchAllCockpits(progressEl),
            PipefyService.getRoiWeek(progressEl, 3)
        ]);
        elegiveis = cockpits;
        roiLista = roi || [];
        atualizadoEm = new Date();
        classificar();
        periodoKey = periodoPadrao(keysOrder.map(periodoPorChave)).key;
    } catch (e) {
        console.error('Erro:', e);
        document.getElementById('app').innerHTML = `
            <div class="card card-pad max-w-xl mx-auto mt-8" style="border-color:var(--red-line);background:var(--red-bg)">
                <div class="flex items-center gap-4">
                    <span class="stat-icon" style="background:var(--red-bg);color:var(--red)"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg></span>
                    <div>
                        <p class="text-sm font-bold" style="color:var(--red)">Erro ao carregar dados</p>
                        <p class="text-xs mt-1" style="color:var(--muted)">${e.message}</p>
                    </div>
                </div>
            </div>`;
        return;
    }
    render();
    setInterval(() => { if (!document.hidden) atualizarAoVivo(); }, INTERVALO_COBRANCA_MS);
}

init();

import { RoiReportView } from '../views/roi-report-view.js';
import { PipefyService } from '../services/pipefy-service.js';
import { fetchAllCockpits } from '../sheets-service.js';
import { getPeriodoRoiWeek, periodoPorChave, periodoPadrao } from '../utils/periodo.js';

let preenchidosPorKey = {};
let faltantesPorKey = {};
let keysOrder = [];
let filtroSquad = '';
let periodoKey = '';

function chaveDeData(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

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

function calcularMetricas(p, f) {
    const total = p.length + f.length;
    return { total_clientes: total, total_preenchidos: p.length, total_faltantes: f.length };
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
        vigenteFaltantes
    };
    document.getElementById('app').innerHTML = RoiReportView.render(data);
    if (document.getElementById('filtro-squad')) {
        document.getElementById('filtro-squad').value = filtroSquad;
        document.getElementById('filtro-squad').addEventListener('change', e => { filtroSquad = e.target.value; render(); });
    }
    document.getElementById('filtro-periodo')?.addEventListener('change', e => { periodoKey = e.target.value; render(); });
    document.getElementById('btn-copiar')?.addEventListener('click', async () => {
        const msg = RoiReportView.gerarMensagem(vigenteFaltantes, vigente);
        await navigator.clipboard.writeText(msg);
        const btn = document.getElementById('btn-copiar');
        btn.textContent = 'Copiado!';
        setTimeout(() => btn.textContent = 'Copiar Mensagem para GTs', 2000);
    });
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
        const [elegiveis, roi] = await Promise.all([
            fetchAllCockpits(progressEl),
            PipefyService.getRoiWeek(progressEl, 3)
        ]);

        const grupos = {};
        (roi || []).forEach(x => {
            const d = new Date(x.data_obj);
            if (isNaN(d)) return;
            const k = chaveDeData(d);
            if (!grupos[k]) grupos[k] = [];
            grupos[k].push(x);
        });
        keysOrder = Object.keys(grupos).sort().reverse();
        if (!keysOrder.length) keysOrder = [getPeriodoRoiWeek().key];
        periodoKey = periodoPadrao(keysOrder.map(periodoPorChave)).key;

        preenchidosPorKey = {};
        faltantesPorKey = {};
        keysOrder.forEach(k => {
            const grupo = grupos[k] || [];
            preenchidosPorKey[k] = [];
            faltantesPorKey[k] = [];
            elegiveis.forEach(c => {
                const r = grupo.find(x => testeMatch(c, x));
                if (r && (r.investimento > 0 || r.mc > 0 || r.faturamento > 0)) {
                    const roiPercent = r.investimento > 0 ? ((r.faturamento - r.investimento) / r.investimento) * 100 : 0;
                    preenchidosPorKey[k].push({
                        id: c.id, nome_fantasia: c.nome, squad: c.squad, gt: c.gt,
                        saude: { roi: roiPercent, status: roiPercent >= 50 ? 'safe' : roiPercent >= 0 ? 'care' : 'danger' }
                    });
                } else {
                    faltantesPorKey[k].push({ id: c.id, nome_fantasia: c.nome, squad: c.squad, gt: c.gt });
                }
            });
        });
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
}

init();
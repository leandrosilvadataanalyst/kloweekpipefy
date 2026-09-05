import { RoiView } from '../views/roi-view.js';
import { PipefyService } from '../services/pipefy-service.js';
import { fetchAllCockpits } from '../sheets-service.js';
import { getPeriodoRoiWeek, periodoPorChave, periodoPadrao } from '../utils/periodo.js';

let clientesPorKey = {};
let keysOrder = [];
let filtroSquad = '';
let filtroStatus = '';
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

function calcularMetricas(clientes) {
    const total = clientes.length;
    const safe = clientes.filter(c => c.status === 'safe').length;
    const care = clientes.filter(c => c.status === 'care').length;
    const danger = clientes.filter(c => c.status === 'danger').length;

    return {
        total,
        pct_safe: total > 0 ? (safe / total) * 100 : 0,
        pct_care: total > 0 ? (care / total) * 100 : 0,
        pct_danger: total > 0 ? (danger / total) * 100 : 0,
        roi_medio: total > 0 ? clientes.reduce((a, c) => a + c.roi, 0) / total : 0
    };
}

function render() {
    const store = clientesPorKey[periodoKey] || [];
    const fc = store.filter(c => {
        if (filtroSquad && c.squad !== filtroSquad) return false;
        if (filtroStatus && c.status !== filtroStatus) return false;
        return true;
    });
    const data = {
        metricas: calcularMetricas(store),
        clientes: fc,
        periodo: periodoPorChave(periodoKey),
        periodoVigente: getPeriodoRoiWeek(),
        periodoOptions: keysOrder.map(periodoPorChave),
        periodoKey
    };
    document.getElementById('app').innerHTML = RoiView.render(data);
    document.getElementById('filtro-squad')?.addEventListener('change', e => { filtroSquad = e.target.value; render(); });
    document.getElementById('filtro-status')?.addEventListener('change', e => { filtroStatus = e.target.value; render(); });
    document.getElementById('filtro-periodo')?.addEventListener('change', e => { periodoKey = e.target.value; render(); });
}

async function init() {
    document.getElementById('app').innerHTML = `
        <div class="card card-pad max-w-xl mx-auto mt-8">
            <div class="flex items-center gap-4">
                <span class="spinner"></span>
                <div>
                    <p class="section-title">Carregando análise ROI...</p>
                    <p class="section-sub mt-1">Buscando cockpits e ROI Week do Pipefy</p>
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

        clientesPorKey = {};
        keysOrder.forEach(k => {
            const grupo = grupos[k] || [];
            clientesPorKey[k] = elegiveis.map(c => {
                const r = grupo.find(x => testeMatch(c, x));
                if (r && (r.investimento > 0 || r.faturamento > 0 || r.mc > 0)) {
                    const roiPercent = r.investimento > 0 ? ((r.faturamento - r.investimento) / r.investimento) * 100 : 0;
                    return {
                        cliente: c.nome,
                        squad: c.squad || 'N/A',
                        investimento_midia: r.investimento,
                        mc: r.mc,
                        faturamento: r.faturamento,
                        roi: roiPercent,
                        status: roiPercent >= 50 ? 'safe' : roiPercent >= 0 ? 'care' : 'danger'
                    };
                }
                return {
                    cliente: c.nome,
                    squad: c.squad || 'N/A',
                    investimento_midia: 0, mc: 0, faturamento: 0, roi: 0,
                    status: 'danger'
                };
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
                        <button id="btn-tentar-novamente" class="btn btn-primary btn-sm mt-3">Tentar novamente</button>
                    </div>
                </div>
            </div>`;
        document.getElementById('btn-tentar-novamente')?.addEventListener('click', init);
        return;
    }
    render();
}

init();
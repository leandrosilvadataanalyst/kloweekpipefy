import { AjustesView } from '../views/ajustes-view.js';
import { PipefyService } from '../services/pipefy-service.js';
import { VinculoService } from '../services/vinculo-service.js';
import { JanelaService } from '../services/janela-service.js';
import { fetchAllCockpits } from '../sheets-service.js';
import { getPeriodoRoiWeek } from '../utils/periodo.js';
import { encontrarCards, matchCliente } from '../utils/match-cliente.js';
import { aplicarVinculos, chaveCliente } from '../utils/vinculos.js';

// Estado da tela
let cockpits = [];
let cardsVigente = [];
let vinculosRows = [];
let aviso = '';
let filtros = { status: 'pendentes', squad: '', texto: '' };
let selecionado = null;       // chave do cliente com o painel de busca aberto
let busca = '';
let resultados = null;
let buscando = false;
let erroBusca = '';
let msg = null;

function clientesComStatus() {
    return aplicarVinculos(cockpits, vinculosRows).map(c => {
        const card = encontrarCards(c, cardsVigente)[0] || null;
        return { ...c, chave: chaveCliente(c.nome), card, via: card ? matchCliente(c, card).via : null };
    });
}

function render() {
    const periodo = getPeriodoRoiWeek();
    const clientes = clientesComStatus();
    const squads = [...new Set(cockpits.map(c => c.squad).filter(Boolean))].sort();
    document.getElementById('app').innerHTML = AjustesView.render({
        periodo, clientes, filtros, squads, aviso, selecionado, busca, resultados, buscando, erroBusca, msg
    });
    bind(clientes);
}

function bind(clientes) {
    document.getElementById('aj-status')?.addEventListener('change', e => { filtros.status = e.target.value; render(); });
    document.getElementById('aj-squad')?.addEventListener('change', e => { filtros.squad = e.target.value; render(); });
    const texto = document.getElementById('aj-texto');
    texto?.addEventListener('change', e => { filtros.texto = e.target.value; render(); });
    texto?.addEventListener('keydown', e => { if (e.key === 'Enter') { filtros.texto = e.target.value; render(); } });

    document.querySelectorAll('[data-buscar]').forEach(btn => btn.addEventListener('click', () => {
        const c = clientes.find(x => x.chave === btn.dataset.buscar);
        if (selecionado === c.chave) { selecionado = null; return render(); }
        selecionado = c.chave;
        // sugestão de busca: primeira palavra relevante do nome do cockpit
        busca = (c.nome || '').replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').trim().split(/\s+/)[0] || '';
        resultados = null; erroBusca = ''; msg = null;
        render();
        buscar();
    }));
    const inputBusca = document.getElementById('aj-busca');
    inputBusca?.addEventListener('keydown', e => { if (e.key === 'Enter') { busca = e.target.value; buscar(); } });
    document.getElementById('aj-btn-busca')?.addEventListener('click', () => { busca = inputBusca?.value || ''; buscar(); });

    document.querySelectorAll('[data-vincular]').forEach(btn => btn.addEventListener('click', async () => {
        const c = clientes.find(x => x.chave === selecionado);
        const card = resultados?.[Number(btn.dataset.vincular)];
        if (!c || !card) return;
        await executar(() => VinculoService.vincular(c, card), `${c.nome} vinculado ao card "${card.titulo}".`);
        selecionado = null; resultados = null;
        render();
    }));
    document.querySelectorAll('[data-remover]').forEach(btn => btn.addEventListener('click', async () => {
        const c = clientes.find(x => x.chave === btn.dataset.remover);
        if (!c) return;
        await executar(() => VinculoService.remover(c), `Vínculo de ${c.nome} removido.`);
        render();
    }));
}

async function buscar() {
    if (busca.trim().length < 2) { erroBusca = 'Digite ao menos 2 letras do título do card.'; resultados = null; return render(); }
    buscando = true; erroBusca = ''; render();
    try {
        resultados = await PipefyService.buscarCardsPorTitulo(busca);
    } catch (e) {
        erroBusca = `Falha na busca: ${e.message}`;
        resultados = null;
    } finally {
        buscando = false;
        render();
        document.getElementById('aj-busca')?.focus();
    }
}

async function executar(acao, okTexto) {
    try {
        await acao();
        ({ rows: vinculosRows, aviso } = await VinculoService.carregar());
        msg = { texto: okTexto, erro: false };
    } catch (e) {
        msg = { texto: e.message, erro: true };
    }
}

async function init() {
    document.getElementById('app').innerHTML = `
        <div class="card card-pad max-w-xl mx-auto mt-8">
            <div class="flex items-center gap-4">
                <span class="spinner"></span>
                <div>
                    <p class="section-title">Carregando ajustes...</p>
                    <p class="section-sub mt-1">Cockpits, cards do ROI Week vigente e vínculos manuais</p>
                    <p id="progresso" class="text-xs mt-2 mb-0" style="color:var(--faint)"></p>
                </div>
            </div>
        </div>`;
    try {
        const progressEl = document.getElementById('progresso');
        await JanelaService.carregar();
        const periodo = getPeriodoRoiWeek();
        const [cps, cards, vinc] = await Promise.all([
            fetchAllCockpits(progressEl),
            PipefyService.getRoiWeekAtualizadosDesde(periodo.inicio),
            VinculoService.carregar()
        ]);
        cockpits = cps;
        cardsVigente = cards.filter(r => periodo.ehDoPeriodo(r.data_obj));
        ({ rows: vinculosRows, aviso } = vinc);
    } catch (e) {
        document.getElementById('app').innerHTML = `<div class="card card-pad max-w-xl mx-auto mt-8" style="border-color:var(--red-line);background:var(--red-bg)"><p class="text-sm font-bold" style="color:var(--red)">Erro ao carregar ajustes</p><p class="text-xs mt-1" style="color:var(--muted)">${AjustesView.esc(e.message)}</p></div>`;
        return;
    }
    render();
}

init();

import { CONFIG } from './config.js';
import { sheetsEndpoint } from './api-base.js';
import { fetchAllCockpitsFromBackup } from './backup-service.js';

const COCKPIT_URLS = [
    { ...CONFIG.SHEETS.WALL_STREET, nome: 'Wall Street' },
    { ...CONFIG.SHEETS.ROMANS, nome: 'Romans' },
    { ...CONFIG.SHEETS.LEGACY, nome: 'Legacy' },
    { ...CONFIG.SHEETS.MONSTERS_SA, nome: 'Monsters S/A' }
];

function findColIndex(headers, ...candidates) {
    for (const c of candidates) {
        const re = new RegExp(`\\b${c.toLowerCase()}\\b`);
        const idx = headers.findIndex(h => h && re.test(h.toLowerCase()));
        if (idx !== -1) return idx;
    }
    return -1;
}

function normalizeClient(row, headers, squad) {
    const idIdx = findColIndex(headers, 'id');
    const nameIdx = findColIndex(headers, 'name', 'nome do projeto', 'cliente');
    const churnIdx = findColIndex(headers, 'churn');
    const coordIdx = findColIndex(headers, 'coordenador', 'coodernador');
    const accountIdx = findColIndex(headers, 'account');
    const gtIdx = findColIndex(headers, 'gt');
    const feeIdx = findColIndex(headers, 'fee');
    const flagIdx = findColIndex(headers, 'flag calculada', 'flag');
    const healthIdx = findColIndex(headers, 'health', 'pontuação');
    const statusIdx = findColIndex(headers, 'customer care status');
    const atualizacaoIdx = findColIndex(headers, 'data de atualização', 'data atualização', 'atualizado', 'última atualização', 'ultima atualizacao');

    const id = idIdx >= 0 ? row[idIdx] : '';
    const name = nameIdx >= 0 ? row[nameIdx] : '';
    const churnRaw = churnIdx >= 0 ? (row[churnIdx] || '').toLowerCase().trim() : '';
    const coordenador = coordIdx >= 0 ? row[coordIdx] : '';
    const account = accountIdx >= 0 ? row[accountIdx] : '';
    const gt = gtIdx >= 0 ? row[gtIdx] : '';
    const feeRaw = feeIdx >= 0 ? row[feeIdx] : '0';
    const flag = flagIdx >= 0 ? row[flagIdx] : '';
    const health = healthIdx >= 0 ? row[healthIdx] : '';
    const customerCareStatus = statusIdx >= 0 ? row[statusIdx] : '';
    const dataAtualizacao = atualizacaoIdx >= 0 ? row[atualizacaoIdx] : '';

    if (!name) return null;
    if (churnRaw && churnRaw !== 'não' && churnRaw !== 'nao' && churnRaw !== 'n' && churnRaw !== '') return null;

    let fee = 0;
    if (feeRaw) {
        fee = parseFloat(String(feeRaw).replace(/[R$\s.]/g, '').replace(',', '.'));
        if (isNaN(fee)) fee = 0;
    }

    return {
        id,
        nome: String(name).toUpperCase().trim(),
        squad,
        coordenador,
        account,
        gt,
        fee,
        flag,
        health,
        customerCareStatus,
        dataAtualizacao
    };
}

async function fetchSheet(sheet) {
    const params = new URLSearchParams({
        id: sheet.id,
        title: sheet.title,
        gid: sheet.gid
    });
    const resp = await fetch(`${sheetsEndpoint()}?${params.toString()}`, { cache: 'no-store' });
    if (!resp.ok) {
        let detail = resp.statusText;
        const err = await resp.json().catch(() => null);
        if (err && err.error) detail = err.error;
        throw new Error(`Erro ao buscar ${sheet.nome}: ${resp.status} - ${detail}`);
    }
    const data = await resp.json();
    const rows = data.rows || [];
    if (rows.length < 2) return [];
    const headers = rows[0];
    const clients = [];
    for (let i = 1; i < rows.length; i++) {
        const c = normalizeClient(rows[i], headers, sheet.squad);
        if (c) clients.push(c);
    }
    return clients;
}

function validarConsistencia(all) {
    if (!all || all.length === 0) return;
    const alertas = [];

    const incompletos = all.filter(c => !c.coordenador || !c.gt);
    if (incompletos.length > 0) {
        alertas.push(`${incompletos.length} cliente(s) sem coordenador/GT preenchido na planilha (verifique a atualização das duplas): ${incompletos.slice(0, 3).map(c => c.nome).join(', ')}${incompletos.length > 3 ? '...' : ''}`);
    }

    const mapaPessoa = new Map();
    all.forEach(c => {
        [c.coordenador, c.gt].forEach(pessoa => {
            const nome = (pessoa || '').trim();
            if (!nome) return;
            if (!mapaPessoa.has(nome)) mapaPessoa.set(nome, new Set());
            mapaPessoa.get(nome).add(c.squad);
        });
    });

    const emMuitasSquads = [...mapaPessoa.entries()].filter(([, squads]) => squads.size > 1);
    if (emMuitasSquads.length > 0) {
        emMuitasSquads.forEach(([pessoa, squads]) => {
            alertas.push(`Atenção: "${pessoa}" aparece em múltiplas squads (${[...squads].sort().join(', ')}) — possível mudança de função não refletida nas planilhas.`);
        });
    }

    if (alertas.length > 0) {
        console.warn('[Sheets] Verificações de consistência:\n' + alertas.map(a => ' - ' + a).join('\n'));
    }
}

export async function fetchAllCockpits(progressEl) {
    const all = [];
    let primaryFailed = 0;

    for (let i = 0; i < COCKPIT_URLS.length; i++) {
        const sheet = COCKPIT_URLS[i];
        if (progressEl) progressEl.textContent = `Buscando ${sheet.nome}... (${i + 1}/${COCKPIT_URLS.length})`;
        try {
            const clients = await fetchSheet(sheet);
            all.push(...clients);
        } catch (e) {
            primaryFailed++;
            console.warn(`Falha ao buscar ${sheet.nome}: ${e.message} — continuando com demais squads`);
        }
        if (i < COCKPIT_URLS.length - 1) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    if (all.length === 0 && primaryFailed > 0) {
        console.warn('[Sheets] Todas as fontes primárias falharam. Tentando fallback para planilha de backup...');
        if (progressEl) progressEl.textContent = 'Fontes primárias indisponíveis. Carregando backup...';
        try {
            const backupClients = await fetchAllCockpitsFromBackup(progressEl);
            console.log(`[Sheets] Fallback: ${backupClients.length} clientes carregados do backup`);
            validarConsistencia(backupClients);
            return backupClients;
        } catch (backupErr) {
            console.error(`[Sheets] Fallback também falhou: ${backupErr.message}`);
            throw new Error('Nenhum cockpit pôde ser carregado (fontes primárias e backup falharam)');
        }
    }

    if (all.length === 0) throw new Error('Nenhum cockpit pôde ser carregado');
    validarConsistencia(all);
    return all;
}
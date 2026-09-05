import { CONFIG } from './config.js';

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
        customerCareStatus
    };
}

async function fetchSheet(sheet) {
    const params = new URLSearchParams({
        id: sheet.id,
        title: sheet.title,
        gid: sheet.gid
    });
    const resp = await fetch(`/kloweekpipefy/sheets-proxy.php?${params.toString()}`, { cache: 'no-store' });
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

export async function fetchAllCockpits(progressEl) {
    const all = [];
    for (let i = 0; i < COCKPIT_URLS.length; i++) {
        const sheet = COCKPIT_URLS[i];
        if (progressEl) progressEl.textContent = `Buscando ${sheet.nome}... (${i + 1}/${COCKPIT_URLS.length})`;
        try {
            const clients = await fetchSheet(sheet);
            all.push(...clients);
        } catch (e) {
            console.warn(`Falha ao buscar ${sheet.nome}: ${e.message} — continuando com demais squads`);
        }
        if (i < COCKPIT_URLS.length - 1) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    if (all.length === 0) throw new Error('Nenhum cockpit pôde ser carregado');
    return all;
}
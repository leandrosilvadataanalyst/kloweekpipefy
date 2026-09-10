import { CONFIG } from './config.js';
import { sheetsEndpoint } from './api-base.js';

const BACKUP_SHEET_ID = CONFIG.BACKUP_SHEET?.id || '13GcuQBrOhsGJO0T39UQS8xoGAVKoZOsesAtgt4Xqhek';

const BACKUP_COCKPITS = [
    { sheetName: 'Cockpit Wall Street', squad: 'wall-street', nome: 'Wall Street' },
    { sheetName: 'Cockpit Romans', squad: 'romans', nome: 'Romans' },
    { sheetName: 'Cockpit Legacy', squad: 'legacy', nome: 'Legacy' },
    { sheetName: 'Cockpit Monsters', squad: 'monsters-sa', nome: 'Monsters S/A' }
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
    const nameIdx = findColIndex(headers, 'name', 'nome', 'cliente');
    const coordIdx = findColIndex(headers, 'coordenador', 'coodernador');
    const accountIdx = findColIndex(headers, 'account');
    const gtIdx = findColIndex(headers, 'gt');
    const feeIdx = findColIndex(headers, 'fee');
    const flagIdx = findColIndex(headers, 'flag calculada', 'flag');
    const healthIdx = findColIndex(headers, 'health', 'pontuação');
    const statusIdx = findColIndex(headers, 'customer care status');
    const atualizacaoIdx = findColIndex(headers, 'data de atualização', 'data atualização', 'atualizado');

    const id = idIdx >= 0 ? row[idIdx] : '';
    const name = nameIdx >= 0 ? row[nameIdx] : '';
    const coordenador = coordIdx >= 0 ? row[coordIdx] : '';
    const account = accountIdx >= 0 ? row[accountIdx] : '';
    const gt = gtIdx >= 0 ? row[gtIdx] : '';
    const flag = flagIdx >= 0 ? row[flagIdx] : '';
    const health = healthIdx >= 0 ? row[healthIdx] : '';
    const customerCareStatus = statusIdx >= 0 ? row[statusIdx] : '';
    const dataAtualizacao = atualizacaoIdx >= 0 ? row[atualizacaoIdx] : '';

    if (!name) return null;

    let fee = 0;
    if (feeIdx >= 0) {
        fee = parseFloat(String(row[feeIdx] || '0').replace(/[R$\s.]/g, '').replace(',', '.'));
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

async function fetchBackupSheet(sheetName) {
    const params = new URLSearchParams({
        id: BACKUP_SHEET_ID,
        title: sheetName,
        gid: '0'
    });

    const resp = await fetch(`${sheetsEndpoint()}?${params.toString()}`, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return data.rows || [];
}

export async function fetchAllCockpitsFromBackup(progressEl) {
    const all = [];

    for (let i = 0; i < BACKUP_COCKPITS.length; i++) {
        const cockpit = BACKUP_COCKPITS[i];
        if (progressEl) progressEl.textContent = `Backup: ${cockpit.nome}... (${i + 1}/${BACKUP_COCKPITS.length})`;

        try {
            const rows = await fetchBackupSheet(cockpit.sheetName);
            if (rows.length < 2) continue;

            const headers = rows[0];
            for (let j = 1; j < rows.length; j++) {
                const client = normalizeClient(rows[j], headers, cockpit.squad);
                if (client) all.push(client);
            }
        } catch (e) {
            console.warn(`[Backup] Falha ao buscar ${cockpit.nome}: ${e.message}`);
        }

        if (i < BACKUP_COCKPITS.length - 1) {
            await new Promise(r => setTimeout(r, 300));
        }
    }

    if (all.length === 0) throw new Error('Nenhum cockpit backup pôde ser carregado');
    return all;
}

export async function fetchRoiWeekFromBackup(progressEl) {
    if (progressEl) progressEl.textContent = 'Backup: Buscando ROI Week...';

    const rows = await fetchBackupSheet('ROI Week');
    if (rows.length < 2) return [];

    const headers = rows[0];
    const idIdx = headers.findIndex(h => h && h.toLowerCase() === 'id');
    const clienteIdx = headers.findIndex(h => h && h.toLowerCase().includes('cliente'));
    const projetoIdx = headers.findIndex(h => h && h.toLowerCase().includes('projeto'));
    const investIdx = headers.findIndex(h => h && h.toLowerCase().includes('investimento'));
    const mcIdx = headers.findIndex(h => h && h.toLowerCase().includes('mc'));
    const fatIdx = headers.findIndex(h => h && h.toLowerCase().includes('faturamento'));
    const vendasIdx = headers.findIndex(h => h && h.toLowerCase().includes('vendas'));
    const dataAtualIdx = headers.findIndex(h => h && h.toLowerCase().includes('data atualização'));
    const dataRefIdx = headers.findIndex(h => h && h.toLowerCase().includes('data ref'));
    const statusIdx = headers.findIndex(h => h && h.toLowerCase().includes('status'));
    const urlIdx = headers.findIndex(h => h && h.toLowerCase().includes('card url'));

    const records = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cliente = clienteIdx >= 0 ? row[clienteIdx] : '';
        if (!cliente) continue;

        const dataAtual = dataAtualIdx >= 0 ? row[dataAtualIdx] : '';
        const dataRef = dataRefIdx >= 0 ? row[dataRefIdx] : '';
        let dataObj = null;
        if (dataRef) {
            const p = dataRef.split('/');
            if (p.length === 3) dataObj = new Date(p[2], p[1] - 1, p[0]);
        }

        records.push({
            cliente_id: idIdx >= 0 ? row[idIdx] : '',
            cliente_nome: cliente,
            projeto: projetoIdx >= 0 ? row[projetoIdx] : '',
            investimento: investIdx >= 0 ? parseFloat(String(row[investIdx] || '0').replace(/[R$\s.]/g, '').replace(',', '.')) || 0 : 0,
            mc: mcIdx >= 0 ? parseFloat(String(row[mcIdx] || '0').replace('%', '').replace(',', '.')) || 0 : 0,
            faturamento: fatIdx >= 0 ? parseFloat(String(row[fatIdx] || '0').replace(/[R$\s.]/g, '').replace(',', '.')) || 0 : 0,
            vendas: vendasIdx >= 0 ? parseFloat(String(row[vendasIdx] || '0').replace(/[R$\s.]/g, '').replace(',', '.')) || 0 : 0,
            data_atualizacao: dataAtual,
            data_obj: dataObj,
            card_url: urlIdx >= 0 ? row[urlIdx] : '',
            created_at: dataAtual
        });
    }

    if (progressEl) progressEl.textContent = `Backup: ${records.length} cards ROI Week carregados.`;
    return records;
}

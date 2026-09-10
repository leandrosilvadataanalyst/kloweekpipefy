const { replaceAll, appendRow, ensureSheetExists } = require('./sheets-writer');

const BACKUP_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_BACKUP_ID || '13GcuQBrOhsGJO0T39UQS8xoGAVKoZOsesAtgt4Xqhek';
const PIPEFY_TOKEN = process.env.PIPEFY_TOKEN || '';
const GOOGLE_API_KEY = process.env.GOOGLE_SHEETS_API_KEY || '';

const PIPES = {
    ROI_WEEK: '303444567',
    ADITIVO: '303700294',
    DATABASE_CLIENTES: '301753761',
    DATABASE_PROJETO: '305733459'
};

const COCKPITS = [
    { id: '1zMpTklO0jLCZcMFan_KKTctbgMySRqd_pVxsrHdsz5U', title: '[Cockpit - Teste]', gid: '330387776', squad: 'wall-street', nome: 'Wall Street' },
    { id: '1U7ciY_zNsbb6esFMMgwSOC-R16kFO5Z4ddACdBNhDtA', title: '[Cockpit - Teste]', gid: '5', squad: 'romans', nome: 'Romans' },
    { id: '17y3rdmRMO3moQP9haBJOg5Z8bv-4T4BVtfvMowm3jv8', title: '[ Cockpit ]', gid: '330387776', squad: 'legacy', nome: 'Legacy' },
    { id: '1Oj971TOsgJQ_3A5sBRGHcEgx53y2r-PuZeOd_E002Ao', title: '[COCKPIT]', gid: '3', squad: 'monsters-sa', nome: 'Monsters S/A' }
];

const COCKPIT_HEADER = [
    'ID', 'Nome', 'Squad', 'Coordenador', 'Account', 'GT',
    'Fee', 'Flag', 'Health', 'Customer Care Status', 'Data Atualização', 'Sincronizado Em'
];

const ROI_WEEK_HEADER = [
    'ID', 'Cliente', 'Projeto', 'Investimento', 'MC (%)',
    'Faturamento', 'Vendas', 'Data Atualização', 'Data Ref',
    'Squad', 'Status', 'Card URL', 'Sincronizado Em'
];

const DB_CLIENTES_HEADER = ['ID', 'Nome', 'Fee', 'Produto', 'Data Assinatura', 'Sincronizado Em'];
const DB_PROJETO_HEADER = ['ID', 'Nome', 'Status', 'Fase', 'Sincronizado Em'];
const SYNC_LOG_HEADER = ['Timestamp', 'Origem', 'Ação', 'Registros', 'Status', 'Detalhes'];

async function pipefyQuery(query) {
    const res = await fetch('https://api.pipefy.com/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${PIPEFY_TOKEN}`
        },
        body: JSON.stringify({ query })
    });
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0].message);
    return data.data;
}

async function getAllCards(pipeId) {
    let allCards = [];
    let cursor = null;
    let hasNext = true;
    let page = 1;

    while (hasNext) {
        const after = cursor ? `, after: "${cursor}"` : '';
        const q = `{ cards(pipe_id: "${pipeId}", first: 50${after}) { edges { node { id title current_phase { id name } createdAt fields { name value float_value datetime_value } } } pageInfo { hasNextPage endCursor } } }`;
        const r = await pipefyQuery(q);
        if (!r?.cards?.edges?.length) break;
        allCards = allCards.concat(r.cards.edges);
        hasNext = r.cards.pageInfo.hasNextPage;
        cursor = r.cards.pageInfo.endCursor;
        page++;
        if (allCards.length > 5000) break;
    }
    return allCards;
}

function extractField(node, name) {
    const lower = name.toLowerCase();
    const f = node.fields.find(f => f.name.toLowerCase().includes(lower) || lower.includes(f.name.toLowerCase()));
    return f?.value || null;
}

function extractFloat(node, name) {
    const f = node.fields.find(f => f.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(f.name.toLowerCase()));
    if (!f) return 0;
    if (f.float_value != null) return f.float_value;
    const val = f.value;
    if (!val) return 0;
    return parseFloat(String(val).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

function parseDate(value) {
    if (!value) return null;
    const str = String(value).trim();
    if (!str || str === 'null') return null;
    if (str.includes('-')) {
        const d = new Date(str + (str.length === 10 ? 'T00:00:00' : ''));
        return isNaN(d) ? null : d;
    }
    const p = str.split('/');
    if (p.length === 3) {
        const d = new Date(p[2], p[1] - 1, p[0]);
        return isNaN(d) ? null : d;
    }
    return null;
}

function formatDate(d) {
    if (!d || isNaN(d)) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

async function syncRoiWeek() {
    console.log('Sync: Buscando ROI Week...');
    const edges = await getAllCards(PIPES.ROI_WEEK);
    const now = new Date().toISOString();

    const rows = edges.map(e => {
        const dataRaw = extractField(e.node, 'Data de Atualização') || e.node.createdAt;
        const dataObj = parseDate(dataRaw);
        return [
            e.node.id,
            e.node.title,
            extractField(e.node, 'Projeto [USAR ESTE]') || '',
            extractFloat(e.node, 'Investimento em mídia no mês'),
            extractFloat(e.node, 'Margem de contribuição'),
            extractFloat(e.node, 'Faturamento (vendas V4)'),
            extractFloat(e.node, 'Vendas realizadas (apenas geradas pela V4)'),
            dataRaw || '',
            formatDate(dataObj),
            '',
            e.node.current_phase?.name || '',
            `https://app.pipefy.com/open-cards/${e.node.id}`,
            now
        ];
    });

    await replaceAll(BACKUP_SPREADSHEET_ID, 'ROI Week', ROI_WEEK_HEADER, rows);
    console.log(`Sync: ROI Week - ${rows.length} cards gravados`);
    return rows.length;
}

async function syncCockpit(cockpit) {
    console.log(`Sync: Buscando ${cockpit.nome}...`);
    const range = encodeURIComponent(`${cockpit.title}!A1:Z500`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${cockpit.id}/values/${range}?key=${GOOGLE_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google retornou ${res.status} para ${cockpit.nome}`);

    const data = await res.json();
    const rows = data.values || [];
    if (rows.length < 2) return 0;

    const headers = rows[0];
    const now = new Date().toISOString();

    const findCol = (...candidates) => {
        for (const c of candidates) {
            const re = new RegExp(`\\b${c.toLowerCase()}\\b`);
            const idx = headers.findIndex(h => h && re.test(h.toLowerCase()));
            if (idx !== -1) return idx;
        }
        return -1;
    };

    const idIdx = findCol('id');
    const nameIdx = findCol('name', 'nome do projeto', 'cliente');
    const churnIdx = findCol('churn');
    const coordIdx = findCol('coordenador', 'coodernador');
    const accountIdx = findCol('account');
    const gtIdx = findCol('gt');
    const feeIdx = findCol('fee');
    const flagIdx = findCol('flag calculada', 'flag');
    const healthIdx = findCol('health', 'pontuação');
    const statusIdx = findCol('customer care status');
    const atualizacaoIdx = findCol('data de atualização', 'data atualização', 'atualizado');

    const dataRows = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const name = nameIdx >= 0 ? row[nameIdx] : '';
        if (!name) continue;
        const churnRaw = churnIdx >= 0 ? (row[churnIdx] || '').toLowerCase().trim() : '';
        if (churnRaw && churnRaw !== 'não' && churnRaw !== 'nao' && churnRaw !== 'n' && churnRaw !== '') continue;

        let fee = 0;
        if (feeIdx >= 0) {
            fee = parseFloat(String(row[feeIdx] || '0').replace(/[R$\s.]/g, '').replace(',', '.'));
            if (isNaN(fee)) fee = 0;
        }

        dataRows.push([
            idIdx >= 0 ? row[idIdx] : '',
            String(name).toUpperCase().trim(),
            cockpit.squad,
            coordIdx >= 0 ? row[coordIdx] : '',
            accountIdx >= 0 ? row[accountIdx] : '',
            gtIdx >= 0 ? row[gtIdx] : '',
            fee,
            flagIdx >= 0 ? row[flagIdx] : '',
            healthIdx >= 0 ? row[healthIdx] : '',
            statusIdx >= 0 ? row[statusIdx] : '',
            atualizacaoIdx >= 0 ? row[atualizacaoIdx] : '',
            now
        ]);
    }

    await replaceAll(BACKUP_SPREADSHEET_ID, `Cockpit ${cockpit.nome}`, COCKPIT_HEADER, dataRows);
    console.log(`Sync: ${cockpit.nome} - ${dataRows.length} clientes gravados`);
    return dataRows.length;
}

async function syncDatabasePipes() {
    console.log('Sync: Buscando DATABASE_CLIENTES...');
    const clientesEdges = await getAllCards(PIPES.DATABASE_CLIENTES);
    const now = new Date().toISOString();

    const clientesRows = clientesEdges.map(e => [
        e.node.id,
        e.node.title,
        extractFloat(e.node, 'Valor do Fee'),
        extractField(e.node, 'Produto') || '',
        extractField(e.node, 'Data da assinatura do contrato') || '',
        now
    ]);

    await replaceAll(BACKUP_SPREADSHEET_ID, 'Database Clientes', DB_CLIENTES_HEADER, clientesRows);
    console.log(`Sync: DATABASE_CLIENTES - ${clientesRows.length} registros`);

    console.log('Sync: Buscando DATABASE_PROJETO...');
    const projetoEdges = await getAllCards(PIPES.DATABASE_PROJETO);

    const projetoRows = projetoEdges.map(e => [
        e.node.id,
        e.node.title,
        e.node.current_phase?.name || '',
        extractField(e.node, 'Produto') || '',
        now
    ]);

    await replaceAll(BACKUP_SPREADSHEET_ID, 'Database Projeto', DB_PROJETO_HEADER, projetoRows);
    console.log(`Sync: DATABASE_PROJETO - ${projetoRows.length} registros`);

    return { clientes: clientesRows.length, projetos: projetoRows.length };
}

export default async function handler(req, res) {
    if (req.method === 'GET' && req.query.secret !== (process.env.CRON_SECRET || 'kloweek-cron-secret')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const results = { start: new Date().toISOString(), tasks: [], errors: [] };

    try {
        await ensureSheetExists(BACKUP_SPREADSHEET_ID, 'Sync Log');
    } catch (e) {
        console.error('Erro ao criar Sync Log:', e.message);
    }

    try {
        const roiCount = await syncRoiWeek();
        results.tasks.push({ name: 'ROI Week', status: 'ok', count: roiCount });
    } catch (e) {
        console.error('Erro ROI Week:', e.message);
        results.tasks.push({ name: 'ROI Week', status: 'erro', error: e.message });
        results.errors.push(`ROI Week: ${e.message}`);
    }

    for (const cockpit of COCKPITS) {
        try {
            const count = await syncCockpit(cockpit);
            results.tasks.push({ name: cockpit.nome, status: 'ok', count });
        } catch (e) {
            console.error(`Erro ${cockpit.nome}:`, e.message);
            results.tasks.push({ name: cockpit.nome, status: 'erro', error: e.message });
            results.errors.push(`${cockpit.nome}: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 500));
    }

    try {
        const db = await syncDatabasePipes();
        results.tasks.push({ name: 'DATABASE_CLIENTES', status: 'ok', count: db.clientes });
        results.tasks.push({ name: 'DATABASE_PROJETO', status: 'ok', count: db.projetos });
    } catch (e) {
        console.error('Erro Database:', e.message);
        results.tasks.push({ name: 'DATABASE', status: 'erro', error: e.message });
        results.errors.push(`Database: ${e.message}`);
    }

    const totalRecords = results.tasks.filter(t => t.status === 'ok').reduce((s, t) => s + (t.count || 0), 0);
    results.end = new Date().toISOString();
    results.totalRecords = totalRecords;
    results.success = results.errors.length === 0;

    try {
        await appendRow(BACKUP_SPREADSHEET_ID, 'Sync Log', [
            results.end,
            'Cron Sync',
            'full-sync',
            String(totalRecords),
            results.success ? 'OK' : 'ERRO PARCIAL',
            results.errors.length > 0 ? results.errors.join('; ') : 'Todas as fontes sincronizadas'
        ]);
    } catch (e) {
        console.error('Erro ao logar:', e.message);
    }

    console.log(`Sync completo: ${totalRecords} registros, ${results.errors.length} erros`);
    return res.status(200).json(results);
}

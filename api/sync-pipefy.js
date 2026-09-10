const { getSupabase } = require('./supabase-client');

const PIPEFY_TOKEN = process.env.PIPEFY_TOKEN || '';
const PIPES = {
    ROI_WEEK: '303444567',
    DATABASE_CLIENTES: '301753761',
    DATABASE_PROJETO: '305733459'
};

// ─── Pipefy Helpers ────────────────────────────────────────

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

    while (hasNext) {
        const after = cursor ? `, after: "${cursor}"` : '';
        const q = `{ cards(pipe_id: "${pipeId}", first: 50${after}) { edges { node { id title current_phase { id name } createdAt fields { name value float_value datetime_value } } } pageInfo { hasNextPage endCursor } } }`;
        const r = await pipefyQuery(q);
        if (!r?.cards?.edges?.length) break;
        allCards = allCards.concat(r.cards.edges);
        hasNext = r.cards.pageInfo.hasNextPage;
        cursor = r.cards.pageInfo.endCursor;
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
        return isNaN(d) ? null : d.toISOString().split('T')[0];
    }
    const p = str.split('/');
    if (p.length === 3) {
        const d = new Date(p[2], p[1] - 1, p[0]);
        return isNaN(d) ? null : d.toISOString().split('T')[0];
    }
    return null;
}

function extractAllFields(node) {
    const raw = {};
    for (const f of node.fields) {
        raw[f.name] = f.value || f.float_value || null;
    }
    return raw;
}

// ─── Sync Functions ────────────────────────────────────────

async function syncRoiWeek(supabase) {
    console.log('Sync: Buscando ROI Week...');
    const edges = await getAllCards(PIPES.ROI_WEEK);
    const rows = edges.map(e => ({
        id: e.node.id,
        cliente_nome: e.node.title,
        projeto: extractField(e.node, 'Projeto [USAR ESTE]') || '',
        investimento: extractFloat(e.node, 'Investimento em mídia no mês'),
        mc: extractFloat(e.node, 'Margem de contribuição'),
        faturamento: extractFloat(e.node, 'Faturamento (vendas V4)'),
        vendas: extractFloat(e.node, 'Vendas realizadas (apenas geradas pela V4)'),
        data_atualizacao: extractField(e.node, 'Data de Atualização') || e.node.createdAt || '',
        data_obj: parseDate(extractField(e.node, 'Data de Atualização') || e.node.createdAt),
        phase_id: e.node.current_phase?.id || '',
        phase_name: e.node.current_phase?.name || '',
        card_url: `https://app.pipefy.com/open-cards/${e.node.id}`,
        pipefy_created_at: e.node.createdAt,
        raw_fields: extractAllFields(e.node)
    }));

    const { error } = await supabase
        .from('roi_week')
        .upsert(rows, { onConflict: 'id' });

    if (error) throw new Error(`ROI Week upsert: ${error.message}`);
    console.log(`Sync: ROI Week - ${rows.length} cards`);
    return rows.length;
}

async function syncDatabaseClientes(supabase) {
    console.log('Sync: Buscando DATABASE_CLIENTES...');
    const edges = await getAllCards(PIPES.DATABASE_CLIENTES);
    const rows = edges.map(e => ({
        id: e.node.id,
        nome: e.node.title,
        fee: extractFloat(e.node, 'Valor do Fee'),
        produto: extractField(e.node, 'Produto') || '',
        data_assinatura: extractField(e.node, 'Data da assinatura do contrato') || '',
        phase_id: e.node.current_phase?.id || '',
        phase_name: e.node.current_phase?.name || '',
        raw_fields: extractAllFields(e.node)
    }));

    const { error } = await supabase
        .from('database_clientes')
        .upsert(rows, { onConflict: 'id' });

    if (error) throw new Error(`DB Clientes upsert: ${error.message}`);
    console.log(`Sync: DATABASE_CLIENTES - ${rows.length} registros`);
    return rows.length;
}

async function syncDatabaseProjeto(supabase) {
    console.log('Sync: Buscando DATABASE_PROJETO...');
    const edges = await getAllCards(PIPES.DATABASE_PROJETO);
    const rows = edges.map(e => ({
        id: e.node.id,
        nome: e.node.title,
        status: '',
        fase: extractField(e.node, 'Fase') || '',
        produto: extractField(e.node, 'Produto') || '',
        phase_id: e.node.current_phase?.id || '',
        phase_name: e.node.current_phase?.name || '',
        raw_fields: extractAllFields(e.node)
    }));

    const { error } = await supabase
        .from('database_projeto')
        .upsert(rows, { onConflict: 'id' });

    if (error) throw new Error(`DB Projeto upsert: ${error.message}`);
    console.log(`Sync: DATABASE_PROJETO - ${rows.length} registros`);
    return rows.length;
}

async function syncCockpitsFromGoogle(supabase) {
    const COCKPITS = [
        { id: '1zMpTklO0jLCZcMFan_KKTctbgMySRqd_pVxsrHdsz5U', title: '[Cockpit - Teste]', gid: '330387776', squad: 'wall-street', nome: 'Wall Street' },
        { id: '1U7ciY_zNsbb6esFMMgwSOC-R16kFO5Z4ddACdBNhDtA', title: '[Cockpit - Teste]', gid: '330387776', squad: 'romans', nome: 'Romans' },
        { id: '17y3rdmRMO3moQP9haBJOg5Z8bv-4T4BVtfvMowm3jv8', title: '[ Cockpit ]', gid: '330387776', squad: 'legacy', nome: 'Legacy' },
        { id: '1Oj971TOsgJQ_3A5sBRGHcEgx53y2r-PuZeOd_E002Ao', title: '[COCKPIT]', gid: '330387776', squad: 'monsters-sa', nome: 'Monsters S/A' }
    ];
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    if (!apiKey) {
        console.log('Sync: GOOGLE_SHEETS_API_KEY não configurada, pulando cockpits');
        return 0;
    }

    let totalRows = 0;
    for (const cockpit of COCKPITS) {
        try {
            const range = encodeURIComponent(`${cockpit.title}!A1:Z500`);
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${cockpit.id}/values/${range}?key=${apiKey}`;
            const res = await fetch(url);
            if (!res.ok) continue;

            const data = await res.json();
            const srcRows = data.values || [];
            if (srcRows.length < 2) continue;

            const headers = srcRows[0];
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

            const rows = [];
            for (let i = 1; i < srcRows.length; i++) {
                const row = srcRows[i];
                const name = nameIdx >= 0 ? row[nameIdx] : '';
                if (!name) continue;
                const churnRaw = churnIdx >= 0 ? (row[churnIdx] || '').toLowerCase().trim() : '';
                const isChurn = churnRaw && churnRaw !== 'não' && churnRaw !== 'nao' && churnRaw !== 'n' && churnRaw !== '';

                let fee = 0;
                if (feeIdx >= 0) {
                    fee = parseFloat(String(row[feeIdx] || '0').replace(/[R$\s.]/g, '').replace(',', '.'));
                    if (isNaN(fee)) fee = 0;
                }

                rows.push({
                    id: idIdx >= 0 ? row[idIdx] : `${cockpit.squad}-${i}`,
                    nome: String(name).toUpperCase().trim(),
                    squad: cockpit.squad,
                    coordenador: coordIdx >= 0 ? row[coordIdx] : '',
                    account: accountIdx >= 0 ? row[accountIdx] : '',
                    gt: gtIdx >= 0 ? row[gtIdx] : '',
                    fee,
                    flag: flagIdx >= 0 ? row[flagIdx] : '',
                    health: healthIdx >= 0 ? row[healthIdx] : '',
                    customer_care_status: statusIdx >= 0 ? row[statusIdx] : '',
                    data_atualizacao: atualizacaoIdx >= 0 ? row[atualizacaoIdx] : '',
                    churn: isChurn
                });
            }

            const { error } = await supabase
                .from('cockpits')
                .upsert(rows, { onConflict: 'id' });

            if (error) console.error(`Cockpit ${cockpit.nome} upsert error:`, error.message);
            else {
                console.log(`Sync: ${cockpit.nome} - ${rows.length} clientes`);
                totalRows += rows.length;
            }
        } catch (e) {
            console.error(`Cockpit ${cockpit.nome} sync error:`, e.message);
        }
        await new Promise(r => setTimeout(r, 500));
    }
    return totalRows;
}

// ─── Handler ───────────────────────────────────────────────

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const secret = req.query.secret || req.headers['x-sync-secret'];
    const expected = process.env.SYNC_SECRET || 'kloweek-sync';
    if (secret !== expected) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabase();
    const results = { start: new Date().toISOString(), tasks: [], errors: [] };

    // Sync ROI Week
    try {
        const count = await syncRoiWeek(supabase);
        results.tasks.push({ name: 'ROI Week', status: 'ok', count });
    } catch (e) {
        results.tasks.push({ name: 'ROI Week', status: 'erro', error: e.message });
        results.errors.push(`ROI Week: ${e.message}`);
    }

    // Sync Database Clientes
    try {
        const count = await syncDatabaseClientes(supabase);
        results.tasks.push({ name: 'DATABASE_CLIENTES', status: 'ok', count });
    } catch (e) {
        results.tasks.push({ name: 'DATABASE_CLIENTES', status: 'erro', error: e.message });
        results.errors.push(`DB Clientes: ${e.message}`);
    }

    // Sync Database Projeto
    try {
        const count = await syncDatabaseProjeto(supabase);
        results.tasks.push({ name: 'DATABASE_PROJETO', status: 'ok', count });
    } catch (e) {
        results.tasks.push({ name: 'DATABASE_PROJETO', status: 'erro', error: e.message });
        results.errors.push(`DB Projeto: ${e.message}`);
    }

    // Sync Cockpits from Google Sheets
    try {
        const count = await syncCockpitsFromGoogle(supabase);
        results.tasks.push({ name: 'Cockpits', status: 'ok', count });
    } catch (e) {
        results.tasks.push({ name: 'Cockpits', status: 'erro', error: e.message });
        results.errors.push(`Cockpits: ${e.message}`);
    }

    // Log
    const totalRecords = results.tasks.filter(t => t.status === 'ok').reduce((s, t) => s + (t.count || 0), 0);
    results.end = new Date().toISOString();
    results.totalRecords = totalRecords;
    results.success = results.errors.length === 0;

    try {
        await supabase.from('sync_log').insert({
            origem: 'sync-pipefy',
            acao: 'full-sync',
            registros: totalRecords,
            status: results.success ? 'OK' : 'ERRO PARCIAL',
            detalhes: results.errors.length > 0 ? results.errors.join('; ') : 'Todas as fontes sincronizadas'
        });
    } catch (e) {
        console.error('Log error:', e.message);
    }

    console.log(`Sync completo: ${totalRecords} registros, ${results.errors.length} erros`);
    return res.status(200).json(results);
}

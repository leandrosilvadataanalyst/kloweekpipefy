const BACKUP_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_BACKUP_ID || '13GcuQBrOhsGJO0T39UQS8xoGAVKoZOsesAtgt4Xqhek';
const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || '';

const ROI_WEEK_HEADER = [
    'ID', 'Cliente', 'Projeto', 'Investimento', 'MC (%)',
    'Faturamento', 'Vendas', 'Data Atualização', 'Data Ref',
    'Squad', 'Status', 'Card URL', 'Sincronizado Em'
];

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

function formatRow(card) {
    const dataAtualizacao = extractField(card, 'Data de Atualização') || card.createdAt;
    const dataObj = parseDate(dataAtualizacao);
    return [
        card.id || '',
        card.title || '',
        extractField(card, 'Projeto [USAR ESTE]') || '',
        extractFloat(card, 'Investimento em mídia no mês'),
        extractFloat(card, 'Margem de contribuição'),
        extractFloat(card, 'Faturamento (vendas V4)'),
        extractFloat(card, 'Vendas realizadas (apenas geradas pela V4)'),
        dataAtualizacao || '',
        dataObj ? `${String(dataObj.getDate()).padStart(2, '0')}/${String(dataObj.getMonth() + 1).padStart(2, '0')}/${dataObj.getFullYear()}` : '',
        '',
        card.current_phase?.name || '',
        `https://app.pipefy.com/open-cards/${card.id}`,
        new Date().toISOString()
    ];
}

async function sendToBackup(sheetName, action, rows) {
    if (!APPS_SCRIPT_URL) {
        console.log(`Backup skipped (no Apps Script URL): ${sheetName} ${rows.length} rows`);
        return;
    }
    const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet: sheetName, action, rows })
    });
    const result = await resp.json();
    if (!result.ok) throw new Error(result.error || 'Apps Script failed');
    return result;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Pipefy-Secret');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const secret = req.headers['x-pipefy-secret'];
    const expectedSecret = process.env.PIPEFY_WEBHOOK_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
        return res.status(401).json({ error: 'Secret inválido' });
    }

    try {
        const body = req.body;
        const action = body.action;
        const card = body.card || body.data?.card;

        if (!card) {
            return res.status(400).json({ error: 'Card não encontrado no payload' });
        }

        console.log(`PipefyWebhook: action=${action} card=${card.id} title=${card.title}`);

        const row = formatRow(card);

        if (action === 'card.create' || action === 'card.move' || action === 'card.update') {
            await sendToBackup('ROI Week', 'append', [row]);
        }

        await sendToBackup('Sync Log', 'append', [[
            new Date().toISOString(),
            'Pipefy Webhook',
            action,
            '1',
            'OK',
            `Card: ${card.title} (${card.id})`
        ]]);

        return res.status(200).json({ ok: true, action, cardId: card.id });
    } catch (e) {
        console.error(`PipefyWebhook ERR: ${e.message}`);
        try {
            await sendToBackup('Sync Log', 'append', [[
                new Date().toISOString(),
                'Pipefy Webhook',
                req.body?.action || 'unknown',
                '0',
                'ERRO',
                e.message
            ]]);
        } catch (logErr) {
            console.error('Falha ao logar erro:', logErr.message);
        }
        return res.status(500).json({ error: e.message });
    }
}

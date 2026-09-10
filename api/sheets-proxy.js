export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

    const id = String(req.query.id || '').trim();
    const title = String(req.query.title || '').trim();
    const gid = String(req.query.gid || '').trim();

    if (!id || title === '' || gid === '') {
        return res.status(400).json({ error: 'Parâmetros id, title e gid são obrigatórios' });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        return res.status(400).json({ error: 'ID de planilha inválido' });
    }

    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    if (!apiKey) return res.status(401).json({ error: 'GOOGLE_SHEETS_API_KEY não configurada' });

    const range = encodeURIComponent(`${title}!A1:Z500`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?key=${encodeURIComponent(apiKey)}`;

    console.log(`SheetsProxy REQ: id=${id} title=${title} gid=${gid}`);

    try {
        const upRes = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(30000)
        });
        const text = await upRes.text();
        if (upRes.status !== 200) {
            let googleError = '';
            try {
                const decoded = JSON.parse(text);
                if (decoded.error && decoded.error.message) googleError = ': ' + decoded.error.message;
            } catch (e) {}
            console.error(`SheetsProxy FAIL: ${id} title=${title} gid=${gid} http=${upRes.status} resp=${text.slice(0, 500)}`);
            return res.status(502).json({ error: `Google Sheets retornou HTTP ${upRes.status}${googleError}. Dados da planilha indisponíveis.` });
        }
        const data = JSON.parse(text);
        const rows = data.values || [];
        console.log(`SheetsProxy OK: ${id} title=${title} rows=${rows.length}`);
        return res.json({ id, title, gid, rows, total_rows: rows.length });
    } catch (e) {
        console.error(`SheetsProxy ERR: ${e.message}`);
        return res.status(502).json({ error: 'Erro de rede ao acessar Google Sheets: ' + e.message });
    }
}
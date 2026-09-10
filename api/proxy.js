export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const token = process.env.PIPEFY_TOKEN;
    if (!token) return res.status(401).json({ error: 'Token não configurado' });

    const body = req.body;
    if (!body || !body.query) return res.status(400).json({ error: 'Query não fornecida' });

    try {
        const upRes = await fetch('https://api.pipefy.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(body)
        });
        const text = await upRes.text();
        res.status(upRes.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e) {
        return res.status(502).json({ error: 'Erro ao acessar Pipefy: ' + e.message });
    }
}
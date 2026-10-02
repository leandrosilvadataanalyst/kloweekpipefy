// Vínculo manual cliente → título do card do ROI Week (Vercel) — espelho de vinculo.php (XAMPP).
//   GET → { rows } · POST { cliente_chave, cliente_nome, squad, card_titulo, card_id } · DELETE ?cliente_chave=
const { getSupabase } = require('./supabase-client');

const tabelaAusente = (error) => ['42P01', 'PGRST205'].includes(error?.code);
const texto = (v, max) => String(v ?? '').trim().slice(0, max);

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
        const supabase = getSupabase();

        if (req.method === 'GET') {
            const { data, error } = await supabase.from('vinculo_card')
                .select('cliente_chave,cliente_nome,squad,card_titulo,card_id,updated_at').order('cliente_nome');
            if (error && tabelaAusente(error)) return res.json({ rows: [], aviso: 'Tabela vinculo_card ausente: rode a migração do schema.sql' });
            if (error) return res.status(502).json({ error: `Falha ao ler vinculo_card: ${error.message}` });
            return res.json({ rows: data });
        }

        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
            const row = {
                cliente_chave: texto(body.cliente_chave, 200),
                cliente_nome: texto(body.cliente_nome, 200),
                squad: texto(body.squad, 50),
                card_titulo: texto(body.card_titulo, 300),
                card_id: String(body.card_id ?? '').replace(/\D/g, ''),
                updated_at: new Date().toISOString()
            };
            if (!row.cliente_chave || !row.card_titulo) return res.status(400).json({ error: 'cliente_chave e card_titulo são obrigatórios' });
            const { data, error } = await supabase.from('vinculo_card').upsert(row, { onConflict: 'cliente_chave' }).select();
            if (error && tabelaAusente(error)) return res.status(409).json({ error: 'Tabela vinculo_card ausente: rode a migração do schema.sql no Supabase' });
            if (error) return res.status(502).json({ error: `Falha ao gravar: ${error.message}` });
            return res.json({ ok: true, row: data?.[0] || row });
        }

        if (req.method === 'DELETE') {
            const chave = texto(req.query.cliente_chave, 200);
            if (!chave) return res.status(400).json({ error: 'cliente_chave é obrigatório' });
            const { error } = await supabase.from('vinculo_card').delete().eq('cliente_chave', chave);
            if (error) return res.status(502).json({ error: `Falha ao remover: ${error.message}` });
            return res.json({ ok: true });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}

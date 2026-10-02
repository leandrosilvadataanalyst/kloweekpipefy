// Janela de preenchimento do ROI Week (Vercel) — espelho de janela.php (XAMPP).
//   GET → { rows } · POST { chave, dia_inicio, dia_fim, motivo } · DELETE ?chave=YYYY-MM
const { getSupabase } = require('./supabase-client');

const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

function validar(chave, ini, fim) {
    if (chave !== 'padrao' && !RE_MES.test(chave)) return 'Chave inválida (use "padrao" ou AAAA-MM)';
    if (!Number.isInteger(ini) || ini < 1 || ini > 31) return 'Dia de início inválido (1 a 31)';
    if (!Number.isInteger(fim) || fim < 1 || fim > 31) return 'Dia de fim inválido (1 a 31)';
    if (fim < ini) return 'O dia de fim deve ser igual ou posterior ao de início';
    return '';
}

const tabelaAusente = (error) => ['42P01', 'PGRST205'].includes(error?.code);

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
        const supabase = getSupabase();

        if (req.method === 'GET') {
            const { data, error } = await supabase.from('config_janela')
                .select('chave,dia_inicio,dia_fim,motivo,updated_at').order('chave');
            if (error && tabelaAusente(error)) return res.json({ rows: [], aviso: 'Tabela config_janela ausente: rode a migração do schema.sql' });
            if (error) return res.status(502).json({ error: `Falha ao ler config_janela: ${error.message}` });
            return res.json({ rows: data });
        }

        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
            const chave = String(body.chave || '').trim();
            const ini = Number(body.dia_inicio), fim = Number(body.dia_fim);
            const erro = validar(chave, ini, fim);
            if (erro) return res.status(400).json({ error: erro });
            const row = { chave, dia_inicio: ini, dia_fim: fim, motivo: String(body.motivo || '').trim().slice(0, 200), updated_at: new Date().toISOString() };
            const { data, error } = await supabase.from('config_janela').upsert(row, { onConflict: 'chave' }).select();
            if (error && tabelaAusente(error)) return res.status(409).json({ error: 'Tabela config_janela ausente: rode a migração do schema.sql no Supabase' });
            if (error) return res.status(502).json({ error: `Falha ao gravar: ${error.message}` });
            return res.json({ ok: true, row: data?.[0] || row });
        }

        if (req.method === 'DELETE') {
            const chave = String(req.query.chave || '').trim();
            if (!RE_MES.test(chave)) return res.status(400).json({ error: 'Só exceções de mês (AAAA-MM) podem ser removidas' });
            const { error } = await supabase.from('config_janela').delete().eq('chave', chave);
            if (error) return res.status(502).json({ error: `Falha ao remover: ${error.message}` });
            return res.json({ ok: true });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}

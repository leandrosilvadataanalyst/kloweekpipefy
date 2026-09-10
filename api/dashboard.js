const { getSupabase } = require('./supabase-client');

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

    try {
        const supabase = getSupabase();

        const monthsBack = parseInt(req.query.months) || 3;
        const dataLimite = new Date();
        dataLimite.setMonth(dataLimite.getMonth() - monthsBack);

        // Buscar cockpits (clientes elegíveis)
        const { data: cockpits, error: cockErr } = await supabase
            .from('cockpits')
            .select('*')
            .eq('churn', false);

        if (cockErr) throw new Error(`Cockpits: ${cockErr.message}`);

        // Buscar ROI Week (filtrado por período)
        const { data: roiWeek, error: roiErr } = await supabase
            .from('roi_week')
            .select('*')
            .gte('data_obj', dataLimite.toISOString().split('T')[0])
            .order('data_obj', { ascending: false });

        if (roiErr) throw new Error(`ROI Week: ${roiErr.message}`);

        // Montar resposta
        const clientes = cockpits.map(c => {
            const cLower = c.nome.toLowerCase();
            const cClean = cLower.replace(/[^\w\s]/g, '');
            const matches = roiWeek.filter(r => {
                const rNome = (r.cliente_nome || '').toLowerCase();
                const rProj = (r.projeto || '').toLowerCase();
                if (rNome.includes(cLower) || cLower.includes(rNome) ||
                    rProj.includes(cLower) || cLower.includes(rProj)) {
                    return true;
                }
                const rNomeClean = rNome.replace(/[^\w\s]/g, '');
                const rProjClean = rProj.replace(/[^\w\s]/g, '');
                return rNomeClean.includes(cClean) || cClean.includes(rNomeClean) ||
                       rProjClean.includes(cClean) || cClean.includes(rProjClean);
            });

            if (matches.length === 0) {
                return {
                    id: c.id, nome: c.nome, squad: c.squad,
                    coordenador: c.coordenador, account: c.account, gt: c.gt,
                    fee: c.fee, flag: c.flag, health: c.health,
                    customer_care_status: c.customer_care_status,
                    data_atualizacao: c.data_atualizacao,
                    roi: null, preenchido: false
                };
            }

            const roi = matches[0];
            const investimento = roi.investimento || 0;
            const faturamento = roi.faturamento || 0;
            const mcRaw = roi.mc || 0;
            const mcDec = mcRaw > 1 ? mcRaw / 100 : mcRaw;
            const vendas = roi.vendas || 0;

            return {
                id: c.id, nome: c.nome, squad: c.squad,
                coordenador: c.coordenador, account: c.account, gt: c.gt,
                fee: c.fee, flag: c.flag, health: c.health,
                customer_care_status: c.customer_care_status,
                data_atualizacao: c.data_atualizacao,
                roi: {
                    id: roi.id, projeto: roi.projeto,
                    investimento, mc: mcRaw, faturamento, vendas,
                    data_atualizacao: roi.data_atualizacao,
                    data_obj: roi.data_obj,
                    card_url: roi.card_url,
                    roi_calculado: investimento > 0 ? (faturamento * mcDec) / investimento : 0,
                    roas: investimento > 0 ? faturamento / investimento : 0,
                    cac: vendas > 0 ? investimento / vendas : 0
                },
                preenchido: true
            };
        });

        return res.json({
            clientes,
            cockpits_count: cockpits.length,
            roi_count: roiWeek.length,
            months: monthsBack
        });
    } catch (e) {
        console.error('Dashboard API error:', e.message);
        return res.status(500).json({ error: e.message });
    }
}

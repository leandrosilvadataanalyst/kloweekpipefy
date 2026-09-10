const { getSupabase } = require('./supabase-client');
const fs = require('fs');
const path = require('path');

// Carregar aliases de nomes
let aliases = {};
try {
    const aliasesPath = path.join(process.cwd(), 'data', 'client-aliases.json');
    if (fs.existsSync(aliasesPath)) {
        const aliasesData = JSON.parse(fs.readFileSync(aliasesPath, 'utf8'));
        aliases = aliasesData.razao_to_fantasia || {};
    }
} catch (e) {
    console.warn('Aliases não carregados:', e.message);
}

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
            const cNorm = c.nome.trim().toUpperCase();
            const cNormClean = cNorm.replace(/[^\w\s]/g, '');
            const aliasNames = aliases[cNormClean] || [];

            const matches = roiWeek.filter(r => {
                const rNome = (r.cliente_nome || '').trim().toLowerCase();
                const rProj = (r.projeto || '').trim().toLowerCase();
                const rProjClean = rProj.replace(/[[\]"']/g, '').trim();

                if (rNome && (rNome.includes(cLower) || cLower.includes(rNome))) return true;
                if (rProjClean && (rProjClean.includes(cLower) || cLower.includes(rProjClean))) return true;

                if (aliasNames.length > 0) {
                    const rNomeUpper = rNome.toUpperCase();
                    const rProjUpper = rProjClean.toUpperCase();
                    for (const alias of aliasNames) {
                        const aliasUpper = alias.trim().toUpperCase();
                        if (rNomeUpper === aliasUpper || rProjUpper === aliasUpper ||
                            rNomeUpper.includes(aliasUpper) || aliasUpper.includes(rNomeUpper) ||
                            rProjUpper.includes(aliasUpper) || aliasUpper.includes(rProjUpper)) {
                            return true;
                        }
                    }
                }

                const rNomeClean = rNome.replace(/[^\w\s]/g, '');
                const rProjClean2 = rProjClean.replace(/[^\w\s]/g, '');
                if (rNomeClean && (rNomeClean.includes(cClean) || cClean.includes(rNomeClean))) return true;
                if (rProjClean2 && (rProjClean2.includes(cClean) || cClean.includes(rProjClean2))) return true;
                return false;
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

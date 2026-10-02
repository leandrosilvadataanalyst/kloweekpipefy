// Nomes EXATOS dos campos do card "Formulário de ROI Week (interno)" no Pipefy (pipe 303444567).
// Fonte única: usados para LER os campos (PipefyService) e como RÓTULO em telas e exportações,
// para que o sistema use a mesma nomenclatura do card (ex.: "Faturamento (vendas V4)" = receita).
export const CAMPOS_ROI = Object.freeze({
    data: 'Data de Atualização',
    projeto: 'Projeto [USAR ESTE]',
    investimento: 'Investimento em mídia no mês',
    mc: 'Margem de contribuição',
    faturamento: 'Faturamento (vendas V4)',
    vendas: 'Vendas realizadas (apenas geradas pela V4)'
});

// Margem vem do Pipefy como 35 ou 0.35 — sempre exibir em %
export function mcPercentual(mc) {
    const n = Number(mc);
    if (!n || isNaN(n)) return 0;
    return n > 1 ? n : n * 100;
}

// Fonte única da lista/mensagem de cobrança do ROI Week (dashboard e relatório ROI).
// Entram SOMENTE os clientes ainda não identificados no Pipefy (sem card preenchido no ROI Week vigente):
// assim que o GT preenche o card, o cliente sai da cobrança na próxima atualização.

function norm(v) {
    return (v || '').toString().trim().replace(/\s+/g, ' ');
}

function nomeCliente(c) {
    return c.nome_fantasia || c.nome || '';
}

function razaoCliente(c) {
    return norm(c.razaoSocial ?? c.razao_social);
}

export function naoIdentificados(lista) {
    return (lista || []).filter(c => !c.preenchido);
}

export function agruparPorDupla(lista) {
    const grupos = new Map();
    (lista || []).forEach(c => {
        const squad = norm(c.squad) || 'Sem Squad';
        const coord = norm(c.coordenador) || 'Sem Coord';
        const gt = norm(c.gt) || 'Sem GT';
        const chave = `${squad}||${coord}||${gt}`;
        if (!grupos.has(chave)) grupos.set(chave, { squad, coord, gt, clientes: [] });
        grupos.get(chave).clientes.push(c);
    });
    return [...grupos.values()].sort((a, b) =>
        a.squad.localeCompare(b.squad) || a.coord.localeCompare(b.coord) || a.gt.localeCompare(b.gt)
    );
}

export function gerarMensagemCobranca(lista) {
    const pendentes = naoIdentificados(lista);
    if (pendentes.length === 0) return 'Todos os clientes já preencheram o ROI Week!';

    // Só sinaliza "sem razão social" se a coluna foi lida (alguém da lista tem razão social);
    // evita marcar todos quando a fonte ainda não traz o campo (ex.: Supabase antes da migração).
    const colunaLida = (lista || []).some(c => razaoCliente(c));

    let msg = '';
    agruparPorDupla(pendentes).forEach((g, i) => {
        if (i > 0) msg += '\n';
        msg += `${g.squad}: Coord ${g.coord} | GT: ${g.gt}\n`;
        msg += `Clientes com ROI Week pendente de preenchimento:\n`;
        g.clientes.forEach(c => {
            const aviso = colunaLida && !razaoCliente(c) ? ' (sem razão social no cockpit)' : '';
            msg += `- ${nomeCliente(c)}${aviso}\n`;
        });
    });
    return msg;
}

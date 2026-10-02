// Vínculos manuais cliente (cockpit) → título do card no Pipefy, feitos na tela Ajustes.
// Tabela vinculo_card (Supabase). O título vale para todos os meses: o card é recriado
// todo mês com o mesmo nome. No matcher, o vínculo é o nível 0 (vence razão social e nome).
import { normalizarNome } from './match-cliente.js';

export function chaveCliente(nome) {
    return normalizarNome(nome);
}

export function aplicarVinculos(clientes, rows) {
    const porChave = new Map();
    (rows || []).forEach(r => {
        if (!r?.cliente_chave || !r?.card_titulo) return;
        if (!porChave.has(r.cliente_chave)) porChave.set(r.cliente_chave, []);
        porChave.get(r.cliente_chave).push(r.card_titulo);
    });
    return (clientes || []).map(c => ({ ...c, vinculos: porChave.get(chaveCliente(c.nome)) || [] }));
}

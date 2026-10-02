import { vinculoEndpoint } from '../api-base.js';
import { chaveCliente } from '../utils/vinculos.js';

// Vínculos manuais cliente → título do card (tabela vinculo_card, via vinculo.php / api/vinculo).
export class VinculoService {
    // Nunca derruba a tela: em falha devolve lista vazia + aviso (cruzamento automático segue normal).
    static async carregar() {
        try {
            const resp = await fetch(vinculoEndpoint(), { cache: 'no-store' });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
            return { rows: data.rows || [], aviso: data.aviso || '' };
        } catch (e) {
            console.warn('[Vínculos] Indisponível:', e.message);
            return { rows: [], aviso: `Vínculos manuais indisponíveis (${e.message})` };
        }
    }

    static async vincular(cliente, card) {
        const resp = await fetch(vinculoEndpoint(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cliente_chave: chaveCliente(cliente.nome),
                cliente_nome: cliente.nome,
                squad: cliente.squad || '',
                card_titulo: card.titulo,
                card_id: card.id || ''
            })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
        return data;
    }

    static async remover(cliente) {
        const resp = await fetch(`${vinculoEndpoint()}?cliente_chave=${encodeURIComponent(chaveCliente(cliente.nome))}`, { method: 'DELETE' });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
        return data;
    }
}

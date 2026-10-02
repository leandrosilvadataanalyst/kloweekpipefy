import { janelaEndpoint } from '../api-base.js';
import { normalizarConfig } from '../utils/janela.js';
import { definirConfigJanelas } from '../utils/periodo.js';

// Carrega/salva a janela de preenchimento (config_janela no Supabase, via janela.php / api/janela).
export class JanelaService {
    // Nunca derruba a tela: em falha, mantém o padrão 01 a 03 e devolve o aviso.
    static async carregar() {
        try {
            const resp = await fetch(janelaEndpoint(), { cache: 'no-store' });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
            const config = normalizarConfig(data.rows);
            definirConfigJanelas(config);
            return { config, aviso: data.aviso || '' };
        } catch (e) {
            console.warn('[Janela] Usando padrão 01 a 03:', e.message);
            const config = normalizarConfig(null);
            definirConfigJanelas(config);
            return { config, aviso: `Configuração indisponível (${e.message}) — usando padrão 01 a 03` };
        }
    }

    static async salvar({ chave, inicio, fim, motivo }) {
        const resp = await fetch(janelaEndpoint(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chave, dia_inicio: Number(inicio), dia_fim: Number(fim), motivo: motivo || '' })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
        return data;
    }

    static async removerExcecao(chave) {
        const resp = await fetch(`${janelaEndpoint()}?chave=${encodeURIComponent(chave)}`, { method: 'DELETE' });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
        return data;
    }
}

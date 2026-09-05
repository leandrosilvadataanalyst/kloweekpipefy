import { CONFIG } from '../config.js';

export class PipefyService {
    static API_URL = '/kloweekpipefy/proxy.php';

    static async query(graphqlQuery) {
        const response = await fetch(this.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: graphqlQuery })
        });
        const data = await response.json();
        if (data.errors) throw new Error(data.errors[0].message);
        return data.data;
    }

    static async getAllCards(pipeId, progressEl) {
        let allCards = [];
        let cursor = null;
        let hasNext = true;
        let page = 1;

        while (hasNext) {
            if (progressEl) progressEl.textContent = `Página ${page}... (${allCards.length} cartões carregados)`;
            const after = cursor ? `, after: "${cursor}"` : '';
            const q = `{ cards(pipe_id: "${pipeId}", first: 50${after}) { edges { node { id title current_phase { id name } createdAt fields { name value float_value datetime_value } } } pageInfo { hasNextPage endCursor } } }`;
            const r = await this.query(q);
            if (!r?.cards?.edges?.length) break;
            allCards = allCards.concat(r.cards.edges);
            hasNext = r.cards.pageInfo.hasNextPage;
            cursor = r.cards.pageInfo.endCursor;
            page++;
            if (allCards.length > 5000) break;
        }
        if (progressEl) progressEl.textContent = `${allCards.length} cartões carregados no total.`;
        return allCards;
    }

    static async getClientesElegiveis() {
        const edges = await this.getAllCards(CONFIG.PIPES.DATABASE_PROJETO);
        const hoje = new Date();
        const mais60Dias = new Date(hoje);
        mais60Dias.setDate(mais60Dias.getDate() - 60);

        return edges
            .filter(e => {
                const fase = e.node.current_phase?.name || '';
                const produto = this._getField(e.node, 'Produto') || '';
                const data = this._parseDate(this._getField(e.node, 'Data da assinatura do contrato'));
                return fase === 'Ativo' && produto.toLowerCase().includes('assessoria') && data && data <= mais60Dias;
            })
            .map(e => ({
                id: e.node.id,
                nome: this._getClienteName(e.node) || e.node.title,
                fee: this._parseCurrency(this._getField(e.node, 'Valor do Fee'))
            }));
    }

    static async getRoiWeek(progressEl, monthsBack = 3) {
        const edges = await this.getAllCards(CONFIG.PIPES.ROI_WEEK, progressEl);
        const hoje = new Date();
        const dataLimite = new Date(hoje);
        dataLimite.setMonth(dataLimite.getMonth() - monthsBack);

        return edges
            .filter(e => {
                const v = this._getField(e.node, 'Data de Atualização') || e.node.createdAt;
                if (!v) return false;
                const d = this._parseDate(v) || new Date(v);
                return d && !isNaN(d) && d >= dataLimite;
            })
            .map(e => {
                const dataRaw = this._getField(e.node, 'Data de Atualização') || e.node.createdAt;
                const dataObj = this._parseDate(dataRaw) || new Date(dataRaw);
                return {
                    cliente_id: e.node.id,
                    cliente_nome: e.node.title,
                    projeto: this._getField(e.node, 'Projeto [USAR ESTE]'),
                    investimento: this._getFieldFloat(e.node, 'Investimento em mídia no mês'),
                    mc: this._getFieldFloat(e.node, 'Margem de contribuição'),
                    faturamento: this._getFieldFloat(e.node, 'Faturamento (vendas V4)'),
                    vendas: this._getFieldFloat(e.node, 'Vendas realizadas (apenas geradas pela V4)'),
                    data_atualizacao: dataRaw,
                    data_obj: isNaN(dataObj) ? null : dataObj,
                    card_url: `https://app.pipefy.com/open-cards/${e.node.id}`,
                    created_at: e.node.createdAt
                };
            });
    }

    static _getClienteName(node) {
        const f = node.fields.find(f => f.name.toLowerCase().includes('cliente'));
        if (f?.value) {
            const m = f.value.match(/\["(.+?)"\]/);
            return m ? m[1] : f.value;
        }
        return null;
    }

    static _getField(node, name) {
        const lower = name.toLowerCase();
        const f = node.fields.find(f => f.name.toLowerCase().includes(lower) || lower.includes(f.name.toLowerCase()));
        return f?.value || null;
    }

    static _getFieldFloat(node, name) {
        const lower = name.toLowerCase();
        const f = node.fields.find(f => f.name.toLowerCase().includes(lower) || lower.includes(f.name.toLowerCase()));
        if (!f) return 0;
        if (f.float_value != null) return f.float_value;
        return this._parseCurrency(f.value);
    }

    static _parseDate(value) {
        if (!value) return null;
        const str = String(value).trim();
        if (!str || str === 'null') return null;
        if (str.includes('-')) {
            const d = new Date(str + (str.length === 10 ? 'T00:00:00' : ''));
            return isNaN(d) ? null : d;
        }
        const p = str.split('/');
        if (p.length === 3) {
            const d = new Date(p[2], p[1] - 1, p[0]);
            return isNaN(d) ? null : d;
        }
        return null;
    }

    static _parseCurrency(value) {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        return parseFloat(String(value).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.')) || 0;
    }
}

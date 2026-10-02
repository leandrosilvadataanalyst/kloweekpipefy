// Tela Ajustes: vincular cliente do cockpit ao card certo do ROI Week no Pipefy.
const VIA = {
    vinculo_manual: { label: 'Vínculo manual', cls: 'b-ok' },
    razao_social: { label: 'Razão social', cls: 'b-ok' },
    nome: { label: 'Nome do cockpit', cls: 'b-ok' },
    prefixo: { label: 'Início do nome (conferir)', cls: 'b-care' },
    contido: { label: 'Nome contido (conferir)', cls: 'b-care' }
};

export class AjustesView {
    static esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    static render({ periodo, clientes, filtros, squads, aviso, selecionado, busca, resultados, buscando, erroBusca, msg }) {
        const total = clientes.length;
        const identificados = clientes.filter(c => c.card).length;
        const manuais = clientes.filter(c => c.vinculos.length).length;
        const visiveis = clientes.filter(c => {
            if (filtros.status === 'pendentes' && c.card) return false;
            if (filtros.status === 'conferir' && !['prefixo', 'contido'].includes(c.via)) return false;
            if (filtros.status === 'manuais' && !c.vinculos.length) return false;
            if (filtros.squad && c.squad !== filtros.squad) return false;
            if (filtros.texto) {
                const t = filtros.texto.toLowerCase();
                if (!`${c.nome} ${c.razaoSocial || ''}`.toLowerCase().includes(t)) return false;
            }
            return true;
        });
        const sel = (v, atual) => (v === atual ? 'selected' : '');
        return `
            <div class="card card-pad mb-6">
                <h2 class="section-title">Vincular cliente ao card do Pipefy — ROI Week ${periodo.roiWeekCurto} · Ref: ${periodo.referenciaCurta}</h2>
                <p class="section-sub mt-1">Quando o card do Pipefy tem um título diferente do nome/razão social da planilha, busque o card e vincule. O vínculo usa o <strong style="color:var(--text)">título do card</strong> e vale para todos os meses (o card é recriado todo mês com o mesmo nome). Vínculo manual tem prioridade sobre a razão social.</p>
                ${aviso ? `<p class="text-xs mt-2 mb-0" style="color:var(--red)">${this.esc(aviso)}</p>` : ''}
                <div class="flex flex-wrap gap-2 mt-4">
                    <span class="badge b-ok"><span class="dot"></span>${identificados} de ${total} identificados</span>
                    <span class="badge b-danger"><span class="dot"></span>${total - identificados} não identificados</span>
                    <span class="badge b-care"><span class="dot"></span>${manuais} vínculo(s) manual(is)</span>
                </div>
            </div>

            <div class="tbl-wrap mb-6">
                <div class="px-5 py-3 border-b flex flex-wrap items-center gap-2" style="border-color:var(--border)">
                    <select id="aj-status" class="ctl md:w-auto">
                        <option value="pendentes" ${sel('pendentes', filtros.status)}>Não identificados</option>
                        <option value="conferir" ${sel('conferir', filtros.status)}>Identificados por aproximação (conferir)</option>
                        <option value="manuais" ${sel('manuais', filtros.status)}>Com vínculo manual</option>
                        <option value="todos" ${sel('todos', filtros.status)}>Todos</option>
                    </select>
                    <select id="aj-squad" class="ctl md:w-auto">
                        <option value="">Todos squads</option>
                        ${squads.map(s => `<option value="${this.esc(s)}" ${sel(s, filtros.squad)}>${this.esc(String(s).toUpperCase())}</option>`).join('')}
                    </select>
                    <input id="aj-texto" type="text" class="ctl flex-1" placeholder="Filtrar cliente ou razão social" value="${this.esc(filtros.texto)}">
                </div>
                ${msg ? `<p class="px-5 pt-3 text-xs mb-0" style="color:${msg.erro ? 'var(--red)' : 'var(--green)'}">${this.esc(msg.texto)}</p>` : ''}
                <div class="overflow-x-auto">
                    <table class="tbl">
                        <thead><tr><th>Squad</th><th>Cliente (cockpit)</th><th>Razão social / nome card (planilha)</th><th>Card no ROI Week ${periodo.roiWeekCurto}</th><th>Identificado por</th><th>Ação</th></tr></thead>
                        <tbody>
                            ${visiveis.length === 0
                                ? `<tr><td colspan="6" class="px-3 py-8 text-center text-xs" style="color:var(--faint)">Nenhum cliente neste filtro</td></tr>`
                                : visiveis.map(c => this.renderLinha(c, c.chave === selecionado ? { busca, resultados, buscando, erroBusca } : null)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }

    static renderLinha(c, painel) {
        const via = c.via ? VIA[c.via] : null;
        const acao = `
            <div class="flex flex-wrap gap-2">
                <button class="btn btn-ghost btn-sm" data-buscar="${this.esc(c.chave)}">${painel ? 'Fechar' : 'Buscar card'}</button>
                ${c.vinculos.length ? `<button class="btn btn-ghost btn-sm" data-remover="${this.esc(c.chave)}">Remover vínculo</button>` : ''}
            </div>`;
        return `
            <tr>
                <td class="font-semibold uppercase whitespace-nowrap" style="color:var(--text)">${this.esc(c.squad)}</td>
                <td class="font-bold" style="color:var(--text)">${this.esc(c.nome)}</td>
                <td class="text-xs">${this.esc(c.razaoSocial || '—')}${c.vinculos.length ? `<br><span style="color:var(--green)">Vinculado a: ${this.esc(c.vinculos.join(', '))}</span>` : ''}</td>
                <td>${c.card
                    ? `${this.esc(c.card.cliente_nome)}<br><a href="${this.esc(c.card.card_url)}" target="_blank" rel="noopener" class="link-pipefy text-xs">Abrir no Pipefy</a> <span class="text-xs" style="color:var(--faint)">${this.esc(c.card.data_atualizacao || '')}</span>`
                    : '<span class="badge b-danger"><span class="dot"></span>Não identificado</span>'}</td>
                <td>${via ? `<span class="badge ${via.cls}"><span class="dot"></span>${via.label}</span>` : '—'}</td>
                <td>${acao}</td>
            </tr>
            ${painel ? `<tr><td colspan="6" style="background:var(--surface-2)">${this.renderBusca(c, painel)}</td></tr>` : ''}`;
    }

    static renderBusca(c, { busca, resultados, buscando, erroBusca }) {
        const lista = buscando
            ? '<p class="text-xs mb-0" style="color:var(--faint)">Buscando no Pipefy...</p>'
            : erroBusca
                ? `<p class="text-xs mb-0" style="color:var(--red)">${this.esc(erroBusca)}</p>`
                : resultados === null
                    ? ''
                    : resultados.length === 0
                        ? '<p class="text-xs mb-0" style="color:var(--faint)">Nenhum card com esse título. Tente outra parte do nome.</p>'
                        : `<ul class="space-y-1 text-sm">${resultados.map((r, i) => `
                            <li class="flex flex-wrap items-center gap-3">
                                <strong style="color:var(--text)">${this.esc(r.titulo)}</strong>
                                <span class="text-xs" style="color:var(--muted)">último card ${this.esc(r.ultimaDataStr || '—')} · ${r.total} card(s)</span>
                                <a href="https://app.pipefy.com/open-cards/${this.esc(r.id)}" target="_blank" rel="noopener" class="link-pipefy text-xs">Abrir</a>
                                <button class="btn btn-primary btn-sm" data-vincular="${i}">Vincular</button>
                            </li>`).join('')}</ul>`;
        return `
            <div class="py-2">
                <p class="stat-label mb-2">Buscar card do ROI Week para ${this.esc(c.nome)}</p>
                <div class="flex flex-wrap gap-2 mb-3">
                    <input id="aj-busca" type="text" class="ctl flex-1" value="${this.esc(busca)}" placeholder="Parte do título do card (mín. 2 letras)">
                    <button id="aj-btn-busca" class="btn btn-primary btn-sm">Buscar no Pipefy</button>
                </div>
                ${lista}
            </div>`;
    }
}

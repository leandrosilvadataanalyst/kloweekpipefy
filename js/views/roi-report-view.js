import { gerarMensagemCobranca } from '../utils/cobranca.js';

export class RoiReportView {
    static render(data) {
        const { preenchidos, faltantes, metricas, periodo, periodoVigente, periodoOptions, periodoKey, vigenteFaltantes } = data;
        const pctTotal = metricas.total_clientes > 0 ? (metricas.total_preenchidos / metricas.total_clientes) * 100 : 0;
        const squads = [...new Set([...preenchidos, ...faltantes].map(c => c.squad).filter(Boolean))].sort();

        return `
            <div class="card card-pad flex flex-col md:flex-row md:items-center gap-4 mb-6">
                <div>
                    <h2 class="section-title">Relatório ROI — ROI Week ${periodo.roiWeek}</h2>
                    <p class="section-sub mt-1">Ref: ${periodo.referencia} · período ${periodo.vigente ? `vigente em ${periodo.dataAtual}` : 'histórico'} · cruza planilhas × ROI Week do Pipefy</p>
                </div>
                <div class="md:ml-auto flex flex-wrap items-center gap-2">
                    <div class="flex items-center gap-2">
                        <span class="stat-label hidden sm:inline">Período</span>
                        <span class="badge b-ok" title="Histórico será disponibilizado depois"><span class="dot"></span>ROI Week ${periodoVigente.roiWeekCurto} · Ref: ${periodoVigente.referenciaCurta} (atual)</span>
                    </div>
                    <select id="filtro-squad" class="ctl">
                        <option value="">Todos os squads</option>
                        ${squads.map(s => `<option value="${s}">${String(s).toUpperCase()}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="card card-pad card-hover">
                    <div class="flex items-center justify-between mb-2"><span class="stat-label">Total Elegíveis</span><span class="stat-icon"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.374 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg></span></div>
                    <p class="stat-value">${metricas.total_clientes}</p>
                    <p class="stat-hint">Base planilhas</p>
                </div>
                <div class="card card-pad card-hover">
                    <div class="flex items-center justify-between mb-2"><span class="stat-label">Preenchidos</span><span class="stat-icon" style="background:var(--green-bg);color:var(--green)"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></span></div>
                    <p class="stat-value" style="color:var(--green)">${metricas.total_preenchidos}</p>
                    <p class="stat-hint">Dentro da janela</p>
                </div>
                <div class="card card-pad card-hover">
                    <div class="flex items-center justify-between mb-2"><span class="stat-label">Faltando</span><span class="stat-icon" style="background:var(--red-bg);color:var(--red)"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></span></div>
                    <p class="stat-value" style="color:var(--red)">${metricas.total_faltantes}</p>
                    <p class="stat-hint">Pendentes de cobrança</p>
                </div>
                <div class="card card-pad card-hover">
                    <div class="flex items-center justify-between mb-2"><span class="stat-label">Preenchimento</span><span class="stat-icon"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125L10.5 21l7.5-7.875M12 3v17.25"/></svg></span></div>
                    <div class="flex items-baseline gap-2"><p class="stat-value" style="color:${pctTotal >= 80 ? 'var(--green)' : 'var(--red)'}">${pctTotal.toFixed(1)}%</p></div>
                    <p class="stat-hint">Meta 80%</p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div class="tbl-wrap">
                    <div class="px-5 py-3 border-b flex items-center gap-2" style="border-color:var(--border);background:var(--green-bg)">
                        <svg class="w-4 h-4" style="color:var(--green)" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <h3 class="section-title" style="color:var(--green)">Preenchidos (${preenchidos.length})</h3>
                    </div>
                    <div class="overflow-y-auto max-h-[420px]">
                        <table class="tbl">
                            <thead><tr><th>Cliente</th><th class="text-center">ROI</th><th class="text-center">Status</th></tr></thead>
                            <tbody>
                                ${preenchidos.length === 0
                                    ? `<tr><td colspan="3" class="px-3 py-8 text-center text-xs" style="color:var(--faint)">Nenhum cliente preenchido</td></tr>`
                                    : preenchidos.map(c => `
                                        <tr>
                                            <td class="font-bold" style="color:var(--text)">${c.nome_fantasia}</td>
                                            <td class="text-center font-bold" style="color:${c.saude.roi >= 0 ? 'var(--green)' : 'var(--red)'}">${c.saude.roi.toFixed(1)}%</td>
                                            <td class="text-center">${this.statusBadge(c.saude.status)}</td>
                                        </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="tbl-wrap">
                    <div class="px-5 py-3 border-b flex items-center gap-2" style="border-color:var(--border);background:var(--red-bg)">
                        <svg class="w-4 h-4" style="color:var(--red)" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        <h3 class="section-title" style="color:var(--red)">Faltando (${faltantes.length})</h3>
                    </div>
                    <div class="overflow-y-auto max-h-[420px]">
                        <table class="tbl">
                            <thead><tr><th>Cliente</th><th class="text-center">Status</th></tr></thead>
                            <tbody>
                                ${faltantes.length === 0
                                    ? `<tr><td colspan="2" class="px-3 py-8 text-center text-xs" style="color:var(--faint)">Nenhum cliente faltante</td></tr>`
                                    : faltantes.map(c => `
                                        <tr>
                                            <td class="font-bold" style="color:var(--text)">${c.nome_fantasia}</td>
                                            <td class="text-center"><span class="badge b-danger"><span class="dot"></span>Pendente</span></td>
                                        </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            ${vigenteFaltantes.length > 0 ? `
            <div class="card card-pad mb-6">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                    <div>
                        <h3 class="section-title">Mensagem para GTs — ${vigenteFaltantes.length} cliente(s) não identificados no Pipefy</h3>
                        <p class="section-sub">ROI Week vigente (${periodoVigente.roiWeek} · Ref: ${periodoVigente.referencia}) · cada cliente sai da lista assim que o card é preenchido</p>
                        <p class="text-xs mt-1 mb-0" style="color:var(--faint)">${this.statusAtualizacao(data)}</p>
                    </div>
                    <div class="flex gap-2">
                        <button id="btn-atualizar-cobranca" class="btn btn-ghost btn-sm">Atualizar agora</button>
                        <button id="btn-copiar" class="btn btn-primary btn-sm">Copiar mensagem</button>
                    </div>
                </div>
                <pre class="rounded-lg p-4 text-xs whitespace-pre-wrap mono" style="background:var(--surface-2);border:1px solid var(--border)">${this.gerarMensagem(vigenteFaltantes)}</pre>
            </div>` : `
            <div class="card card-pad mb-6" style="background:var(--green-bg);border-color:var(--green-line)">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <p class="text-sm font-bold mb-0" style="color:var(--green)">Todos os clientes preencheram o ROI Week vigente (${periodoVigente.roiWeek}).</p>
                        <p class="text-xs mt-1 mb-0" style="color:var(--muted)">${this.statusAtualizacao(data)}</p>
                    </div>
                    <button id="btn-atualizar-cobranca" class="btn btn-ghost btn-sm">Atualizar agora</button>
                </div>
            </div>`}
        `;
    }

    static statusAtualizacao({ atualizadoEm, erroAtualizacao }) {
        if (erroAtualizacao) return `<span style="color:var(--red)">Falha ao atualizar do Pipefy (${erroAtualizacao}) — exibindo últimos dados carregados</span>`;
        if (!atualizadoEm) return '';
        const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(atualizadoEm);
        return `Atualizado do Pipefy às ${hora} · atualiza sozinho a cada 2 min`;
    }

    static statusBadge(status) {
        const map = {
            safe: { cls: 'b-ok', label: 'Safe' },
            care: { cls: 'b-care', label: 'Care' },
            danger: { cls: 'b-danger', label: 'Danger' }
        };
        const s = map[status] || map.danger;
        return `<span class="badge ${s.cls}"><span class="dot"></span>${s.label}</span>`;
    }

    // Mesma mensagem do dashboard (utils/cobranca.js): só clientes não identificados no Pipefy
    static gerarMensagem(faltantes) {
        return gerarMensagemCobranca(faltantes);
    }
}
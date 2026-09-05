export class RoiView {
    static render(data) {
        const { metricas, clientes, periodo, periodoVigente, periodoOptions, periodoKey } = data;
        const squadOptions = [...new Set(clientes.map(c => c.squad))].sort();

        return `
            <div class="card card-pad flex flex-col md:flex-row md:items-center gap-4 mb-6">
                <div>
                    <h2 class="section-title">Análise ROI — ROI Week ${periodo.roiWeek}</h2>
                    <p class="section-sub mt-1">Ref: ${periodo.referencia} · período ${periodo.vigente ? `vigente em ${periodo.dataAtual}` : 'histórico'} · % sobre investimento · janela 01–03</p>
                </div>
                <div class="md:ml-auto flex flex-wrap items-center gap-2">
                    <div class="flex items-center gap-2">
                        <span class="stat-label hidden sm:inline">Período</span>
                        <select id="filtro-periodo" class="ctl">
                            ${periodoOptions.map(o => `<option value="${o.key}" ${o.key === periodoKey ? 'selected' : ''}>${o.opcao}</option>`).join('')}
                        </select>
                    </div>
                    <select id="filtro-squad" class="ctl">
                        <option value="">Todos os squads</option>
                        ${squadOptions.map(s => `<option value="${s}">${String(s).toUpperCase()}</option>`).join('')}
                    </select>
                    <select id="filtro-status" class="ctl">
                        <option value="">Todos os status</option>
                        <option value="safe">Safe</option>
                        <option value="care">Care</option>
                        <option value="danger">Danger</option>
                    </select>
                </div>
            </div>

            <div class="card card-pad flex flex-col sm:flex-row sm:items-center gap-3 mb-6" style="border-left:4px solid ${periodo.vigente ? 'var(--text)' : 'var(--muted)'}">
                <span class="stat-icon shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>
                </span>
                <div class="min-w-0 flex-1">
                    <h3 class="section-title">${periodo.vigente ? 'Janela de preenchimento' : 'Período selecionado'} — ROI Week ${periodo.roiWeek}</h3>
                    <p class="section-sub mt-1">
                        ${periodo.vigente
                            ? `Dados vigentes em <strong style="color:var(--text)">${periodo.dataAtual}</strong> · janela de preenchimento 01 a 03 de cada mês (referente ao mês anterior).`
                            : `Período histórico. Os dados abaixo correspondem ao ROI Week ${periodo.roiWeek} (Ref: ${periodo.referencia}).`}
                    </p>
                </div>
                <span class="badge ${periodo.vigente ? (periodo.dentroJanela ? 'b-ok' : 'b-care') : 'b-care'} shrink-0">${periodo.vigente ? (periodo.dentroJanela ? 'Janela aberta' : 'Janela fechada') : 'Histórico'}</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div class="card card-pad card-hover">
                    <div class="flex items-center justify-between mb-2"><span class="stat-label">Total Clientes</span><span class="stat-icon"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.374 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg></span></div>
                    <p class="stat-value">${metricas.total}</p>
                    <p class="stat-hint">Base planilhas</p>
                </div>
                <div class="card card-pad card-hover">
                    <div class="flex items-center justify-between mb-2"><span class="stat-label">ROI Médio</span><span class="stat-icon" style="background:${metricas.roi_medio >= 0 ? 'var(--green-bg)' : 'var(--red-bg)'};color:${metricas.roi_medio >= 0 ? 'var(--green)' : 'var(--red)'}"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg></span></div>
                    <p class="stat-value" style="color:${metricas.roi_medio >= 0 ? 'var(--green)' : 'var(--red)'}">${metricas.roi_medio.toFixed(1)}%</p>
                    <p class="stat-hint">Média simples</p>
                </div>
                <div class="card card-pad card-hover">
                    <div class="flex items-center justify-between mb-2"><span class="stat-label">Safe (≥50%)</span><span class="stat-icon" style="background:var(--green-bg);color:var(--green)"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></span></div>
                    <div class="flex items-baseline gap-2"><p class="stat-value" style="color:var(--green)">${metricas.pct_safe.toFixed(1)}%</p><p class="text-sm text-gray-dark dark:text-gray-400 font-medium">${Math.round(metricas.total * metricas.pct_safe / 100)}</p></div>
                    <p class="stat-hint">Acima da meta</p>
                </div>
                <div class="card card-pad card-hover">
                    <div class="flex items-center justify-between mb-2"><span class="stat-label">Care (0–50%)</span><span class="stat-icon"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg></span></div>
                    <p class="stat-value">${metricas.pct_care.toFixed(1)}%</p>
                    <p class="stat-hint">Atenção</p>
                </div>
                <div class="card card-pad card-hover">
                    <div class="flex items-center justify-between mb-2"><span class="stat-label">Danger (&lt;0%)</span><span class="stat-icon" style="background:var(--red-bg);color:var(--red)"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></span></div>
                    <p class="stat-value" style="color:var(--red)">${metricas.pct_danger.toFixed(1)}%</p>
                    <p class="stat-hint">Abaixo de zero</p>
                </div>
            </div>

            <div class="tbl-wrap">
                <div class="px-5 py-4 border-b" style="border-color:var(--border)">
                    <h3 class="section-title">Lista de clientes — ROI Week ${periodo.roiWeek}</h3>
                    <p class="section-sub">Ref: ${periodo.referencia} · ROI % sobre investimento</p>
                </div>
                <div class="overflow-x-auto">
                    <table class="tbl min-w-[900px]">
                        <thead>
                            <tr>
                                <th>Cliente</th><th>Squad</th>
                                <th class="text-right">Investimento</th><th class="text-right">Faturamento</th>
                                <th class="text-center">ROI</th><th class="text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${clientes.length === 0
                                ? `<tr><td colspan="6" class="px-3 py-8 text-center text-xs" style="color:var(--faint)">Nenhum cliente encontrado</td></tr>`
                                : clientes.map(c => `
                                    <tr>
                                        <td class="font-bold" style="color:var(--text)">${c.cliente}</td>
                                        <td class="font-semibold uppercase">${String(c.squad || 'N/A').toUpperCase()}</td>
                                        <td class="text-right whitespace-nowrap">${c.investimento_midia > 0 ? `R$ ${c.investimento_midia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</td>
                                        <td class="text-right whitespace-nowrap">${c.faturamento > 0 ? `R$ ${c.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</td>
                                        <td class="text-center font-bold whitespace-nowrap" style="color:${c.roi >= 0 ? 'var(--green)' : 'var(--red)'}">${c.roi.toFixed(1)}%</td>
                                        <td class="text-center whitespace-nowrap">${this.statusBadge(c.status)}</td>
                                    </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card card-pad mt-6" style="border-left:4px solid var(--muted)">
                <p class="text-xs" style="color:var(--faint)">
                    Referência de cobrança: mensagens de pendência continuam utilizando o ROI Week vigente
                    (<strong style="color:var(--text)">${periodoVigente.roiWeek}</strong> · Ref: ${periodoVigente.referencia}).
                </p>
            </div>
        `;
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
}
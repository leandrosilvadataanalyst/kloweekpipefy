let _chartData = null;
const _charts = [];

function _destroyCharts() {
    _charts.forEach(c => { try { c.destroy(); } catch (e) {} });
    _charts.length = 0;
}

export class DashboardView {
    static render(data, mesesRetroativos) {
        const { metricas, topGTs, squadStats, squadsList, gtsList, mensagemGTs, clientes, faltantesCount, chartData, periodo, periodoVigente, periodoOptions, periodoKey } = data;
        const janelaState = periodo.vigente
            ? (periodo.dentroJanela ? 'Janela aberta' : 'Janela fechada')
            : 'Período histórico';
        const janelaTone = periodo.vigente
            ? (periodo.dentroJanela ? 'b-ok' : 'b-care')
            : 'b-care';
        const alerta = `
            <div class="card card-pad flex flex-col sm:flex-row sm:items-center gap-3 mb-6" style="border-left:4px solid var(--text)">
                <span class="stat-icon shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>
                </span>
                <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                        <h3 class="section-title">${periodo.vigente ? 'Janela de preenchimento' : 'Período selecionado'} — ROI Week ${periodo.roiWeek}</h3>
                        <span class="badge ${janelaTone}"><span class="dot"></span>${janelaState}</span>
                    </div>
                    <p class="section-sub mt-1">
                        ${periodo.vigente
                            ? `Coleta vigente. Os dados em todos os quadros e tabelas correspondem ao dia <strong style="color:var(--text)">${periodo.dataAtual}</strong> · <strong style="color:var(--text)">ROI Week ${periodo.roiWeek}</strong> · <strong style="color:var(--text)">Ref: ${periodo.referencia}</strong> · janela de preenchimento: 01 a 03 de cada mês (referente ao mês anterior). ${metricas.alerta_prazo ? `<strong style="color:var(--red)">${metricas.alerta_prazo}</strong>` : ''}`
                            : `Você está analisando um período histórico: <strong style="color:var(--text)">ROI Week ${periodo.roiWeek}</strong> · <strong style="color:var(--text)">Ref: ${periodo.referencia}</strong>. A cobrança de pendências abaixo continua referente ao ROI Week vigente (<strong style="color:var(--text)">${periodoVigente.roiWeek}</strong>).`}
                    </p>
                </div>
                ${periodo.vigente ? `<span class="badge b-care shrink-0">Dia ${metricas.dia_atual}</span>` : ''}
            </div>`;

        return `
            <div class="card card-pad flex flex-col md:flex-row md:items-center gap-4 mb-6">
                <div>
                    <h2 class="section-title">Visão Geral — ROI Week ${periodo.roiWeek}</h2>
                    <p class="section-sub mt-1">Ref: ${periodo.referencia} · período ${periodo.vigente ? `vigente em ${periodo.dataAtual}` : 'histórico'} · planilhas como fonte da verdade</p>
                </div>
                <div class="md:ml-auto flex flex-wrap items-center gap-2">
                    <div class="flex items-center gap-2">
                        <span class="stat-label hidden sm:inline">Período</span>
                        <select id="filtro-periodo" class="ctl md:w-auto">
                            ${periodoOptions.map(o => `<option value="${o.key}" ${o.key === periodoKey ? 'selected' : ''}>${o.opcao}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="stat-label hidden sm:inline">Buscar</span>
                        <select id="filtro-meses" class="ctl md:w-auto">
                            <option value="1" ${mesesRetroativos === 1 ? 'selected' : ''}>1 mês</option>
                            <option value="3" ${mesesRetroativos === 3 ? 'selected' : ''}>3 meses</option>
                            <option value="6" ${mesesRetroativos === 6 ? 'selected' : ''}>6 meses</option>
                            <option value="12" ${mesesRetroativos === 12 ? 'selected' : ''}>12 meses</option>
                            <option value="24" ${mesesRetroativos === 24 ? 'selected' : ''}>24 meses</option>
                        </select>
                    </div>
                    <button id="btn-recarregar" class="btn btn-primary">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg>
                        Recarregar
                    </button>
                </div>
            </div>

            ${alerta}

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div class="card card-pad card-hover">
                    <div class="flex items-center justify-between mb-2"><span class="stat-label">Total Elegíveis</span><span class="stat-icon"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.374 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg></span></div>
                    <p class="stat-value">${metricas.total_elegiveis}</p>
                    <p class="stat-hint">Base planilhas</p>
                </div>
                <div class="card card-pad card-hover">
                    <div class="flex items-center justify-between mb-2"><span class="stat-label">Preenchidos</span><span class="stat-icon" style="background:var(--green-bg);color:var(--green)"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></span></div>
                    <div class="flex items-baseline gap-2"><p class="stat-value" style="color:var(--green)">${metricas.total_preenchidos}</p><span class="text-sm font-bold" style="color:var(--green)">${metricas.pct_preenchimento.toFixed(1)}%</span></div>
                    <p class="stat-hint">${metricas.no_prazo} no prazo · ${metricas.fora_prazo} fora</p>
                </div>
                <div class="card card-pad card-hover">
                    <div class="flex items-center justify-between mb-2"><span class="stat-label">ROI &gt; 1</span><span class="stat-icon"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg></span></div>
                    <div class="flex items-baseline gap-2"><p class="stat-value">${metricas.total_roi_maior_1}</p><span class="text-sm font-semibold text-gray-dark dark:text-gray-400">${metricas.pct_roi_maior_1.toFixed(1)}%</span></div>
                    <p class="stat-hint">Sobre preenchidos</p>
                </div>
                <div class="card card-pad card-hover">
                    <div class="flex items-center justify-between mb-2"><span class="stat-label">ROAS Médio</span><span class="stat-icon"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125L10.5 21l7.5-7.875M12 3v17.25"/><path stroke-linecap="round" stroke-linejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5"/></svg></span></div>
                    <p class="stat-value">${metricas.roas_medio.toFixed(2)}x</p>
                    <p class="stat-hint">Faturamento / Invest.</p>
                </div>
                <div class="card card-pad card-hover">
                    <div class="flex items-center justify-between mb-2"><span class="stat-label">CAC Médio</span><span class="stat-icon"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12 12 12 12 12s-1.536 0-2.121.659c-1.172.879-1.172 2.303 0 3.182l.879.659z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z"/></svg></span></div>
                    <p class="stat-value">${metricas.cac_medio > 0 ? `R$ ${metricas.cac_medio.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '—'}</p>
                    <p class="stat-hint">Invest. / Vendas</p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div class="card p-5">
                    <div class="flex items-center gap-3 mb-1">
                        <span class="w-1.5 h-6 rounded-full" style="background:var(--text)"></span>
                        <div><h3 class="section-title">Top 5 GT por ROI médio</h3><p class="section-sub">GTs que mais geram retorno</p></div>
                    </div>
                    <div class="space-y-2 mt-4">
                        ${topGTs.length === 0
                            ? `<p class="section-sub py-4 text-center">Sem dados</p>`
                            : topGTs.map((g, i) => `
                                <div class="card flex items-center justify-between px-3 py-3 card-pad" style="${i === 0 ? 'border-color:var(--border-strong)' : ''}">
                                    <div class="flex items-center gap-3">
                                        <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style="background:var(--text);color:var(--surface)">${i + 1}</span>
                                        <div><p class="text-sm font-bold" style="color:var(--text)">${g.nome}</p><p class="text-xs" style="color:var(--faint)">${String(g.squad).toUpperCase()} · ${g.totalClientes} clientes</p></div>
                                    </div>
                                    <div class="text-right"><p class="text-sm font-extrabold" style="color:${g.roiMedio > 1 ? 'var(--green)' : 'var(--red)'}">${g.roiMedio.toFixed(2)}x</p><p class="text-xs" style="color:var(--faint)">ROAS ${g.roasMedio.toFixed(2)}x</p></div>
                                </div>`).join('')}
                    </div>
                </div>
                <div class="card p-5">
                    <div class="flex items-center gap-3 mb-1">
                        <span class="w-1.5 h-6 rounded-full" style="background:var(--muted)"></span>
                        <div><h3 class="section-title">Performance por Squad</h3><p class="section-sub">Ordenado por ROI médio</p></div>
                    </div>
                    <div class="space-y-2 mt-4">
                        ${squadStats.map(s => `
                            <div class="card p-3">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm font-bold uppercase" style="color:var(--text)">${s.nome}</span>
                                    <span class="badge b-care">${s.preenchidos}/${s.total} · ${s.pctPreenchimento.toFixed(0)}%</span>
                                </div>
                                <div class="grid grid-cols-3 gap-3 mt-3 pt-3 border-t" style="border-color:var(--border)">
                                    <div><p class="text-xs stat-label">ROI médio</p><p class="text-sm font-extrabold" style="color:${s.roiMedio > 1 ? 'var(--green)' : 'var(--red)'}">${s.roiMedio.toFixed(2)}x</p></div>
                                    <div><p class="text-xs stat-label">ROAS</p><p class="text-sm font-bold" style="color:var(--text)">${s.roasMedio.toFixed(2)}x</p></div>
                                    <div><p class="text-xs stat-label">Faturamento</p><p class="text-sm font-bold" style="color:var(--text)">R$ ${s.faturamento.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p></div>
                                </div>
                            </div>`).join('')}
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div class="card p-5">
                    <h3 class="section-title mb-3">Série temporal — ROI médio por mês</h3>
                    <canvas id="chart-temporal" height="160"></canvas>
                </div>
                <div class="card p-5">
                    <h3 class="section-title mb-3">Faturamento vs Investimento por Squad</h3>
                    <canvas id="chart-barras" height="160"></canvas>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div class="card p-5">
                    <h3 class="section-title mb-3">Distribuição por Squad (preenchidos)</h3>
                    <canvas id="chart-pizza" height="180"></canvas>
                </div>
                <div class="card p-5 lg:col-span-2">
                    <h3 class="section-title mb-1">Pareto — Concentração de ROI por cliente</h3>
                    <p class="section-sub mb-3">Clientes ordenados por ROI; linha acumulada mostra 80/20</p>
                    <canvas id="chart-pareto" height="180"></canvas>
                </div>
            </div>

            <div class="card card-pad mb-6">
                <h3 class="section-title mb-3">Estatística descritiva — ROI</h3>
                <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
                    ${[
                        ['N', chartData.descritiva.n, ''],
                        ['Média', `${chartData.descritiva.mean.toFixed(2)}x`, ''],
                        ['Mediana', `${chartData.descritiva.median.toFixed(2)}x`, ''],
                        ['Mín', `${chartData.descritiva.min.toFixed(2)}x`, 'red'],
                        ['Máx', `${chartData.descritiva.max.toFixed(2)}x`, 'green'],
                        ['Desv. padrão', `${chartData.descritiva.std.toFixed(2)}`, '']
                    ].map(([label, value, tone]) => `
                        <div class="card p-3 text-center" style="background:var(--surface-2)">
                            <p class="stat-label">${label}</p>
                            <p class="text-sm font-extrabold mt-1" style="color:${tone === 'red' ? 'var(--red)' : tone === 'green' ? 'var(--green)' : 'var(--text)'}">${value}</p>
                        </div>`).join('')}
                </div>
            </div>

            <div class="tbl-wrap mb-6">
                <div class="px-5 py-4 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-3" style="border-color:var(--border)">
                    <div>
                        <h3 class="section-title">Tabela Resumo Consolidada — ROI Week ${periodo.roiWeek}</h3>
                        <p class="section-sub">Ref: ${periodo.referencia} · filtros e exportação · janela de prazo 01–03 evidenciada</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="btn-export-json" class="btn btn-ghost btn-sm">JSON</button>
                        <button id="btn-export-excel" class="btn btn-primary btn-sm">Excel</button>
                        <button id="btn-export-csv" class="btn btn-ghost btn-sm">CSV</button>
                    </div>
                </div>
                <div class="p-4 grid grid-cols-1 md:grid-cols-6 gap-3 border-b" style="border-color:var(--border);background:var(--surface-2)">
                    <input id="filtro-busca" type="text" placeholder="Buscar cliente" class="ctl">
                    <select id="filtro-squad" class="ctl md:col-span-1"><option value="">Todos squads</option>${squadsList.map(s => `<option value="${s}">${String(s).toUpperCase()}</option>`).join('')}</select>
                    <select id="filtro-gt" class="ctl"><option value="">Todos GTs</option>${gtsList.map(g => `<option value="${g}">${g}</option>`).join('')}</select>
                    <select id="filtro-status" class="ctl"><option value="">Todos status</option><option value="preenchido">Preenchido</option><option value="pendente">Pendente</option></select>
                    <select id="filtro-roi" class="ctl"><option value="">Todos ROI</option><option value="maior1">ROI > 1</option><option value="menor1">ROI ≤ 1</option></select>
                    <select id="filtro-prazo" class="ctl"><option value="">Todos prazos</option><option value="noprazo">No prazo</option><option value="fora">Fora do prazo</option><option value="pendente">Pendente</option></select>
                </div>
                <div class="overflow-x-auto max-h-[520px] overflow-y-auto">
                    <table class="tbl min-w-[1150px]">
                        <thead>
                            <tr>
                                <th>Squad</th><th>Coordenador</th><th>Account</th><th>GT</th><th>Cliente</th>
                                <th class="text-right">Faturamento</th><th class="text-right">Margem de Contribuição</th><th class="text-right">Investimento</th><th class="text-center">ROI</th>
                                <th class="text-center">ROAS</th><th class="text-right">CAC</th><th class="text-center">Prazo</th><th class="text-center">Pipefy</th>
                            </tr>
                        </thead>
                        <tbody id="tabela-resumo-body">${this.renderTabelaResumo(clientes)}</tbody>
                    </table>
                </div>
            </div>

            ${faltantesCount > 0 ? `
            <div class="card card-pad mb-6">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                    <div>
                        <h3 class="section-title">Cobrança — clientes pendentes por GT</h3>
                        <p class="section-sub">Referente ao ROI Week vigente (${periodoVigente.roiWeek} · Ref: ${periodoVigente.referencia}) · mensagem pronta para enviar aos GTs</p>
                    </div>
                    <button id="btn-copiar" class="btn btn-primary btn-sm">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"/></svg>
                        Copiar mensagem
                    </button>
                </div>
                <pre class="rounded-lg p-4 text-xs whitespace-pre-wrap mono" style="background:var(--surface-2);border:1px solid var(--border)">${mensagemGTs}</pre>
            </div>`
            : `<div class="card card-pad mb-6" style="background:var(--green-bg);border-color:var(--green-line)">
                <p class="text-sm font-bold" style="color:var(--green)">Todos os clientes preencheram o ROI Week vigente (${periodoVigente.roiWeek}) dentro da janela.</p>
              </div>`}
        `;
    }

    static renderTabelaResumo(clientes) {
        if (!clientes || clientes.length === 0) return `<tr><td colspan="13" class="px-3 py-8 text-center text-xs" style="color:var(--faint)">Nenhum cliente encontrado</td></tr>`;
        const fmtMc = (mc) => {
            if (!mc || isNaN(mc)) return '-';
            const pct = mc > 1 ? mc : mc * 100;
            return `${pct.toFixed(1)}%`;
        };
        return clientes.map(c => {
            const prazoChip = c.prazoClasse === 'prazo'
                ? `<span class="badge b-ok"><span class="dot"></span>${c.prazoLabel}</span>`
                : c.prazoClasse === 'fora'
                    ? `<span class="badge b-danger"><span class="dot"></span>${c.prazoLabel}</span>`
                    : `<span class="badge b-pending"><span class="dot"></span>${c.prazoLabel}</span>`;
            return `
                <tr>
                    <td class="font-semibold uppercase whitespace-nowrap" style="color:var(--text)">${c.squad || '-'}</td>
                    <td class="whitespace-nowrap">${c.coordenador || '-'}</td>
                    <td class="whitespace-nowrap">${c.account || '-'}</td>
                    <td class="font-medium whitespace-nowrap" style="color:var(--text)">${c.gt || '-'}</td>
                    <td class="font-bold min-w-[180px]" style="color:var(--text)">${c.nome}</td>
                    <td class="text-right whitespace-nowrap">${c.faturamento > 0 ? `R$ ${c.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
                    <td class="text-right whitespace-nowrap font-semibold" style="color:var(--text)">${c.preenchido ? fmtMc(c.mc) : '-'}</td>
                    <td class="text-right whitespace-nowrap">${c.investimento > 0 ? `R$ ${c.investimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
                    <td class="text-center font-bold whitespace-nowrap" style="color:${c.roi > 1 ? 'var(--green)' : c.roi > 0 ? 'var(--text)' : 'var(--red)'}">${c.preenchido ? `${c.roi.toFixed(2)}x` : '-'}</td>
                    <td class="text-center font-semibold whitespace-nowrap">${c.preenchido && c.roas > 0 ? `${c.roas.toFixed(2)}x` : '-'}</td>
                    <td class="text-right whitespace-nowrap">${c.preenchido && c.cac > 0 ? `R$ ${c.cac.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
                    <td class="text-center whitespace-nowrap">${prazoChip}</td>
                    <td class="text-center whitespace-nowrap">${c.card_url ? `<a href="${c.card_url}" target="_blank" rel="noopener" class="link-pipefy whitespace-nowrap">Abrir no Pipefy</a>` : '<span style="color:var(--faint)">—</span>'}</td>
                </tr>`;
        }).join('');
    }

    static initCharts(chartData) {
        if (!window.Chart || !chartData) return;
        _chartData = chartData;
        _destroyCharts();
        const css = getComputedStyle(document.documentElement);
        const v = (name) => css.getPropertyValue(name).trim() || '#9E9E9E';
        const palette = {
            text: v('--text'), muted: v('--muted'), faint: v('--faint'),
            border: v('--border'), green: v('--green'), red: v('--red')
        };
        Chart.defaults.color = palette.muted;
        Chart.defaults.borderColor = palette.border;
        Chart.defaults.font.family = "'Montserrat', sans-serif";
        const baseOptions = (extra = {}) => ({
            responsive: true,
            plugins: { legend: { labels: { boxWidth: 12, font: { size: 10 } } } },
            scales: {
                y: { beginAtZero: true, grid: { color: palette.border }, ticks: { font: { size: 10 } } },
                x: { grid: { color: palette.border }, ticks: { font: { size: 10 } } }
            },
            ...extra
        });

        const ctx1 = document.getElementById('chart-temporal');
        if (ctx1) _charts.push(new Chart(ctx1, {
            type: 'line',
            data: {
                labels: chartData.temporal.labels,
                datasets: [
                    { label: 'ROI médio', data: chartData.temporal.roiMedio, borderColor: palette.text, backgroundColor: 'transparent', tension: 0.3, borderWidth: 2, pointHitRadius: 6 },
                    { label: 'ROAS médio', data: chartData.temporal.roasMedio, borderColor: palette.muted, backgroundColor: 'transparent', tension: 0.3, borderWidth: 1.5, borderDash: [4, 4] }
                ]
            },
            options: baseOptions()
        }));

        const barrasEl = document.getElementById('chart-barras');
        if (barrasEl && chartData.barras) {
            _charts.push(new Chart(barrasEl, {
                type: 'bar',
                data: {
                    labels: chartData.barras.labels,
                    datasets: [
                        { label: 'Faturamento', data: chartData.barras.faturamento, backgroundColor: palette.text },
                        { label: 'Investimento', data: chartData.barras.investimento, backgroundColor: palette.faint }
                    ]
                },
                options: baseOptions()
            }));
        }

        const ctx3 = document.getElementById('chart-pizza');
        if (ctx3) _charts.push(new Chart(ctx3, {
            type: 'doughnut',
            data: {
                labels: chartData.pizza.map(p => p.label.toUpperCase()),
                datasets: [{ data: chartData.pizza.map(p => p.value), backgroundColor: [palette.text, palette.muted, palette.faint, palette.green, palette.red] }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }
        }));

        const ctx4 = document.getElementById('chart-pareto');
        if (ctx4) _charts.push(new Chart(ctx4, {
            type: 'bar',
            data: {
                labels: chartData.pareto.slice(0, 20).map(p => p.nome.substring(0, 12)),
                datasets: [
                    { type: 'bar', label: 'ROI', data: chartData.pareto.slice(0, 20).map(p => p.roi), backgroundColor: palette.text, yAxisID: 'y' },
                    { type: 'line', label: 'Acumulado %', data: chartData.pareto.slice(0, 20).map(p => p.acumulado), borderColor: palette.red, backgroundColor: 'transparent', yAxisID: 'y1', tension: 0.2 }
                ]
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { labels: { boxWidth: 12, font: { size: 10 } } } },
                scales: {
                    y: { type: 'linear', position: 'left', beginAtZero: true, grid: { color: palette.border }, ticks: { font: { size: 10 } } },
                    y1: { type: 'linear', position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { callback: val => val + '%', font: { size: 10 } } },
                    x: { grid: { color: palette.border }, ticks: { font: { size: 8 }, maxRotation: 45 } }
                }
            }
        }));
    }

    static refreshCharts() {
        if (!window.Chart) return;
        _chartData = _chartData || null;
        this.initCharts(_chartData);
    }
}
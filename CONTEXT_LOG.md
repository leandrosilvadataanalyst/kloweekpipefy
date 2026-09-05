# Context Log - Projeto kloweekpipefy

## Legenda
- ✅ Concluído
- 🔄 Em andamento
- ❌ Cancelado
- 🐛 Bug Fix
- ⚠️ Atenção necessária

---

## Entradas do Log

### [04/09/2026] - Setup: Skills de Infraestrutura e Documentação
- **Descrição:** Criação de 7 skills para o projeto: context-log, proxy-php, test-unit, doc-pipefy, doc-php, doc-javascript, doc-python
- **Arquivos afetados:** `.opencode/skills/*.md`, `AGENTS.md`, `CONTEXT_LOG.md`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Sempre consultar skills antes de implementar

### [04/09/2026] - Setup: AGENTS.md com Workflow
- **Descrição:** Criado arquivo de workflow obrigatório com fluxo 7 etapas
- **Arquivos afetados:** `AGENTS.md`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Seguir fluxo 1-7 em toda mudança

### [04/09/2026] - Setup: CONTEXT_LOG.md
- **Descrição:** Criado log de contexto para anti-regressão
- **Arquivos afetados:** `CONTEXT_LOG.md`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Atualizar sempre que houver mudança

---

### [04/09/2026] - Feature: Relatório ROI com Cruzamento de Dados
- **Descrição:** Nova página `/roi-report` com duas listas lado a lado (preenchidos vs faltantes)
- **Arquivos afetados:** `controllers/roi_report_controller.py`, `templates/roi_report.html`, `app.py`, `config.py`, `.env`, `services/pipefy_service.py`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Verificar se os IDs dos pipes estão configurados no `.env`

### [04/09/2026] - Feature: Botão Copiar Mensagem Padrão
- **Descrição:** Botão para copiar mensagem formatada com clientes faltantes para enviar aos GTs
- **Arquivos afetados:** `templates/roi_report.html`, `controllers/roi_report_controller.py`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Usar Clipboard API com tratamento de erro

### [04/09/2026] - Configuração: Múltiplos Pipes
- **Descrição:** Configuração de 3 pipes: ROI Week Interno, Aditivo, Database Clientes
- **Arquivos afetados:** `config.py`, `.env`, `services/pipefy_service.py`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Preencher IDs dos pipes no `.env` antes de usar

### [04/09/2026] - Testes: Suite de Testes Completa
- **Descrição:** 46 testes unitários para models, services e controllers
- **Arquivos afetados:** `tests/`, `requirements.txt`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Rodar `pytest -v` antes de qualquer mudança

### [04/09/2026] - Menu: Link Relatório ROI no Sidebar
- **Descrição:** Adicionado link "Relatório ROI" no menu lateral
- **Arquivos afetados:** `templates/base.html`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Verificar se o link funciona corretamente

### [04/09/2026] - Configuração: Proxy XAMPP
- **Descrição:** Ajustado .htaccess e proxy.php para funcionar via XAMPP (Apache) com Flask na porta 5000
- **Arquivos afetados:** `.htaccess`, `proxy.php`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Flask deve estar rodando na porta 5000 antes de acessar via XAMPP

### [04/09/2026] - Segurança: Proteção de Dados Sensíveis
- **Descrição:** Criado .gitignore, protegido .env de acesso web, removido expostação de dados em erros
- **Arquivos afetados:** `.gitignore`, `.htaccess`, `proxy.php`, `config.py`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Nunca expor chaves em erros, sempre manter .env fora do git

### [04/09/2026] - Feature: Integração Google Sheets Cockpits
- **Descrição:** Criado `sheets-service.js` para buscar dados dos 4 cockpits (Wall Street, Romans, Legacy, Monsters S/A) via Google Sheets CSV export
- **Arquivos afetados:** `js/sheets-service.js`, `js/config.js`, `js/controllers/dashboard-controller.js`, `js/views/dashboard-view.js`, `index.html`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **GIDs Descobertos:** Wall Street (gid=4), Romans (gid=5), Legacy (gid=2), Monsters S/A (gid=3)
- **Prevenção:** Sheets devem estar compartilhadas publicamente para funcionar

### [04/09/2026] - Refactor: Dashboard com Dados Dinâmicos
- **Descrição:** Removida lista hardcoded de 104 clientes, agora busca dados dos cockpits dinamicamente
- **Arquivos afetados:** `js/controllers/dashboard-controller.js`, `js/views/dashboard-view.js`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Verificar se as sheets estão acessíveis antes de usar

### [04/09/2026] - Feature: Mensagem Segmentada por GT
- **Descrição:** Mensagem de cobrança agora agrupa clientes por GT (Account Manager)
- **Arquivos afetados:** `js/controllers/dashboard-controller.js`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Formato usa **negrito** para nomes dos GTs

### [04/09/2026] - Segurança: Proxy Google Sheets
- **Descrição:** Criado `sheets-proxy.php` para manter API key do Google server-side, evitando exposição no frontend
- **Arquivos afetados:** `sheets-proxy.php` (novo), `js/sheets-service.js`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** API key fica apenas no .env, nunca no JS do browser

### [04/09/2026] - Performance: Carregamento ROI Week por Período
- **Descrição:** Agora carrega apenas últimos 3 meses por padrão, com opção de selecionar 1/3/6/12/24 meses
- **Arquivos afetados:** `js/services/pipefy-service.js`, `js/controllers/dashboard-controller.js`, `js/views/dashboard-view.js`, `index.html`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Filtro de meses acelera carregamento em ~75% (de ~32 páginas para ~8 páginas)

### [04/09/2026] - 🐛 Bug Fix: Google Sheets Proxy
- **Descrição:** Corrigido formato do range na chamada da API Google Sheets - agora usa CSV export com gid
- **Arquivos afetados:** `sheets-proxy.php`, `js/sheets-service.js`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Google Sheets API v4 não aceita `gid` como range; usar CSV export com `?format=csv&gid=X`

### [04/09/2026] - Refactor: Padronização do Fluxo de Dados de Todos os Controllers
- **Descrição:** Atualizados `roi-controller.js` e `roi-report-controller.js` para usarem `fetchAllCockpits()` e a nova API `PipefyService.getRoiWeek(progressEl, 3)`, harmonizando todas as telas (`Visão Geral`, `ROI` e `Relatório ROI`).
- **Arquivos afetados:** `js/controllers/roi-controller.js`, `js/controllers/roi-report-controller.js`, `roi.html`, `roi-report.html`
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Todos os controllers do sistema agora utilizam a mesma fonte unificada de clientes (Google Sheets + Fallback Legacy) e o mesmo método otimizado do Pipefy.

---

## Bugs Registrados

### [05/09/2026] - 🐛 Bug Fix: Legacy sem dados no dashboard (findColIndex substring)
- **Descrição:** Após o refactor 100% API v4, os outros 3 squads carregavam, mas a Legacy continuava **sem nenhum cliente** no dashboard (nenhum card/tabela/GT).
- **Causa raiz:** `findColIndex()` usava `includes()` (substring). O candidato de nome `'name'` casava com o header `Relaciona**name**nto` (índice 11, coluna vazia) **antes** de chegar em `Nome do Projeto` (índice 1). Resultado: `name=''` → `if (!name) return null` descartava as 32/32 linhas.
- **Solução:** `findColIndex()` agora usa regex com word-boundary (`\b...\b`), que não casa `'name'` dentro de `Relacionamento`. Também adicionado candidato `'coodernador'` (typo real da coluna Legacy) para preencher o coordenador.
- **Validação (script node contra proxy real):** Wall Street 34, Romans 23, **Legacy 20** (POLIPISO, SLEEP HOUSE, APOENA…; coord=Cadu, GT=Felipe), Monsters 27. Demais squads com contagens idênticas ao comportamento anterior (nenhuma regressão).
- **Arquivos afetados:** `js/sheets-service.js`, `index.html` (v=23), `roi.html`/`roi-report.html` (v=10)
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Nunca usar `includes()` puro para casar nomes de coluna (substring case-se comum em headers); usar word-boundary. Ao validar nova planilha, rodar script de normalização contando clientes por squad antes de considerar o dashboard pronto.

### [05/09/2026] - Refactor do zero: Integração Google Sheets via API (100% API v4)
- **Descrição:** Reimplementação completa da camada de planilhas, do zero, eliminando todos os artefatos herdados (CSV export, cache local, metadata lookup, retries amplificando quota). Tudo passa a usar **somente a Google Sheets API v4**.
- **O que mudou:**
  1. `js/config.js`: cada squad agora tem o campo `title` (nome exato da aba) → elimina a chamada de `spreadsheets.get` (metadata). De 2 chamadas Google/squad para **1**.
  2. `sheets-proxy.php` reescrito do zero (~90 linhas): aceita `id` + `title` + `gid`, monta `values.get` com A1 notation (`{title}!A1:Z500`), **1 cURL sem retry**, retorna JSON `{id,title,gid,rows,total_rows}`. Sem CSV, sem cache, sem metadata, sem `X-Stale`.
  3. `js/sheets-service.js` reescrito do zero: consome JSON do proxy, converte `rows` (array de arrays) via `normalizeClient()`. Sem `parseCSV`, sem retry, sem `getStaleSheets`. Fetch **sequencial** com delay de 1s entre squads (anti-rajada → quota 300 req/min respeitada: apenas 4 chamadas/page load).
  4. `dashboard-controller.js`/`dashboard-view.js`: removidos `getStaleSheets` e o banner de cache stale.
  5. `cache/` esvaziado (fallback local removido por completo). HTMLs com bump de versão (index v=22, roi/report v=9).
- **Títulos validados:** Wall Street gid=4 e Romans gid=5 → `[Cockpit - Teste]`; Legacy gid=330387776 → `[ Cockpit ]`; Monsters S/A gid=3 → `[COCKPIT]`.
- **Validação:** curl nos 4 proxies retorna HTTP 200 (rows: WS=57, Romans=71, Legacy=33, Monsters=40). Legacy devolve dados reais (POLIPISO, SLEEP HOUSE, APOENA, HIPER CHECK; typo "Coodernador" preservado). `php -l` e `node --check` OK. Nenhum arquivo de cache gerado.
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Nunca retentar no proxy (quota explode); nunca usar CSV público; título da aba é a fonte única do range (renomear a aba = atualizar `title` no `config.js`); se Google falhar, a squad é pulada com warn (dados do resto continuam carregando).

### [05/09/2026] - 🐛 Bug Fix: Legacy 404 no Browser (Causa Raiz CORRETA)
- **Descrição:** A planilha Legacy falhava com 404 intermitente enquanto as demais squads carregavam normalmente.
- **Causa raiz REAL:** O `spreadsheetId` do Legacy em `js/config.js` estava **errado** — faltava a letra `B`. Config tinha `17y3rdmRMO3moQP9ha`**`JO`**`g5Z8bv...` e o correto é `...ha`**`BJO`**`g5Z8bv...`. Google retorna `404 "Requested entity was not found"` para ID inexistente. (Teste direto: `JO`→404, `BJO`→200).
- **Soluções implementadas nesta sessão:**
  1. `sheets-proxy.php` reescrito: **somente API v4** (sem CSV público nunca), 2 chamadas por squad, cache local em arquivo como fallback (`X-Stale: true`), sem retry no proxy (evita ciclo de quota).
  2. Frontend detecta `X-Stale` e exibe alerta; retry 4x com backoff no frontend; `cache/` no `.gitignore`.
  3. **Correção final:** `js/config.js` → `haJOg5` → `haBJOg5` (1 letra).
- **Arquivos afetados:** `js/config.js` (CORREÇÃO FINAL), `sheets-proxy.php`, `js/sheets-service.js`, `js/views/dashboard-view.js`, `js/controllers/dashboard-controller.js`, `.gitignore`, `index.html` (v=21)
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** Ao conferir spreadsheetId, validar sempre direto na Google API (`spreadsheets/{id}?key=`) antes de assumir problema de quota/rede; gid Legacy correto é o sheetId da aba `[ Cockpit ]` = `330387776`.

### [05/09/2026] - 🐛 Bug Fix: Legacy 404 no Browser (Causa Raiz)
- **Descrição:** A planilha Legacy (`17y3rdmRMO3moQP9haBJOg5Z8bv-4T4BVtfvMowm3jv8`) retornava 404/503 intermitente via browser enquanto as demais squads carregavam normalmente. Diagnóstico via `error.log` do Apache: Google devolve `"Requested entity was not found"` (404) e `503 UNAVAILABLE` de forma transitória para essa planilha específica.
- **Causa raiz:** Ciclo vicioso de quota. O proxy retentava (12-18 chamadas Google só para Legacy), esgotando a quota do projeto (300 req/min) e derrubando as chamadas seguintes — inclusive das outras squads.
- **Solução definitiva:** `sheets-proxy.php` reescrito para usar **somente Google Sheets API v4** (sem CSV público nunca):
  1. Zero retry no proxy (1 chamada metadata + 1 values por squad = 2 chamadas Google/page load).
  2. **Cache local em arquivo** (`cache/sheet_{id}_{gid}.csv` + `.ts`): sucesso grava cache; falha do Google serve o cache com header `X-Stale: true`.
  3. Frontend detecta `X-Stale` → alerta visual "dados do cache (desatualizados)" e `console.warn`.
  4. Retry (4x com backoff 1/2/3s) mantido apenas no frontend.
  5. GID Legacy correto é `330387776` (sheetId da aba `[ Cockpit ]`, **não** índice); mapeamento metadata usa sheetId primeiro, depois índice.
- **Arquivos afetados:** `sheets-proxy.php`, `js/sheets-service.js`, `js/views/dashboard-view.js`, `js/controllers/dashboard-controller.js`, `.gitignore`, `index.html` (v=20)
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** NUNCA usar CSV público; NUNCA retentre no proxy (quota explode); cache local é o fallback de dados, não fallback de gid; adicionar `cache/` ao `.gitignore`; confirmar gid real (sheetId vs índice) por via de metadata da API.

### [05/09/2026] - Refactor Visual: Design System, Dark Mode e Modernização UX/UI
- **Descrição:** Reforma visual completa de todas as telas com as melhores práticas de UI/UX, mantendo **somente** as cores padrão do projeto (preto, branco, cinza, verde e vermelho) e Tailwind CSS + modo escuro.
- **O que foi implementado:**
  1. `css/style.css` reescrito como **design system**: tokens CSS (`:root` claro + `.dark` escuro) e componentes semânticos (`.card`, `.stat-*`, `.btn`, `.badge` com `.b-safe/.b-care/.b-danger/.b-pending/.b-ok`, `.ctl`, `.tbl` com thead sticky, `.nav-link.active`, `.spinner`, `.skeleton`, scrollbar e `prefers-reduced-motion`).
  2. **Modo escuro** nos 3 HTMLs: `darkMode:'class'` no `tailwind.config` + IDs de versão `css/style.css?v=2`; script inline pré-paint (sem FOUC), preferência em `localStorage['kloweek-theme']`, fallback `prefers-color-scheme`; toggle com reload (mantém charts consistentes).
  3. **Shell moderno** dos 3 HTMLs: sidebar fixa escura (nav ativa em destaque), header com `backdrop-blur`, badge "Online", menu mobile com hambúrguer + backdrop + botão modos; Tailwind `gray` expandido (50–950 + chaves legadas `dark/light/bg/border`); bumps de versão **index v=24, roi/report v=11**.
  4. `js/theme.js` (novo): alternância de tema + abertura/fechamento do menu mobile (Esc fecha).
  5. Views reescritas: `dashboard-view.js` (cards, Top 5 GT, performance por squad, 4 gráficos com `Chart.defaults` lendo tokens CSS via `getComputedStyle` → theme-aware, estatística descritiva, tabela consolidada com filtros/export), `roi-view.js` e `roi-report-view.js` (período dinâmico via `Intl`, cards semânticos, tabelas lado a lado). Status `care` agora usa **cinza** (`.b-care`) — removido o amarelo que violava a paleta. **Emojis removidos** (✅/✗/📋/👋) → SVGs inline (regra AGENTS).
  6. Loaders dos 3 controllers modernizados (card com `.spinner` theme-aware + `#progresso` mantido) e estados de erro com card vermelho + botão "Tentar novamente".
- **Contratos preservados:** assinaturas `DashboardView.render(data, mesesRetroativos)`, `RoiView.render(metricas, clientes)`, `RoiReportView.render(preenchidos, faltantes, metricas)`/`gerarMensagem`; todos os ids de DOM usados pelos controllers (`#app`, `#progresso`, filtros, export, `#btn-copiar`, `#tabela-resumo-body`, `#chart-*`).
- **Validação:** `node --check` OK em todos os 15 JS; servidor PHP (`php -S`) com HTTP 200 em páginas + todos assets; smoke test em Node dos 3 renders (HTML gerado válido, sem amarelo nem emojis, mensagem GT correta); `.nav-link.active` corrigido para fundo branco com texto preto.
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** ao adicionar novas views, usar sempre as classes semânticas do design system e tokens CSS (nunca cores fora da paleta permitida); para dark mode, ler cores de gráfico das variáveis CSS (nunca hardcode de luminosidade); toggle de tema recarrega a página de propósito para evitar estado inconsistente dos charts.

### [05/09/2026] - Feature: Período vigente do ROI Week (ROI Week X · Ref: mês anterior)
- **Descrição:** O painel agora informa ao usuário **qual é a coleta vigente do ROI Week e a que período os dados se referem** ("ROI Week Setembro/2026 · Ref: Agosto/2026 · dados vigentes em 05/09/2026"). Os dados exibidos passam a **corresponder de fato** a essa data.
- **O que mudou:**
  1. `js/utils/periodo.js` (novo): fonte única do período — `getPeriodoRoiWeek()` (ROI Week = mês atual, coleta 01–03, referência = mês anterior, + data de hoje e estado da janela) e `ehDoRoiWeekAtual(dataObj)` (card pertence ao roi week vigente = data_obj dentro do mês atual até agora).
  2. Controllers (`dashboard`, `roi`, `roi-report`): ao cruzar clientes × ROI Week, agora **preferem o card do período vigente** (`matches.find(ehDoRoiWeekAtual) || matches[0]`). Um card só conta como "preenchido" se tiver valores **e** for do ROI Week atual (`ehDoRoiWeekAtual(roi.data_obj)`). Cartões de coleta anterior deixam de poluir as métricas (virando "Pendente" → cobrança correta aos GTs). `periodo` é injetado nas views.
  3. Views: card "Janela de preenchimento" **sempre visível** com ROI Week, Referência, data de hoje, status da janela (aberta/fechada) e alerta de pendências em destaque; toolbars e cabeçalhos de todas as tabelas/quadros ("Visão Geral", "Análise ROI", "Relatório ROI", "Tabela Resumo", "Cobrança por GT") exibem o período. `gerarMensagem` agora usa o nome do ROI Week vigente.
- **Contratos alterados:** `RoiView.render(metricas, clientes, periodo)` e `RoiReportView.render(preenchidos, faltantes, metricas, periodo)` ganharam o parâmetro `periodo`; `RoiReportView.gerarMensagem(faltantes, periodo)`.
- **Validação:** `node --check` OK nos 7 arquivos; smoke test em Node confirma período gerado ("Setembro/2026" / "Agosto/2026"), `ehDoRoiWeekAtual` correto (mês passado fora, mês atual dentro), três renders com os rótulos de período, ausência de amarelo/emojis e mensagem GT com o período; assets servidos 200 via `php -S`. Bumps: **index v=25, roi/report v=12**.
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** nunca derivar o período duplicado nas views/controllers — usar sempre `js/utils/periodo.js`; semântica: "preenchido" = card do ROI Week vigente (data_obj no mês atual); se uma planilha for preenchida fora da janela 01–03, o card continua contando (fora do prazo), mas só valem valores de coleta do mês corrente.

### [05/09/2026] - Feature: Filtro de período (GDS), Mensagens do vigente, Tema sem reload, Margem de Contribuição
- **Descrição:** Atendidos 4 pedidos: (1) filtro de período no estilo Google Data Studio — dashboard, Análise ROI e Relatório ROI reagem dinamicamente ao trocar o mês (sem refetch); (2) mensagens de lembrete/cobrança sempre referem o **ROI Week vigente**, mesmo analisando histórico; (3) toggle de tema agora muda sem recarregar a página; (4) errata: coluna "Margem de Contribuição" na Tabela Resumo (e exports), entre Faturamento e Investimento.
- **O que mudou:**
  1. `js/utils/periodo.js` expandido: `montarPeriodo()` gera o descritor de período (`key YYYY-MM`, `opcao` autoexplicativa "Set/2026 · Ref: Ago/2026 (atual)", `ehDoPeriodo`, `vigente`, `dentroJanela`, `dataAtual`); novos `periodoDoMesOffset`, `periodoPorChave`, `periodosDisponiveis(roiLista)` (agrupa os meses com dados), `periodoPadrao(options)` (vigente se existir, senão mais recente). `ehDoRoiWeekAtual` mantido.
  2. Dashboard: `#filtro-periodo` na toolbar; troca só re-renderiza no cliente (`periodoSelecionado`), gráficos/tabelas/cards/estatísticas recalculados via `processarDados(roiData, periodo)` + `calcularCharts(lista, stats)`. Card da janela com variações vigente/histórico; cobrança e `gerarMensagemGTs` usam SEMPRE `getPeriodoRoiWeek()` (lista do vigente), independente do filtro.
  3. ROI/ROI Report: controllers armazenam `*PorKey` (pré-agrupado por mês após o fetch) e `#filtro-periodo` troca o período; mensagem do report usa `vigenteFaltantes`; rótulos indicam "período vigente/histórico".
  4. `js/theme.js`: troca classe `dark`, persiste `kloweek-theme` e dispara `window.dispatchEvent(new CustomEvent('theme-changed', { detail: { dark } }))` — **sem `location.reload()`**. DashboardView ganhou registry de charts (`_charts`, `_destroyCharts`) + `refreshCharts()` (lê cores de `getComputedStyle` de novo) chamado via listener; controller registra o listener.
  5. `export-service.js`: coluna "Margem de Contribuição (%)" no CSV e no Excel após Faturamento (raw `mc`: `> 1 ? mc : mc*100`, 2 casas). Views usam o mesmo critério (1 casa, sufixo %); tabela passou a 13 colunas (colspan do empty-state = 13).
- **Contratos alterados:** assinaturas por objeto — `RoiView.render(data)` e `RoiReportView.render(data)` (`{ metricas, clientes/preenchidos/faltantes, periodo, periodoVigente, periodoOptions, periodoKey, vigenteFaltantes }`); controllers de ROI/ROI Report não exportam mais `periodoInfo` fixo. `gerarMensagem(faltantes, periodo)` exige o período (label + Ref).
- **Validação:** `node --check` em 10 arquivos JS; smoke test Node cobrindo `periodosDisponiveis` (2 meses), `periodoPadrao` = vigente, `ehDoRoiWeekAtual`, selects de período nas 3 views, coluna Margem (`mc=250 → "250.0%"`, `mc=0.5 → "50.0%"`, bruto nunca aparece), colspan 13, mensagens com ROI Week/Ref vigentes; todos os assets servidos 200 via `php -S`. Bumps: **index v=26, roi/report v=13, theme.js v=3**.
- **⚠️ Atenção:** `pytest` NÃO passa neste momento por problema **pré-existente**: o repositório não contém mais `config.py`/`app.py` (migração de Flask → frontend + proxies PHP), e `services/pipefy_service.py` ainda importa `config`, quebrando a coleta dos testes (`ModuleNotFoundError: No module named 'config'`). Nada relacionado às mudanças frontend desta entrada.
- **Status:** ✅ Concluído
- **Autor:** opencode
- **Prevenção:** período selecionável sempre via `periodoPorChave`/`periodosDisponiveis` (nunca montar mês manualmente); mensagens de cobrança SEMPRE do vigente (`getPeriodoRoiWeek()`), nunca do filtro; tema sem reload exige `refreshCharts` em toda view com Chart.js (destruir/recriar lendo cores dos tokens); margem exibida como % com regra `mc > 1 ? mc : mc*100` compartilhada entre view e exports; atualizar pytest futuramente para o backend `services/*.py` (remover dependência de `config.py`).

---

## Decisões Arquiteturais

### [04/09/2026] - Múltiplos Pipes Pipefy
- **Decisão:** Usar 3 pipes separados: ROI Week Interno, Aditivo, Database Clientes e Projeto
- **Justificativa:** Dados de saúde do cliente ficam em pipe separado do cadastro
- **Impacto:** PipefyService precisa buscar dados de múltiplos pipes e cruzar

### [04/09/2026] - Feature ROI Report
- **Decisão:** Nova página `/roi-report` ao invés de integrar na `/roi`
- **Justificativa:** Relatório dedicado com duas listas lado a lado
- **Impacto:** Novo controller, template, e endpoints API

---

## Referências Rápidas

### Arquivos Importantes
- `proxy.php` - Proxy PHP para proteção de chaves
- `sheets-proxy.php` - Proxy PHP para Google Sheets API v4
- `js/config.js` - Configuração dos squads/abas das planilhas
- `js/services/pipefy-service.js` - Comunicação com Pipefy API
- `js/sheets-service.js` - Leitura das planilhas via proxy

### Bugs Comuns e Soluções
_Nenhum bug comum registrado ainda._

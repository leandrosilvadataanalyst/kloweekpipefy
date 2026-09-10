-- ============================================================
-- Schema: kloweekpipefy (Supabase)
-- Fluxo: Pipefy → Supabase → Dashboard
-- ============================================================

-- ============================================================
-- 1. COCKPITS (dados das planilhas Google Sheets)
--    Fonte: 4 planilhas Wall Street, Romans, Legacy, Monsters
-- ============================================================

CREATE TABLE IF NOT EXISTS cockpits (
    id              TEXT PRIMARY KEY,
    nome            TEXT NOT NULL,
    squad           TEXT NOT NULL,
    coordenador     TEXT DEFAULT '',
    account         TEXT DEFAULT '',
    gt              TEXT DEFAULT '',
    fee             NUMERIC(12,2) DEFAULT 0,
    flag            TEXT DEFAULT '',
    health          TEXT DEFAULT '',
    customer_care_status TEXT DEFAULT '',
    data_atualizacao TEXT DEFAULT '',
    churn           BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cockpits_squad ON cockpits(squad);
CREATE INDEX idx_cockpits_gt ON cockpits(gt);
CREATE INDEX idx_cockpits_coordenador ON cockpits(coordenador);
CREATE INDEX idx_cockpits_churn ON cockpits(churn);

COMMENT ON TABLE cockpits IS 'Dados dos 4 cockpits de squads (fonte: Google Sheets)';

-- ============================================================
-- 2. ROI WEEK (cards do pipe ROI_WEEK - 303444567)
--    Pipefy → tabela → dashboard cruza com cockpits
-- ============================================================

CREATE TABLE IF NOT EXISTS roi_week (
    id              TEXT PRIMARY KEY,
    cliente_nome    TEXT NOT NULL,
    projeto         TEXT DEFAULT '',
    investimento    NUMERIC(12,2) DEFAULT 0,
    mc              NUMERIC(8,4) DEFAULT 0,
    faturamento     NUMERIC(12,2) DEFAULT 0,
    vendas          NUMERIC(10,0) DEFAULT 0,
    data_atualizacao TEXT DEFAULT '',
    data_obj        DATE,
    phase_id        TEXT DEFAULT '',
    phase_name      TEXT DEFAULT '',
    card_url        TEXT DEFAULT '',
    pipefy_created_at TIMESTAMPTZ,
    raw_fields      JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roi_week_cliente_nome ON roi_week(cliente_nome);
CREATE INDEX idx_roi_week_data_obj ON roi_week(data_obj);
CREATE INDEX idx_roi_week_projeto ON roi_week(projeto);
CREATE INDEX idx_roi_week_phase ON roi_week(phase_name);

COMMENT ON TABLE roi_week IS 'Cards do pipe ROI Week (Pipefy 303444567)';

-- ============================================================
-- 3. DATABASE CLIENTES (pipe DATABASE_CLIENTES - 301753761)
--    Base de dados de clientes do Pipefy
-- ============================================================

CREATE TABLE IF NOT EXISTS database_clientes (
    id              TEXT PRIMARY KEY,
    nome            TEXT NOT NULL,
    fee             NUMERIC(12,2) DEFAULT 0,
    produto         TEXT DEFAULT '',
    data_assinatura TEXT DEFAULT '',
    phase_id        TEXT DEFAULT '',
    phase_name      TEXT DEFAULT '',
    raw_fields      JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_db_clientes_nome ON database_clientes(nome);
CREATE INDEX idx_db_clientes_phase ON database_clientes(phase_name);

COMMENT ON TABLE database_clientes IS 'Base de dados de clientes (Pipefy 301753761)';

-- ============================================================
-- 4. DATABASE PROJETO (pipe DATABASE_PROJETO - 305733459)
--    Base de dados de projetos do Pipefy
-- ============================================================

CREATE TABLE IF NOT EXISTS database_projeto (
    id              TEXT PRIMARY KEY,
    nome            TEXT NOT NULL,
    status          TEXT DEFAULT '',
    fase            TEXT DEFAULT '',
    produto         TEXT DEFAULT '',
    phase_id        TEXT DEFAULT '',
    phase_name      TEXT DEFAULT '',
    raw_fields      JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_db_projeto_nome ON database_projeto(nome);
CREATE INDEX idx_db_projeto_phase ON database_projeto(phase_name);
CREATE INDEX idx_db_projeto_fase ON database_projeto(fase);

COMMENT ON TABLE database_projeto IS 'Base de dados de projetos (Pipefy 305733459)';

-- ============================================================
-- 5. PIPEFY SYNC LOG (log de sincronizações Pipefy → Supabase)
-- ============================================================

CREATE TABLE IF NOT EXISTS sync_log (
    id              BIGSERIAL PRIMARY KEY,
    origem          TEXT NOT NULL,
    acao            TEXT NOT NULL,
    registros       INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'OK',
    detalhes        TEXT DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_log_origem ON sync_log(origem);
CREATE INDEX idx_sync_log_created ON sync_log(created_at DESC);

COMMENT ON TABLE sync_log IS 'Log de sincronizações Pipefy ↔ Supabase';

-- ============================================================
-- 6. VIEW: Dashboard (consolida cockpits + roi_week)
--    Esta view substitui o processarDados() do JS
-- ============================================================

CREATE OR REPLACE VIEW dashboard_consolidado AS
SELECT
    c.id,
    c.nome,
    c.squad,
    c.coordenador,
    c.account,
    c.gt,
    c.fee,
    c.flag,
    c.health,
    c.customer_care_status,
    c.data_atualizacao AS cockpit_data_atualizacao,
    COALESCE(c.churn, FALSE) AS churn,
    r.id AS roi_id,
    r.cliente_nome AS roi_cliente_nome,
    r.projeto,
    r.investimento,
    r.mc,
    r.faturamento,
    r.vendas,
    r.data_atualizacao AS roi_data_atualizacao,
    r.data_obj AS roi_data_obj,
    r.phase_name AS roi_phase,
    r.card_url,
    CASE
        WHEN r.investimento > 0 THEN ROUND((r.faturamento * CASE WHEN r.mc > 1 THEN r.mc / 100 ELSE r.mc END) / r.investimento, 4)
        ELSE 0
    END AS roi_calculado,
    CASE
        WHEN r.investimento > 0 THEN ROUND(r.faturamento / r.investimento, 4)
        ELSE 0
    END AS roas,
    CASE
        WHEN r.vendas > 0 THEN ROUND(r.investimento / r.vendas, 2)
        ELSE 0
    END AS cac,
    CASE
        WHEN r.id IS NULL THEN 'Pendente'
        WHEN r.data_obj >= DATE_TRUNC('month', CURRENT_DATE)
         AND r.data_obj < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '3 days'
        THEN 'No prazo'
        ELSE 'Fora do prazo'
    END AS prazo_status
FROM cockpits c
LEFT JOIN roi_week r ON (
    LOWER(c.nome) = LOWER(r.cliente_nome)
    OR LOWER(c.nome) LIKE '%' || LOWER(r.cliente_nome) || '%'
    OR LOWER(r.cliente_nome) LIKE '%' || LOWER(c.nome) || '%'
    OR LOWER(c.nome) = LOWER(r.projeto)
    OR LOWER(r.projeto) LIKE '%' || LOWER(c.nome) || '%'
)
WHERE COALESCE(c.churn, FALSE) = FALSE;

COMMENT ON VIEW dashboard_consolidado IS 'View consolidada: cockpits + ROI Week (substitute processarDados JS)';

-- ============================================================
-- 7. RLS (Row Level Security) - Habilitar para produção
-- ============================================================

ALTER TABLE cockpits ENABLE ROW LEVEL SECURITY;
ALTER TABLE roi_week ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_projeto ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Anon read (dashboard público)
CREATE POLICY "cockpits_select" ON cockpits FOR SELECT USING (true);
CREATE POLICY "roi_week_select" ON roi_week FOR SELECT USING (true);
CREATE POLICY "database_clientes_select" ON database_clientes FOR SELECT USING (true);
CREATE POLICY "database_projeto_select" ON database_projeto FOR SELECT USING (true);
CREATE POLICY "sync_log_select" ON sync_log FOR SELECT USING (true);

-- Service role write (sync via backend)
CREATE POLICY "cockpits_insert" ON cockpits FOR INSERT WITH CHECK (true);
CREATE POLICY "cockpits_update" ON cockpits FOR UPDATE USING (true);
CREATE POLICY "cockpits_delete" ON cockpits FOR DELETE USING (true);

CREATE POLICY "roi_week_insert" ON roi_week FOR INSERT WITH CHECK (true);
CREATE POLICY "roi_week_update" ON roi_week FOR UPDATE USING (true);
CREATE POLICY "roi_week_delete" ON roi_week FOR DELETE USING (true);

CREATE POLICY "database_clientes_insert" ON database_clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "database_clientes_update" ON database_clientes FOR UPDATE USING (true);
CREATE POLICY "database_clientes_delete" ON database_clientes FOR DELETE USING (true);

CREATE POLICY "database_projeto_insert" ON database_projeto FOR INSERT WITH CHECK (true);
CREATE POLICY "database_projeto_update" ON database_projeto FOR UPDATE USING (true);
CREATE POLICY "database_projeto_delete" ON database_projeto FOR DELETE USING (true);

CREATE POLICY "sync_log_insert" ON sync_log FOR INSERT WITH CHECK (true);

-- ============================================================
-- 8. FUNCTIONS para upsert (evitar duplicatas)
-- ============================================================

-- Upsert ROI Week (por card ID do Pipefy)
CREATE OR REPLACE FUNCTION upsert_roi_week(
    p_id TEXT,
    p_cliente_nome TEXT,
    p_projeto TEXT,
    p_investimento NUMERIC,
    p_mc NUMERIC,
    p_faturamento NUMERIC,
    p_vendas NUMERIC,
    p_data_atualizacao TEXT,
    p_data_obj DATE,
    p_phase_id TEXT,
    p_phase_name TEXT,
    p_card_url TEXT,
    p_pipefy_created_at TIMESTAMPTZ,
    p_raw_fields JSONB
) RETURNS roi_week AS $$
BEGIN
    INSERT INTO roi_week (
        id, cliente_nome, projeto, investimento, mc, faturamento, vendas,
        data_atualizacao, data_obj, phase_id, phase_name, card_url,
        pipefy_created_at, raw_fields, updated_at
    ) VALUES (
        p_id, p_cliente_nome, p_projeto, p_investimento, p_mc, p_faturamento, p_vendas,
        p_data_atualizacao, p_data_obj, p_phase_id, p_phase_name, p_card_url,
        p_pipefy_created_at, p_raw_fields, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        cliente_nome = EXCLUDED.cliente_nome,
        projeto = EXCLUDED.projeto,
        investimento = EXCLUDED.investimento,
        mc = EXCLUDED.mc,
        faturamento = EXCLUDED.faturamento,
        vendas = EXCLUDED.vendas,
        data_atualizacao = EXCLUDED.data_atualizacao,
        data_obj = EXCLUDED.data_obj,
        phase_id = EXCLUDED.phase_id,
        phase_name = EXCLUDED.phase_name,
        card_url = EXCLUDED.card_url,
        raw_fields = EXCLUDED.raw_fields,
        updated_at = NOW()
    RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Upsert Cockpit (por ID)
CREATE OR REPLACE FUNCTION upsert_cockpit(
    p_id TEXT,
    p_nome TEXT,
    p_squad TEXT,
    p_coordenador TEXT,
    p_account TEXT,
    p_gt TEXT,
    p_fee NUMERIC,
    p_flag TEXT,
    p_health TEXT,
    p_customer_care_status TEXT,
    p_data_atualizacao TEXT,
    p_churn BOOLEAN
) RETURNS cockpits AS $$
BEGIN
    INSERT INTO cockpits (
        id, nome, squad, coordenador, account, gt, fee, flag, health,
        customer_care_status, data_atualizacao, churn, updated_at
    ) VALUES (
        p_id, p_nome, p_squad, p_coordenador, p_account, p_gt, p_fee, p_flag, p_health,
        p_customer_care_status, p_data_atualizacao, p_churn, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        nome = EXCLUDED.nome,
        squad = EXCLUDED.squad,
        coordenador = EXCLUDED.coordenador,
        account = EXCLUDED.account,
        gt = EXCLUDED.gt,
        fee = EXCLUDED.fee,
        flag = EXCLUDED.flag,
        health = EXCLUDED.health,
        customer_care_status = EXCLUDED.customer_care_status,
        data_atualizacao = EXCLUDED.data_atualizacao,
        churn = EXCLUDED.churn,
        updated_at = NOW()
    RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. TRIGGER: atualizar updated_at automaticamente
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cockpits_updated
    BEFORE UPDATE ON cockpits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_roi_week_updated
    BEFORE UPDATE ON roi_week
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_db_clientes_updated
    BEFORE UPDATE ON database_clientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_db_projeto_updated
    BEFORE UPDATE ON database_projeto
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

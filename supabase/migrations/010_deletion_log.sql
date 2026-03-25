-- ============================================================================
-- Migration 010 : Log de suppressions (propagation cross-browser)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_deletions (
  id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT now(),
  deleted_by TEXT,
  PRIMARY KEY (id, table_name)
);

ALTER TABLE crm_deletions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_deletions_all" ON crm_deletions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Nettoyer les entrées de plus de 24h automatiquement (optionnel, via cron Supabase)
CREATE INDEX idx_crm_deletions_date ON crm_deletions(deleted_at);

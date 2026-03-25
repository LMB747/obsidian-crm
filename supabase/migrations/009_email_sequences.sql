-- ============================================================================
-- Migration 009 : Tables séquences email
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_email_sequences (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_email_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_email_sequences_all" ON crm_email_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS crm_sequence_enrollments (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_sequence_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_sequence_enrollments_all" ON crm_sequence_enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);

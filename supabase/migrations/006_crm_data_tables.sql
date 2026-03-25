-- ============================================================================
-- Migration 006 : Tables CRM principales (clients, projects, invoices, freelancers)
-- ============================================================================

-- CLIENTS
CREATE TABLE IF NOT EXISTS crm_clients (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_clients_all" ON crm_clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FREELANCERS
CREATE TABLE IF NOT EXISTS crm_freelancers (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_freelancers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_freelancers_all" ON crm_freelancers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PROJECTS
CREATE TABLE IF NOT EXISTS crm_projects (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_projects_all" ON crm_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- INVOICES
CREATE TABLE IF NOT EXISTS crm_invoices (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_invoices_all" ON crm_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DEVIS
CREATE TABLE IF NOT EXISTS crm_devis (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_devis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_devis_all" ON crm_devis FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SNOOZE SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS crm_snooze (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_snooze ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_snooze_all" ON crm_snooze FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SETTINGS (singleton row)
CREATE TABLE IF NOT EXISTS crm_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_settings_all" ON crm_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- UNIFIED TAGS
CREATE TABLE IF NOT EXISTS crm_tags (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_tags_all" ON crm_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PROJECT TEMPLATES
CREATE TABLE IF NOT EXISTS crm_templates (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_templates_all" ON crm_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CLIENT PORTAL ACCESSES
CREATE TABLE IF NOT EXISTS crm_portal_accesses (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_portal_accesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_portal_all" ON crm_portal_accesses FOR ALL TO authenticated USING (true) WITH CHECK (true);

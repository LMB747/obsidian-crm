-- ============================================================================
-- Migration 007 : Activer Supabase Realtime sur les tables clés
-- ============================================================================

-- Activer la publication realtime sur les tables de chat et données CRM
ALTER PUBLICATION supabase_realtime ADD TABLE project_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE crm_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE crm_clients;
ALTER PUBLICATION supabase_realtime ADD TABLE crm_invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;

-- ============================================================================
-- Migration 001 : Audit logs, Personal tasks/notes, User workspaces
-- Toutes les tables ont RLS active avec policies par utilisateur
-- ============================================================================

-- ─── AUDIT LOGS ─────────────────────────────────────────────────────────────
-- user_id est TEXT (pas UUID) car le store local utilise des IDs custom
-- comme 'admin-001' ou 'system' qui ne sont pas des UUIDs Supabase.

CREATE TABLE IF NOT EXISTS audit_logs (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    text NOT NULL,
  user_nom   text NOT NULL,
  action     text NOT NULL,
  section    text,
  details    text,
  date       timestamptz NOT NULL DEFAULT now(),
  ip         text
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins voient tout
CREATE POLICY "audit_logs_admin_select"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Non-admins voient uniquement leurs propres logs
CREATE POLICY "audit_logs_user_select"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Tout utilisateur authentifie peut inserer
CREATE POLICY "audit_logs_insert"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index pour les requetes frequentes
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs (date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);


-- ─── PERSONAL TASKS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS personal_tasks (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titre          text NOT NULL,
  description    text DEFAULT '',
  statut         text DEFAULT 'todo',
  priorite       text DEFAULT 'normale',
  date_echeance  timestamptz,
  date_creation  timestamptz DEFAULT now(),
  tags           jsonb DEFAULT '[]'::jsonb,
  subtasks       jsonb DEFAULT '[]'::jsonb,
  ordre          integer DEFAULT 0,
  rappel         timestamptz
);

ALTER TABLE personal_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personal_tasks_user_all"
  ON personal_tasks FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_personal_tasks_user ON personal_tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_ordre ON personal_tasks (user_id, ordre);


-- ─── PERSONAL NOTES ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS personal_notes (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titre             text NOT NULL,
  contenu           text DEFAULT '',
  couleur           text,
  epingle           boolean DEFAULT false,
  ordre             integer DEFAULT 0,
  date_creation     timestamptz DEFAULT now(),
  date_modification timestamptz DEFAULT now()
);

ALTER TABLE personal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personal_notes_user_all"
  ON personal_notes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_personal_notes_user ON personal_notes (user_id);
CREATE INDEX IF NOT EXISTS idx_personal_notes_ordre ON personal_notes (user_id, ordre);


-- ─── USER WORKSPACES (tracking d'initialisation) ───────────────────────────

CREATE TABLE IF NOT EXISTS user_workspaces (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  initialized     boolean DEFAULT true,
  storage_folder  text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_workspaces_user_select"
  ON user_workspaces FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_workspaces_user_insert"
  ON user_workspaces FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_workspaces_user_update"
  ON user_workspaces FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_workspaces_user ON user_workspaces (user_id);


-- ─── STORAGE BUCKET ─────────────────────────────────────────────────────────
-- Le bucket user-files doit etre cree via le dashboard Supabase ou l'API.
-- Policies de storage recommandees :
--   SELECT : (storage.foldername(name))[1] = auth.uid()::text
--   INSERT : (storage.foldername(name))[1] = auth.uid()::text
--   UPDATE : (storage.foldername(name))[1] = auth.uid()::text
--   DELETE : (storage.foldername(name))[1] = auth.uid()::text

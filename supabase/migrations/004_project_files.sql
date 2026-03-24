-- ============================================================================
-- Migration 004 : Project Files (Upload fichiers)
-- ============================================================================

-- NOTE: Créer le bucket 'project-files' dans Supabase Storage (privé)
-- avec les policies RLS suivantes:
-- SELECT/INSERT/UPDATE/DELETE: (storage.foldername(name))[1] = project_id associé

CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  task_id TEXT,
  livrable_id TEXT,
  user_id TEXT NOT NULL,
  user_nom TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT,
  mime_type TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read files"
  ON project_files FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert files"
  ON project_files FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete own files"
  ON project_files FOR DELETE TO authenticated
  USING (user_id = auth.uid()::text);

CREATE INDEX idx_pf_project ON project_files(project_id, created_at DESC);

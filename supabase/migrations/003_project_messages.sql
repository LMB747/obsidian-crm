-- ============================================================================
-- Migration 003 : Project Messages (Chat temps réel)
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_nom TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'file', 'system')),
  reply_to_id UUID REFERENCES project_messages(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read messages"
  ON project_messages FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert messages"
  ON project_messages FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_pm_project ON project_messages(project_id, created_at DESC);
CREATE INDEX idx_pm_user ON project_messages(user_id);

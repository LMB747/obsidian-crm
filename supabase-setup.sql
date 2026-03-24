-- ============================================================
-- OBSIDIAN CRM — Supabase Setup
-- Exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Table profiles (liée à auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nom TEXT DEFAULT '',
  prenom TEXT DEFAULT '',
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'freelancer', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- 2. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom, prenom, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Admins can see all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admins can update any profile
CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Create the first admin user
-- ⚠️ REMPLACER email et password par vos identifiants
-- Exécutez ceci APRÈS avoir créé le user via l'interface Supabase Auth
-- ou via le formulaire de setup du CRM (#setup)

-- ============================================================
-- INSTRUCTIONS :
-- 1. Allez dans Supabase → Authentication → Users → Add User
-- 2. Email: votre-email@domaine.com, Password: votre-mot-de-passe
-- 3. Le trigger créera automatiquement le profil
-- 4. Mettez à jour le rôle en admin :
--    UPDATE profiles SET role = 'admin' WHERE email = 'votre-email@domaine.com';
-- 5. Dans Vercel, ajoutez les env vars :
--    VITE_SUPABASE_URL = https://xxxx.supabase.co
--    VITE_SUPABASE_KEY = eyJhb...
-- ============================================================

-- ============================================================
-- 5. ESPACE PERSONNEL — Tâches & Notes
-- ============================================================

-- 5a. Personal Tasks
CREATE TABLE IF NOT EXISTS personal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titre TEXT NOT NULL,
  description TEXT DEFAULT '',
  statut TEXT DEFAULT 'todo' CHECK (statut IN ('todo', 'in_progress', 'done')),
  priorite TEXT DEFAULT 'normale' CHECK (priorite IN ('basse', 'normale', 'haute', 'urgente')),
  date_echeance DATE,
  date_creation TIMESTAMPTZ DEFAULT now(),
  tags TEXT[] DEFAULT '{}',
  subtasks JSONB DEFAULT '[]',
  ordre INTEGER DEFAULT 0,
  rappel TIMESTAMPTZ
);

ALTER TABLE personal_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own personal tasks" ON personal_tasks
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_personal_tasks_user ON personal_tasks(user_id);

-- 5b. Personal Notes
CREATE TABLE IF NOT EXISTS personal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titre TEXT NOT NULL,
  contenu TEXT DEFAULT '',
  couleur TEXT DEFAULT '#6366f1',
  epingle BOOLEAN DEFAULT false,
  ordre INTEGER DEFAULT 0,
  date_creation TIMESTAMPTZ DEFAULT now(),
  date_modification TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE personal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own personal notes" ON personal_notes
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_personal_notes_user ON personal_notes(user_id);

-- ============================================================
-- 6. AUDIT LOGS — Journal d'activité
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_nom TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  section TEXT,
  details TEXT,
  date TIMESTAMPTZ DEFAULT now(),
  ip TEXT
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all audit logs
CREATE POLICY "Admins can read all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_audit_logs_date ON audit_logs(date DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ============================================================
-- 7. PERMISSIONS par utilisateur (optionnel, extension de profiles)
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';

-- ============================================================================
-- Migration 008 : Restreindre RLS sur crm_settings (contient API keys)
-- ============================================================================

-- Supprimer l'ancienne policy trop permissive sur settings
DROP POLICY IF EXISTS "crm_settings_all" ON crm_settings;

-- Seuls les admins peuvent lire/écrire les settings
CREATE POLICY "crm_settings_admin_only" ON crm_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

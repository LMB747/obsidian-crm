-- Migration 002 : Ajouter la colonne permissions à profiles
-- Les permissions sont stockées comme un array TEXT[] dans Supabase

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);

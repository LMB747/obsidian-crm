/**
 * Client Supabase — pont vers le singleton de supabaseAuth.ts
 *
 * Ce fichier existe pour la rétrocompatibilité (Settings, etc.)
 * Le vrai client Supabase est géré dans supabaseAuth.ts → getSupabase()
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

/**
 * Crée un client Supabase à la volée avec la config fournie.
 * Utilisé par Settings quand l'admin configure manuellement l'URL/key.
 */
export function createSupabaseClient(config: SupabaseConfig): SupabaseClient | null {
  if (!config.url || !config.anonKey) {
    console.warn('[Supabase] URL ou clé manquante.');
    return null;
  }
  return createClient(config.url, config.anonKey);
}

/**
 * Tables à créer dans Supabase :
 *
 * profiles (id, email, nom, prenom, role, is_active, created_at, last_login)
 * personal_tasks (id, user_id, titre, description, statut, priorite, date_echeance, date_creation, tags, subtasks, ordre, rappel)
 * personal_notes (id, user_id, titre, contenu, couleur, epingle, ordre, date_creation, date_modification)
 * audit_logs (id, user_id, user_nom, action, section, details, date, ip)
 *
 * Activer RLS (Row Level Security) sur toutes les tables.
 */

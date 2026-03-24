/**
 * Supabase Auth — système d'authentification complet
 *
 * Utilise Supabase Auth (email/password) pour :
 * - Login / Logout
 * - Gestion de session (persistée automatiquement par Supabase)
 * - Invitation d'utilisateurs par l'admin
 * - Récupération du profil utilisateur depuis la table `profiles`
 *
 * Variables d'environnement requises :
 *   VITE_SUPABASE_URL = https://xxxx.supabase.co
 *   VITE_SUPABASE_KEY = eyJhb... (anon key)
 */

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

// ─── Singleton client ───────────────────────────────────────────────────────

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_KEY;

  if (!url || !key) {
    console.warn('[Auth] VITE_SUPABASE_URL ou VITE_SUPABASE_KEY non configuré.');
    return null;
  }

  _client = createClient(url, key);
  return _client;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: 'admin' | 'freelancer' | 'viewer';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

// ─── Auth functions ─────────────────────────────────────────────────────────

/** Login with email + password */
export async function signIn(email: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase non configuré. Contactez l\'administrateur.' };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message };
  }

  if (!data.user) return { success: false, error: 'Erreur de connexion.' };

  // Fetch profile from profiles table
  const profile = await getProfile(data.user.id);

  // Update last_login
  await supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', data.user.id);

  return { success: true, user: profile || { id: data.user.id, email: data.user.email!, nom: '', prenom: '', role: 'viewer', is_active: true, created_at: data.user.created_at } };
}

/** Logout */
export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** Get current session user */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return getProfile(user.id);
}

/** Get profile from profiles table */
async function getProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return data as UserProfile | null;
}

/** Invite a new user (admin only) */
export async function inviteUser(email: string, password: string, nom: string, prenom: string, role: 'admin' | 'freelancer' | 'viewer'): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase non configuré.' };

  // Create user via Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nom, prenom, role },
    },
  });

  if (error) return { success: false, error: error.message };
  if (!data.user) return { success: false, error: 'Erreur lors de la création.' };

  // Insert profile
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    email,
    nom,
    prenom,
    role,
    is_active: true,
  });

  if (profileError) return { success: false, error: profileError.message };

  return { success: true };
}

/** List all users (admin) */
export async function listUsers(): Promise<UserProfile[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  return (data as UserProfile[]) || [];
}

/** Listen to auth state changes */
export function onAuthStateChange(callback: (user: User | null) => void) {
  const supabase = getSupabase();
  if (!supabase) return { unsubscribe: () => {} };

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return { unsubscribe: () => subscription.unsubscribe() };
}

/** Check if Supabase is configured */
export function isSupabaseConfigured(): boolean {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_KEY);
}

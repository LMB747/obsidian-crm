/**
 * Supabase Service — CRUD pour audit logs, tâches/notes personnelles, espaces utilisateurs
 *
 * Toutes les fonctions d'écriture sont fire-and-forget (pas de blocage UI).
 * Si Supabase n'est pas configuré, chaque fonction retourne silencieusement.
 */

import { getSupabase } from './supabaseAuth';
import type { AuditLog, PersonalTask, PersonalNote } from '../types';

// ─── Guard ──────────────────────────────────────────────────────────────────

function sb() {
  return getSupabase();
}

// ─── Field Mapping ──────────────────────────────────────────────────────────

const TASK_TO_DB: Record<string, string> = {
  userId: 'user_id',
  dateCreation: 'date_creation',
  dateEcheance: 'date_echeance',
};

const TASK_FROM_DB: Record<string, string> = {
  user_id: 'userId',
  date_creation: 'dateCreation',
  date_echeance: 'dateEcheance',
};

const NOTE_TO_DB: Record<string, string> = {
  userId: 'user_id',
  dateCreation: 'date_creation',
  dateModification: 'date_modification',
};

const NOTE_FROM_DB: Record<string, string> = {
  user_id: 'userId',
  date_creation: 'dateCreation',
  date_modification: 'dateModification',
};

const LOG_TO_DB: Record<string, string> = {
  userId: 'user_id',
  userNom: 'user_nom',
};

const LOG_FROM_DB: Record<string, string> = {
  user_id: 'userId',
  user_nom: 'userNom',
};

function mapKeys(obj: Record<string, any>, mapping: Record<string, string>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[mapping[key] || key] = value;
  }
  return result;
}

// ─── AUDIT LOGS ─────────────────────────────────────────────────────────────

/** Insert un audit log dans Supabase (fire-and-forget) */
export function syncAuditLog(log: AuditLog): void {
  const supabase = sb();
  if (!supabase) return;

  const dbLog = mapKeys(log, LOG_TO_DB);
  // Ne pas envoyer l'id local — laisser Supabase générer le sien
  delete dbLog.id;

  supabase
    .from('audit_logs')
    .insert(dbLog)
    .then(({ error }) => {
      if (error) console.warn('[Supabase] syncAuditLog error:', error.message);
    });
}

/** Récupère les audit logs depuis Supabase (pour Admin) */
export async function fetchAuditLogs(filters?: {
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const supabase = sb();
  if (!supabase) return [];

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('date', { ascending: false })
    .limit(filters?.limit ?? 500);

  if (filters?.userId) query = query.eq('user_id', filters.userId);
  if (filters?.action) query = query.eq('action', filters.action);
  if (filters?.dateFrom) query = query.gte('date', filters.dateFrom);
  if (filters?.dateTo) query = query.lte('date', filters.dateTo);

  const { data, error } = await query;

  if (error) {
    console.warn('[Supabase] fetchAuditLogs error:', error.message);
    return [];
  }

  return (data || []).map((row: any) => mapKeys(row, LOG_FROM_DB) as AuditLog);
}

// ─── PERSONAL TASKS ─────────────────────────────────────────────────────────

/** Upsert une tâche personnelle (fire-and-forget) */
export function syncPersonalTask(task: PersonalTask): void {
  const supabase = sb();
  if (!supabase) return;

  const dbTask = mapKeys(task, TASK_TO_DB);

  supabase
    .from('personal_tasks')
    .upsert(dbTask, { onConflict: 'id' })
    .then(({ error }) => {
      if (error) console.warn('[Supabase] syncPersonalTask error:', error.message);
    });
}

/** Mise à jour partielle d'une tâche (fire-and-forget) */
export function updatePersonalTaskRemote(id: string, updates: Partial<PersonalTask>): void {
  const supabase = sb();
  if (!supabase) return;

  const dbUpdates = mapKeys(updates as Record<string, any>, TASK_TO_DB);

  supabase
    .from('personal_tasks')
    .update(dbUpdates)
    .eq('id', id)
    .then(({ error }) => {
      if (error) console.warn('[Supabase] updatePersonalTask error:', error.message);
    });
}

/** Supprime une tâche (fire-and-forget) */
export function deletePersonalTaskRemote(id: string): void {
  const supabase = sb();
  if (!supabase) return;

  supabase
    .from('personal_tasks')
    .delete()
    .eq('id', id)
    .then(({ error }) => {
      if (error) console.warn('[Supabase] deletePersonalTask error:', error.message);
    });
}

/** Charge toutes les tâches d'un utilisateur depuis Supabase */
export async function fetchUserPersonalTasks(userId: string): Promise<PersonalTask[]> {
  const supabase = sb();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('personal_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('ordre', { ascending: true });

  if (error) {
    console.warn('[Supabase] fetchUserPersonalTasks error:', error.message);
    return [];
  }

  return (data || []).map((row: any) => mapKeys(row, TASK_FROM_DB) as PersonalTask);
}

/** Met à jour l'ordre des tâches (fire-and-forget) */
export function reorderPersonalTasksRemote(tasks: Array<{ id: string; ordre: number }>): void {
  const supabase = sb();
  if (!supabase) return;

  // Batch update via upsert
  const updates = tasks.map(t => ({ id: t.id, ordre: t.ordre }));
  supabase
    .from('personal_tasks')
    .upsert(updates, { onConflict: 'id', ignoreDuplicates: false })
    .then(({ error }) => {
      if (error) console.warn('[Supabase] reorderPersonalTasks error:', error.message);
    });
}

// ─── PERSONAL NOTES ─────────────────────────────────────────────────────────

/** Upsert une note personnelle (fire-and-forget) */
export function syncPersonalNote(note: PersonalNote): void {
  const supabase = sb();
  if (!supabase) return;

  const dbNote = mapKeys(note, NOTE_TO_DB);

  supabase
    .from('personal_notes')
    .upsert(dbNote, { onConflict: 'id' })
    .then(({ error }) => {
      if (error) console.warn('[Supabase] syncPersonalNote error:', error.message);
    });
}

/** Mise à jour partielle d'une note (fire-and-forget) */
export function updatePersonalNoteRemote(id: string, updates: Partial<PersonalNote>): void {
  const supabase = sb();
  if (!supabase) return;

  const dbUpdates = mapKeys(updates as Record<string, any>, NOTE_TO_DB);

  supabase
    .from('personal_notes')
    .update(dbUpdates)
    .eq('id', id)
    .then(({ error }) => {
      if (error) console.warn('[Supabase] updatePersonalNote error:', error.message);
    });
}

/** Supprime une note (fire-and-forget) */
export function deletePersonalNoteRemote(id: string): void {
  const supabase = sb();
  if (!supabase) return;

  supabase
    .from('personal_notes')
    .delete()
    .eq('id', id)
    .then(({ error }) => {
      if (error) console.warn('[Supabase] deletePersonalNote error:', error.message);
    });
}

/** Charge toutes les notes d'un utilisateur depuis Supabase */
export async function fetchUserPersonalNotes(userId: string): Promise<PersonalNote[]> {
  const supabase = sb();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('personal_notes')
    .select('*')
    .eq('user_id', userId)
    .order('ordre', { ascending: true });

  if (error) {
    console.warn('[Supabase] fetchUserPersonalNotes error:', error.message);
    return [];
  }

  return (data || []).map((row: any) => mapKeys(row, NOTE_FROM_DB) as PersonalNote);
}

/** Met à jour l'ordre des notes (fire-and-forget) */
export function reorderPersonalNotesRemote(notes: Array<{ id: string; ordre: number }>): void {
  const supabase = sb();
  if (!supabase) return;

  const updates = notes.map(n => ({ id: n.id, ordre: n.ordre }));
  supabase
    .from('personal_notes')
    .upsert(updates, { onConflict: 'id', ignoreDuplicates: false })
    .then(({ error }) => {
      if (error) console.warn('[Supabase] reorderPersonalNotes error:', error.message);
    });
}

// ─── USER SPACE INITIALIZATION ──────────────────────────────────────────────

/** Vérifie si l'espace utilisateur existe, sinon le crée */
export async function ensureUserSpaceExists(userId: string, email: string): Promise<void> {
  const supabase = sb();
  if (!supabase) return;

  try {
    const { data } = await supabase
      .from('user_workspaces')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!data) {
      await initializeUserSpace(userId, email);
    }
  } catch {
    // Table might not exist yet or other error — silently skip
    console.warn('[Supabase] ensureUserSpaceExists: could not check, skipping init');
  }
}

/** Crée l'espace utilisateur : dossier storage + welcome task/note + tracking row */
async function initializeUserSpace(userId: string, email: string): Promise<void> {
  const supabase = sb();
  if (!supabase) return;

  try {
    // 1. Créer le dossier dans le bucket storage
    const emptyFile = new Blob([''], { type: 'text/plain' });
    await supabase.storage
      .from('user-files')
      .upload(`${userId}/.keep`, emptyFile, { upsert: true });

    // 2. Créer une tâche de bienvenue
    await supabase.from('personal_tasks').insert({
      user_id: userId,
      titre: 'Bienvenue dans votre espace personnel !',
      description: 'Ceci est votre première tâche. Vous pouvez créer, organiser et suivre vos tâches personnelles ici.',
      statut: 'todo',
      priorite: 'normale',
      tags: JSON.stringify(['bienvenue']),
      subtasks: JSON.stringify([
        { id: 'sub-1', titre: 'Explorer mon espace', done: false },
        { id: 'sub-2', titre: 'Créer ma première tâche', done: false },
      ]),
      ordre: 0,
    });

    // 3. Créer une note de bienvenue
    await supabase.from('personal_notes').insert({
      user_id: userId,
      titre: 'Ma première note',
      contenu: `Bienvenue ${email} ! 🎉\n\nCet espace est votre bloc-notes personnel. Vous pouvez y écrire des idées, des rappels, ou tout ce qui vous est utile.\n\nVos notes sont privées et visibles uniquement par vous.`,
      couleur: '#3b82f6',
      epingle: true,
      ordre: 0,
    });

    // 4. Marquer l'espace comme initialisé
    await supabase.from('user_workspaces').insert({
      user_id: userId,
      initialized: true,
      storage_folder: `${userId}/`,
    });

    console.info(`[Supabase] User space initialized for ${email}`);
  } catch (err) {
    console.warn('[Supabase] initializeUserSpace error:', err);
  }
}

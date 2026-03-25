/**
 * Supabase Data Sync — syncs ALL CRM data to Supabase
 *
 * Strategy: JSONB tables — each entity is stored as a JSON blob
 * This avoids complex schema migrations when types change.
 *
 * Two operations:
 * 1. loadFromSupabase() — called on login, loads all data from Supabase
 * 2. saveToSupabase() — called after every store mutation, debounced
 */

import { isSupabaseConfigured } from './supabaseAuth';

let supabaseInstance: any = null;

async function getSupabase() {
  if (supabaseInstance) return supabaseInstance;
  try {
    const mod = await import('./supabaseAuth');
    supabaseInstance = mod.getSupabase();
    return supabaseInstance;
  } catch {
    return null;
  }
}

// ─── Generic CRUD helpers ─────────────────────────────────────────────────

async function syncItems(table: string, items: Array<{ id: string; [key: string]: any }>, deletedIds?: Set<string>) {
  const supabase = await getSupabase();
  if (!supabase) return;

  // Filtrer : ne PAS re-upserter les items qui ont été supprimés par un autre utilisateur
  const safeItems = deletedIds && deletedIds.size > 0
    ? items.filter(item => !deletedIds.has(item.id))
    : items;

  // Upsert les éléments locaux (pas de diff-delete — les suppressions passent par deleteItem + crm_deletions)
  if (safeItems.length === 0) return;

  const rows = safeItems.map(item => ({
    id: item.id,
    data: item,
    updated_at: new Date().toISOString(),
  }));

  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    await supabase.from(table).upsert(chunk, { onConflict: 'id' });
  }
}

async function loadItems<T>(table: string): Promise<T[]> {
  const supabase = await getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(table)
    .select('data')
    .order('updated_at', { ascending: false });

  if (error || !data) return [];
  return data.map((row: any) => row.data as T);
}

async function deleteItem(table: string, id: string) {
  const supabase = await getSupabase();
  if (!supabase) return;
  // Supprimer l'item ET logger la suppression pour propagation cross-browser
  await Promise.all([
    supabase.from(table).delete().eq('id', id),
    supabase.from('crm_deletions').upsert({ id, table_name: table, deleted_at: new Date().toISOString() }, { onConflict: 'id,table_name' }),
  ]);
}

/** Récupérer les IDs supprimés (derniers 30 jours — ne pas réduire !) */
async function getRecentDeletions(): Promise<Map<string, Set<string>>> {
  const supabase = await getSupabase();
  if (!supabase) return new Map();

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('crm_deletions')
    .select('id, table_name')
    .gte('deleted_at', cutoff);

  const map = new Map<string, Set<string>>();
  (data || []).forEach((row: any) => {
    if (!map.has(row.table_name)) map.set(row.table_name, new Set());
    map.get(row.table_name)!.add(row.id);
  });
  return map;
}

async function upsertSingleton(table: string, id: string, data: any) {
  const supabase = await getSupabase();
  if (!supabase) return;
  await supabase.from(table).upsert({
    id,
    data,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
}

async function loadSingleton<T>(table: string, id: string): Promise<T | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from(table)
    .select('data')
    .eq('id', id)
    .single();

  return data?.data as T || null;
}

// ─── Sensitive data helpers ───────────────────────────────────────────────

/** Strip API keys / secrets / financial data before syncing settings to Supabase */
function stripSensitiveSettings(settings: any): any {
  if (!settings) return settings;
  const {
    resendApiKey, stripeKey, supabaseKey, revenueCatApiKey, revenueCatProjectId,
    iban, bic, password, passwordHash, motDePasse,
    ...safe
  } = settings;
  return safe;
}

// ─── Public API ───────────────────────────────────────────────────────────

export interface CRMData {
  clients: any[];
  freelancers: any[];
  projects: any[];
  invoices: any[];
  devis: any[];
  snoozeSubscriptions: any[];
  settings: any;
  unifiedTags: any[];
  projectTemplates: any[];
  clientPortalAccesses: any[];
  emailSequences: any[];
  sequenceEnrollments: any[];
}

/** Load all CRM data from Supabase */
export async function loadAllFromSupabase(): Promise<CRMData | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    // Charger données ET suppressions en parallèle
    const [clients, freelancers, projects, invoices, devis, snoozeSubscriptions, settings, unifiedTags, projectTemplates, clientPortalAccesses, emailSequences, sequenceEnrollments, deletions] = await Promise.all([
      loadItems('crm_clients'),
      loadItems('crm_freelancers'),
      loadItems('crm_projects'),
      loadItems('crm_invoices'),
      loadItems('crm_devis'),
      loadItems('crm_snooze'),
      loadSingleton('crm_settings', 'global'),
      loadItems('crm_tags'),
      loadItems('crm_templates'),
      loadItems('crm_portal_accesses'),
      loadItems('crm_email_sequences'),
      loadItems('crm_sequence_enrollments'),
      getRecentDeletions(),
    ]);

    // Filtrer les items qui sont dans le log de suppressions
    const filterDel = (arr: any[], table: string) => {
      const deleted = deletions.get(table);
      if (!deleted || deleted.size === 0) return arr;
      return arr.filter((item: any) => !deleted.has(item.id));
    };

    const safeClients = filterDel(clients, 'crm_clients');
    const safeFreelancers = filterDel(freelancers, 'crm_freelancers');
    const safeProjects = filterDel(projects, 'crm_projects');
    const safeInvoices = filterDel(invoices, 'crm_invoices');

    // Toujours retourner les données Supabase, même si tout a été supprimé
    // (retourner null empêcherait de vider le store local après suppression)
    return {
      clients: safeClients,
      freelancers: safeFreelancers,
      projects: safeProjects,
      invoices: safeInvoices,
      devis: filterDel(devis, 'crm_devis'),
      snoozeSubscriptions: filterDel(snoozeSubscriptions, 'crm_snooze'),
      settings,
      unifiedTags: filterDel(unifiedTags, 'crm_tags'),
      projectTemplates: filterDel(projectTemplates, 'crm_templates'),
      clientPortalAccesses: filterDel(clientPortalAccesses, 'crm_portal_accesses'),
      emailSequences: filterDel(emailSequences, 'crm_email_sequences'),
      sequenceEnrollments: filterDel(sequenceEnrollments, 'crm_sequence_enrollments'),
    };
  } catch (err) {
    console.error('[DataSync] Load failed:', err);
    return null;
  }
}

/** Save all CRM data to Supabase (debounced externally) */
export async function saveAllToSupabase(data: CRMData): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    // Charger les suppressions récentes pour ne pas re-créer des items supprimés par un autre user
    const deletions = await getRecentDeletions();

    await Promise.all([
      syncItems('crm_clients', data.clients, deletions.get('crm_clients')),
      syncItems('crm_freelancers', data.freelancers, deletions.get('crm_freelancers')),
      syncItems('crm_projects', data.projects, deletions.get('crm_projects')),
      syncItems('crm_invoices', data.invoices, deletions.get('crm_invoices')),
      syncItems('crm_devis', data.devis, deletions.get('crm_devis')),
      syncItems('crm_snooze', data.snoozeSubscriptions, deletions.get('crm_snooze')),
      data.settings ? upsertSingleton('crm_settings', 'global', stripSensitiveSettings(data.settings)) : Promise.resolve(),
      syncItems('crm_tags', data.unifiedTags, deletions.get('crm_tags')),
      syncItems('crm_templates', data.projectTemplates, deletions.get('crm_templates')),
      syncItems('crm_portal_accesses', data.clientPortalAccesses, deletions.get('crm_portal_accesses')),
      syncItems('crm_email_sequences', data.emailSequences, deletions.get('crm_email_sequences')),
      syncItems('crm_sequence_enrollments', data.sequenceEnrollments, deletions.get('crm_sequence_enrollments')),
    ]);
  } catch (err) {
    console.error('[DataSync] Save failed:', err);
  }
}

/** Delete a specific item from a Supabase table */
export async function deleteFromSupabase(table: string, id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await deleteItem(table, id);
}

/** Map store entity type to Supabase table name */
export const ENTITY_TABLE_MAP: Record<string, string> = {
  clients: 'crm_clients',
  freelancers: 'crm_freelancers',
  projects: 'crm_projects',
  invoices: 'crm_invoices',
  devis: 'crm_devis',
  snoozeSubscriptions: 'crm_snooze',
  unifiedTags: 'crm_tags',
  projectTemplates: 'crm_templates',
  clientPortalAccesses: 'crm_portal_accesses',
  emailSequences: 'crm_email_sequences',
  sequenceEnrollments: 'crm_sequence_enrollments',
};

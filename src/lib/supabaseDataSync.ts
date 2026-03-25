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

async function syncItems(table: string, items: Array<{ id: string; [key: string]: any }>) {
  const supabase = await getSupabase();
  if (!supabase) return;

  // 1. Charger les IDs existants dans Supabase
  const { data: existing } = await supabase.from(table).select('id');
  const remoteIds = new Set<string>((existing || []).map((r: any) => r.id as string));
  const localIds = new Set<string>(items.map(i => i.id));

  // 2. Supprimer les éléments qui n'existent plus localement
  const toDelete: string[] = [...remoteIds].filter(id => !localIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from(table).delete().in('id', toDelete);
  }

  // 3. Upsert les éléments locaux
  if (items.length === 0) return;

  const rows = items.map(item => ({
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
  await supabase.from(table).delete().eq('id', id);
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
}

/** Load all CRM data from Supabase */
export async function loadAllFromSupabase(): Promise<CRMData | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const [clients, freelancers, projects, invoices, devis, snoozeSubscriptions, settings, unifiedTags, projectTemplates, clientPortalAccesses] = await Promise.all([
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
    ]);

    // Only return if we actually have data in Supabase
    const hasData = clients.length > 0 || projects.length > 0 || freelancers.length > 0 || invoices.length > 0;
    if (!hasData) return null;

    return {
      clients,
      freelancers,
      projects,
      invoices,
      devis,
      snoozeSubscriptions,
      settings,
      unifiedTags,
      projectTemplates,
      clientPortalAccesses,
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
    await Promise.all([
      syncItems('crm_clients', data.clients),
      syncItems('crm_freelancers', data.freelancers),
      syncItems('crm_projects', data.projects),
      syncItems('crm_invoices', data.invoices),
      syncItems('crm_devis', data.devis),
      syncItems('crm_snooze', data.snoozeSubscriptions),
      data.settings ? upsertSingleton('crm_settings', 'global', data.settings) : Promise.resolve(),
      syncItems('crm_tags', data.unifiedTags),
      syncItems('crm_templates', data.projectTemplates),
      syncItems('crm_portal_accesses', data.clientPortalAccesses),
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
};

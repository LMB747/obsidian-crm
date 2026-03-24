/**
 * Obsidian Agency CRM — PhantomBuster Scraping Service
 *
 * Architecture :
 *   Frontend → Netlify Function (proxy) → PhantomBuster API v2
 *   Fallback direct si proxy indisponible (dev local)
 *
 * PhantomBuster fonctionne différemment d'Apify :
 *   1. L'utilisateur crée des Phantoms dans son dashboard PhantomBuster
 *   2. On récupère la liste de ses Phantoms via l'API
 *   3. On lance un Phantom par son Agent ID
 *   4. On poll le statut du container puis on récupère les résultats
 *
 * Pour utiliser : renseigner la clé API PhantomBuster dans
 *   Prospection IA → Configuration → PhantomBuster API Key
 * Obtenir une clé : https://phantombuster.com/settings
 */

import { v4 as uuidv4 } from 'uuid';
import type { ProspectContact, ProspectSource } from '../types/prospection';
import { computeProspectScore } from './apifyService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhantomAgent {
  id: string;
  name: string;
  script: string;
  lastEndMessage?: string;
}

export interface PhantomContainer {
  id: string;
  status: 'running' | 'finished' | 'error' | 'launched' | 'starting';
  exitMessage?: string;
}

// ─── API Calls ──────────────────────────────────────────────────────────────

const PROXY_URL = '/api/phantombuster-proxy';
const PB_BASE = 'https://api.phantombuster.com/api/v2';

async function callProxy(body: Record<string, unknown>): Promise<{ ok: boolean; data: unknown; error?: string }> {
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, data: null, error: (data as Record<string, string>)?.error || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch {
    return { ok: false, data: null, error: 'PROXY_UNAVAILABLE' };
  }
}

async function callDirect(
  url: string,
  apiKey: string,
  options: { method?: string; body?: string } = {}
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'X-Phantombuster-Key-1': apiKey,
        'Content-Type': 'application/json',
      },
      body: options.body,
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = (data as Record<string, string>)?.error || (data as Record<string, string>)?.message || `HTTP ${res.status}`;
      return { ok: false, data: null, error: msg };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, data: null, error: `Erreur réseau : ${String(err)}` };
  }
}

async function pbCall(
  proxyBody: Record<string, unknown>,
  directUrl: string,
  apiKey: string,
  directOptions: { method?: string; body?: string } = {}
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  const proxyResult = await callProxy(proxyBody);
  if (proxyResult.error !== 'PROXY_UNAVAILABLE') return proxyResult;
  return callDirect(directUrl, apiKey, directOptions);
}

// ─── Fetch available Phantoms ───────────────────────────────────────────────

export async function fetchPhantomAgents(apiKey: string): Promise<{ agents: PhantomAgent[]; error?: string }> {
  const result = await pbCall(
    { action: 'list-agents', apiKey },
    `${PB_BASE}/agents/fetch-all`,
    apiKey,
  );

  if (!result.ok || result.error) {
    return { agents: [], error: result.error || 'Impossible de récupérer les Phantoms' };
  }

  const raw = result.data;
  if (!Array.isArray(raw)) {
    return { agents: [], error: 'Format de réponse inattendu' };
  }

  return {
    agents: (raw as Array<Record<string, unknown>>).map((a) => ({
      id: String(a.id || ''),
      name: String(a.name || 'Sans nom'),
      script: String(a.script || ''),
      lastEndMessage: a.lastEndMessage ? String(a.lastEndMessage) : undefined,
    })),
  };
}

// ─── Launch a Phantom ───────────────────────────────────────────────────────

export async function launchPhantom(
  apiKey: string,
  agentId: string,
  argument?: Record<string, unknown>
): Promise<{ containerId: string; error?: string }> {
  const body: Record<string, unknown> = { id: agentId };
  if (argument) {
    body.argument = argument;
  }

  const result = await pbCall(
    { action: 'launch', apiKey, agentId, argument },
    `${PB_BASE}/agents/launch`,
    apiKey,
    { method: 'POST', body: JSON.stringify(body) },
  );

  if (!result.ok || result.error) {
    return { containerId: '', error: result.error || 'Impossible de lancer le Phantom' };
  }

  const containerId = String((result.data as Record<string, unknown>)?.containerId || '');
  if (!containerId) {
    return { containerId: '', error: 'PhantomBuster n\'a pas retourné de container ID' };
  }

  return { containerId };
}

// ─── Check container status ─────────────────────────────────────────────────

export async function checkPhantomStatus(
  apiKey: string,
  containerId: string
): Promise<{ status: 'running' | 'finished' | 'error'; error?: string }> {
  const result = await pbCall(
    { action: 'status', apiKey, containerId },
    `${PB_BASE}/containers/fetch?id=${containerId}`,
    apiKey,
  );

  if (!result.ok || result.error) {
    return { status: 'error', error: result.error };
  }

  const raw = result.data as Record<string, unknown>;
  const status = String(raw.status || 'running');

  if (status === 'finished') return { status: 'finished' };
  if (status === 'error' || status === 'crashed') return { status: 'error', error: String(raw.exitMessage || 'Phantom crashed') };
  return { status: 'running' };
}

// ─── Get results from a finished container ──────────────────────────────────

export async function getPhantomResults(
  apiKey: string,
  containerId: string,
  platform: ProspectSource
): Promise<ProspectContact[]> {
  const result = await pbCall(
    { action: 'results', apiKey, containerId },
    `${PB_BASE}/containers/fetch-result-object?id=${containerId}`,
    apiKey,
  );

  if (!result.ok) return [];

  // PhantomBuster retourne soit un objet avec resultObject, soit directement les données
  let items: Array<Record<string, unknown>> = [];
  const raw = result.data as Record<string, unknown>;

  if (raw.resultObject) {
    try {
      const parsed = typeof raw.resultObject === 'string' ? JSON.parse(raw.resultObject) : raw.resultObject;
      items = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  } else if (Array.isArray(raw)) {
    items = raw as Array<Record<string, unknown>>;
  }

  return items
    .map((item) => mapPBItemToProspect(item, platform))
    .filter((p): p is ProspectContact => p !== null)
    .map(p => ({ ...p, score: computeProspectScore(p) }));
}

// ─── Mapper PhantomBuster item → ProspectContact ────────────────────────────

function str(v: unknown): string {
  return v ? String(v).trim() : '';
}

function mapPBItemToProspect(item: Record<string, unknown>, platform: ProspectSource): ProspectContact | null {
  // PhantomBuster utilise des noms de champs assez standards
  const name = str(
    item.fullName || item.name || item.firstName
      ? `${str(item.firstName)} ${str(item.lastName)}`.trim()
      : item.title || item.companyName
  );
  if (!name) return null;

  const parts = name.split(' ');
  const prenom = parts[0] || '';
  const nom = parts.slice(1).join(' ') || '';

  return {
    id: uuidv4(),
    prenom,
    nom,
    entreprise: str(item.companyName || item.company || item.organizationName || item.businessName || name),
    poste: str(item.jobTitle || item.title || item.headline || item.position || item.category) || 'Non renseigné',
    email: str(item.email || item.mail) || undefined,
    telephone: str(item.phone || item.phoneNumber || item.phoneNumbers) || undefined,
    website: str(item.website || item.websiteUrl || item.companyWebsite || item.url) || undefined,
    adresse: str(item.address || item.street) || undefined,
    ville: str(item.city || item.location || item.area) || undefined,
    pays: str(item.country) || 'France',
    linkedinUrl: str(item.linkedinUrl || item.profileUrl || item.linkedInProfileUrl) || undefined,
    twitterUrl: str(item.twitterUrl) || undefined,
    instagramUrl: str(item.instagramUrl) || undefined,
    source: platform,
    score: 70,
    status: 'new',
    tags: ['phantombuster'],
    notes: str(item.description || item.summary || item.bio || item.about),
    dateDecouvert: new Date().toISOString().split('T')[0],
    secteur: str(item.industry || item.sector || item.category) || undefined,
    tailleEntreprise: str(item.companySize || item.staffCount || item.employeeCount) || 'TPE/PME',
    followers: typeof item.followersCount === 'number' ? item.followersCount
      : typeof item.followers === 'number' ? item.followers : undefined,
    intentionAchat: 'moyenne',
  };
}

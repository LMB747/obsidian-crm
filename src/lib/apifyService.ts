/**
 * Obsidian Agency CRM — Apify Scraping Service
 *
 * Architecture :
 *   Frontend → Netlify Function (proxy) → Apify REST API → Acteurs Apify
 *
 * Chaque plateforme est mappée à un acteur Apify public sur la marketplace.
 * Les acteurs Apify sont des scrapers cloud managés qui tournent sur leur infra.
 *
 * Pour utiliser : renseigner la clé API Apify dans
 *   Prospection IA → Configuration → Clé API Apify
 * Obtenir une clé : https://console.apify.com/account/integrations
 */

import { v4 as uuidv4 } from 'uuid';
import type { ProspectContact, ProspectSource } from '../types/prospection';

// ─── Mapping Plateforme → Acteur Apify ───────────────────────────────────────
// Approche robuste : on utilise `apify/google-search-scraper` comme acteur
// universel fiable. Chaque plateforme est convertie en requête Google avec
// `site:` pour cibler le bon réseau. L'utilisateur peut aussi renseigner un
// Actor ID personnalisé dans la configuration.

const GOOGLE_SEARCH_ACTOR = 'apify/google-search-scraper';

// Tous les PLATFORM_ACTORS pointent vers Google Search Scraper
// sauf si l'utilisateur configure un actor ID personnalisé
export const PLATFORM_ACTORS: Partial<Record<ProspectSource, string>> = {
  linkedin:              GOOGLE_SEARCH_ACTOR,
  google_maps:           'compass/crawler-google-places',
  annuaire_entreprises:  GOOGLE_SEARCH_ACTOR,
  societe_com:           GOOGLE_SEARCH_ACTOR,
  instagram:             GOOGLE_SEARCH_ACTOR,
  instagram_pro:         GOOGLE_SEARCH_ACTOR,
  tiktok:                GOOGLE_SEARCH_ACTOR,
  twitter:               GOOGLE_SEARCH_ACTOR,
  facebook:              GOOGLE_SEARCH_ACTOR,
  youtube:               GOOGLE_SEARCH_ACTOR,
  github:                GOOGLE_SEARCH_ACTOR,
  producthunt:           GOOGLE_SEARCH_ACTOR,
  crunchbase:            GOOGLE_SEARCH_ACTOR,
  malt:                  GOOGLE_SEARCH_ACTOR,
  upwork:                GOOGLE_SEARCH_ACTOR,
  indeed:                GOOGLE_SEARCH_ACTOR,
  welcome_to_the_jungle: GOOGLE_SEARCH_ACTOR,
  google_search:         GOOGLE_SEARCH_ACTOR,
  pappers:               GOOGLE_SEARCH_ACTOR,
  behance:               GOOGLE_SEARCH_ACTOR,
  dribbble:              GOOGLE_SEARCH_ACTOR,
  le_bon_coin:           GOOGLE_SEARCH_ACTOR,
};

// Préfixes site: pour convertir chaque plateforme en requête Google ciblée
const PLATFORM_SITE_PREFIX: Partial<Record<ProspectSource, string>> = {
  linkedin:              'site:linkedin.com/in OR site:linkedin.com/company',
  instagram:             'site:instagram.com',
  instagram_pro:         'site:instagram.com',
  tiktok:                'site:tiktok.com/@',
  twitter:               'site:x.com OR site:twitter.com',
  facebook:              'site:facebook.com',
  youtube:               'site:youtube.com/channel OR site:youtube.com/@',
  github:                'site:github.com',
  producthunt:           'site:producthunt.com',
  crunchbase:            'site:crunchbase.com/organization',
  malt:                  'site:malt.fr/profile',
  upwork:                'site:upwork.com/freelancers',
  indeed:                'site:indeed.fr',
  welcome_to_the_jungle: 'site:welcometothejungle.com',
  pappers:               'site:pappers.fr',
  behance:               'site:behance.net',
  dribbble:              'site:dribbble.com',
  le_bon_coin:           'site:leboncoin.fr',
  annuaire_entreprises:  'site:societe.com OR site:annuaire-entreprises.com',
  societe_com:           'site:societe.com',
};

// Stockage de l'actor ID personnalisé (en mémoire, pas persisté)
let _customActorId = '';
export function setCustomActorId(id: string) { _customActorId = id.trim(); }
export function getCustomActorId(): string { return _customActorId; }

// Retourne true si la plateforme a un acteur Apify configuré
export function isPlatformSupported(platform: ProspectSource): boolean {
  return platform in PLATFORM_ACTORS;
}

export function getSupportedPlatforms(): ProspectSource[] {
  return Object.keys(PLATFORM_ACTORS) as ProspectSource[];
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScrapeInput {
  keywords: string;
  location: string;
  sector: string;
  maxResults?: number;
  jobTitle?: string;
}

// ─── Constructeurs d'input par acteur ────────────────────────────────────────

function buildActorInput(platform: ProspectSource, input: ScrapeInput): Record<string, unknown> {
  const searchQuery = [input.keywords, input.sector, input.location]
    .filter(Boolean)
    .join(' ')
    .trim();
  const maxResults = input.maxResults ?? 25;

  // Si l'utilisateur a un actor ID personnalisé, on ne peut pas deviner le format
  // d'input → on envoie un format générique
  if (_customActorId) {
    return {
      searchQuery,
      queries: [searchQuery],
      maxResults,
      searchStringsArray: [searchQuery],
    };
  }

  // Google Maps a un vrai acteur dédié (compass/crawler-google-places)
  if (platform === 'google_maps') {
    return {
      searchStringsArray: [searchQuery],
      maxCrawledPlacesPerSearch: maxResults,
      language: 'fr',
      countryCode: 'fr',
      includeWebResults: true,
    };
  }

  // Toutes les autres plateformes → Google Search avec préfixe site:
  const sitePrefix = PLATFORM_SITE_PREFIX[platform] || '';
  const googleQuery = sitePrefix
    ? `${sitePrefix} ${searchQuery}`
    : searchQuery;

  return {
    queries: [googleQuery],
    maxPagesPerQuery: Math.ceil(maxResults / 10),
    resultsPerPage: 10,
    languageCode: 'fr',
    countryCode: 'fr',
  };
}

// ─── API Calls ──────────────────────────────────────────────────────────────
// Stratégie : Netlify Function proxy en priorité (prod),
// fallback sur appel direct avec ?token= (dev local / si proxy indisponible)

const PROXY_URL = '/api/apify-proxy';
const APIFY_BASE = 'https://api.apify.com/v2';

// Encode l'actor ID pour les URLs (apify/google-search-scraper → apify~google-search-scraper)
function encodeActorId(actor: string): string {
  return actor.replace(/\//g, '~');
}

// Appel via le proxy Netlify (fonctionne en production Netlify)
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

// Appel direct à l'API Apify avec token en query param (évite les problèmes CORS du header Authorization)
async function callDirect(
  url: string,
  apiKey: string,
  options: { method?: string; body?: string } = {}
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  const sep = url.includes('?') ? '&' : '?';
  const fullUrl = `${url}${sep}token=${apiKey}`;
  try {
    const res = await fetch(fullUrl, {
      method: options.method || 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body,
    });
    const data = await res.json();
    if (!res.ok) {
      const errField = (data as Record<string, unknown>)?.error;
      const msg = (typeof errField === 'object' && errField && 'message' in errField)
        ? String((errField as Record<string, unknown>).message)
        : (typeof errField === 'string' ? errField : `HTTP ${res.status}`);
      return { ok: false, data: null, error: String(msg) };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, data: null, error: `Erreur réseau : ${String(err)}` };
  }
}

// Smart fetch : essaie le proxy, puis fallback sur appel direct
async function apifyCall(
  proxyBody: Record<string, unknown>,
  directUrl: string,
  apiKey: string,
  directOptions: { method?: string; body?: string } = {}
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  // 1) Tenter le proxy Netlify
  const proxyResult = await callProxy(proxyBody);
  if (proxyResult.error !== 'PROXY_UNAVAILABLE') return proxyResult;
  // 2) Fallback direct si proxy indisponible
  return callDirect(directUrl, apiKey, directOptions);
}

// Démarre un run Apify pour une plateforme donnée
export async function startApifyRun(
  apiKey: string,
  platform: ProspectSource,
  input: ScrapeInput
): Promise<{ runId: string; error?: string }> {
  const actor = _customActorId || PLATFORM_ACTORS[platform];
  if (!actor) {
    return { runId: '', error: `Plateforme "${platform}" non supportée via Apify` };
  }

  const actorInput = buildActorInput(platform, input);
  const result = await apifyCall(
    { action: 'start', apiKey, actor, input: actorInput },
    `${APIFY_BASE}/acts/${encodeActorId(actor)}/runs`,
    apiKey,
    { method: 'POST', body: JSON.stringify(actorInput) }
  );

  if (!result.ok || result.error) {
    return { runId: '', error: result.error || 'Impossible de démarrer le run Apify' };
  }

  const runId = (result.data as Record<string, Record<string, string>>)?.data?.id || '';
  if (!runId) {
    return { runId: '', error: 'Apify n\'a pas retourné d\'ID de run. Vérifiez votre clé API.' };
  }

  return { runId };
}

// Vérifie le statut d'un run en cours
export async function checkApifyRun(
  apiKey: string,
  runId: string
): Promise<{ status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTED' | 'TIMED-OUT'; error?: string }> {
  const result = await apifyCall(
    { action: 'status', apiKey, runId },
    `${APIFY_BASE}/actor-runs/${runId}`,
    apiKey,
  );

  if (!result.ok || result.error) {
    return { status: 'FAILED', error: result.error };
  }

  const status = (result.data as Record<string, Record<string, string>>)?.data?.status;
  const validStatuses = ['RUNNING', 'SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'];
  return {
    status: validStatuses.includes(status) ? status as 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTED' | 'TIMED-OUT' : 'RUNNING',
  };
}

// Récupère et convertit les résultats d'un run terminé
export async function getApifyResults(
  apiKey: string,
  runId: string,
  platform: ProspectSource
): Promise<ProspectContact[]> {
  const result = await apifyCall(
    { action: 'results', apiKey, runId },
    `${APIFY_BASE}/actor-runs/${runId}/dataset/items?limit=100&clean=true`,
    apiKey,
  );

  if (!result.ok || !Array.isArray(result.data)) {
    return [];
  }

  return (result.data as Record<string, unknown>[])
    .map(item => mapItemToProspect(item, platform))
    .filter((p): p is ProspectContact => p !== null)
    .map(p => ({ ...p, score: computeProspectScore(p) }));
}

// ─── Mapper raw item → ProspectContact ────────────────────────────────────────

function str(v: unknown): string {
  return v ? String(v).trim() : '';
}

// ─── Scoring dynamique ─────────────────────────────────────────────────────
// Calcule un score 0-100 basé sur la complétude des données du prospect
export function computeProspectScore(p: ProspectContact): number {
  let score = 30; // base
  if (p.email) score += 15;
  if (p.telephone) score += 10;
  if (p.linkedinUrl) score += 10;
  if (p.website) score += 5;
  if (p.secteurActivite) score += 5;
  if (p.ville) score += 5;
  if (p.poste && p.poste !== 'Non renseigné') score += 5;
  if (p.entreprise && p.entreprise !== p.nom) score += 5;
  if (p.notes && p.notes.length > 20) score += 5;
  if (p.followers && p.followers > 1000) score += 5;
  return Math.min(100, score);
}

function mapItemToProspect(item: Record<string, unknown>, platform: ProspectSource): ProspectContact | null {
  // Chaque cas extrait les champs en fonction de ce que retourne l'acteur Apify

  switch (platform) {
    // ── Google Maps ─────────────────────────────────────────────────────────
    case 'google_maps':
    case 'societe_com':
    case 'annuaire_entreprises': {
      const name = str(item.title || item.name);
      if (!name) return null;
      return {
        id: uuidv4(), prenom: name.split(' ')[0] || '', nom: name.split(' ').slice(1).join(' ') || name,
        entreprise: str(item.title || item.name),
        poste: str(item.categoryName || item.category) || 'Dirigeant',
        email: str(item.email) || undefined,
        telephone: str(item.phone || item.phoneUnformatted) || undefined,
        adresse: str(item.street || item.address) || undefined,
        ville: str(item.city || (item.location as Record<string, unknown>)?.city) || undefined,
        pays: 'France',
        website: str(item.website || item.url) || undefined,
        source: platform,
        score: 65, status: 'new', tags: [], notes: str(item.description),
        dateDecouvert: today(),
        secteurActivite: str(item.categoryName) || undefined,
        tailleEntreprise: 'TPE/PME', intentionAchat: 'faible',
      };
    }

    // ── LinkedIn ─────────────────────────────────────────────────────────────
    case 'linkedin': {
      const name = str(item.name || item.fullName || item.title);
      if (!name) return null;
      const parts = name.split(' ');
      return {
        id: uuidv4(), prenom: parts[0] || '', nom: parts.slice(1).join(' ') || '',
        entreprise: str(item.companyName || item.company || item.organizationName),
        poste: str(item.title || item.position || item.headline || item.jobTitle),
        email: str(item.email) || undefined,
        ville: str(item.location || item.city || item.headquarters) || undefined,
        pays: 'France',
        linkedinUrl: str(item.linkedinUrl || item.url || item.profileUrl) || undefined,
        website: str(item.companyWebsite || item.website) || undefined,
        source: 'linkedin',
        score: 75, status: 'new', tags: [],
        notes: str(item.summary || item.about || item.description),
        dateDecouvert: today(),
        secteurActivite: str(item.industry || item.field) || undefined,
        tailleEntreprise: str(item.companySize || item.staffCount) || 'TPE/PME',
        intentionAchat: 'moyenne',
      };
    }

    // ── Instagram ────────────────────────────────────────────────────────────
    case 'instagram':
    case 'instagram_pro': {
      const fullName = str(item.fullName || item.username);
      return {
        id: uuidv4(), prenom: fullName.split(' ')[0] || '', nom: fullName.split(' ').slice(1).join(' ') || '',
        entreprise: str(item.username || item.fullName),
        poste: 'Créateur / Influenceur',
        email: str(item.email || item.businessEmail) || undefined,
        telephone: str(item.businessPhoneNumber) || undefined,
        ville: str(item.city || item.location) || undefined,
        pays: 'France',
        website: str(item.externalUrl) || undefined,
        instagramUrl: str(item.url || item.profileUrl) || undefined,
        source: platform,
        score: 60, status: 'new', tags: ['instagram'],
        notes: str(item.biography || item.bio),
        dateDecouvert: today(),
        secteurActivite: str(item.category || item.businessCategory) || undefined,
        tailleEntreprise: 'Indépendant',
        followers: typeof item.followersCount === 'number' ? item.followersCount : undefined,
        intentionAchat: 'faible',
      };
    }

    // ── TikTok ───────────────────────────────────────────────────────────────
    case 'tiktok': {
      const name = str(item.name || item.nickname || item.authorName);
      return {
        id: uuidv4(), prenom: name.split(' ')[0] || '', nom: name.split(' ').slice(1).join(' ') || '',
        entreprise: str(item.authorName || item.uniqueId || name),
        poste: 'Créateur TikTok',
        website: str(item.bioLink || item.url) || undefined,
        source: 'tiktok',
        score: 55, status: 'new', tags: ['tiktok'],
        notes: str(item.signature || item.bio),
        dateDecouvert: today(),
        tailleEntreprise: 'Indépendant',
        followers: typeof item.fans === 'number' ? item.fans : undefined,
        intentionAchat: 'faible',
        pays: 'France',
      };
    }

    // ── Twitter ──────────────────────────────────────────────────────────────
    case 'twitter': {
      const name = str(item.name || item.authorName || item.user_name);
      return {
        id: uuidv4(), prenom: name.split(' ')[0] || '', nom: name.split(' ').slice(1).join(' ') || str(item.username),
        entreprise: str(item.username || name),
        poste: 'Community Manager',
        ville: str(item.location || item.place) || undefined,
        pays: 'France',
        website: str(item.url || item.externalUrl) || undefined,
        twitterUrl: str(item.twitterUrl || item.profileUrl) || undefined,
        source: 'twitter',
        score: 60, status: 'new', tags: ['twitter'],
        notes: str(item.bio || item.description),
        dateDecouvert: today(),
        tailleEntreprise: 'Indépendant',
        followers: typeof item.followers === 'number' ? item.followers : undefined,
        intentionAchat: 'faible',
      };
    }

    // ── Facebook ─────────────────────────────────────────────────────────────
    case 'facebook': {
      const name = str(item.name || item.title || item.pageName);
      if (!name) return null;
      return {
        id: uuidv4(), prenom: name.split(' ')[0] || '', nom: name.split(' ').slice(1).join(' ') || name,
        entreprise: name,
        poste: 'Gestionnaire Page',
        email: str(item.email) || undefined,
        telephone: str(item.phone) || undefined,
        ville: str(item.location || item.city) || undefined,
        pays: 'France',
        website: str(item.website) || undefined,
        source: 'facebook',
        score: 60, status: 'new', tags: ['facebook'],
        notes: str(item.about || item.description),
        dateDecouvert: today(),
        secteurActivite: str(item.category) || undefined,
        tailleEntreprise: 'TPE/PME',
        followers: typeof item.fans === 'number' ? item.fans : undefined,
        intentionAchat: 'faible',
      };
    }

    // ── YouTube ──────────────────────────────────────────────────────────────
    case 'youtube': {
      const name = str(item.channelName || item.title || item.name);
      return {
        id: uuidv4(), prenom: name.split(' ')[0] || '', nom: name.split(' ').slice(1).join(' ') || '',
        entreprise: name,
        poste: 'Créateur YouTube',
        email: str(item.email) || undefined,
        ville: str(item.country || item.location) || undefined,
        pays: 'France',
        website: str(item.channelUrl || item.url) || undefined,
        source: 'youtube',
        score: 65, status: 'new', tags: ['youtube'],
        notes: str(item.description || item.about),
        dateDecouvert: today(),
        tailleEntreprise: 'Indépendant',
        followers: typeof item.subscriberCount === 'number' ? item.subscriberCount : undefined,
        intentionAchat: 'moyenne',
      };
    }

    // ── GitHub ───────────────────────────────────────────────────────────────
    case 'github': {
      const name = str(item.name || item.login);
      return {
        id: uuidv4(), prenom: name.split(' ')[0] || '', nom: name.split(' ').slice(1).join(' ') || str(item.login),
        entreprise: str(item.company) || name,
        poste: 'Développeur',
        email: str(item.email) || undefined,
        ville: str(item.location) || undefined,
        pays: 'France',
        website: str(item.blog || item.htmlUrl) || undefined,
        source: 'github',
        score: 70, status: 'new', tags: ['dev', 'github'],
        notes: str(item.bio),
        dateDecouvert: today(),
        secteurActivite: 'Technologie',
        tailleEntreprise: 'Indépendant',
        technologies: Array.isArray(item.topRepositories)
          ? (item.topRepositories as Array<Record<string, Record<string, string>>>)
              .map(r => r?.primaryLanguage?.name || '').filter(Boolean)
          : [],
        intentionAchat: 'moyenne',
      };
    }

    // ── ProductHunt ──────────────────────────────────────────────────────────
    case 'producthunt': {
      const name = str(item.name || item.product_name || item.maker_name);
      if (!name) return null;
      return {
        id: uuidv4(), prenom: name.split(' ')[0] || '', nom: name.split(' ').slice(1).join(' ') || '',
        entreprise: str(item.product_name || name),
        poste: str(item.tagline || 'Fondateur'),
        website: str(item.url || item.website) || undefined,
        source: 'producthunt',
        score: 80, status: 'new', tags: ['startup', 'producthunt'],
        notes: str(item.description || item.tagline),
        dateDecouvert: today(),
        secteurActivite: 'Technologie',
        tailleEntreprise: 'Startup',
        intentionAchat: 'forte',
        pays: 'France',
      };
    }

    // ── Crunchbase ───────────────────────────────────────────────────────────
    case 'crunchbase': {
      const name = str(item.name || item.fullName || item.organizationName);
      if (!name) return null;
      return {
        id: uuidv4(), prenom: name.split(' ')[0] || '', nom: name.split(' ').slice(1).join(' ') || '',
        entreprise: str(item.organizationName || name),
        poste: str(item.title || item.primaryJobTitle || 'Fondateur'),
        ville: str(item.location || item.city) || undefined,
        pays: str(item.country) || 'France',
        website: str(item.website || item.url) || undefined,
        linkedinUrl: str(item.linkedinUrl) || undefined,
        source: 'crunchbase',
        score: 85, status: 'new', tags: ['startup', 'crunchbase'],
        notes: str(item.shortDescription || item.description),
        dateDecouvert: today(),
        secteurActivite: str(item.primaryRole || (Array.isArray(item.categories) ? (item.categories as string[]).join(', ') : '')) || undefined,
        tailleEntreprise: str(item.numEmployeesEnum) || 'Startup',
        intentionAchat: 'forte',
      };
    }

    // ── Malt ─────────────────────────────────────────────────────────────────
    case 'malt': {
      const name = str(item.fullName || item.name || item.title);
      return {
        id: uuidv4(), prenom: name.split(' ')[0] || '', nom: name.split(' ').slice(1).join(' ') || '',
        entreprise: name,
        poste: str(item.jobTitle || item.speciality || item.headline) || 'Freelancer',
        ville: str(item.location || item.city) || undefined,
        pays: 'France',
        website: str(item.profileUrl || item.url) || undefined,
        source: 'malt',
        score: 70, status: 'new', tags: ['freelance', 'malt'],
        notes: str(item.description || item.bio),
        dateDecouvert: today(),
        secteurActivite: 'Freelance',
        tailleEntreprise: 'Indépendant',
        intentionAchat: 'moyenne',
      };
    }

    // ── Upwork ───────────────────────────────────────────────────────────────
    case 'upwork': {
      const name = str(item.name || item.fullName || item.title);
      return {
        id: uuidv4(), prenom: name.split(' ')[0] || '', nom: name.split(' ').slice(1).join(' ') || '',
        entreprise: str(item.agency || name),
        poste: str(item.title || (Array.isArray(item.skills) ? (item.skills as string[])[0] : '')) || 'Freelancer',
        ville: str(item.location || item.city) || undefined,
        pays: str(item.country) || 'France',
        website: str(item.profileUrl || item.url) || undefined,
        source: 'upwork',
        score: 65, status: 'new', tags: ['freelance', 'upwork'],
        notes: str(item.description || item.overview),
        dateDecouvert: today(),
        secteurActivite: 'Freelance',
        tailleEntreprise: 'Indépendant',
        intentionAchat: 'moyenne',
      };
    }

    // ── Indeed ───────────────────────────────────────────────────────────────
    case 'indeed': {
      const companyName = str(item.company || item.employerName || item.employer);
      if (!companyName) return null;
      return {
        id: uuidv4(), prenom: '', nom: companyName,
        entreprise: companyName,
        poste: str(item.jobTitle || 'Recruteur'),
        ville: str(item.location || item.city) || undefined,
        pays: 'France',
        website: str(item.companyWebsite || item.url) || undefined,
        source: 'indeed',
        score: 60, status: 'new', tags: ['recrutement', 'indeed'],
        notes: str(item.jobDescription || item.description),
        dateDecouvert: today(),
        secteurActivite: str(item.sector || item.industry) || undefined,
        tailleEntreprise: 'TPE/PME',
        intentionAchat: 'moyenne',
      };
    }

    // ── Welcome to the Jungle ─────────────────────────────────────────────────
    case 'welcome_to_the_jungle': {
      const companyName = str(item.companyName || item.name || item.company);
      if (!companyName) return null;
      return {
        id: uuidv4(), prenom: '', nom: companyName,
        entreprise: companyName,
        poste: 'Responsable RH',
        ville: str(item.location || item.city) || undefined,
        pays: 'France',
        website: str(item.website || item.url) || undefined,
        source: 'welcome_to_the_jungle',
        score: 65, status: 'new', tags: ['tech', 'startup', 'wtj'],
        notes: str(item.description || item.summary),
        dateDecouvert: today(),
        secteurActivite: str(item.sector || item.industry) || 'Technologie',
        tailleEntreprise: str(item.staffCount) || 'Startup',
        intentionAchat: 'moyenne',
      };
    }

    // ── Google Search / Pappers ───────────────────────────────────────────────
    case 'google_search':
    case 'pappers': {
      const title = str(item.title || item.name);
      if (!title) return null;
      return {
        id: uuidv4(), prenom: '', nom: title,
        entreprise: title,
        poste: 'Dirigeant',
        email: str(item.email) || undefined,
        telephone: str(item.phone) || undefined,
        ville: str(item.city || item.location) || undefined,
        pays: 'France',
        website: str(item.url || item.link) || undefined,
        source: platform,
        score: 60, status: 'new', tags: [platform === 'pappers' ? 'pappers' : 'web'],
        notes: str(item.description || item.snippet),
        dateDecouvert: today(),
        tailleEntreprise: 'TPE/PME',
        intentionAchat: 'faible',
      };
    }

    // ── Behance ──────────────────────────────────────────────────────────────
    case 'behance': {
      const name = str(item.ownerName || item.displayName || item.name || item.title);
      return {
        id: uuidv4(), prenom: name.split(' ')[0] || '', nom: name.split(' ').slice(1).join(' ') || '',
        entreprise: str(item.username || name),
        poste: 'Créatif / Designer',
        ville: str(item.location || item.city) || undefined,
        pays: 'France',
        website: str(item.url || item.profileUrl) || undefined,
        source: 'behance',
        score: 60, status: 'new', tags: ['design', 'créatif', 'behance'],
        notes: str(item.description || item.specialties),
        dateDecouvert: today(),
        secteurActivite: 'Design',
        tailleEntreprise: 'Indépendant',
        intentionAchat: 'faible',
      };
    }

    // ── Dribbble ─────────────────────────────────────────────────────────────
    case 'dribbble': {
      const name = str(item.name || item.login || item.username);
      return {
        id: uuidv4(), prenom: name.split(' ')[0] || '', nom: name.split(' ').slice(1).join(' ') || str(item.login),
        entreprise: str(item.company || name),
        poste: 'UI/UX Designer',
        ville: str(item.location) || undefined,
        pays: 'France',
        website: str(item.websiteUrl || item.url) || undefined,
        source: 'dribbble',
        score: 60, status: 'new', tags: ['ui/ux', 'design', 'dribbble'],
        notes: str(item.bio || item.description),
        dateDecouvert: today(),
        secteurActivite: 'Design',
        tailleEntreprise: 'Indépendant',
        intentionAchat: 'faible',
      };
    }

    // ── Le Bon Coin ──────────────────────────────────────────────────────────
    case 'le_bon_coin': {
      const name = str(item.title || item.name || item.company);
      if (!name) return null;
      return {
        id: uuidv4(), prenom: '', nom: name,
        entreprise: name,
        poste: 'Annonceur',
        telephone: str(item.phone) || undefined,
        ville: str(item.location || item.city) || undefined,
        pays: 'France',
        website: str(item.url) || undefined,
        source: 'le_bon_coin',
        score: 50, status: 'new', tags: ['leboncoin'],
        notes: str(item.description || item.body),
        dateDecouvert: today(),
        tailleEntreprise: 'Indépendant',
        intentionAchat: 'faible',
      };
    }

    // ── Fallback générique ───────────────────────────────────────────────────
    default: {
      const name = str(item.name || item.title || item.fullName);
      if (!name) return null;
      return {
        id: uuidv4(), prenom: name.split(' ')[0] || '', nom: name.split(' ').slice(1).join(' ') || '',
        entreprise: str(item.company || item.organization || name),
        poste: str(item.title || item.position || ''),
        email: str(item.email) || undefined,
        telephone: str(item.phone) || undefined,
        ville: str(item.city || item.location) || undefined,
        pays: 'France',
        website: str(item.website || item.url) || undefined,
        source: 'other',
        score: 50, status: 'new', tags: [],
        notes: str(item.description || item.about),
        dateDecouvert: today(),
        tailleEntreprise: 'TPE/PME',
        intentionAchat: 'faible',
      };
    }
  }
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

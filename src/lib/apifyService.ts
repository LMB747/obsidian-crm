import { v4 as uuidv4 } from 'uuid';
import type { ProspectContact } from '../types/prospection';

// Mapping plateformes → actors Apify
export const PLATFORM_ACTORS: Record<string, string> = {
  'linkedin':             'apify~linkedin-company-scraper',
  'google_maps':          'apify~google-maps-scraper',
  'instagram':            'apify~instagram-profile-scraper',
  'tiktok':               'apify~tiktok-profile-scraper',
  'producthunt':          'apify~producthunt-scraper',
  'github':               'apify~github-scraper',
  'malt':                 'bebity~malt-fr-scraper',
  'annuaire_entreprises': 'apify~yellow-pages-scraper',
  'societe_com':          'apify~google-maps-scraper', // fallback Google Maps
};

interface ScrapeInput {
  keywords: string;
  location: string;
  sector: string;
  maxResults?: number;
}

// Construit l'input pour chaque actor selon la plateforme
function buildActorInput(platform: string, input: ScrapeInput): Record<string, unknown> {
  const searchQuery = [input.keywords, input.sector, input.location].filter(Boolean).join(' ');

  switch (platform) {
    case 'google_maps':
    case 'societe_com':
      return {
        searchStringsArray: [searchQuery],
        maxCrawledPlacesPerSearch: input.maxResults || 30,
        language: 'fr',
        countryCode: 'fr',
      };
    case 'linkedin':
      return {
        searchQuery,
        maxResults: input.maxResults || 30,
        proxyConfiguration: { useApifyProxy: true },
      };
    case 'instagram':
      return {
        usernames: [],
        resultsLimit: input.maxResults || 20,
        searchQuery,
      };
    case 'tiktok':
      return {
        profiles: [],
        searchSection: 'user',
        searchQuery,
        maxProfilesPerQuery: input.maxResults || 20,
      };
    case 'producthunt':
      return {
        searchQuery,
        maxResults: input.maxResults || 20,
      };
    case 'github':
      return {
        searchQuery: `${input.keywords} language:javascript location:${input.location}`,
        maxResults: input.maxResults || 20,
      };
    default:
      return {
        searchStringsArray: [searchQuery],
        maxResults: input.maxResults || 30,
      };
  }
}

// Démarre un run Apify
export async function startApifyRun(
  apiKey: string,
  platform: string,
  input: ScrapeInput
): Promise<{ runId: string; error?: string }> {
  const actor = PLATFORM_ACTORS[platform];
  if (!actor) return { runId: '', error: `Plateforme "${platform}" non supportée` };

  const actorInput = buildActorInput(platform, input);

  const res = await fetch('/.netlify/functions/apify-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'start', apiKey, actor, input: actorInput }),
  });

  const data = await res.json();
  if (!res.ok || data.error) return { runId: '', error: data.error || 'Erreur Apify' };

  return { runId: (data.data?.id as string) || '' };
}

// Vérifie le statut d'un run
export async function checkApifyRun(
  apiKey: string,
  runId: string
): Promise<{ status: string; error?: string }> {
  const res = await fetch('/.netlify/functions/apify-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'status', apiKey, runId }),
  });

  const data = await res.json();
  if (!res.ok) return { status: 'FAILED', error: data.error };
  return { status: (data.data?.status as string) || 'RUNNING' };
}

// Récupère les résultats et les convertit en ProspectContact[]
export async function getApifyResults(
  apiKey: string,
  runId: string,
  platform: string
): Promise<ProspectContact[]> {
  const res = await fetch('/.netlify/functions/apify-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'results', apiKey, runId }),
  });

  const items = await res.json();
  if (!Array.isArray(items)) return [];

  return (items as Record<string, unknown>[])
    .map((item) => mapToProspect(item, platform))
    .filter((p): p is ProspectContact => p !== null);
}

// Convertit un résultat Apify en ProspectContact
function mapToProspect(item: Record<string, unknown>, platform: string): ProspectContact | null {
  const str = (v: unknown): string => (v ? String(v) : '');

  // Google Maps / Société.com
  if (platform === 'google_maps' || platform === 'societe_com') {
    const name = str(item.title || item.name);
    if (!name) return null;
    const nameParts = name.split(' ');
    return {
      id: uuidv4(),
      prenom: nameParts[0] || '',
      nom: nameParts.slice(1).join(' ') || name,
      entreprise: str(item.categoryName || item.category),
      poste: 'Dirigeant',
      email: str(item.email) || undefined,
      telephone: str(item.phone || item.phoneNumber) || undefined,
      adresse: str(item.address || item.street) || undefined,
      ville: str(item.city || (item.location as Record<string, unknown>)?.city) || undefined,
      pays: 'France',
      website: str(item.website || item.url) || undefined,
      source: 'google_maps',
      score: 65,
      status: 'new',
      tags: [],
      notes: str(item.description),
      dateDecouvert: new Date().toISOString().split('T')[0],
      secteur: str(item.categoryName) || undefined,
      tailleEntreprise: 'TPE/PME',
      intentionAchat: 'faible',
    };
  }

  // LinkedIn
  if (platform === 'linkedin') {
    const name = str(item.name || item.fullName);
    const nameParts = name.split(' ');
    return {
      id: uuidv4(),
      prenom: nameParts[0] || '',
      nom: nameParts.slice(1).join(' ') || '',
      entreprise: str(item.companyName || item.company),
      poste: str(item.title || item.position || item.headline),
      email: str(item.email) || undefined,
      ville: str(item.location || item.city) || undefined,
      pays: 'France',
      linkedinUrl: str(item.linkedinUrl || item.profileUrl) || undefined,
      website: str(item.companyWebsite) || undefined,
      source: 'linkedin',
      score: 75,
      status: 'new',
      tags: [],
      notes: str(item.summary || item.about),
      dateDecouvert: new Date().toISOString().split('T')[0],
      secteur: str(item.industry) || undefined,
      tailleEntreprise: str(item.companySize) || 'TPE/PME',
      intentionAchat: 'moyenne',
    };
  }

  // Instagram
  if (platform === 'instagram') {
    const fullName = str(item.fullName || item.username);
    return {
      id: uuidv4(),
      prenom: fullName.split(' ')[0] || '',
      nom: fullName.split(' ').slice(1).join(' ') || '',
      entreprise: str(item.username),
      poste: 'Créateur / Influenceur',
      email: str(item.email || item.businessEmail) || undefined,
      telephone: str(item.businessPhoneNumber) || undefined,
      ville: str(item.city) || undefined,
      pays: 'France',
      website: str(item.externalUrl) || undefined,
      instagramUrl: str(item.url || item.profileUrl) || undefined,
      source: 'instagram',
      score: 60,
      status: 'new',
      tags: ['instagram'],
      notes: str(item.biography),
      dateDecouvert: new Date().toISOString().split('T')[0],
      secteur: str(item.category) || undefined,
      tailleEntreprise: 'Indépendant',
      intentionAchat: 'faible',
    };
  }

  // GitHub
  if (platform === 'github') {
    const name = str(item.name || item.login);
    return {
      id: uuidv4(),
      prenom: name.split(' ')[0] || '',
      nom: name.split(' ').slice(1).join(' ') || str(item.login),
      entreprise: str(item.company),
      poste: 'Développeur',
      email: str(item.email) || undefined,
      ville: str(item.location) || undefined,
      pays: 'France',
      website: str(item.blog || item.htmlUrl) || undefined,
      source: 'github',
      score: 70,
      status: 'new',
      tags: ['dev', 'github'],
      notes: str(item.bio),
      dateDecouvert: new Date().toISOString().split('T')[0],
      secteur: 'Technologie',
      tailleEntreprise: 'Indépendant',
      technologies: ((item.topRepositories as Array<{ primaryLanguage?: { name?: string } }>) || [])
        .map((r) => r?.primaryLanguage?.name || '')
        .filter(Boolean),
      intentionAchat: 'moyenne',
    };
  }

  // Generic fallback
  const name = str(item.name || item.title || item.fullName);
  if (!name) return null;
  return {
    id: uuidv4(),
    prenom: name.split(' ')[0] || '',
    nom: name.split(' ').slice(1).join(' ') || '',
    entreprise: str(item.company || item.organization),
    poste: str(item.title || item.position),
    email: str(item.email) || undefined,
    telephone: str(item.phone) || undefined,
    adresse: str(item.address) || undefined,
    ville: str(item.city || item.location) || undefined,
    pays: 'France',
    linkedinUrl: str(item.linkedinUrl) || undefined,
    website: str(item.website || item.url) || undefined,
    source: 'other',
    score: 60,
    status: 'new',
    tags: [],
    notes: str(item.description),
    dateDecouvert: new Date().toISOString().split('T')[0],
    secteur: str(item.industry || item.category) || undefined,
    tailleEntreprise: 'TPE/PME',
    intentionAchat: 'faible',
  };
}

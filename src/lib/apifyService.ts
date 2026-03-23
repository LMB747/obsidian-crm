import { v4 as uuidv4 } from 'uuid';
import type { ProspectContact } from '../types/prospection';

// Mapping plateformes → actors Apify
export const PLATFORM_ACTORS: Record<string, string> = {
  'linkedin':             'apify~linkedin-company-scraper',
  'google_maps':          'apify~google-maps-scraper',
  'google_search':        'apify~google-search-scraper',
  'instagram':            'apify~instagram-profile-scraper',
  'instagram_pro':        'apify~instagram-profile-scraper',
  'tiktok':               'apify~tiktok-profile-scraper',
  'producthunt':          'apify~producthunt-scraper',
  'github':               'apify~github-scraper',
  'malt':                 'bebity~malt-fr-scraper',
  'annuaire_entreprises': 'apify~yellow-pages-scraper',
  'societe_com':          'apify~google-maps-scraper',
  'twitter':              'apify~twitter-scraper',
  'facebook':             'apify~facebook-pages-scraper',
  'youtube':              'apify~youtube-scraper',
  'crunchbase':           'apify~crunchbase-scraper',
  'upwork':               'apify~upwork-scraper',
  'indeed':               'apify~indeed-scraper',
  'le_bon_coin':          'apify~leboncoin-scraper',
  'welcome_to_the_jungle':'apify~welltojungle-scraper',
  'behance':              'apify~web-scraper',
  'dribbble':             'apify~web-scraper',
  'pappers':              'apify~google-search-scraper',
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
    case 'twitter':
      return {
        searchTerms: [searchQuery],
        maxItems: input.maxResults || 20,
        addUserInfo: true,
      };
    case 'facebook':
      return {
        startUrls: [],
        searchQuery,
        maxItems: input.maxResults || 20,
      };
    case 'youtube':
      return {
        searchQuery,
        maxResults: input.maxResults || 20,
        type: 'channel',
      };
    case 'crunchbase':
      return {
        searchQuery,
        maxItems: input.maxResults || 20,
      };
    case 'upwork':
      return {
        searchQuery,
        maxResults: input.maxResults || 20,
        type: 'freelancers',
      };
    case 'indeed':
      return {
        queries: [{
          keyword: searchQuery,
          location: input.location || 'France',
        }],
        maxItems: input.maxResults || 20,
      };
    case 'le_bon_coin':
      return {
        startUrls: [`https://www.leboncoin.fr/recherche?text=${encodeURIComponent(searchQuery)}`],
        maxItems: input.maxResults || 20,
      };
    case 'welcome_to_the_jungle':
      return {
        startUrls: [`https://www.welcometothejungle.com/fr/jobs?query=${encodeURIComponent(searchQuery)}`],
        maxItems: input.maxResults || 20,
      };
    case 'behance':
      return {
        startUrls: [`https://www.behance.net/search/projects?search=${encodeURIComponent(searchQuery)}&field=graphic+design`],
        maxItems: input.maxResults || 20,
      };
    case 'dribbble':
      return {
        startUrls: [`https://dribbble.com/search/${encodeURIComponent(searchQuery)}`],
        maxItems: input.maxResults || 20,
      };
    case 'pappers':
      return {
        queries: [`site:pappers.fr ${searchQuery}`],
        maxResults: input.maxResults || 20,
        resultsPerPage: 10,
      };
    case 'google_search':
      return {
        queries: [searchQuery],
        maxResults: input.maxResults || 20,
        resultsPerPage: 10,
        languageCode: 'fr',
        countryCode: 'fr',
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

  // Twitter
  if (platform === 'twitter') {
    const name = str(item.name || item.author || item.username);
    return {
      id: uuidv4(),
      prenom: name.split(' ')[0] || '',
      nom: name.split(' ').slice(1).join(' ') || str(item.username),
      entreprise: str(item.author || item.username),
      poste: 'Community Manager / Influenceur',
      email: undefined,
      ville: str(item.location || item.place) || undefined,
      pays: 'France',
      website: str(item.url || item.externalUrl) || undefined,
      twitterUrl: str(item.twitterUrl || item.profileUrl || item.url) || undefined,
      source: 'twitter',
      score: 60,
      status: 'new',
      tags: ['twitter', 'social media'],
      notes: str(item.bio || item.description),
      dateDecouvert: new Date().toISOString().split('T')[0],
      secteur: str(item.category) || undefined,
      tailleEntreprise: 'Indépendant',
      followers: typeof item.followersCount === 'number' ? item.followersCount : undefined,
      intentionAchat: 'faible',
    };
  }

  // Facebook
  if (platform === 'facebook') {
    const name = str(item.name || item.title);
    if (!name) return null;
    return {
      id: uuidv4(),
      prenom: name.split(' ')[0] || '',
      nom: name.split(' ').slice(1).join(' ') || name,
      entreprise: name,
      poste: 'Gestionnaire Page Facebook',
      email: str(item.email) || undefined,
      telephone: str(item.phone) || undefined,
      ville: str(item.location || item.city) || undefined,
      pays: 'France',
      website: str(item.website) || undefined,
      source: 'facebook',
      score: 60,
      status: 'new',
      tags: ['facebook'],
      notes: str(item.about || item.description),
      dateDecouvert: new Date().toISOString().split('T')[0],
      secteur: str(item.category) || undefined,
      tailleEntreprise: 'TPE/PME',
      followers: typeof item.fans === 'number' ? item.fans : undefined,
      intentionAchat: 'faible',
    };
  }

  // YouTube
  if (platform === 'youtube') {
    const name = str(item.channelName || item.title || item.name);
    return {
      id: uuidv4(),
      prenom: name.split(' ')[0] || '',
      nom: name.split(' ').slice(1).join(' ') || '',
      entreprise: name,
      poste: 'Créateur YouTube',
      email: str(item.email) || undefined,
      ville: str(item.country || item.location) || undefined,
      pays: 'France',
      website: str(item.channelUrl || item.url) || undefined,
      source: 'youtube',
      score: 65,
      status: 'new',
      tags: ['youtube', 'vidéo'],
      notes: str(item.description || item.about),
      dateDecouvert: new Date().toISOString().split('T')[0],
      secteur: str(item.category) || undefined,
      tailleEntreprise: 'Indépendant',
      followers: typeof item.subscriberCount === 'number' ? item.subscriberCount : undefined,
      intentionAchat: 'moyenne',
    };
  }

  // Crunchbase
  if (platform === 'crunchbase') {
    const name = str(item.name || item.fullName);
    if (!name) return null;
    return {
      id: uuidv4(),
      prenom: name.split(' ')[0] || '',
      nom: name.split(' ').slice(1).join(' ') || '',
      entreprise: str(item.organizationName || item.companyName || name),
      poste: str(item.title || item.primaryJobTitle || 'Fondateur'),
      email: str(item.email) || undefined,
      ville: str(item.location || item.city) || undefined,
      pays: str(item.country) || 'France',
      website: str(item.website || item.url) || undefined,
      linkedinUrl: str(item.linkedinUrl) || undefined,
      source: 'crunchbase',
      score: 80,
      status: 'new',
      tags: ['startup', 'crunchbase'],
      notes: str(item.shortDescription || item.description),
      dateDecouvert: new Date().toISOString().split('T')[0],
      secteur: str(item.primaryRole || item.categories) || undefined,
      tailleEntreprise: str(item.numEmployeesEnum) || 'Startup',
      intentionAchat: 'forte',
    };
  }

  // Upwork
  if (platform === 'upwork') {
    const name = str(item.name || item.fullName);
    return {
      id: uuidv4(),
      prenom: name.split(' ')[0] || '',
      nom: name.split(' ').slice(1).join(' ') || '',
      entreprise: str(item.agency || item.title),
      poste: str(item.title || (item.skills as string[] | undefined)?.[0] || 'Freelancer'),
      email: undefined,
      ville: str(item.location || item.city) || undefined,
      pays: str(item.country) || 'France',
      website: str(item.profileUrl || item.url) || undefined,
      source: 'upwork',
      score: 65,
      status: 'new',
      tags: ['freelance', 'upwork'],
      notes: str(item.description || item.overview),
      dateDecouvert: new Date().toISOString().split('T')[0],
      secteur: 'Freelance',
      tailleEntreprise: 'Indépendant',
      intentionAchat: 'moyenne',
    };
  }

  // Indeed
  if (platform === 'indeed') {
    const companyName = str(item.company || item.employerName);
    if (!companyName) return null;
    return {
      id: uuidv4(),
      prenom: '',
      nom: companyName,
      entreprise: companyName,
      poste: str(item.jobTitle || 'Recruteur'),
      email: undefined,
      telephone: undefined,
      ville: str(item.location || item.city) || undefined,
      pays: 'France',
      website: str(item.companyWebsite || item.url) || undefined,
      source: 'indeed',
      score: 60,
      status: 'new',
      tags: ['recrutement', 'indeed'],
      notes: str(item.jobDescription || item.description),
      dateDecouvert: new Date().toISOString().split('T')[0],
      secteur: str(item.sector || item.industry) || undefined,
      tailleEntreprise: 'TPE/PME',
      intentionAchat: 'moyenne',
    };
  }

  // Welcome to the Jungle
  if (platform === 'welcome_to_the_jungle') {
    const companyName = str(item.companyName || item.name);
    if (!companyName) return null;
    return {
      id: uuidv4(),
      prenom: '',
      nom: companyName,
      entreprise: companyName,
      poste: 'Responsable RH / Recrutement',
      email: undefined,
      ville: str(item.location || item.city) || undefined,
      pays: 'France',
      website: str(item.website || item.url) || undefined,
      source: 'welcome_to_the_jungle',
      score: 65,
      status: 'new',
      tags: ['tech', 'startup', 'wtj'],
      notes: str(item.description || item.summary),
      dateDecouvert: new Date().toISOString().split('T')[0],
      secteur: str(item.sector || item.industry) || 'Technologie',
      tailleEntreprise: str(item.staffCount) || 'Startup',
      intentionAchat: 'moyenne',
    };
  }

  // Behance
  if (platform === 'behance') {
    const name = str(item.ownerName || item.displayName || item.name);
    return {
      id: uuidv4(),
      prenom: name.split(' ')[0] || '',
      nom: name.split(' ').slice(1).join(' ') || '',
      entreprise: str(item.username || name),
      poste: 'Créatif / Designer',
      email: undefined,
      ville: str(item.location || item.city) || undefined,
      pays: 'France',
      website: str(item.url || item.profileUrl) || undefined,
      source: 'behance',
      score: 60,
      status: 'new',
      tags: ['design', 'créatif', 'behance'],
      notes: str(item.description || item.specialties),
      dateDecouvert: new Date().toISOString().split('T')[0],
      secteur: 'Design',
      tailleEntreprise: 'Indépendant',
      intentionAchat: 'faible',
    };
  }

  // Dribbble
  if (platform === 'dribbble') {
    const name = str(item.name || item.login || item.username);
    return {
      id: uuidv4(),
      prenom: name.split(' ')[0] || '',
      nom: name.split(' ').slice(1).join(' ') || str(item.login),
      entreprise: str(item.company || name),
      poste: 'UI/UX Designer',
      email: undefined,
      ville: str(item.location) || undefined,
      pays: 'France',
      website: str(item.websiteUrl || item.url) || undefined,
      source: 'dribbble',
      score: 60,
      status: 'new',
      tags: ['ui/ux', 'design', 'dribbble'],
      notes: str(item.bio || item.description),
      dateDecouvert: new Date().toISOString().split('T')[0],
      secteur: 'Design',
      tailleEntreprise: 'Indépendant',
      intentionAchat: 'faible',
    };
  }

  // Google Search / Pappers (résultats web génériques)
  if (platform === 'google_search' || platform === 'pappers') {
    const title = str(item.title || item.name);
    if (!title) return null;
    return {
      id: uuidv4(),
      prenom: title.split(' ')[0] || '',
      nom: title.split(' ').slice(1).join(' ') || '',
      entreprise: title,
      poste: 'Dirigeant',
      email: str(item.email) || undefined,
      telephone: str(item.phone) || undefined,
      adresse: str(item.address) || undefined,
      ville: str(item.city || item.location) || undefined,
      pays: 'France',
      website: str(item.url || item.link) || undefined,
      source: platform === 'pappers' ? 'pappers' : 'google_search',
      score: 60,
      status: 'new',
      tags: [platform === 'pappers' ? 'pappers' : 'google'],
      notes: str(item.description || item.snippet),
      dateDecouvert: new Date().toISOString().split('T')[0],
      secteur: undefined,
      tailleEntreprise: 'TPE/PME',
      intentionAchat: 'faible',
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

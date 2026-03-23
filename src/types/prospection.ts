export type ProspectSource =
  | 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'tiktok'
  | 'google_maps' | 'google_search' | 'youtube' | 'github'
  | 'producthunt' | 'crunchbase' | 'malt' | 'upwork'
  | 'annuaire_entreprises' | 'societe_com' | 'pappers'
  | 'le_bon_coin' | 'indeed' | 'welcome_to_the_jungle'
  | 'instagram_pro' | 'behance' | 'dribbble' | 'other';

export type ProspectStatus =
  | 'new' | 'enriched' | 'qualified' | 'contacted' | 'imported' | 'excluded';

export type PipelineColumn =
  | 'identifie' | 'contacte' | 'en_discussion' | 'proposition_envoyee' | 'signe' | 'refuse';

export interface ProspectContact {
  id: string;
  // Identité
  nom: string;
  prenom: string;
  entreprise: string;
  poste: string;
  // Coordonnées
  email?: string;
  telephone?: string;
  website?: string;
  adresse?: string;
  ville?: string;
  pays: string;
  // Social
  linkedinUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  // Source
  source: ProspectSource;
  sourceUrl?: string;
  // Métriques
  followers?: number;
  engagement?: number;
  score: number;           // 0-100, score de qualification IA
  // Meta
  status: ProspectStatus;
  tags: string[];
  notes: string;
  dateDecouvert: string;
  dateEnrichi?: string;
  // Données enrichies IA
  secteur?: string;
  tailleEntreprise?: string;   // '1-10' | '11-50' | '51-200' | '201-500' | '500+'
  chiffreAffaires?: string;
  description?: string;
  technologies?: string[];
  besoinsDetectes?: string[];  // ex: ['design', 'développement web', 'SEO']
  intentionAchat?: 'faible' | 'moyenne' | 'forte';
  pipelineColumn?: PipelineColumn;
  dernierContact?: string;
}

export interface ScrapeJob {
  id: string;
  platforms: ProspectSource[];
  keywords: string[];
  location?: string;
  sector?: string;
  companySize?: string;
  jobTitle?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;       // 0-100
  resultsCount: number;
  dateCreated: string;
  dateCompleted?: string;
  errorMessage?: string;
}

export interface ProspectionFilter {
  search: string;
  sources: ProspectSource[];
  status: ProspectStatus[];
  scoreMin: number;
  scoreMax: number;
  pays: string[];
  secteur: string[];
  intentionAchat: string[];
}

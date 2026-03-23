import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { ProspectContact, ScrapeJob, ProspectSource, ProspectionFilter } from '../types/prospection';
import { useStore } from './useStore';

// ─── Default Filters ───────────────────────────────────────────────────────────
const defaultFilters: ProspectionFilter = {
  search: '',
  sources: [],
  status: [],
  scoreMin: 0,
  scoreMax: 100,
  pays: [],
  secteur: [],
  intentionAchat: [],
};

// ─── Store Interface ───────────────────────────────────────────────────────────
interface ProspectionStore {
  prospects: ProspectContact[];
  scrapeJobs: ScrapeJob[];
  filters: ProspectionFilter;
  selectedProspects: string[];

  // Prospect actions
  addProspect: (prospect: Omit<ProspectContact, 'id'>) => void;
  addProspects: (prospects: ProspectContact[]) => void;
  updateProspect: (id: string, updates: Partial<ProspectContact>) => void;
  deleteProspect: (id: string) => void;
  deleteProspects: (ids: string[]) => void;
  clearProspects: () => void;

  // Job actions
  addScrapeJob: (job: ScrapeJob) => void;
  updateScrapeJob: (id: string, updates: Partial<ScrapeJob>) => void;
  deleteScrapeJob: (id: string) => void;

  // Filter actions
  setFilters: (filters: Partial<ProspectionFilter>) => void;
  resetFilters: () => void;

  // Selection actions
  toggleSelectProspect: (id: string) => void;
  selectAllProspects: (ids: string[]) => void;
  clearSelection: () => void;

  // Import & scrape
  importToMainCRM: (ids: string[]) => void;
  startScrapeJob: (config: {
    platforms: ProspectSource[];
    keywords: string[];
    location?: string;
    sector?: string;
    companySize?: string;
    jobTitle?: string;
  }) => void;
}

export const useProspectionStore = create<ProspectionStore>()(
  persist(
    (set, get) => ({
      prospects: [],
      scrapeJobs: [],
      filters: defaultFilters,
      selectedProspects: [],

      // ─── Prospect Actions ─────────────────────────────────────────────────
      addProspect: (prospectData) => {
        const prospect: ProspectContact = { ...prospectData, id: uuidv4() };
        set((state) => ({ prospects: [prospect, ...state.prospects] }));
      },

      addProspects: (newProspects) =>
        set((state) => ({
          prospects: [
            ...state.prospects,
            ...newProspects.map((p) => ({ ...p, id: p.id || uuidv4() })),
          ],
        })),

      updateProspect: (id, updates) =>
        set((state) => ({
          prospects: state.prospects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      deleteProspect: (id) =>
        set((state) => ({
          prospects: state.prospects.filter((p) => p.id !== id),
          selectedProspects: state.selectedProspects.filter((sid) => sid !== id),
        })),

      deleteProspects: (ids) =>
        set((state) => ({
          prospects: state.prospects.filter((p) => !ids.includes(p.id)),
          selectedProspects: state.selectedProspects.filter((sid) => !ids.includes(sid)),
        })),

      clearProspects: () => set({ prospects: [], selectedProspects: [] }),

      // ─── Job Actions ──────────────────────────────────────────────────────
      addScrapeJob: (job) =>
        set((state) => ({
          scrapeJobs: [{ ...job, id: job.id || uuidv4() }, ...state.scrapeJobs],
        })),

      updateScrapeJob: (id, updates) =>
        set((state) => ({
          scrapeJobs: state.scrapeJobs.map((j) =>
            j.id === id ? { ...j, ...updates } : j
          ),
        })),

      deleteScrapeJob: (id) =>
        set((state) => ({
          scrapeJobs: state.scrapeJobs.filter((j) => j.id !== id),
        })),

      // ─── Filter Actions ───────────────────────────────────────────────────
      setFilters: (filters) =>
        set((state) => ({ filters: { ...state.filters, ...filters } })),

      resetFilters: () => set({ filters: defaultFilters }),

      // ─── Selection Actions ────────────────────────────────────────────────
      toggleSelectProspect: (id) =>
        set((state) => ({
          selectedProspects: state.selectedProspects.includes(id)
            ? state.selectedProspects.filter((sid) => sid !== id)
            : [...state.selectedProspects, id],
        })),

      selectAllProspects: (ids) => set({ selectedProspects: ids }),

      clearSelection: () => set({ selectedProspects: [] }),

      // ─── Import to Main CRM ───────────────────────────────────────────────
      importToMainCRM: (prospectIds) => {
        const { prospects } = get();
        const mainStore = useStore.getState();

        prospectIds.forEach((pid) => {
          const prospect = prospects.find((p) => p.id === pid);
          if (!prospect || prospect.status === 'imported') return;

          mainStore.addClient({
            nom: `${prospect.prenom} ${prospect.nom}`,
            entreprise: prospect.entreprise,
            email: prospect.email ?? '',
            telephone: prospect.telephone ?? '',
            adresse: prospect.adresse
              ? `${prospect.adresse}${prospect.ville ? ', ' + prospect.ville : ''}`
              : prospect.ville ?? '',
            statut: 'prospect',
            source: 'réseaux sociaux',
            tags: prospect.tags,
            notes: `[Importé depuis Prospection IA — source: ${prospect.source}]\n${prospect.notes}`,
            chiffreAffaires: 0,
            avatar: undefined,
          });
        });

        set((state) => ({
          prospects: state.prospects.map((p) =>
            prospectIds.includes(p.id) ? { ...p, status: 'imported' as const } : p
          ),
          selectedProspects: [],
        }));
      },

      // ─── Start Scrape Job (with simulated progress) ───────────────────────
      startScrapeJob: (config) => {
        const jobId = uuidv4();
        const job: ScrapeJob = {
          id: jobId,
          platforms: config.platforms,
          keywords: config.keywords,
          location: config.location,
          sector: config.sector,
          companySize: config.companySize,
          jobTitle: config.jobTitle,
          status: 'running',
          progress: 0,
          resultsCount: 0,
          dateCreated: new Date().toISOString(),
        };

        set((state) => ({ scrapeJobs: [job, ...state.scrapeJobs] }));

        // Simulate progress
        const totalDuration = 4000 + Math.random() * 3000;
        const intervalMs = 200;
        const steps = Math.floor(totalDuration / intervalMs);
        let currentStep = 0;

        const interval = setInterval(() => {
          currentStep++;
          const rawProgress = currentStep / steps;
          // Ease-in-out curve so it doesn't feel mechanical
          const progress = Math.min(
            100,
            Math.round(rawProgress < 0.5
              ? 2 * rawProgress * rawProgress * 100
              : (1 - Math.pow(-2 * rawProgress + 2, 2) / 2) * 100
            )
          );

          const { scrapeJobs } = useProspectionStore.getState();
          const stillRunning = scrapeJobs.find((j) => j.id === jobId)?.status === 'running';

          if (!stillRunning) {
            clearInterval(interval);
            return;
          }

          if (progress >= 100) {
            clearInterval(interval);
            const resultsCount = 10 + Math.floor(Math.random() * 26);
            // Generate mock prospects
            const newProspects = generateMockProspects({
              keywords: config.keywords,
              location: config.location,
              sector: config.sector,
              jobTitle: config.jobTitle,
              platforms: config.platforms,
            });

            useProspectionStore.getState().addProspects(newProspects);
            useProspectionStore.getState().updateScrapeJob(jobId, {
              status: 'completed',
              progress: 100,
              resultsCount,
              dateCompleted: new Date().toISOString(),
            });
          } else {
            useProspectionStore.getState().updateScrapeJob(jobId, { progress });
          }
        }, intervalMs);
      },
    }),
    {
      name: 'prospection-store-v3',
      partialize: (state) => ({
        prospects: state.prospects,
        scrapeJobs: state.scrapeJobs,
        filters: state.filters,
      }),
    }
  )
);

// ─── Mock prospect generator ──────────────────────────────────────────────────
const FIRST_NAMES = [
  'Arnaud', 'Béatrice', 'Cédric', 'Delphine', 'Edouard', 'Florence', 'Guillaume',
  'Hélène', 'Ignace', 'Julie', 'Kévin', 'Laura', 'Michel', 'Nathalie', 'Olivier',
  'Patricia', 'Quentin', 'Rachel', 'Sébastien', 'Tiphaine', 'Ugo', 'Vanessa', 'Xavier',
];

const LAST_NAMES = [
  'Andrieu', 'Blanchard', 'Caron', 'Deschamps', 'Estève', 'François', 'Gillet',
  'Hermand', 'Imbert', 'Jacquet', 'Keller', 'Lachamp', 'Marchand', 'Nicolet',
  'Olivier', 'Pétard', 'Quirant', 'Rollet', 'Sandoval', 'Tissier', 'Urso',
];

const COMPANIES_BY_SECTOR: Record<string, string[]> = {
  'Agence': ['Studio Créatif', 'Digital Factory', 'Agence Fusion', 'NovaDesign', 'Sparkle Agency', 'Nexus Studio'],
  'E-commerce': ['Boutique Zenith', 'MarketPlace Pro', 'E-Shop Éclat', 'CommerceFlow', 'ShopStar'],
  'SaaS': ['CloudApp.io', 'FlexTool', 'BizFlow', 'SoftLab', 'DataVault', 'AppSphere'],
  'default': ['Entreprise Solutions', 'Pro Services', 'Corp Innovation', 'Tech Ventures', 'Groupe Avenir'],
};

const POSTES_BY_SECTOR: Record<string, string[]> = {
  'Agence': ['CEO', 'Directeur Associé', 'Fondateur', 'Directeur Général', 'Co-Fondateur'],
  'E-commerce': ['Directeur E-commerce', 'Fondateur', 'Gérante', 'Directeur Marketing'],
  'SaaS': ['CEO', 'CTO', 'CPO', 'Co-Fondateur', 'Head of Growth'],
  'default': ['Directeur', 'Gérant', 'Fondateur', 'Responsable', 'Président'],
};

const VILLES = ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse', 'Nantes', 'Lille', 'Rennes', 'Montpellier', 'Strasbourg'];

export function generateMockProspects(criteria: {
  keywords: string[];
  location?: string;
  sector?: string;
  jobTitle?: string;
  platforms: ProspectSource[];
}): ProspectContact[] {
  const count = 10 + Math.floor(Math.random() * 16);
  const results: ProspectContact[] = [];
  const sectorKey = criteria.sector && COMPANIES_BY_SECTOR[criteria.sector] ? criteria.sector : 'default';

  for (let i = 0; i < count; i++) {
    const prenom = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const nom = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const entrepriseNames = COMPANIES_BY_SECTOR[sectorKey];
    const entreprise = entrepriseNames[Math.floor(Math.random() * entrepriseNames.length)];
    const postes = POSTES_BY_SECTOR[sectorKey];
    const poste = criteria.jobTitle || postes[Math.floor(Math.random() * postes.length)];
    const ville = criteria.location || VILLES[Math.floor(Math.random() * VILLES.length)];
    const source = criteria.platforms[Math.floor(Math.random() * criteria.platforms.length)];
    const score = 40 + Math.floor(Math.random() * 56);
    const isHot = score >= 70;
    const prenomLower = prenom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const nomLower = nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const entrepriseDomain = entreprise.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + '.fr';

    results.push({
      id: uuidv4(),
      nom,
      prenom,
      entreprise,
      poste,
      email: `${prenomLower}.${nomLower}@${entrepriseDomain}`,
      telephone: `0${6 + Math.floor(Math.random() * 2)} ${String(Math.floor(Math.random() * 90) + 10).padStart(2, '0')} ${String(Math.floor(Math.random() * 90) + 10).padStart(2, '0')} ${String(Math.floor(Math.random() * 90) + 10).padStart(2, '0')} ${String(Math.floor(Math.random() * 90) + 10).padStart(2, '0')}`,
      website: `https://${entrepriseDomain}`,
      ville,
      pays: 'France',
      source,
      score,
      status: 'new',
      tags: [
        ...(criteria.keywords.slice(0, 2)),
        sectorKey !== 'default' ? sectorKey.toLowerCase() : '',
        ville.toLowerCase(),
      ].filter(Boolean),
      notes: '',
      dateDecouvert: new Date().toISOString().split('T')[0],
      secteur: criteria.sector || 'Non défini',
      tailleEntreprise: (['1-10', '11-50', '51-200'] as const)[Math.floor(Math.random() * 3)],
      besoinsDetectes: criteria.keywords.slice(0, 3),
      intentionAchat: isHot ? (score >= 85 ? 'forte' : 'moyenne') : 'faible',
    });
  }

  return results;
}

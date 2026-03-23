import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { ProspectContact, ScrapeJob, ProspectSource, ProspectionFilter, EmailTemplate } from '../types/prospection';
import { useStore } from './useStore';
import { startApifyRun, checkApifyRun, getApifyResults, PLATFORM_ACTORS } from '../lib/apifyService';
import { launchPhantom, checkPhantomStatus, getPhantomResults } from '../lib/phantombusterService';

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
export interface ProspectionApiKeys {
  apify: string;
  phantombuster: string;
}

export type ScrapingEngine = 'apify' | 'phantombuster';

interface ProspectionStore {
  prospects: ProspectContact[];
  scrapeJobs: ScrapeJob[];
  filters: ProspectionFilter;
  selectedProspects: string[];
  apiKeys: ProspectionApiKeys;
  emailTemplates: EmailTemplate[];
  phantomAgentId: string; // ID du Phantom à lancer (configuré par l'utilisateur)

  // API key action
  updateApiKeys: (keys: Partial<ProspectionApiKeys>) => void;
  setPhantomAgentId: (id: string) => void;

  // Email template actions
  addEmailTemplate: (tpl: Omit<EmailTemplate, 'id'>) => void;
  updateEmailTemplate: (id: string, updates: Partial<EmailTemplate>) => void;
  deleteEmailTemplate: (id: string) => void;

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
  clearEmptyJobs: () => void;
  clearAllJobs: () => void;

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
    engine?: ScrapingEngine;
  }) => void;
}

export const useProspectionStore = create<ProspectionStore>()(
  persist(
    (set, get) => ({
      prospects: [],
      scrapeJobs: [],
      filters: defaultFilters,
      selectedProspects: [],
      apiKeys: { apify: '', phantombuster: '' },
      phantomAgentId: '',
      emailTemplates: [
        { id: 'tpl-1', nom: 'Premier contact', type: 'premier_contact', sujet: 'Collaboration {{PLATEFORME}} — {{NOM_AGENCE}}', corps: 'Bonjour {{PRENOM}},\n\nJe me permets de vous contacter car votre travail chez {{ENTREPRISE}} a retenu notre attention.\n\nChez {{NOM_AGENCE}}, nous accompagnons des entreprises comme la vôtre en stratégie digitale et marketing.\n\nSeriez-vous disponible pour un échange de 15 minutes cette semaine ?\n\nBien cordialement,\n{{NOM_AGENCE}}' },
        { id: 'tpl-2', nom: 'Relance', type: 'relance', sujet: 'Suite à mon message — {{NOM_AGENCE}}', corps: 'Bonjour {{PRENOM}},\n\nJe me permets de revenir vers vous suite à mon précédent message.\n\nJe serais ravi de pouvoir échanger avec vous sur les besoins de {{ENTREPRISE}} en termes de stratégie digitale.\n\nÊtes-vous disponible cette semaine pour un court appel ?\n\nCordialement,\n{{NOM_AGENCE}}' },
        { id: 'tpl-3', nom: 'Proposition commerciale', type: 'proposition', sujet: 'Proposition — {{NOM_AGENCE}} x {{ENTREPRISE}}', corps: 'Bonjour {{PRENOM}},\n\nSuite à notre échange, je vous fais parvenir notre proposition d\'accompagnement pour {{ENTREPRISE}}.\n\nVous trouverez ci-joint le détail de notre offre incluant :\n- Stratégie digitale sur mesure\n- Gestion de campagnes média\n- Reporting et optimisation continue\n\nN\'hésitez pas à revenir vers moi pour toute question.\n\nCordialement,\n{{NOM_AGENCE}}' },
        { id: 'tpl-4', nom: 'Remerciement', type: 'remerciement', sujet: 'Merci pour votre confiance — {{NOM_AGENCE}}', corps: 'Bonjour {{PRENOM}},\n\nJe tenais à vous remercier pour la confiance que vous accordez à {{NOM_AGENCE}}.\n\nNous sommes ravis de collaborer avec {{ENTREPRISE}} et mettons tout en œuvre pour atteindre vos objectifs.\n\nN\'hésitez pas à nous contacter à tout moment.\n\nBien cordialement,\n{{NOM_AGENCE}}' },
      ],

      // ─── Email Template Actions ─────────────────────────────────────────────
      addEmailTemplate: (tplData) => set(s => ({ emailTemplates: [...s.emailTemplates, { ...tplData, id: uuidv4() }] })),
      updateEmailTemplate: (id, updates) => set(s => ({ emailTemplates: s.emailTemplates.map(t => t.id === id ? { ...t, ...updates } : t) })),
      deleteEmailTemplate: (id) => set(s => ({ emailTemplates: s.emailTemplates.filter(t => t.id !== id) })),

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

      updateApiKeys: (keys) =>
        set((state) => ({ apiKeys: { ...state.apiKeys, ...keys } })),

      setPhantomAgentId: (id) => set({ phantomAgentId: id.trim() }),

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

      clearEmptyJobs: () =>
        set((state) => ({
          scrapeJobs: state.scrapeJobs.filter(j => j.resultsCount > 0 || j.status === 'running'),
        })),

      clearAllJobs: () => set({ scrapeJobs: [] }),

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

      // ─── Start Scrape Job ─────────────────────────────────────────────────
      startScrapeJob: (config) => {
        const { apiKeys, phantomAgentId } = useProspectionStore.getState();
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

        // Déterminer le moteur : choix explicite > clé disponible > démo
        const engine: ScrapingEngine | 'demo' =
          config.engine
            ? config.engine
            : apiKeys.apify.trim() ? 'apify'
            : apiKeys.phantombuster.trim() ? 'phantombuster'
            : 'demo';

        // ── Mode Démo ──────────────────────────────────────────────────────
        if (engine === 'demo') {
          const totalDuration = 4000 + Math.random() * 3000;
          const intervalMs = 200;
          const steps = Math.floor(totalDuration / intervalMs);
          let currentStep = 0;

          const tick = () => {
            currentStep++;
            const rawProgress = currentStep / steps;
            const progress = Math.min(
              100,
              Math.round(
                rawProgress < 0.5
                  ? 2 * rawProgress * rawProgress * 100
                  : (1 - Math.pow(-2 * rawProgress + 2, 2) / 2) * 100
              )
            );

            const stillRunning =
              useProspectionStore.getState().scrapeJobs.find((j) => j.id === jobId)?.status === 'running';

            if (!stillRunning) return;

            if (progress >= 100) {
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
                resultsCount: newProspects.length,
                dateCompleted: new Date().toISOString(),
              });
            } else {
              useProspectionStore.getState().updateScrapeJob(jobId, { progress });
              setTimeout(tick, intervalMs);
            }
          };

          setTimeout(tick, intervalMs);
          return;
        }

        // ── Mode PhantomBuster ─────────────────────────────────────────────
        if (engine === 'phantombuster') {
          const pbKey = apiKeys.phantombuster.trim();
          const agentId = phantomAgentId;

          if (!agentId) {
            useProspectionStore.getState().updateScrapeJob(jobId, {
              status: 'error',
              errorMessage: 'Aucun Phantom Agent ID configuré. Allez dans Configuration → PhantomBuster Agent ID.',
            });
            return;
          }

          void (async () => {
            const TIMEOUT_MS = 120_000; // 2 min pour PhantomBuster (plus lent)
            const startTime = Date.now();

            try {
              // Lancer le Phantom avec les arguments de recherche
              const argument: Record<string, unknown> = {
                search: config.keywords.join(', '),
                numberOfProfiles: 30,
              };
              if (config.location) argument.location = config.location;
              if (config.sector) argument.category = config.sector;
              if (config.jobTitle) argument.jobTitle = config.jobTitle;

              const { containerId, error: launchError } = await launchPhantom(pbKey, agentId, argument);
              if (launchError || !containerId) {
                useProspectionStore.getState().updateScrapeJob(jobId, {
                  status: 'error',
                  errorMessage: `PhantomBuster : ${launchError || 'Pas de container ID'}`,
                });
                return;
              }

              useProspectionStore.getState().updateScrapeJob(jobId, { progress: 10 });

              // Polling
              const poll = async () => {
                const stillRunning =
                  useProspectionStore.getState().scrapeJobs.find((j) => j.id === jobId)?.status === 'running';
                if (!stillRunning) return;

                if (Date.now() - startTime > TIMEOUT_MS) {
                  // Tenter de récupérer des résultats partiels
                  const results = await getPhantomResults(pbKey, containerId, config.platforms[0] || 'other');
                  if (results.length > 0) {
                    useProspectionStore.getState().addProspects(results);
                    useProspectionStore.getState().updateScrapeJob(jobId, {
                      status: 'completed', progress: 100, resultsCount: results.length,
                      dateCompleted: new Date().toISOString(),
                    });
                  } else {
                    useProspectionStore.getState().updateScrapeJob(jobId, {
                      status: 'error', progress: 100,
                      errorMessage: 'Timeout (2min) — aucun résultat. Vérifiez que votre Phantom est bien configuré.',
                    });
                  }
                  return;
                }

                const { status, error: statusError } = await checkPhantomStatus(pbKey, containerId);

                if (status === 'error') {
                  useProspectionStore.getState().updateScrapeJob(jobId, {
                    status: 'error',
                    errorMessage: `PhantomBuster : ${statusError || 'Le Phantom a échoué'}`,
                  });
                  return;
                }

                if (status === 'finished') {
                  const results = await getPhantomResults(pbKey, containerId, config.platforms[0] || 'other');
                  useProspectionStore.getState().addProspects(results);
                  useProspectionStore.getState().updateScrapeJob(jobId, {
                    status: 'completed',
                    progress: 100,
                    resultsCount: results.length,
                    dateCompleted: new Date().toISOString(),
                  });
                  return;
                }

                // Toujours en cours → incrémenter la progress bar
                const elapsed = Date.now() - startTime;
                const progress = Math.min(90, Math.round((elapsed / TIMEOUT_MS) * 90));
                useProspectionStore.getState().updateScrapeJob(jobId, { progress });
                setTimeout(poll, 5000);
              };

              setTimeout(poll, 5000);
            } catch (err: unknown) {
              useProspectionStore.getState().updateScrapeJob(jobId, {
                status: 'error',
                errorMessage: `PhantomBuster : ${String(err)}`,
              });
            }
          })();
          return;
        }

        // ── Mode Apify ─────────────────────────────────────────────────────
        const apifyKey = apiKeys.apify.trim();
        const keywordsStr = config.keywords.join(' ');
        const scrapeInput = {
          keywords: keywordsStr,
          location: config.location || '',
          sector: config.sector || '',
          maxResults: 30,
        };

        const supportedPlatforms = config.platforms.filter(
          (p) => PLATFORM_ACTORS[p] !== undefined
        );

        if (supportedPlatforms.length === 0) {
          useProspectionStore.getState().updateScrapeJob(jobId, {
            status: 'error',
            errorMessage: 'Aucune des plateformes sélectionnées n\'est supportée.',
          });
          return;
        }

        void (async () => {
          const TIMEOUT_MS = 60_000;
          const startTime = Date.now();

          try {
            const runEntries: Array<{ platform: ProspectSource; runId: string }> = [];
            const errors: string[] = [];

            for (const platform of supportedPlatforms) {
              const { runId, error } = await startApifyRun(apifyKey, platform, scrapeInput);
              if (error || !runId) {
                errors.push(`${platform}: ${error || 'Pas de runId'}`);
                continue;
              }
              runEntries.push({ platform, runId });
            }

            if (runEntries.length === 0) {
              const detail = errors.length > 0
                ? `\n\nDétails :\n${errors.join('\n')}`
                : '';
              useProspectionStore.getState().updateScrapeJob(jobId, {
                status: 'error',
                errorMessage: `Impossible de démarrer les runs Apify. Vérifiez votre clé API et la connexion réseau.${detail}`,
              });
              return;
            }

            const totalRuns = runEntries.length;
            const poll = async () => {
              const stillRunning =
                useProspectionStore.getState().scrapeJobs.find((j) => j.id === jobId)?.status === 'running';
              if (!stillRunning) return;

              if (Date.now() - startTime > TIMEOUT_MS) {
                const allProspects: ProspectContact[] = [];
                for (const { platform, runId } of runEntries) {
                  try {
                    const results = await getApifyResults(apifyKey, runId, platform);
                    allProspects.push(...results);
                  } catch { /* ignore partial results errors */ }
                }
                useProspectionStore.getState().addProspects(allProspects);
                useProspectionStore.getState().updateScrapeJob(jobId, {
                  status: allProspects.length > 0 ? 'completed' : 'error',
                  progress: 100,
                  resultsCount: allProspects.length,
                  dateCompleted: new Date().toISOString(),
                  errorMessage: allProspects.length === 0
                    ? 'Timeout (60s) — aucun résultat récupéré. Essayez avec moins de plateformes.'
                    : undefined,
                });
                return;
              }

              const statuses = await Promise.all(
                runEntries.map(({ runId }) => checkApifyRun(apifyKey, runId))
              );

              const doneCount = statuses.filter(
                (s) => s.status === 'SUCCEEDED' || s.status === 'FAILED' || s.status === 'ABORTED' || s.status === 'TIMED-OUT'
              ).length;

              const progress = Math.min(95, Math.round((doneCount / totalRuns) * 95));
              useProspectionStore.getState().updateScrapeJob(jobId, { progress });

              if (doneCount < totalRuns) {
                setTimeout(poll, 3000);
                return;
              }

              const allProspects: ProspectContact[] = [];
              for (let i = 0; i < runEntries.length; i++) {
                if (statuses[i].status === 'SUCCEEDED') {
                  const results = await getApifyResults(apifyKey, runEntries[i].runId, runEntries[i].platform);
                  allProspects.push(...results);
                }
              }

              useProspectionStore.getState().addProspects(allProspects);
              useProspectionStore.getState().updateScrapeJob(jobId, {
                status: 'completed',
                progress: 100,
                resultsCount: allProspects.length,
                dateCompleted: new Date().toISOString(),
              });
            };

            setTimeout(poll, 3000);
          } catch (err: unknown) {
            const message = String(err);
            const isNetworkError = message.includes('fetch') || message.includes('network') || message.includes('ECONNREFUSED');
            useProspectionStore.getState().updateScrapeJob(jobId, {
              status: 'error',
              errorMessage: isNetworkError
                ? 'Erreur réseau — le proxy est inaccessible. Déployez sur Netlify ou lancez npx netlify dev.'
                : `Erreur Apify : ${message}`,
            });
          }
        })();
      },
    }),
    {
      name: 'prospection-store-v4',
      partialize: (state) => ({
        prospects: state.prospects,
        scrapeJobs: state.scrapeJobs,
        filters: state.filters,
        apiKeys: state.apiKeys,
        phantomAgentId: state.phantomAgentId,
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

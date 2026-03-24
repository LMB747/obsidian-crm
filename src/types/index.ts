// ─── FREELANCER / PRESTATAIRE ─────────────────────────────────────────────────
export type FreelancerSpecialite =
  | 'développement web'
  | 'design UI/UX'
  | 'développement mobile'
  | 'marketing digital'
  | 'rédaction'
  | 'vidéo / motion'
  | 'SEO / SEA'
  | 'data / analytics'
  | 'devops / cloud'
  | 'consulting'
  | 'autre';

export type FreelancerStatut = 'actif' | 'inactif' | 'en mission';

export interface Freelancer {
  id: string;
  nom: string;
  prenom: string;
  entreprise: string;         // Raison sociale ou nom commercial
  email: string;
  telephone: string;
  adresse: string;
  siret: string;
  numeroTVA: string;
  specialite: FreelancerSpecialite;
  tjm: number;                // Taux Journalier Moyen en €
  statut: FreelancerStatut;
  tags: string[];
  notes: string;
  dateCreation: string;
  totalFacture: number;       // CA total généré avec ce freelancer
  iban: string;               // Coordonnées bancaires — IBAN
  bic: string;                // Coordonnées bancaires — BIC / SWIFT
  tvaApplicable: boolean;     // true = assujetti TVA, false = art.293B (micro-entreprise)
  tauxTva: number;            // Taux TVA applicable (0, 5.5, 10, 20) — ignoré si tvaApplicable=false
}

// ─── DOCUMENT — ACOMPTE ──────────────────────────────────────────────────────

export type AcompteStatut = 'a_payer' | 'paye' | 'partiellement_paye' | 'annule';

export interface DocumentAcompte {
  id: string;
  montant: number;              // Montant de l'acompte en €
  pourcentage: number;          // % du TTC correspondant
  statut: AcompteStatut;
  datePrevue: string;           // Date prévue du paiement (ISO)
  dateReglement?: string;       // Date effective si payé (ISO)
  moyenPaiement?: string;       // "virement", "chèque", "CB", etc.
}

// ─── DOCUMENT — PAIEMENT PAR FREELANCER (Annexe 2 contrats) ─────────────────

export interface FreelancerPaiement {
  freelancerId: string;
  role: string;                 // Rôle dans le projet (Media Buyer, Monteur, etc.)
  montantHT: number;
  tvaApplicable: boolean;
  tauxTva: number;              // 0, 5.5, 10, 20
  montantTTC: number;           // Calculé : HT + TVA
  echeanceConditions: string;   // "50% signature, 50% J+30", etc.
  iban: string;
}

// ─── CLIENT ───────────────────────────────────────────────────────────────────
export type ClientStatus = 'prospect' | 'actif' | 'inactif' | 'vip';
export type ClientSource = 'référence' | 'réseaux sociaux' | 'cold outreach' | 'partenariat' | 'autre';

export interface Client {
  id: string;
  nom: string;
  entreprise: string;
  email: string;
  telephone: string;
  adresse: string;
  statut: ClientStatus;
  source: ClientSource;
  tags: string[];
  notes: string;
  dateCreation: string;
  derniereActivite: string;
  chiffreAffaires: number;
  avatar?: string;
}

// ─── PROJECT ──────────────────────────────────────────────────────────────────
export type ProjectStatus = 'planification' | 'en cours' | 'en révision' | 'terminé' | 'en pause' | 'annulé';
export type ProjectPriority = 'faible' | 'normale' | 'haute' | 'urgente';

export interface Task {
  id: string;
  titre: string;
  description: string;
  statut: 'todo' | 'en cours' | 'fait';
  priorite: ProjectPriority;
  assigneA: string;
  assigneAIds?: string[];      // IDs des freelancers assignés (multi-assignation)
  dateEcheance: string;
  heuresEstimees: number;
  heuresReelles: number;
  tags: string[];
  notes: TaskNote[];
  subCategoryId?: string;      // lien vers une sous-catégorie du projet
}

export interface Milestone {
  id: string;
  titre: string;
  dateEcheance: string;
  complete: boolean;
}

export interface Project {
  id: string;
  nom: string;
  description: string;
  clientId: string;
  clientNom: string;
  statut: ProjectStatus;
  priorite: ProjectPriority;
  dateDebut: string;
  dateFin: string;
  budget: number;
  depenses: number;
  progression: number;
  taches: Task[];
  milestones: Milestone[];
  equipe: string[];            // noms libres (legacy)
  freelancerIds: string[];     // IDs des freelancers attachés (nouveau)
  tags: string[];
  categorie: string;
  activityLog: ProjectActivity[];
  objectives?: Objective[];    // objectifs du projet
  subCategories?: ProjectSubCategory[]; // sous-catégories
  livrables?: Livrable[];      // livrables attendus
  depensesProjet?: DepenseProjet[]; // dépenses enregistrées
}

// ─── INVOICE ──────────────────────────────────────────────────────────────────
export type InvoiceStatus = 'brouillon' | 'envoyée' | 'payée' | 'en retard' | 'annulée';

export interface InvoiceItem {
  id: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

export interface Invoice {
  id: string;
  numero: string;
  clientId: string;
  clientNom: string;
  projectId?: string;
  projectNom?: string;
  statut: InvoiceStatus;
  dateEmission: string;
  dateEcheance: string;
  datePaiement?: string;
  items: InvoiceItem[];
  sousTotal: number;
  tva: number;
  total: number;
  notes: string;
}

// ─── PAY TO SNOOZE ────────────────────────────────────────────────────────────
export type SnoozeStatus = 'actif' | 'en attente' | 'expiré' | 'annulé';
export type SnoozePlan = 'freemium' | 'premium_monthly' | 'premium_annual';
export type SnoozeCycle = 'free' | 'monthly' | 'annual';

/** Pénalité transférée — 5% de commission sur chaque pénalité */
export interface SnoozePenalite {
  id: string;
  date: string;
  montantPenalite: number;    // Montant total de la pénalité (ex: 200 $)
  commission: number;         // 5% du montantPenalite (ex: 10 $)
  statut: 'pending' | 'captured' | 'refunded';
  description: string;        // Ex: "Pénalité snooze lundi matin"
}

export interface SnoozeSubscription {
  id: string;
  utilisateur: string;
  email: string;
  plan: SnoozePlan;
  cycle: SnoozeCycle;
  statut: SnoozeStatus;
  dateDebut: string;
  dateRenouvellement: string;
  montantMensuel: number;     // 0 = freemium, 9.99 = monthly, 7.50 = annuel/mois
  snoozesUtilises: number;
  snoozesDisponibles: number; // 2 = freemium, illimité = premium
  penalites: SnoozePenalite[];
  historique: SnoozeEvent[];
  revenueCatId?: string;      // ID utilisateur RevenueCat
  plateforme?: 'ios' | 'android' | 'web';
  notes: string;
}

export interface SnoozeEvent {
  id: string;
  date: string;
  action: 'activation' | 'snooze' | 'réveil' | 'annulation' | 'renouvellement' | 'upgrade' | 'downgrade' | 'penalite';
  details: string;
  montant?: number;
}

// ─── TASK NOTES / SUIVI D'AVANCEMENT ─────────────────────────────────────────
export interface TaskNote {
  id: string;
  auteurId: string;
  auteurNom: string;
  texte: string;
  date: string;
  type: 'note' | 'statut_change' | 'temps_log';
  ancienStatut?: Task['statut'];
  nouveauStatut?: Task['statut'];
}

// ─── PROJECT ACTIVITY LOG ─────────────────────────────────────────────────────
export interface ProjectActivity {
  id: string;
  type: 'tache_cree' | 'tache_statut' | 'tache_note' | 'tache_temps' | 'projet_cree' | 'projet_statut' | 'milestone' | 'facture' | 'commentaire';
  auteurId: string;
  auteurNom: string;
  titre: string;
  description: string;
  date: string;
  taskId?: string;
  taskTitre?: string;
  metadata?: Record<string, unknown>;
}

// ─── ACTIVITY ─────────────────────────────────────────────────────────────────
export type ActivityType = 'client' | 'projet' | 'facture' | 'snooze' | 'système' | 'tache' | 'freelancer';

export interface Activity {
  id: string;
  type: ActivityType;
  titre: string;
  description: string;
  date: string;
  entityId?: string;
  entityNom?: string;
  icon?: string;
}

// ─── TAG UNIFIÉ ──────────────────────────────────────────────────────────────
export interface UnifiedTag {
  id: string;
  name: string;
  color: string; // tailwind-compatible hex, e.g. '#8b5cf6'
}

// ─── STATS ────────────────────────────────────────────────────────────────────
export interface MonthlyRevenue {
  mois: string;
  revenu: number;
  depenses: number;
  benefice: number;
}

export interface DashboardStats {
  totalClients: number;
  clientsActifs: number;
  clientsVIP: number;
  totalProjets: number;
  projetsEnCours: number;
  projetsTermines: number;
  chiffreAffairesMois: number;
  chiffreAffairesTotal: number;
  facturesEnAttente: number;
  facturesEnRetard: number;
  snoozesActifs: number;
  revenusSnooze: number;
}

// ─── STORE TYPES ──────────────────────────────────────────────────────────────
export interface CRMStore {
  // Data
  clients: Client[];
  freelancers: Freelancer[];
  projects: Project[];
  invoices: Invoice[];
  snoozeSubscriptions: SnoozeSubscription[];
  activities: Activity[];
  timerSessions: TimerSession[];
  workspaces: Workspace[];
  invitations: Invitation[];

  // Tags
  unifiedTags: UnifiedTag[];

  // Settings
  settings: AgencySettings;

  // UI State
  activeSection: string;
  sidebarOpen: boolean;
  searchQuery: string;
  notifications: Notification[];

  // Actions — Freelancers
  addFreelancer: (f: Omit<Freelancer, 'id' | 'dateCreation'>) => void;
  updateFreelancer: (id: string, updates: Partial<Freelancer>) => void;
  deleteFreelancer: (id: string) => void;

  // Actions — Clients
  addClient: (client: Omit<Client, 'id' | 'dateCreation' | 'derniereActivite'>) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // Actions — Projects
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addTask: (projectId: string, task: Omit<Task, 'id'>) => void;
  updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => void;
  deleteTask: (projectId: string, taskId: string) => void;
  addFreelancerToProject: (projectId: string, freelancerId: string) => void;
  removeFreelancerFromProject: (projectId: string, freelancerId: string) => void;

  // Actions — Invoices
  addInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;

  // Actions — Snooze
  addSnoozeSubscription: (sub: Omit<SnoozeSubscription, 'id'>) => void;
  updateSnoozeSubscription: (id: string, updates: Partial<SnoozeSubscription>) => void;
  deleteSnoozeSubscription: (id: string) => void;
  clearAllSnoozeSubscriptions: () => void;

  // Actions — Workspaces
  addWorkspace: (ws: Omit<Workspace, 'id' | 'dateCreation'>) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;

  // Actions — Invitations
  createInvitation: (inv: Omit<Invitation, 'id' | 'token' | 'dateCreation' | 'status'>) => Invitation;
  acceptInvitation: (token: string) => { success: boolean; error?: string };
  deleteInvitation: (id: string) => void;

  // Actions — Objectives
  addObjective: (projectId: string, obj: Omit<Objective, 'id' | 'dateCreation' | 'progression'>) => void;
  updateObjective: (projectId: string, objectiveId: string, updates: Partial<Objective>) => void;
  deleteObjective: (projectId: string, objectiveId: string) => void;

  // Actions — Project SubCategories
  addSubCategory: (projectId: string, sub: Omit<ProjectSubCategory, 'id'>) => void;
  updateSubCategory: (projectId: string, subId: string, updates: Partial<ProjectSubCategory>) => void;
  deleteSubCategory: (projectId: string, subId: string) => void;

  // Actions — Tags
  addUnifiedTag: (tag: Omit<UnifiedTag, 'id'>) => UnifiedTag;
  updateUnifiedTag: (id: string, updates: Partial<UnifiedTag>) => void;
  deleteUnifiedTag: (id: string) => void;

  // Actions — Settings
  updateSettings: (updates: Partial<AgencySettings>) => void;

  // Actions — Task Notes & Project Activity
  addTaskNote: (projectId: string, taskId: string, note: Omit<TaskNote, 'id'>) => void;
  addProjectActivity: (projectId: string, activity: Omit<ProjectActivity, 'id'>) => void;
  addNotification: (notif: Omit<Notification, 'id'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Actions — Timer
  addTimerSession: (session: Omit<TimerSession, 'id'>) => void;

  // Actions — UI
  setActiveSection: (section: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  addActivity: (activity: Omit<Activity, 'id'>) => void;

  // Auth
  users: UserAccount[];
  auditLogs: AuditLog[];
  currentUser: UserAccount | null;
  setupComplete: boolean;

  // Actions Auth
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  addUser: (user: Omit<UserAccount, 'id' | 'dateCreation'>) => void;
  updateUser: (id: string, updates: Partial<UserAccount>) => void;
  deleteUser: (id: string) => void;
  addAuditLog: (log: Omit<AuditLog, 'id'>) => void;
  completeSetup: (data: { agencyName: string; adminEmail: string; passwordHash: string }) => void;
}

export interface Notification {
  id: string;
  titre: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  lu: boolean;
  date: string;
  section?: string;
}

// ─── AGENCY SETTINGS ──────────────────────────────────────────────────────────
export interface AgencySettings {
  nom: string;
  adresse: string;
  siret: string;
  email: string;
  telephone: string;
  logoUrl: string;
  resendApiKey: string;
  resendFrom: string;
  stripeKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  revenueCatApiKey: string;
  revenueCatProjectId: string;
}

// ─── TIMER ────────────────────────────────────────────────────────────────────
export interface TimerSession {
  id: string;
  projectId: string;
  projectNom: string;
  taskId: string;
  taskTitre: string;
  dureeMinutes: number;
  date: string;
}

// ─── AUTH / COMPTES ────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'freelancer' | 'viewer';

export type SectionPermission =
  | 'dashboard' | 'clients' | 'freelancers' | 'projects'
  | 'worktracking' | 'invoices' | 'documents' | 'snooze'
  | 'analytics' | 'settings' | 'admin';

export interface UserAccount {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: UserRole;
  password?: string;           // @deprecated — utiliser passwordHash
  passwordHash: string;        // SHA-256 + sel via Web Crypto API
  permissions: SectionPermission[];
  freelancerId?: string;       // lien vers Freelancer si role === 'freelancer'
  isActive: boolean;
  dateCreation: string;
  derniereConnexion?: string;
  avatar?: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userNom: string;
  action: string;              // ex: 'login', 'logout', 'view_section', 'update_task', etc.
  section?: string;
  details?: string;
  date: string;
  ip?: string;
}

// ─── WORKSPACE / ESPACE ──────────────────────────────────────────────────────
export interface Workspace {
  id: string;
  nom: string;
  description: string;
  couleur: string;             // ex: '#7c3aed'
  createdBy: string;           // userId de l'admin qui l'a créé
  dateCreation: string;
  membres: WorkspaceMember[];
}

export interface WorkspaceMember {
  userId: string;
  role: 'owner' | 'member' | 'viewer';
  dateAjout: string;
}

// ─── INVITATION ──────────────────────────────────────────────────────────────
export interface Invitation {
  id: string;
  workspaceId: string;
  email: string;
  role: UserRole;
  token: string;               // token unique pour le lien d'invitation
  expiresAt: string;           // date d'expiration ISO
  status: 'pending' | 'accepted' | 'expired';
  createdBy: string;
  dateCreation: string;
  permissions: SectionPermission[];
}

// ─── OBJECTIF (dans un projet) ───────────────────────────────────────────────
export interface Objective {
  id: string;
  titre: string;
  description: string;
  statut: 'todo' | 'en cours' | 'fait';
  priorite: ProjectPriority;
  dateEcheance: string;
  assigneAIds: string[];       // IDs des freelancers assignés
  taskIds: string[];           // IDs des tâches liées
  progression: number;         // 0-100, calculé auto depuis les tâches
  dateCreation: string;
}

// ─── LIVRABLE (dans un projet) ──────────────────────────────────────────────
export type LivrableType = 'post' | 'vidéo' | 'story' | 'reel' | 'article' | 'carrousel' | 'podcast' | 'autre';
export type LivrableStatut = 'planifié' | 'en production' | 'en revue' | 'validé' | 'publié';

export interface Livrable {
  id: string;
  titre: string;
  type: LivrableType;
  plateforme: string;
  datePrevue: string;
  datePubliee?: string;
  statut: LivrableStatut;
  freelancerId?: string;
  description: string;
  lienExterne?: string;
}

// ─── DÉPENSE PROJET ─────────────────────────────────────────────────────────
export interface DepenseProjet {
  id: string;
  description: string;
  montant: number;
  date: string;
  categorie: string;
  freelancerId?: string;
}

// ─── SOUS-CATÉGORIE PROJET ───────────────────────────────────────────────────
export interface ProjectSubCategory {
  id: string;
  nom: string;
  description: string;
  couleur: string;
  ordre: number;
}

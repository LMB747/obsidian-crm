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
  dateEcheance: string;
  heuresEstimees: number;
  heuresReelles: number;
  tags: string[];
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
  equipe: string[];
  tags: string[];
  categorie: string;
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

// ─── ACTIVITY ─────────────────────────────────────────────────────────────────
export type ActivityType = 'client' | 'projet' | 'facture' | 'snooze' | 'système';

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

  // Actions — Invoices
  addInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;

  // Actions — Snooze
  addSnoozeSubscription: (sub: Omit<SnoozeSubscription, 'id'>) => void;
  updateSnoozeSubscription: (id: string, updates: Partial<SnoozeSubscription>) => void;

  // Actions — Settings
  updateSettings: (updates: Partial<AgencySettings>) => void;

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

  // Actions Auth
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  addUser: (user: Omit<UserAccount, 'id' | 'dateCreation'>) => void;
  updateUser: (id: string, updates: Partial<UserAccount>) => void;
  deleteUser: (id: string) => void;
  addAuditLog: (log: Omit<AuditLog, 'id'>) => void;
}

export interface Notification {
  id: string;
  titre: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  lu: boolean;
  date: string;
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
  password: string;            // stocké en clair (app locale, pas de backend)
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

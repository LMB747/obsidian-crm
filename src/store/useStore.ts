import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { CRMStore, Client, Freelancer, Project, Invoice, SnoozeSubscription, Activity, Task, AgencySettings, TimerSession, UserAccount, AuditLog } from '../types';
import { toast } from '../components/ui/Toast';
import {
  mockClients,
  mockFreelancers,
  mockProjects,
  mockInvoices,
  mockSnoozeSubscriptions,
  mockActivities,
} from '../data/mockData';

const adminAccount: UserAccount = {
  id: 'admin-001',
  email: 'admin@obsidian.agency',
  password: 'admin123',
  nom: 'Admin',
  prenom: 'Super',
  role: 'admin',
  permissions: ['dashboard','clients','freelancers','projects','worktracking','invoices','documents','snooze','analytics','settings','admin'],
  isActive: true,
  dateCreation: '2026-01-01',
};

const defaultSettings: AgencySettings = {
  nom: 'Obsidian Agency',
  adresse: '12 Rue des Créatifs, 75010 Paris',
  siret: '000 000 000 00000',
  email: 'contact@obsidian.agency',
  telephone: '+33 6 00 00 00 00',
  logoUrl: '',
  resendApiKey: '',
  resendFrom: 'Obsidian Agency <noreply@obsidian.agency>',
  stripeKey: '',
  supabaseUrl: '',
  supabaseKey: '',
  revenueCatApiKey: '',
  revenueCatProjectId: '',
};

export const useStore = create<CRMStore>()(
  persist(
    (set, get) => ({
      // ─── Initial Data ──────────────────────────────────────────────────────
      clients: mockClients,
      freelancers: mockFreelancers,
      projects: mockProjects,
      invoices: mockInvoices,
      snoozeSubscriptions: mockSnoozeSubscriptions,
      activities: mockActivities,
      timerSessions: [],
      users: [adminAccount],
      auditLogs: [],
      currentUser: null,

      // ─── Settings ──────────────────────────────────────────────────────────
      settings: defaultSettings,

      // ─── UI State ──────────────────────────────────────────────────────────
      activeSection: 'dashboard',
      sidebarOpen: true,
      searchQuery: '',
      notifications: [
        { id: 'n1', titre: 'Facture en retard', message: 'OA-2026-003 est en retard de paiement', type: 'warning', lu: false, date: '2026-03-22' },
        { id: 'n2', titre: 'Milestone atteint', message: 'Architecture validée sur Pay to Snooze V2', type: 'success', lu: false, date: '2026-03-20' },
        { id: 'n3', titre: 'Nouvel abonnement', message: 'Anaïs Dupuis a souscrit Enterprise', type: 'info', lu: false, date: '2026-03-22' },
      ],

      // ─── Client Actions ────────────────────────────────────────────────────
      addClient: (clientData) => {
        const newClient: Client = {
          ...clientData,
          id: uuidv4(),
          dateCreation: new Date().toISOString().split('T')[0],
          derniereActivite: new Date().toISOString().split('T')[0],
        };
        set((state) => ({ clients: [...state.clients, newClient] }));
        get().addActivity({
          type: 'client',
          titre: 'Nouveau client ajouté',
          description: `${newClient.nom} — ${newClient.entreprise}`,
          date: new Date().toISOString(),
          entityId: newClient.id,
          entityNom: newClient.nom,
        });
        toast.success('Client ajouté', `${newClient.nom} — ${newClient.entreprise}`);
      },

      updateClient: (id, updates) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, ...updates, derniereActivite: new Date().toISOString().split('T')[0] } : c
          ),
        }));
      },

      deleteClient: (id) => {
        set((state) => ({ clients: state.clients.filter((c) => c.id !== id) }));
        toast.warning('Client supprimé');
      },

      // ─── Freelancer Actions ────────────────────────────────────────────────────
      addFreelancer: (freelancerData) => {
        const newFreelancer: Freelancer = {
          ...freelancerData,
          id: uuidv4(),
          dateCreation: new Date().toISOString().split('T')[0],
        };
        set((state) => ({ freelancers: [...state.freelancers, newFreelancer] }));
        get().addActivity({
          type: 'client',
          titre: 'Nouveau prestataire ajouté',
          description: `${newFreelancer.prenom} ${newFreelancer.nom} — ${newFreelancer.entreprise}`,
          date: new Date().toISOString(),
          entityId: newFreelancer.id,
          entityNom: `${newFreelancer.prenom} ${newFreelancer.nom}`,
        });
        toast.success('Prestataire ajouté', `${newFreelancer.prenom} ${newFreelancer.nom} — ${newFreelancer.entreprise}`);
      },

      updateFreelancer: (id, updates) => {
        set((state) => ({
          freelancers: state.freelancers.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        }));
      },

      deleteFreelancer: (id) => {
        set((state) => ({ freelancers: state.freelancers.filter((f) => f.id !== id) }));
        toast.warning('Prestataire supprimé');
      },

      // ─── Project Actions ───────────────────────────────────────────────────
      addProject: (projectData) => {
        const newProject: Project = { ...projectData, id: uuidv4() };
        set((state) => ({ projects: [...state.projects, newProject] }));
        get().addActivity({
          type: 'projet',
          titre: 'Nouveau projet créé',
          description: `${newProject.nom} — ${newProject.clientNom}`,
          date: new Date().toISOString(),
          entityId: newProject.id,
          entityNom: newProject.nom,
        });
        toast.success('Projet créé', newProject.nom);
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
      },

      deleteProject: (id) => {
        set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
        toast.warning('Projet supprimé');
      },

      addTask: (projectId, taskData) => {
        const newTask: Task = { ...taskData, id: uuidv4() };
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, taches: [...p.taches, newTask] } : p
          ),
        }));
      },

      updateTask: (projectId, taskId, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, taches: p.taches.map((t) => (t.id === taskId ? { ...t, ...updates } : t)) }
              : p
          ),
        }));
      },

      deleteTask: (projectId, taskId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, taches: p.taches.filter((t) => t.id !== taskId) } : p
          ),
        }));
      },

      // ─── Invoice Actions ───────────────────────────────────────────────────
      addInvoice: (invoiceData) => {
        const newInvoice: Invoice = { ...invoiceData, id: uuidv4() };
        set((state) => ({ invoices: [...state.invoices, newInvoice] }));
        toast.success('Facture créée', newInvoice.numero);
      },

      updateInvoice: (id, updates) => {
        // Check if status is transitioning to 'payée'
        if (updates.statut === 'payée') {
          const current = get().invoices.find((i) => i.id === id);
          if (current && current.statut !== 'payée') {
            toast.success('Facture payée ✓', `${current.numero} — ${current.total.toLocaleString('fr-FR')} €`);
          }
        }
        set((state) => ({
          invoices: state.invoices.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        }));
      },

      deleteInvoice: (id) => {
        set((state) => ({ invoices: state.invoices.filter((i) => i.id !== id) }));
      },

      // ─── Snooze Actions ────────────────────────────────────────────────────
      addSnoozeSubscription: (subData) => {
        const newSub: SnoozeSubscription = { ...subData, id: uuidv4() };
        set((state) => ({ snoozeSubscriptions: [...state.snoozeSubscriptions, newSub] }));
        get().addActivity({
          type: 'snooze',
          titre: 'Nouvel abonnement Pay to Snooze',
          description: `${newSub.utilisateur} — Plan ${newSub.plan}`,
          date: new Date().toISOString(),
          entityId: newSub.id,
          entityNom: newSub.utilisateur,
        });
      },

      updateSnoozeSubscription: (id, updates) => {
        set((state) => ({
          snoozeSubscriptions: state.snoozeSubscriptions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }));
      },

      // ─── Settings Actions ──────────────────────────────────────────────────
      updateSettings: (updates) => {
        set((state) => ({ settings: { ...state.settings, ...updates } }));
      },

      // ─── Timer Actions ─────────────────────────────────────────────────────
      addTimerSession: (sessionData) => {
        const session: TimerSession = { ...sessionData, id: uuidv4() };
        set((state) => ({
          timerSessions: [session, ...state.timerSessions].slice(0, 200),
        }));
        // Auto-update task heuresReelles
        const { projectId, taskId, dureeMinutes } = sessionData;
        if (projectId && taskId) {
          const addedHours = Math.round((dureeMinutes / 60) * 10) / 10;
          get().updateTask(projectId, taskId, {
            heuresReelles: Math.round(
              ((get().projects.find(p => p.id === projectId)?.taches.find(t => t.id === taskId)?.heuresReelles || 0) + addedHours) * 10
            ) / 10,
          });
        }
        get().addActivity({
          type: 'projet',
          titre: 'Session de travail enregistrée',
          description: `${sessionData.taskTitre} — ${sessionData.projectNom} (${sessionData.dureeMinutes} min)`,
          date: new Date().toISOString(),
          entityId: sessionData.projectId,
          entityNom: sessionData.projectNom,
        });
        toast.info('Session enregistrée', `${sessionData.dureeMinutes} min`);
      },

      // ─── Auth Actions ──────────────────────────────────────────────────────
      login: (email, password) => {
        const users = get().users;
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (!user) return { success: false, error: 'Email ou mot de passe incorrect.' };
        if (!user.isActive) return { success: false, error: 'Ce compte est désactivé.' };
        const updated = { ...user, derniereConnexion: new Date().toISOString() };
        set(state => ({ currentUser: updated, users: state.users.map(u => u.id === user.id ? updated : u) }));
        get().addAuditLog({ userId: user.id, userNom: `${user.prenom} ${user.nom}`, action: 'login', details: 'Connexion réussie', date: new Date().toISOString() });
        toast.success('Bienvenue', `${user.prenom} ${user.nom}`);
        return { success: true };
      },

      logout: () => {
        const user = get().currentUser;
        if (user) get().addAuditLog({ userId: user.id, userNom: `${user.prenom} ${user.nom}`, action: 'logout', details: 'Déconnexion', date: new Date().toISOString() });
        set({ currentUser: null });
      },

      addUser: (userData) => {
        const newUser: UserAccount = { ...userData, id: uuidv4(), dateCreation: new Date().toISOString().split('T')[0] };
        set(state => ({ users: [...state.users, newUser] }));
      },

      updateUser: (id, updates) => {
        set(state => ({ users: state.users.map(u => u.id === id ? { ...u, ...updates } : u) }));
      },

      deleteUser: (id) => {
        set(state => ({ users: state.users.filter(u => u.id !== id) }));
      },

      addAuditLog: (logData) => {
        const log: AuditLog = { ...logData, id: uuidv4() };
        set(state => ({ auditLogs: [log, ...state.auditLogs].slice(0, 500) }));
      },

      // ─── UI Actions ────────────────────────────────────────────────────────
      setActiveSection: (section) => set({ activeSection: section }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      addActivity: (activityData) => {
        const newActivity: Activity = { ...activityData, id: uuidv4() };
        set((state) => ({
          activities: [newActivity, ...state.activities].slice(0, 50),
        }));
      },
    }),
    {
      name: 'obsidian-crm-storage',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        // v1→v2 : migrate old SnoozePlan names + add missing fields
        if (version < 2 && persistedState?.snoozeSubscriptions) {
          const planMap: Record<string, string> = {
            starter: 'premium_monthly',
            pro: 'premium_monthly',
            business: 'premium_annual',
            enterprise: 'premium_annual',
          };
          persistedState.snoozeSubscriptions = persistedState.snoozeSubscriptions.map((s: any) => ({
            ...s,
            plan: planMap[s.plan] ?? s.plan,
            statut: s.statut === 'complété' ? 'expiré' : (s.statut ?? 'actif'),
            cycle: s.cycle ?? (s.plan === 'premium_annual' || s.plan === 'business' || s.plan === 'enterprise' ? 'annual' : s.plan === 'freemium' ? 'free' : 'monthly'),
            penalites: s.penalites ?? [],
            revenueCatId: s.revenueCatId ?? undefined,
            plateforme: s.plateforme ?? 'web',
          }));
        }
        return persistedState;
      },
      partialize: (state) => ({
        clients: state.clients,
        freelancers: state.freelancers,
        projects: state.projects,
        invoices: state.invoices,
        snoozeSubscriptions: state.snoozeSubscriptions,
        activities: state.activities,
        timerSessions: state.timerSessions,
        settings: state.settings,
        users: state.users,
        auditLogs: state.auditLogs,
        currentUser: state.currentUser,
      }),
    }
  )
);

// ─── Computed Selectors ─────────────────────────────────────────────────────
export const selectDashboardStats = (state: CRMStore) => {
  const totalCA = state.clients.reduce((sum, c) => sum + c.chiffreAffaires, 0);
  const caFactures = state.invoices
    .filter((i) => i.statut === 'payée')
    .reduce((sum, i) => sum + i.total, 0);
  const enAttente = state.invoices
    .filter((i) => i.statut === 'envoyée')
    .reduce((sum, i) => sum + i.total, 0);

  return {
    totalClients: state.clients.length,
    clientsActifs: state.clients.filter((c) => c.statut === 'actif').length,
    clientsVIP: state.clients.filter((c) => c.statut === 'vip').length,
    totalProjets: state.projects.length,
    projetsEnCours: state.projects.filter((p) => p.statut === 'en cours').length,
    projetsTermines: state.projects.filter((p) => p.statut === 'terminé').length,
    chiffreAffairesMois: (() => {
      const m = new Date().toISOString().slice(0, 7);
      return state.invoices
        .filter(i => i.statut === 'payée' && (i.datePaiement ?? i.dateEmission).startsWith(m))
        .reduce((s, i) => s + i.total, 0);
    })(),
    chiffreAffairesTotal: totalCA,
    facturesEnAttente: enAttente,
    facturesEnRetard: state.invoices.filter((i) => i.statut === 'en retard').reduce((s, i) => s + i.total, 0),
    snoozesActifs: state.snoozeSubscriptions.filter((s) => s.statut === 'actif').length,
    revenusSnooze: state.snoozeSubscriptions
      .filter((s) => s.statut === 'actif')
      .reduce((sum, s) => sum + s.montantMensuel, 0),
  };
};

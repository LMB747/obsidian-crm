import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { CRMStore, Client, Freelancer, Project, Invoice, SnoozeSubscription, Activity, Task, AgencySettings, TimerSession, UserAccount, AuditLog, TaskNote, ProjectActivity, Notification } from '../types';
import { toast } from '../components/ui/Toast';
import { verifyPassword } from '../utils/crypto';
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
  email: '',
  passwordHash: '',
  nom: 'Admin',
  prenom: 'Super',
  role: 'admin',
  permissions: ['dashboard','clients','freelancers','projects','worktracking','invoices','documents','snooze','analytics','settings','admin'],
  isActive: true,
  dateCreation: '2026-01-01',
};

const defaultSettings: AgencySettings = {
  nom: '',
  adresse: '',
  siret: '',
  email: '',
  telephone: '',
  logoUrl: '',
  resendApiKey: '',
  resendFrom: '',
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
      setupComplete: false,

      // ─── Settings ──────────────────────────────────────────────────────────
      settings: defaultSettings,

      // ─── UI State ──────────────────────────────────────────────────────────
      activeSection: 'dashboard',
      sidebarOpen: true,
      searchQuery: '',
      notifications: [],

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
        const newProject: Project = { ...projectData, id: uuidv4(), activityLog: [], freelancerIds: projectData.freelancerIds || [] };
        const currentUser = get().currentUser;
        set((state) => ({ projects: [...state.projects, newProject] }));
        get().addActivity({
          type: 'projet',
          titre: 'Nouveau projet créé',
          description: `${newProject.nom} — ${newProject.clientNom}`,
          date: new Date().toISOString(),
          entityId: newProject.id,
          entityNom: newProject.nom,
        });
        get().addProjectActivity(newProject.id, {
          type: 'projet_cree',
          auteurId: currentUser?.id || 'system',
          auteurNom: currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Admin',
          titre: 'Projet créé',
          description: `Budget : ${newProject.budget.toLocaleString('fr-FR')} € — Client : ${newProject.clientNom}`,
          date: new Date().toISOString(),
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
        const newTask: Task = { ...taskData, id: uuidv4(), notes: taskData.notes || [] };
        const currentUser = get().currentUser;
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, taches: [...p.taches, newTask] } : p
          ),
        }));
        const project = get().projects.find(p => p.id === projectId);
        get().addProjectActivity(projectId, {
          type: 'tache_cree',
          auteurId: currentUser?.id || 'system',
          auteurNom: currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Admin',
          titre: 'Nouvelle tâche créée',
          description: `"${newTask.titre}" assignée à ${newTask.assigneA || 'personne'}`,
          date: new Date().toISOString(),
          taskId: newTask.id,
          taskTitre: newTask.titre,
        });
        if (newTask.assigneA) {
          get().addNotification({
            titre: 'Nouvelle tâche assignée',
            message: `"${newTask.titre}" dans ${project?.nom || 'un projet'} a été assignée à ${newTask.assigneA}`,
            type: 'info',
            lu: false,
            date: new Date().toISOString(),
          });
        }
      },

      updateTask: (projectId, taskId, updates) => {
        const prevProject = get().projects.find(p => p.id === projectId);
        const prevTask = prevProject?.taches.find(t => t.id === taskId);
        const currentUser = get().currentUser;

        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            const updatedTaches = p.taches.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
            // Auto-calcul progression
            const total = updatedTaches.length;
            const done = updatedTaches.filter(t => t.statut === 'fait').length;
            const progression = total > 0 ? Math.round((done / total) * 100) : p.progression;
            return { ...p, taches: updatedTaches, progression };
          }),
        }));

        // Notification si changement de statut
        if (updates.statut && prevTask && updates.statut !== prevTask.statut) {
          const taskName = prevTask.titre;
          const authorName = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système';
          const authorId = currentUser?.id || 'system';

          const statusLabels: Record<string, string> = { 'todo': 'À faire', 'en cours': 'En cours', 'fait': 'Terminé' };
          const isFreelancer = currentUser?.role === 'freelancer';

          // Notif pour l'admin si c'est un freelancer qui change
          if (isFreelancer) {
            get().addNotification({
              titre: `Tâche mise à jour`,
              message: `${authorName} → "${taskName}" est maintenant "${statusLabels[updates.statut]}"`,
              type: updates.statut === 'fait' ? 'success' : 'info',
              lu: false,
              date: new Date().toISOString(),
            });
          }

          // Activity log du projet
          get().addProjectActivity(projectId, {
            type: 'tache_statut',
            auteurId: authorId,
            auteurNom: authorName,
            titre: `Statut modifié`,
            description: `"${taskName}" : ${statusLabels[prevTask.statut] || prevTask.statut} → ${statusLabels[updates.statut] || updates.statut}`,
            date: new Date().toISOString(),
            taskId,
            taskTitre: taskName,
            metadata: { ancienStatut: prevTask.statut, nouveauStatut: updates.statut },
          });

          // Activité globale
          get().addActivity({
            type: 'tache',
            titre: `Tâche ${updates.statut === 'fait' ? 'terminée' : 'mise à jour'}`,
            description: `"${taskName}" dans ${prevProject?.nom || 'projet'}`,
            date: new Date().toISOString(),
            entityId: projectId,
            entityNom: prevProject?.nom,
          });

          // Si projet à 100%, notifier
          const project = get().projects.find(p => p.id === projectId);
          if (project && project.progression === 100 && updates.statut === 'fait') {
            get().addNotification({
              titre: '🎉 Projet terminé !',
              message: `Toutes les tâches de "${project.nom}" sont complètes. Pensez à créer la facture finale.`,
              type: 'success',
              lu: false,
              date: new Date().toISOString(),
            });
          }
        }
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
        // Lier au projet si payée
        if (updates.statut === 'payée') {
          const inv = get().invoices.find(i => i.id === id);
          if (inv?.projectId) {
            get().addProjectActivity(inv.projectId, {
              type: 'facture',
              auteurId: get().currentUser?.id || 'system',
              auteurNom: get().currentUser ? `${get().currentUser!.prenom} ${get().currentUser!.nom}` : 'Admin',
              titre: 'Facture payée',
              description: `Facture ${inv.numero} — ${inv.total.toLocaleString('fr-FR')} €`,
              date: new Date().toISOString(),
              metadata: { invoiceId: id, amount: inv.total },
            });
          }
          get().addActivity({
            type: 'facture',
            titre: 'Paiement reçu',
            description: `${get().invoices.find(i => i.id === id)?.numero} — payée`,
            date: new Date().toISOString(),
            entityId: id,
          });
        }
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

      deleteSnoozeSubscription: (id) => {
        set((state) => ({ snoozeSubscriptions: state.snoozeSubscriptions.filter((s) => s.id !== id) }));
        toast.warning('Abonnement supprimé');
      },

      clearAllSnoozeSubscriptions: () => {
        set({ snoozeSubscriptions: [] });
        toast.warning('Tous les abonnements supprimés');
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
        get().addProjectActivity(sessionData.projectId, {
          type: 'tache_temps',
          auteurId: get().currentUser?.id || 'system',
          auteurNom: get().currentUser ? `${get().currentUser!.prenom} ${get().currentUser!.nom}` : 'Système',
          titre: 'Temps enregistré',
          description: `${sessionData.dureeMinutes} min sur "${sessionData.taskTitre}"`,
          date: new Date().toISOString(),
          taskId: sessionData.taskId,
          taskTitre: sessionData.taskTitre,
          metadata: { dureeMinutes: sessionData.dureeMinutes },
        });
        toast.info('Session enregistrée', `${sessionData.dureeMinutes} min`);
      },

      // ─── Auth Actions ──────────────────────────────────────────────────────
      login: async (email, password) => {
        const users = get().users;
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) return { success: false, error: 'Email ou mot de passe incorrect.' };
        if (!user.isActive) return { success: false, error: 'Ce compte est désactivé.' };
        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return { success: false, error: 'Email ou mot de passe incorrect.' };
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

      addTaskNote: (projectId, taskId, noteData) => {
        const newNote: TaskNote = { ...noteData, id: uuidv4() };
        const project = get().projects.find(p => p.id === projectId);
        const task = project?.taches.find(t => t.id === taskId);

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  taches: p.taches.map((t) =>
                    t.id === taskId
                      ? { ...t, notes: [...(t.notes || []), newNote] }
                      : t
                  ),
                }
              : p
          ),
        }));

        // Activity log projet
        get().addProjectActivity(projectId, {
          type: 'tache_note',
          auteurId: noteData.auteurId,
          auteurNom: noteData.auteurNom,
          titre: 'Note d\'avancement',
          description: `${noteData.auteurNom} sur "${task?.titre || 'tâche'}" : ${noteData.texte.slice(0, 80)}${noteData.texte.length > 80 ? '…' : ''}`,
          date: new Date().toISOString(),
          taskId,
          taskTitre: task?.titre,
        });

        // Notification admin
        const currentUser = get().currentUser;
        if (currentUser?.role === 'freelancer') {
          get().addNotification({
            titre: 'Nouvelle note d\'avancement',
            message: `${noteData.auteurNom} a commenté la tâche "${task?.titre}" dans "${project?.nom}"`,
            type: 'info',
            lu: false,
            date: new Date().toISOString(),
          });
        }

        get().addActivity({
          type: 'tache',
          titre: 'Note d\'avancement ajoutée',
          description: `${noteData.auteurNom} — "${task?.titre}"`,
          date: new Date().toISOString(),
          entityId: projectId,
          entityNom: project?.nom,
        });
      },

      addProjectActivity: (projectId, activityData) => {
        const newActivity: ProjectActivity = { ...activityData, id: uuidv4() };
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, activityLog: [newActivity, ...(p.activityLog || [])].slice(0, 100) }
              : p
          ),
        }));
      },

      addNotification: (notifData) => {
        const notif: Notification = { ...notifData, id: uuidv4() };
        set((state) => ({
          notifications: [notif, ...state.notifications].slice(0, 50),
        }));
      },

      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map(n => n.id === id ? { ...n, lu: true } : n),
        }));
      },

      markAllNotificationsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, lu: true })),
        }));
      },

      addFreelancerToProject: (projectId, freelancerId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, freelancerIds: [...new Set([...(p.freelancerIds || []), freelancerId])] }
              : p
          ),
        }));
        const project = get().projects.find(p => p.id === projectId);
        const freelancer = get().freelancers.find(f => f.id === freelancerId);
        if (project && freelancer) {
          get().addProjectActivity(projectId, {
            type: 'commentaire',
            auteurId: get().currentUser?.id || 'system',
            auteurNom: get().currentUser ? `${get().currentUser!.prenom} ${get().currentUser!.nom}` : 'Admin',
            titre: 'Prestataire ajouté',
            description: `${freelancer.prenom} ${freelancer.nom} (${freelancer.specialite}) a rejoint le projet`,
            date: new Date().toISOString(),
          });
          get().addNotification({
            titre: 'Prestataire ajouté au projet',
            message: `${freelancer.prenom} ${freelancer.nom} a été attaché à "${project.nom}"`,
            type: 'info',
            lu: false,
            date: new Date().toISOString(),
          });
        }
      },

      removeFreelancerFromProject: (projectId, freelancerId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, freelancerIds: (p.freelancerIds || []).filter(id => id !== freelancerId) }
              : p
          ),
        }));
      },

      completeSetup: ({ agencyName, adminEmail, passwordHash }) => {
        set((state) => ({
          setupComplete: true,
          settings: { ...state.settings, nom: agencyName, email: adminEmail },
          users: state.users.map((u) =>
            u.id === 'admin-001'
              ? { ...u, email: adminEmail, passwordHash }
              : u
          ),
        }));
      },
    }),
    {
      name: 'obsidian-crm-v5',
      version: 5,
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
        setupComplete: state.setupComplete,
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

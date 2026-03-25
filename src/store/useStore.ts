import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { CRMStore, Client, Freelancer, Project, Invoice, SnoozeSubscription, Activity, Task, AgencySettings, TimerSession, UserAccount, AuditLog, TaskNote, ProjectActivity, Notification, Workspace, Invitation, Objective, ProjectSubCategory, UnifiedTag, PersonalTask, PersonalNote, ClientPortalAccess, ProjectTemplate, Devis, EmailSequence, SequenceEnrollment, SequenceStep, ProjectAction } from '../types';
import { toast } from '../components/ui/Toast';
import { verifyPassword } from '../utils/crypto';
import * as supaService from '../lib/supabaseService';
import { loadAllFromSupabase, saveAllToSupabase, deleteFromSupabase, ENTITY_TABLE_MAP } from '../lib/supabaseDataSync';

// Set global d'IDs récemment supprimés — empêche loadFromSupabase de les restaurer
const recentlyDeleted = new Set<string>();
function markDeleted(id: string) {
  recentlyDeleted.add(id);
  // Nettoyer après 30s (la sync aura eu le temps de se faire)
  setTimeout(() => recentlyDeleted.delete(id), 30000);
}
/** Supprimer immédiatement d'une table Supabase (pas de debounce) */
function deleteFromSupabaseNow(table: string, id: string) {
  markDeleted(id);
  deleteFromSupabase(table, id).catch(() => {});
}
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
  permissions: ['dashboard','clients','freelancers','projects','worktracking','invoices','documents','snooze','calendar','analytics','media-buying','prospection','personal','settings','admin'],
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
      // ─── Initial Data (mocks en dev uniquement) ───────────────────────────
      clients: import.meta.env.DEV ? mockClients : [],
      freelancers: import.meta.env.DEV ? mockFreelancers : [],
      projects: import.meta.env.DEV ? mockProjects : [],
      invoices: import.meta.env.DEV ? mockInvoices : [],
      snoozeSubscriptions: import.meta.env.DEV ? mockSnoozeSubscriptions : [],
      activities: import.meta.env.DEV ? mockActivities : [],
      timerSessions: [],
      workspaces: [],
      invitations: [],
      users: [adminAccount],
      auditLogs: [],
      currentUser: null,
      setupComplete: false,
      personalTasks: [],
      personalNotes: [],
      clientPortalAccesses: [],
      projectTemplates: [],
      devis: [],
      emailSequences: [],
      sequenceEnrollments: [],

      // ─── Audit helper (private) ──────────────────────────────────────────
      _audit: (action: string, section?: string, details?: string) => {
        const cu = get().currentUser;
        const log: Omit<AuditLog, 'id'> = {
          userId: cu?.id || 'system',
          userNom: cu ? `${cu.prenom} ${cu.nom}`.trim() : 'Système',
          action,
          section,
          details,
          date: new Date().toISOString(),
        };
        get().addAuditLog(log);
        // Sync to Supabase (fire-and-forget)
        supaService.syncAuditLog({ ...log, id: '' });
      },

      // ─── Supabase CRM Data Sync ──────────────────────────────────────────
      loadFromSupabase: async () => {
        const data = await loadAllFromSupabase();
        if (!data) return;

        // Filtrer les items récemment supprimés (empêche la restauration)
        const filterDeleted = (arr: any[]) => arr.filter(item => !recentlyDeleted.has(item.id));

        // Dédupliquer les freelancers par email
        const dedup = (arr: any[]) => {
          const seen = new Set<string>();
          return arr.filter(item => {
            const key = item.email?.toLowerCase() || item.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        };

        set(state => {
          // Supabase = source de vérité. Un tableau vide = "tout supprimé", pas "pas de données".
          return {
            clients: filterDeleted(data.clients),
            freelancers: dedup(filterDeleted(data.freelancers)),
            projects: filterDeleted(data.projects),
            invoices: filterDeleted(data.invoices),
            devis: filterDeleted(data.devis),
            snoozeSubscriptions: filterDeleted(data.snoozeSubscriptions),
            settings: data.settings || state.settings,
            unifiedTags: filterDeleted(data.unifiedTags),
            projectTemplates: filterDeleted(data.projectTemplates),
            clientPortalAccesses: filterDeleted(data.clientPortalAccesses),
            emailSequences: filterDeleted(data.emailSequences),
            sequenceEnrollments: filterDeleted(data.sequenceEnrollments),
          };
        });
      },

      // ─── Tags unifiés ─────────────────────────────────────────────────────
      unifiedTags: [
        { id: 'tag-vip',        name: 'VIP',         color: '#f59e0b' },
        { id: 'tag-urgent',     name: 'Urgent',      color: '#ef4444' },
        { id: 'tag-design',     name: 'Design',      color: '#ec4899' },
        { id: 'tag-dev',        name: 'Développement', color: '#3b82f6' },
        { id: 'tag-marketing',  name: 'Marketing',   color: '#10b981' },
        { id: 'tag-seo',        name: 'SEO',         color: '#8b5cf6' },
        { id: 'tag-social',     name: 'Social Media', color: '#06b6d4' },
        { id: 'tag-video',      name: 'Vidéo',       color: '#f97316' },
      ] as UnifiedTag[],

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
        get()._audit('create_client', 'clients', `${newClient.nom} — ${newClient.entreprise}`);
      },

      updateClient: (id, updates) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, ...updates, derniereActivite: new Date().toISOString().split('T')[0] } : c
          ),
        }));
        // Sync clientNom in projects and invoices if nom changed
        if (updates.nom) {
          const newNom = updates.nom;
          set((state) => ({
            projects: state.projects.map(p => p.clientId === id ? { ...p, clientNom: newNom } : p),
            invoices: state.invoices.map(i => i.clientId === id ? { ...i, clientNom: newNom } : i),
          }));
        }
      },

      deleteClient: (id) => {
        const client = get().clients.find(c => c.id === id);
        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id),
          projects: state.projects.map(p => p.clientId === id ? { ...p, clientId: '', clientNom: `${p.clientNom} (supprimé)` } : p),
          invoices: state.invoices.map(i => i.clientId === id ? { ...i, clientId: '', clientNom: `${i.clientNom} (supprimé)` } : i),
        }));
        deleteFromSupabaseNow('crm_clients', id);
        toast.warning('Client supprimé', 'Les projets et factures liés ont été mis à jour.');
        get()._audit('delete_client', 'clients', client?.nom || id);
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
          type: 'freelancer',
          titre: 'Nouveau prestataire ajouté',
          description: `${newFreelancer.prenom} ${newFreelancer.nom} — ${newFreelancer.entreprise}`,
          date: new Date().toISOString(),
          entityId: newFreelancer.id,
          entityNom: `${newFreelancer.prenom} ${newFreelancer.nom}`,
        });
        toast.success('Prestataire ajouté', `${newFreelancer.prenom} ${newFreelancer.nom} — ${newFreelancer.entreprise}`);
        get()._audit('create_freelancer', 'freelancers', `${newFreelancer.prenom} ${newFreelancer.nom}`);
      },

      updateFreelancer: (id, updates) => {
        set((state) => ({
          freelancers: state.freelancers.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        }));
      },

      deleteFreelancer: (id) => {
        const fl = get().freelancers.find(f => f.id === id);
        const flName = fl ? `${fl.prenom} ${fl.nom}`.trim() : '';
        // Cascade: remove from project teams + unassign tasks
        set((state) => ({
          freelancers: state.freelancers.filter((f) => f.id !== id),
          projects: state.projects.map(p => ({
            ...p,
            freelancerIds: p.freelancerIds.filter(fid => fid !== id),
            equipe: flName ? p.equipe.filter(e => e !== flName) : p.equipe,
            taches: p.taches.map(t => ({
              ...t,
              assigneA: t.assigneA === flName ? '' : t.assigneA,
              assigneAIds: (t.assigneAIds || []).filter(aid => aid !== id),
            })),
          })),
        }));
        deleteFromSupabaseNow('crm_freelancers', id);
        toast.warning('Prestataire supprimé', 'Ses assignations ont été retirées.');
        get()._audit('delete_freelancer', 'freelancers', fl ? `${fl.prenom} ${fl.nom}` : id);
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
          auteurNom: currentUser ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() || currentUser.email : 'Admin',
          titre: 'Projet créé',
          description: `Budget : ${newProject.budget.toLocaleString('fr-FR')} € — Client : ${newProject.clientNom}`,
          date: new Date().toISOString(),
        });
        toast.success('Projet créé', newProject.nom);
        get()._audit('create_project', 'projects', `${newProject.nom} — ${newProject.clientNom}`);
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
      },

      deleteProject: (id) => {
        const proj = get().projects.find(p => p.id === id);
        // Cascade: unlink invoices from this project
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          invoices: state.invoices.map(i => i.projectId === id ? { ...i, projectId: undefined, projectNom: `${i.projectNom || ''} (supprimé)` } : i),
        }));
        deleteFromSupabaseNow('crm_projects', id);
        toast.warning('Projet supprimé', 'Les factures liées ont été délinkées.');
        get()._audit('delete_project', 'projects', proj?.nom || id);
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
          auteurNom: currentUser ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() || currentUser.email : 'Admin',
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
            section: 'projects',
          });
        }
      },

      updateTask: (projectId, taskId, updates) => {
        const prevProject = get().projects.find(p => p.id === projectId);
        const prevTask = prevProject?.taches.find(t => t.id === taskId);
        const currentUser = get().currentUser;

        // Pre-calculate progression before set() to avoid stale state reads
        const prevTaches = prevProject?.taches || [];
        const simulatedTaches = prevTaches.map(t => t.id === taskId ? { ...t, ...updates } : t);
        const totalTasks = simulatedTaches.length;
        const doneTasks = simulatedTaches.filter(t => t.statut === 'fait').length;
        const newProgression = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            const updatedTaches = p.taches.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
            return { ...p, taches: updatedTaches, progression: newProgression };
          }),
        }));

        // Notification si changement de statut
        if (updates.statut && prevTask && updates.statut !== prevTask.statut) {
          const taskName = prevTask.titre;
          const authorName = currentUser ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() || currentUser.email : 'Système';
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
              section: 'projects',
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

          // Si projet à 100%, notifier (use pre-calculated value, not stale state)
          if (newProgression === 100 && updates.statut === 'fait') {
            get().addNotification({
              titre: 'Projet terminé !',
              message: `Toutes les tâches de "${prevProject?.nom || 'projet'}" sont complètes. Pensez à créer la facture finale.`,
              type: 'success',
              lu: false,
              date: new Date().toISOString(),
              section: 'projects',
            });
          }
        }
      },

      deleteTask: (projectId, taskId) => {
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            const updatedTaches = p.taches.filter((t) => t.id !== taskId);
            const total = updatedTaches.length;
            const done = updatedTaches.filter(t => t.statut === 'fait').length;
            const progression = total > 0 ? Math.round((done / total) * 100) : 0;
            return { ...p, taches: updatedTaches, progression };
          }),
        }));
      },

      // ─── Livrable Actions ────────────────────────────────────────────────
      addLivrable: (projectId: string, livrable: any) => {
        const newLivrable = { ...livrable, id: uuidv4() };
        set(state => ({
          projects: state.projects.map(p => p.id === projectId
            ? { ...p, livrables: [...(p.livrables || []), newLivrable] }
            : p),
        }));
        get()._audit('create_livrable', 'projects', `${newLivrable.titre} dans ${get().projects.find(p => p.id === projectId)?.nom}`);
      },
      updateLivrable: (projectId: string, livrableId: string, updates: any) => {
        set(state => ({
          projects: state.projects.map(p => p.id === projectId
            ? { ...p, livrables: (p.livrables || []).map(l => l.id === livrableId ? { ...l, ...updates } : l) }
            : p),
        }));
      },
      deleteLivrable: (projectId: string, livrableId: string) => {
        set(state => ({
          projects: state.projects.map(p => p.id === projectId
            ? { ...p, livrables: (p.livrables || []).filter(l => l.id !== livrableId) }
            : p),
        }));
        get()._audit('delete_livrable', 'projects', `Livrable supprimé du projet`);
      },

      // ─── Lien d'avancement Actions ────────────────────────────────────────
      addLienAvancement: (projectId: string, lien: any) => {
        const newLien = { ...lien, id: uuidv4(), dateAjout: new Date().toISOString(), projectId };
        set(state => ({
          projects: state.projects.map(p => p.id === projectId
            ? { ...p, liensAvancement: [...(p.liensAvancement || []), newLien] }
            : p),
        }));
        get()._audit('create_lien_avancement', 'projects', `${newLien.titre} dans ${get().projects.find(p => p.id === projectId)?.nom}`);
      },
      updateLienAvancement: (projectId: string, lienId: string, updates: any) => {
        set(state => ({
          projects: state.projects.map(p => p.id === projectId
            ? { ...p, liensAvancement: (p.liensAvancement || []).map(l => l.id === lienId ? { ...l, ...updates } : l) }
            : p),
        }));
      },
      deleteLienAvancement: (projectId: string, lienId: string) => {
        set(state => ({
          projects: state.projects.map(p => p.id === projectId
            ? { ...p, liensAvancement: (p.liensAvancement || []).filter(l => l.id !== lienId) }
            : p),
        }));
        get()._audit('delete_lien_avancement', 'projects', 'Lien supprimé');
      },

      // ─── Dépense Projet Actions ───────────────────────────────────────────
      addDepenseProjet: (projectId: string, depense: any) => {
        const newDepense = { ...depense, id: uuidv4() };
        set(state => ({
          projects: state.projects.map(p => p.id === projectId
            ? { ...p, depensesProjet: [...(p.depensesProjet || []), newDepense], depenses: p.depenses + (newDepense.montant || 0) }
            : p),
        }));
        get()._audit('create_depense', 'projects', `${newDepense.description} — ${newDepense.montant}€`);
      },
      updateDepenseProjet: (projectId: string, depenseId: string, updates: any) => {
        const project = get().projects.find(p => p.id === projectId);
        const oldDepense = (project?.depensesProjet || []).find(d => d.id === depenseId);
        const diff = (updates.montant ?? oldDepense?.montant ?? 0) - (oldDepense?.montant ?? 0);
        set(state => ({
          projects: state.projects.map(p => p.id === projectId
            ? { ...p, depensesProjet: (p.depensesProjet || []).map(d => d.id === depenseId ? { ...d, ...updates } : d), depenses: p.depenses + diff }
            : p),
        }));
      },
      deleteDepenseProjet: (projectId: string, depenseId: string) => {
        const project = get().projects.find(p => p.id === projectId);
        const depense = (project?.depensesProjet || []).find(d => d.id === depenseId);
        set(state => ({
          projects: state.projects.map(p => p.id === projectId
            ? { ...p, depensesProjet: (p.depensesProjet || []).filter(d => d.id !== depenseId), depenses: Math.max(0, p.depenses - (depense?.montant || 0)) }
            : p),
        }));
        get()._audit('delete_depense', 'projects', `Dépense supprimée — ${depense?.montant}€`);
      },

      // ─── Invoice Actions ───────────────────────────────────────────────────
      addInvoice: (invoiceData) => {
        const newInvoice: Invoice = { ...invoiceData, id: uuidv4() };
        set((state) => ({ invoices: [...state.invoices, newInvoice] }));
        toast.success('Facture créée', newInvoice.numero);
        get()._audit('create_invoice', 'invoices', `${newInvoice.numero} — ${newInvoice.clientNom} — ${newInvoice.total?.toLocaleString('fr-FR')} €`);
      },

      updateInvoice: (id, updates) => {
        const current = get().invoices.find((i) => i.id === id);
        // Check if status is transitioning to 'payée'
        if (updates.statut === 'payée') {
          if (current && current.statut !== 'payée') {
            toast.success('Facture payée ✓', `${current.numero} — ${current.total.toLocaleString('fr-FR')} €`);
          }
        }
        set((state) => ({
          invoices: state.invoices.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        }));
        if (updates.statut) get()._audit('update_invoice', 'invoices', `${current?.numero || id} → ${updates.statut}`);
        // Lier au projet si payée
        if (updates.statut === 'payée') {
          const inv = get().invoices.find(i => i.id === id);
          if (inv?.projectId) {
            get().addProjectActivity(inv.projectId, {
              type: 'facture',
              auteurId: get().currentUser?.id || 'system',
              auteurNom: get().currentUser ? `${get().currentUser!.prenom || ''} ${get().currentUser!.nom || ''}`.trim() || get().currentUser!.email : 'Admin',
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
        const inv = get().invoices.find(i => i.id === id);
        set((state) => ({ invoices: state.invoices.filter((i) => i.id !== id) }));
        deleteFromSupabaseNow('crm_invoices', id);
        toast.warning('Facture supprimée');
        get()._audit('delete_invoice', 'invoices', inv?.numero || id);
      },

      // ─── Devis Actions ────────────────────────────────────────────────────
      addDevis: (devisData) => {
        const count = get().devis.length + 1;
        const newDevis: Devis = {
          ...devisData,
          id: uuidv4(),
          numero: `DEV-${String(count).padStart(4, '0')}`,
          dateCreation: new Date().toISOString(),
        };
        set(state => ({ devis: [...state.devis, newDevis] }));
        get()._audit('create_devis', 'devis', `Devis ${newDevis.numero} pour ${newDevis.clientNom}`);
      },
      updateDevis: (id, updates) => {
        set(state => ({ devis: state.devis.map(d => d.id === id ? { ...d, ...updates } : d) }));
      },
      deleteDevis: (id) => {
        set(state => ({ devis: state.devis.filter(d => d.id !== id) }));
        deleteFromSupabaseNow('crm_devis', id);
        get()._audit('delete_devis', 'devis', 'Devis supprimé');
      },
      convertDevisToInvoice: (devisId) => {
        const devis = get().devis.find(d => d.id === devisId);
        if (!devis) return;
        get().addInvoice({
          clientId: devis.clientId,
          clientNom: devis.clientNom,
          projectId: '',
          projectNom: '',
          numero: `FAC-${String(get().invoices.length + 1).padStart(4, '0')}`,
          statut: 'brouillon',
          dateEmission: new Date().toISOString().slice(0, 10),
          dateEcheance: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          items: devis.items.map(i => ({ ...i })),
          sousTotal: devis.sousTotal,
          tva: devis.tva,
          total: devis.total,
          notes: devis.notes,
        });
        get().updateDevis(devisId, { statut: 'accepté' });
        toast.success('Facture créée depuis le devis');
      },
      convertDevisToProject: (devisId) => {
        const devis = get().devis.find(d => d.id === devisId);
        if (!devis) return;
        get().addProject({
          nom: `Projet — ${devis.clientNom}`,
          description: `Projet créé depuis le devis ${devis.numero}`,
          clientId: devis.clientId,
          clientNom: devis.clientNom,
          statut: 'en cours',
          priorite: 'normale',
          dateDebut: new Date().toISOString().slice(0, 10),
          dateFin: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
          budget: devis.total,
          depenses: 0,
          progression: 0,
          taches: [],
          milestones: [],
          equipe: [],
          freelancerIds: [],
          tags: [],
          categorie: '',
          activityLog: [],
        });
        get().updateDevis(devisId, { statut: 'accepté' });
        toast.success('Projet créé depuis le devis');
      },

      // ─── Email Sequence Actions ─────────────────────────────────────────────
      addEmailSequence: (seqData) => {
        const newSeq: EmailSequence = {
          ...seqData,
          id: uuidv4(),
          dateCreation: new Date().toISOString(),
        };
        set(state => ({ emailSequences: [...state.emailSequences, newSeq] }));
        toast.success(`Séquence "${newSeq.nom}" créée`);
        get()._audit('create_sequence', 'sequences', `Séquence "${newSeq.nom}"`);
      },
      updateEmailSequence: (id, updates) => {
        set(state => ({ emailSequences: state.emailSequences.map(s => s.id === id ? { ...s, ...updates } : s) }));
      },
      deleteEmailSequence: (id) => {
        const enrollmentsToDelete = get().sequenceEnrollments.filter(e => e.sequenceId === id);
        set(state => ({
          emailSequences: state.emailSequences.filter(s => s.id !== id),
          sequenceEnrollments: state.sequenceEnrollments.filter(e => e.sequenceId !== id),
        }));
        deleteFromSupabaseNow('crm_email_sequences', id);
        enrollmentsToDelete.forEach(e => deleteFromSupabaseNow('crm_sequence_enrollments', e.id));
        toast.warning('Séquence supprimée');
        get()._audit('delete_sequence', 'sequences', enrollmentsToDelete.length > 0 ? `+ ${enrollmentsToDelete.length} inscriptions` : id);
      },
      enrollInSequence: (sequenceId, clientId, clientNom) => {
        const seq = get().emailSequences.find(s => s.id === sequenceId);
        if (!seq || seq.steps.length === 0) return;
        const now = new Date();
        const firstStep = seq.steps[0];
        const nextDate = new Date(now.getTime() + firstStep.delaiJours * 86400000);
        const enrollment: SequenceEnrollment = {
          id: uuidv4(),
          sequenceId,
          clientId,
          clientNom,
          etapeActuelle: 0,
          dateDebut: now.toISOString(),
          dateProchaineEtape: nextDate.toISOString(),
          statut: 'active',
        };
        set(state => ({ sequenceEnrollments: [...state.sequenceEnrollments, enrollment] }));
        toast.success(`${clientNom} inscrit dans "${seq.nom}"`);
        get()._audit('enroll_sequence', 'sequences', `${clientNom} → ${seq.nom}`);
      },
      advanceSequenceStep: (enrollmentId) => {
        set(state => ({
          sequenceEnrollments: state.sequenceEnrollments.map(e => {
            if (e.id !== enrollmentId) return e;
            const seq = state.emailSequences.find(s => s.id === e.sequenceId);
            if (!seq) return e;
            const nextStep = e.etapeActuelle + 1;
            if (nextStep >= seq.steps.length) {
              return { ...e, etapeActuelle: nextStep, statut: 'completed' as const, dateProchaineEtape: new Date().toISOString() };
            }
            const step = seq.steps[nextStep];
            const nextDate = new Date(Date.now() + step.delaiJours * 86400000);
            return { ...e, etapeActuelle: nextStep, dateProchaineEtape: nextDate.toISOString() };
          }),
        }));
      },
      cancelSequenceEnrollment: (enrollmentId) => {
        set(state => ({
          sequenceEnrollments: state.sequenceEnrollments.map(e =>
            e.id === enrollmentId ? { ...e, statut: 'cancelled' as const } : e
          ),
        }));
        toast.warning('Inscription annulée');
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
        const sub = get().snoozeSubscriptions.find(s => s.id === id);
        set((state) => ({ snoozeSubscriptions: state.snoozeSubscriptions.filter((s) => s.id !== id) }));
        deleteFromSupabaseNow('crm_snooze', id);
        toast.warning('Abonnement supprimé');
        get()._audit('delete_snooze', 'snooze', sub?.utilisateur || id);
      },

      clearAllSnoozeSubscriptions: () => {
        const subs = get().snoozeSubscriptions;
        const count = subs.length;
        // Mark all IDs as deleted and remove from Supabase
        subs.forEach(s => deleteFromSupabaseNow('crm_snooze', s.id));
        set({ snoozeSubscriptions: [] });
        toast.warning('Tous les abonnements supprimés');
        get()._audit('clear_all_snooze', 'snooze', `${count} abonnements supprimés`);
      },

      // ─── Workspace Actions ──────────────────────────────────────────────────
      addWorkspace: (wsData) => {
        const ws: Workspace = { ...wsData, id: uuidv4(), dateCreation: new Date().toISOString().split('T')[0] };
        set((state) => ({ workspaces: [...state.workspaces, ws] }));
        toast.success('Espace créé', ws.nom);
      },

      updateWorkspace: (id, updates) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        }));
      },

      deleteWorkspace: (id) => {
        set((state) => ({ workspaces: state.workspaces.filter((w) => w.id !== id) }));
        toast.warning('Espace supprimé');
      },

      // ─── Invitation Actions ────────────────────────────────────────────────
      createInvitation: (invData) => {
        const token = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '').slice(0, 16);
        const inv: Invitation = {
          ...invData,
          id: uuidv4(),
          token,
          status: 'pending',
          dateCreation: new Date().toISOString(),
        };
        set((state) => ({ invitations: [...state.invitations, inv] }));
        toast.success('Invitation créée', `Lien envoyé à ${inv.email}`);
        return inv;
      },

      acceptInvitation: (token) => {
        const inv = get().invitations.find(i => i.token === token && i.status === 'pending');
        if (!inv) return { success: false, error: 'Invitation invalide ou expirée.' };
        if (new Date(inv.expiresAt) < new Date()) {
          set((state) => ({
            invitations: state.invitations.map(i => i.id === inv.id ? { ...i, status: 'expired' as const } : i),
          }));
          return { success: false, error: 'Ce lien d\'invitation a expiré.' };
        }
        set((state) => ({
          invitations: state.invitations.map(i => i.id === inv.id ? { ...i, status: 'accepted' as const } : i),
        }));
        return { success: true };
      },

      deleteInvitation: (id) => {
        set((state) => ({ invitations: state.invitations.filter((i) => i.id !== id) }));
      },

      // ─── Objective Actions ──────────────────────────────────────────────────
      addObjective: (projectId, objData) => {
        const obj: Objective = { ...objData, id: uuidv4(), dateCreation: new Date().toISOString().split('T')[0], progression: 0 };
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, objectives: [...(p.objectives || []), obj] } : p
          ),
        }));
        toast.success('Objectif ajouté', obj.titre);
      },

      updateObjective: (projectId, objectiveId, updates) => {
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            const objectives = (p.objectives || []).map((o) => {
              if (o.id !== objectiveId) return o;
              const updated = { ...o, ...updates };
              // Auto-calc progression from linked tasks
              if (updated.taskIds.length > 0) {
                const linkedTasks = p.taches.filter(t => updated.taskIds.includes(t.id));
                const done = linkedTasks.filter(t => t.statut === 'fait').length;
                updated.progression = linkedTasks.length > 0 ? Math.round((done / linkedTasks.length) * 100) : 0;
                updated.statut = updated.progression === 100 ? 'fait' : updated.progression > 0 ? 'en cours' : 'todo';
              }
              return updated;
            });
            return { ...p, objectives };
          }),
        }));
      },

      deleteObjective: (projectId, objectiveId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, objectives: (p.objectives || []).filter((o) => o.id !== objectiveId) }
              : p
          ),
        }));
      },

      // ─── SubCategory Actions ────────────────────────────────────────────────
      addSubCategory: (projectId, subData) => {
        const sub: ProjectSubCategory = { ...subData, id: uuidv4() };
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, subCategories: [...(p.subCategories || []), sub] } : p
          ),
        }));
      },

      updateSubCategory: (projectId, subId, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, subCategories: (p.subCategories || []).map(s => s.id === subId ? { ...s, ...updates } : s) }
              : p
          ),
        }));
      },

      deleteSubCategory: (projectId, subId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, subCategories: (p.subCategories || []).filter(s => s.id !== subId) }
              : p
          ),
        }));
      },

      // ─── Tag Actions ────────────────────────────────────────────────────────
      addUnifiedTag: (tagData) => {
        const tag: UnifiedTag = { ...tagData, id: uuidv4() };
        set((state) => ({ unifiedTags: [...state.unifiedTags, tag] }));
        return tag;
      },

      updateUnifiedTag: (id, updates) => {
        set((state) => ({
          unifiedTags: state.unifiedTags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },

      deleteUnifiedTag: (id) => {
        set((state) => ({ unifiedTags: state.unifiedTags.filter((t) => t.id !== id) }));
        deleteFromSupabaseNow('crm_tags', id);
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
          auteurNom: get().currentUser ? `${get().currentUser!.prenom || ''} ${get().currentUser!.nom || ''}`.trim() || get().currentUser!.email : 'Système',
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
        get()._audit('login', undefined, `Connexion réussie — ${user.email}`);
        toast.success('Bienvenue', `${user.prenom} ${user.nom}`);
        // Load CRM data from Supabase after login
        setTimeout(() => get().loadFromSupabase(), 500);
        return { success: true };
      },

      logout: async () => {
        get()._audit('logout', undefined, 'Déconnexion');
        set({ currentUser: null, setupComplete: false });
        // Nettoyer toutes les sessions stockées
        try { localStorage.removeItem('obsidian-session'); } catch {}
        try {
          // Supprimer le cache de session Supabase
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') && key.includes('-auth-token')) {
              localStorage.removeItem(key);
            }
          });
        } catch {}
        // Supabase signout — attendre que ça termine AVANT le reload
        try {
          const { signOut } = await import('../lib/supabaseAuth');
          await signOut();
        } catch {}
        window.location.hash = '';
        window.location.reload();
      },

      // Sync session user (Supabase or API) into Zustand currentUser
      // `id` is the Supabase auth UUID when available — critical for RLS
      syncSessionUser: ({ id: supabaseId, email, role, nom, prenom, permissions: supabasePermissions }: { id?: string; email: string; role: string; nom: string; prenom: string; permissions?: string[] }) => {
        const permissionsByRole: Record<string, string[]> = {
          admin: ['dashboard','clients','freelancers','projects','worktracking','invoices','documents','snooze','calendar','analytics','media-buying','prospection','personal','settings','admin'],
          freelancer: ['dashboard','projects','worktracking','calendar','personal','settings'],
          viewer: ['dashboard','calendar','personal','settings'],
        };
        const defaultPermissions = permissionsByRole[role] || permissionsByRole.viewer;

        // Priority: Supabase profile permissions > existing local permissions > role defaults
        const existing = get().users.find(u => u.email.toLowerCase() === email.toLowerCase());

        let finalPermissions: string[];
        if (supabasePermissions && supabasePermissions.length > 0) {
          finalPermissions = supabasePermissions;
        } else if (existing?.permissions && existing.permissions.length > 0) {
          finalPermissions = existing.permissions as string[];
        } else {
          finalPermissions = defaultPermissions;
        }

        // Use Supabase UUID if available, otherwise keep existing local ID, otherwise generate one
        const resolvedUserId = supabaseId || existing?.id || uuidv4();

        if (existing) {
          // Update existing user — also update their ID to match Supabase if it changed
          const updatedUser = {
            ...existing,
            id: resolvedUserId,
            nom: nom || existing.nom,
            prenom: prenom || existing.prenom,
            role: role as any,
            permissions: finalPermissions as any,
            derniereConnexion: new Date().toISOString(),
          };
          set(state => ({
            currentUser: updatedUser,
            users: state.users.map(u => u.email.toLowerCase() === email.toLowerCase() ? updatedUser : u),
          }));
        } else {
          const newUser: UserAccount = {
            id: resolvedUserId,
            email,
            nom,
            prenom,
            role: (role as any) || 'viewer',
            passwordHash: '',
            permissions: finalPermissions as any,
            isActive: true,
            dateCreation: new Date().toISOString().split('T')[0],
            derniereConnexion: new Date().toISOString(),
          };
          set(state => ({ users: [...state.users, newUser], currentUser: newUser }));
        }

        // Load CRM data from Supabase after Supabase auth login
        setTimeout(() => get().loadFromSupabase(), 500);

        // Initialize user space & load data from Supabase (background)
        supaService.ensureUserSpaceExists(resolvedUserId, email)
          .then(() => supaService.fetchUserPersonalTasks(resolvedUserId))
          .then(tasks => {
            if (tasks.length > 0) {
              set(state => ({
                personalTasks: [
                  ...state.personalTasks.filter(t => t.userId !== resolvedUserId),
                  ...tasks,
                ],
              }));
            }
          })
          .then(() => supaService.fetchUserPersonalNotes(resolvedUserId))
          .then(notes => {
            if (notes.length > 0) {
              set(state => ({
                personalNotes: [
                  ...state.personalNotes.filter(n => n.userId !== resolvedUserId),
                  ...notes,
                ],
              }));
            }
          })
          .catch(err => console.warn('[Supabase] User space init failed:', err));
      },

      // ─── Personal Tasks & Notes ────────────────────────────────────────────
      addPersonalTask: (task: any) => {
        const maxOrdre = Math.max(0, ...get().personalTasks.map(t => t.ordre ?? 0));
        const newTask: PersonalTask = { ...task, id: uuidv4(), dateCreation: new Date().toISOString(), subtasks: task.subtasks || [], ordre: maxOrdre + 1 };
        set(state => ({ personalTasks: [newTask, ...state.personalTasks] }));
        supaService.syncPersonalTask(newTask);
      },
      updatePersonalTask: (id: string, updates: any) => {
        set(state => ({ personalTasks: state.personalTasks.map(t => t.id === id ? { ...t, ...updates } : t) }));
        supaService.updatePersonalTaskRemote(id, updates);
      },
      deletePersonalTask: (id: string) => {
        set(state => ({ personalTasks: state.personalTasks.filter(t => t.id !== id) }));
        supaService.deletePersonalTaskRemote(id);
      },
      reorderPersonalTasks: (orderedIds: string[]) => {
        set(state => ({
          personalTasks: state.personalTasks.map(t => {
            const idx = orderedIds.indexOf(t.id);
            return idx >= 0 ? { ...t, ordre: idx } : t;
          }),
        }));
        supaService.reorderPersonalTasksRemote(orderedIds.map((id, idx) => ({ id, ordre: idx })));
      },
      addPersonalNote: (note: any) => {
        const maxOrdre = Math.max(0, ...get().personalNotes.map(n => n.ordre ?? 0));
        const newNote: PersonalNote = { ...note, id: uuidv4(), dateCreation: new Date().toISOString(), dateModification: new Date().toISOString(), ordre: maxOrdre + 1 };
        set(state => ({ personalNotes: [newNote, ...state.personalNotes] }));
        supaService.syncPersonalNote(newNote);
      },
      updatePersonalNote: (id: string, updates: any) => {
        const fullUpdates = { ...updates, dateModification: new Date().toISOString() };
        set(state => ({ personalNotes: state.personalNotes.map(n => n.id === id ? { ...n, ...fullUpdates } : n) }));
        supaService.updatePersonalNoteRemote(id, fullUpdates);
      },
      deletePersonalNote: (id: string) => {
        set(state => ({ personalNotes: state.personalNotes.filter(n => n.id !== id) }));
        supaService.deletePersonalNoteRemote(id);
      },
      reorderPersonalNotes: (orderedIds: string[]) => {
        set(state => ({
          personalNotes: state.personalNotes.map(n => {
            const idx = orderedIds.indexOf(n.id);
            return idx >= 0 ? { ...n, ordre: idx } : n;
          }),
        }));
        supaService.reorderPersonalNotesRemote(orderedIds.map((id, idx) => ({ id, ordre: idx })));
      },

      // ─── Client Portal Actions ────────────────────────────────────────────
      createClientPortalAccess: (access) => {
        const newAccess: ClientPortalAccess = {
          ...access,
          id: uuidv4(),
          token: uuidv4().replace(/-/g, '').slice(0, 24),
          dateCreation: new Date().toISOString(),
        };
        set(state => ({
          clientPortalAccesses: [...state.clientPortalAccesses, newAccess],
        }));
        get()._audit('create_portal_access', 'clients', `Accès portail pour client ${access.clientId}`);
        return newAccess;
      },
      deleteClientPortalAccess: (id) => {
        set(state => ({
          clientPortalAccesses: state.clientPortalAccesses.filter(a => a.id !== id),
        }));
        deleteFromSupabaseNow('crm_portal_accesses', id);
        get()._audit('delete_portal_access', 'clients', 'Accès portail supprimé');
      },
      getClientPortalByToken: (token) => {
        return get().clientPortalAccesses.find(a => a.token === token && a.isActive && new Date(a.expiresAt) > new Date());
      },

      // ─── Template Actions ─────────────────────────────────────────────────
      saveProjectTemplate: (projectId, nom, description) => {
        const project = get().projects.find(p => p.id === projectId);
        if (!project) return;
        const template: ProjectTemplate = {
          id: uuidv4(),
          nom,
          description,
          categorie: project.categorie,
          tasks: project.taches.map(t => ({
            titre: t.titre,
            statut: 'todo',
            priorite: t.priorite,
            heuresEstimees: t.heuresEstimees,
            subCategoryId: t.subCategoryId,
          })),
          milestones: project.milestones.map(m => ({ titre: m.titre })),
          subCategories: (project.subCategories || []).map(s => ({ nom: s.nom, couleur: s.couleur })),
          createdBy: get().currentUser?.id || '',
          dateCreation: new Date().toISOString(),
        };
        set(state => ({ projectTemplates: [...state.projectTemplates, template] }));
        get()._audit('create_template', 'projects', `Template "${nom}" créé depuis ${project.nom}`);
        toast.success(`Template "${nom}" sauvegardé`);
      },
      deleteProjectTemplate: (id) => {
        set(state => ({ projectTemplates: state.projectTemplates.filter(t => t.id !== id) }));
        deleteFromSupabaseNow('crm_templates', id);
      },
      createProjectFromTemplate: (templateId, projectData) => {
        const template = get().projectTemplates.find(t => t.id === templateId);
        if (!template) return '';
        const projectId = uuidv4();
        const subCats = template.subCategories.map(s => ({ id: uuidv4(), ...s, description: '', ordre: 0 }));
        const tasks = template.tasks.map(t => ({
          id: uuidv4(),
          titre: t.titre,
          description: '',
          statut: 'todo' as const,
          priorite: t.priorite as any,
          assigneA: '',
          assigneAIds: [],
          heuresEstimees: t.heuresEstimees,
          heuresReelles: 0,
          dateDebut: projectData.dateDebut,
          dateEcheance: projectData.dateFin,
          tags: [] as string[],
          notes: [],
          subCategoryId: t.subCategoryId ? subCats[0]?.id : undefined,
        }));
        const milestones = template.milestones.map(m => ({
          id: uuidv4(),
          titre: m.titre,
          dateEcheance: projectData.dateFin,
          complete: false,
        }));
        const newProject: Project = {
          ...projectData,
          id: projectId,
          taches: tasks,
          milestones,
          subCategories: subCats,
          activityLog: [],
          objectives: [],
          livrables: [],
          depensesProjet: [],
          liensAvancement: [],
          categorie: template.categorie,
        };
        set(state => ({ projects: [...state.projects, newProject] }));
        get()._audit('create_project_from_template', 'projects', `${newProject.nom} depuis template "${template.nom}"`);
        return projectId;
      },

      addUser: (userData) => {
        const newUser: UserAccount = { ...userData, id: (userData as any).id || uuidv4(), dateCreation: new Date().toISOString().split('T')[0] };

        // Si le rôle est freelancer, créer automatiquement un prestataire lié
        if (newUser.role === 'freelancer') {
          const freelancerId = uuidv4();
          const newFreelancer = {
            id: freelancerId,
            nom: newUser.nom || '',
            prenom: newUser.prenom || '',
            email: newUser.email || '',
            telephone: '',
            entreprise: '',
            specialite: 'autre' as const,
            competences: [],
            tjm: 0,
            statut: 'actif' as const,
            note: 5,
            totalFacture: 0,
            projetsTermines: 0,
            tags: [],
            portfolio: '',
            iban: '',
            bic: '',
            tvaApplicable: false,
            tauxTva: 0,
            adresse: '',
            siret: '',
            numeroTVA: '',
            notes: '',
            dateCreation: new Date().toISOString().split('T')[0],
          };
          newUser.freelancerId = freelancerId;
          set(state => ({
            users: [...state.users, newUser],
            freelancers: [...state.freelancers, newFreelancer],
          }));
          get()._audit('create_user', 'admin', `${newUser.nom} (${newUser.email}) — rôle: freelancer → prestataire créé`);
          toast.success(`Compte freelancer créé + ajouté aux prestataires`);
        } else {
          set(state => ({ users: [...state.users, newUser] }));
          get()._audit('create_user', 'admin', `${newUser.nom} (${newUser.email}) — rôle: ${newUser.role}`);
        }
      },

      updateUser: (id, updates) => {
        const user = get().users.find(u => u.id === id);
        set(state => {
          const updatedUsers = state.users.map(u => u.id === id ? { ...u, ...updates } : u);
          // Also update currentUser if it's the same user being edited
          const updatedCurrentUser = state.currentUser?.id === id
            ? { ...state.currentUser, ...updates }
            : state.currentUser;
          return { users: updatedUsers, currentUser: updatedCurrentUser };
        });
        const changed = Object.keys(updates).join(', ');
        get()._audit('update_user', 'admin', `${user?.email || id} — champs: ${changed}`);
      },

      deleteUser: (id) => {
        const user = get().users.find(u => u.id === id);
        set(state => ({ users: state.users.filter(u => u.id !== id) }));
        get()._audit('delete_user', 'admin', user?.email || id);
      },

      addAuditLog: (logData) => {
        const log: AuditLog = { ...logData, id: uuidv4() };
        set(state => ({ auditLogs: [log, ...state.auditLogs].slice(0, 500) }));
      },

      // ─── Supabase Sync Actions ────────────────────────────────────────────
      loadUserDataFromSupabase: async (userId: string) => {
        const [tasks, notes] = await Promise.all([
          supaService.fetchUserPersonalTasks(userId),
          supaService.fetchUserPersonalNotes(userId),
        ]);
        if (tasks.length > 0) {
          set(state => ({
            personalTasks: [...state.personalTasks.filter(t => t.userId !== userId), ...tasks],
          }));
        }
        if (notes.length > 0) {
          set(state => ({
            personalNotes: [...state.personalNotes.filter(n => n.userId !== userId), ...notes],
          }));
        }
      },

      initUserSpace: async (userId: string, email: string) => {
        await supaService.ensureUserSpaceExists(userId, email);
        await get().loadUserDataFromSupabase(userId);
      },

      // ─── UI Actions ────────────────────────────────────────────────────────
      setActiveSection: (section) => {
        const prev = get().activeSection;
        set({ activeSection: section });
        if (section !== prev) get()._audit('view_section', section, `Navigation: ${prev} → ${section}`);
      },
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
            section: 'projects',
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
        const user = get().currentUser;
        if (user?.role !== 'admin') {
          toast.error('Seuls les administrateurs peuvent gérer l\'équipe');
          return;
        }
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
            type: 'tache_cree',
            auteurId: get().currentUser?.id || 'system',
            auteurNom: get().currentUser ? `${get().currentUser!.prenom || ''} ${get().currentUser!.nom || ''}`.trim() || get().currentUser!.email : 'Admin',
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
            section: 'projects',
          });
        }
      },

      removeFreelancerFromProject: (projectId, freelancerId) => {
        const user = get().currentUser;
        if (user?.role !== 'admin') {
          toast.error('Seuls les administrateurs peuvent gérer l\'équipe');
          return;
        }
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, freelancerIds: (p.freelancerIds || []).filter(id => id !== freelancerId) }
              : p
          ),
        }));
        get()._audit('remove_freelancer', 'projects', `Prestataire retiré du projet ${get().projects.find(p => p.id === projectId)?.nom}`);
      },

      // ─── Archive & Corbeille ──────────────────────────────────────────
      archiveProject: (id, reason) => {
        const user = get().currentUser;
        if (!user) return;
        const project = get().projects.find(p => p.id === id);
        if (!project) return;
        set(state => ({
          projects: state.projects.map(p => p.id === id ? {
            ...p,
            isArchived: true,
            archivedAt: new Date().toISOString(),
            archivedBy: user.id,
            archivedByNom: `${user.prenom} ${user.nom}`,
            archiveReason: reason,
            previousStatut: p.statut,
            statut: 'archivé' as any,
          } : p),
        }));
        get()._audit('archive_project', 'projects', `Projet "${project.nom}" archivé${reason ? ` — ${reason}` : ''}`);
        get().addNotification({ titre: 'Projet archivé', type: 'info', message: `Projet "${project.nom}" archivé`, lu: false, date: new Date().toISOString(), section: 'projects' });
      },

      restoreProject: (id) => {
        const user = get().currentUser;
        if (user?.role !== 'admin') {
          toast.error('Seuls les administrateurs peuvent restaurer un projet');
          return;
        }
        const project = get().projects.find(p => p.id === id);
        if (!project) return;
        set(state => ({
          projects: state.projects.map(p => p.id === id ? {
            ...p,
            isArchived: false,
            archivedAt: undefined,
            archivedBy: undefined,
            archivedByNom: undefined,
            archiveReason: undefined,
            statut: p.previousStatut || 'planification',
            previousStatut: undefined,
          } : p),
        }));
        get()._audit('restore_project', 'projects', `Projet "${project.nom}" restauré depuis les archives`);
        get().addNotification({ titre: 'Projet restauré', type: 'success', message: `Projet "${project.nom}" restauré`, lu: false, date: new Date().toISOString(), section: 'projects' });
      },

      softDeleteProject: (id, reason) => {
        const user = get().currentUser;
        if (user?.role !== 'admin') {
          toast.error('Seuls les administrateurs peuvent supprimer un projet');
          return;
        }
        const project = get().projects.find(p => p.id === id);
        if (!project) return;
        set(state => ({
          projects: state.projects.map(p => p.id === id ? {
            ...p,
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletedBy: user.id,
            deletedByNom: `${user.prenom} ${user.nom}`,
            deleteReason: reason,
            previousStatut: p.isArchived ? p.previousStatut : p.statut,
            isArchived: false,
          } : p),
        }));
        get()._audit('soft_delete_project', 'projects', `Projet "${project.nom}" mis en corbeille${reason ? ` — ${reason}` : ''}`);
        get().addNotification({ titre: 'Projet en corbeille', type: 'warning', message: `Projet "${project.nom}" mis en corbeille`, lu: false, date: new Date().toISOString(), section: 'projects' });
      },

      restoreDeletedProject: (id) => {
        const user = get().currentUser;
        if (user?.role !== 'admin') return;
        const project = get().projects.find(p => p.id === id);
        if (!project) return;
        set(state => ({
          projects: state.projects.map(p => p.id === id ? {
            ...p,
            isDeleted: false,
            deletedAt: undefined,
            deletedBy: undefined,
            deletedByNom: undefined,
            deleteReason: undefined,
            statut: p.previousStatut || 'planification',
            previousStatut: undefined,
          } : p),
        }));
        get()._audit('restore_deleted_project', 'projects', `Projet "${project.nom}" restauré depuis la corbeille`);
      },

      permanentDeleteProject: (id) => {
        const user = get().currentUser;
        if (user?.role !== 'admin') return;
        const project = get().projects.find(p => p.id === id);
        if (!project || !project.isDeleted) return;
        get().deleteProject(id);
        get()._audit('permanent_delete_project', 'projects', `Projet "${project.nom}" supprimé définitivement`);
      },

      emptyTrash: () => {
        const user = get().currentUser;
        if (user?.role !== 'admin') return;
        const deleted = get().projects.filter(p => p.isDeleted);
        deleted.forEach(p => get().deleteProject(p.id));
        get()._audit('empty_trash', 'projects', `${deleted.length} projet(s) supprimé(s) définitivement`);
      },

      canPerformProjectAction: (action) => {
        const user = get().currentUser;
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (user.role === 'viewer') return false;
        // Freelancer
        switch (action) {
          case 'create':
          case 'edit':
            return (user.permissions || []).includes('projects');
          case 'archive':
            return true;
          default:
            return false;
        }
      },

      getActiveProjects: () => get().projects.filter(p => !p.isArchived && !p.isDeleted),
      getArchivedProjects: () => get().projects.filter(p => p.isArchived && !p.isDeleted),
      getDeletedProjects: () => get().projects.filter(p => p.isDeleted),

      completeSetup: ({ agencyName, adminEmail, passwordHash }) => {
        set((state) => ({
          setupComplete: true,
          clients: [],
          freelancers: [],
          projects: [],
          invoices: [],
          snoozeSubscriptions: [],
          activities: [],
          timerSessions: [],
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
      version: 6,
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
        // v5→v6 : add secteurActivite, typePresence, liensAvancement defaults
        if (version < 6) {
          if (persistedState?.clients) {
            persistedState.clients = persistedState.clients.map((c: any) => ({
              ...c,
              secteurActivite: c.secteurActivite ?? undefined,
              typePresence: c.typePresence ?? undefined,
              localisation: c.localisation ?? undefined,
              siteWeb: c.siteWeb ?? undefined,
            }));
          }
          if (persistedState?.projects) {
            persistedState.projects = persistedState.projects.map((p: any) => ({
              ...p,
              liensAvancement: p.liensAvancement ?? [],
            }));
          }
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
        workspaces: state.workspaces,
        invitations: state.invitations,
        unifiedTags: state.unifiedTags,
        settings: state.settings,
        users: state.users,
        auditLogs: state.auditLogs,
        currentUser: state.currentUser,
        setupComplete: state.setupComplete,
        personalTasks: state.personalTasks,
        personalNotes: state.personalNotes,
        clientPortalAccesses: state.clientPortalAccesses,
        projectTemplates: state.projectTemplates,
        devis: state.devis,
        emailSequences: state.emailSequences,
        sequenceEnrollments: state.sequenceEnrollments,
        notifications: state.notifications,
      }),
    }
  )
);

// ─── Auto-sync to Supabase on any data change (debounced 3s) ────────────────
let _crmSyncTimer: ReturnType<typeof setTimeout> | null = null;
useStore.subscribe((state, prevState) => {
  const dataChanged =
    state.clients !== prevState.clients ||
    state.freelancers !== prevState.freelancers ||
    state.projects !== prevState.projects ||
    state.invoices !== prevState.invoices ||
    state.devis !== prevState.devis ||
    state.snoozeSubscriptions !== prevState.snoozeSubscriptions ||
    state.settings !== prevState.settings ||
    state.unifiedTags !== prevState.unifiedTags ||
    state.projectTemplates !== prevState.projectTemplates ||
    state.clientPortalAccesses !== prevState.clientPortalAccesses ||
    state.emailSequences !== prevState.emailSequences ||
    state.sequenceEnrollments !== prevState.sequenceEnrollments;

  if (!dataChanged) return;

  if (_crmSyncTimer) clearTimeout(_crmSyncTimer);
  _crmSyncTimer = setTimeout(() => {
    saveAllToSupabase({
      clients: state.clients,
      freelancers: state.freelancers,
      projects: state.projects,
      invoices: state.invoices,
      devis: state.devis || [],
      snoozeSubscriptions: state.snoozeSubscriptions,
      settings: state.settings,
      unifiedTags: state.unifiedTags,
      projectTemplates: state.projectTemplates || [],
      clientPortalAccesses: state.clientPortalAccesses || [],
      emailSequences: state.emailSequences || [],
      sequenceEnrollments: state.sequenceEnrollments || [],
    });
  }, 3000);
});

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


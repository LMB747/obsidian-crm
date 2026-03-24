import React, { useState, useMemo } from 'react';
import {
  Plus, FolderKanban, CheckSquare, Clock, Euro,
  Calendar, Users, ChevronDown, ChevronRight,
  Circle, CheckCircle2, AlertCircle, Pause,
  Edit2, Trash2, Target, ArrowUpRight, BarChart3,
  List, Columns, AlertTriangle, Download, Search, X,
  Activity, MessageSquare, FolderPlus, ArrowRight, Flag, FileText,
  Crosshair, Layers, Tag, Package, Wallet, GanttChart,
  Link, ExternalLink, Pen, HardDrive, Github, Columns3, Video, TrendingUp, MessageCircle, Paperclip
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Project, ProjectStatus, Task, Freelancer, Objective, ProjectSubCategory, Livrable, LivrableType, LivrableStatut, DepenseProjet, LienAvancementType } from '../types';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Modal } from '../components/ui/Modal';
import { StatCard } from '../components/ui/StatCard';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { exportProjectsCSV } from '../utils/csvExport';
import { useDebounce } from '../hooks/useDebounce';
import { TagPicker } from '../components/ui/TagPicker';
import { ProjectChat } from '../components/chat/ProjectChat';
import { FileManager } from '../components/files/FileManager';
import clsx from 'clsx';

const statusConfig: Record<ProjectStatus, { label: string; variant: any; icon: React.FC<any>; color: string }> = {
  'planification': { label: 'Planification', variant: 'info',    icon: Circle,        color: 'text-cyan-400' },
  'en cours':      { label: 'En cours',      variant: 'purple',  icon: BarChart3,     color: 'text-primary-400' },
  'en révision':   { label: 'En révision',   variant: 'warning', icon: AlertCircle,   color: 'text-amber-400' },
  'terminé':       { label: 'Terminé',       variant: 'success', icon: CheckCircle2,  color: 'text-emerald-400' },
  'en pause':      { label: 'En pause',      variant: 'default', icon: Pause,         color: 'text-slate-400' },
  'annulé':        { label: 'Annulé',        variant: 'error',   icon: AlertCircle,   color: 'text-red-400' },
};

const statusHex: Record<ProjectStatus, string> = {
  'planification': '#06b6d4', 'en cours': '#7c3aed', 'en révision': '#f59e0b',
  'terminé': '#10b981', 'en pause': '#64748b', 'annulé': '#ef4444',
};

const taskStatusConfig = {
  'todo':     { label: 'À faire',   color: 'text-slate-400',  bg: 'bg-slate-500/20 border-slate-500/30' },
  'en cours': { label: 'En cours',  color: 'text-primary-400', bg: 'bg-primary-500/20 border-primary-500/30' },
  'fait':     { label: 'Fait',      color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' },
};

const kanbanColumns: { statut: ProjectStatus; borderColor: string; titleColor: string }[] = [
  { statut: 'planification', borderColor: 'border-cyan-500/30',    titleColor: 'text-cyan-400' },
  { statut: 'en cours',      borderColor: 'border-primary-500/30', titleColor: 'text-purple-400' },
  { statut: 'en révision',   borderColor: 'border-amber-500/30',   titleColor: 'text-amber-400' },
  { statut: 'terminé',       borderColor: 'border-emerald-500/30', titleColor: 'text-emerald-400' },
  { statut: 'en pause',      borderColor: 'border-slate-500/30',   titleColor: 'text-slate-400' },
];

const INPUT_CLASS = 'w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all';

const LIEN_ICONS: Record<string, { icon: any; color: string }> = {
  notion: { icon: FileText, color: 'text-slate-300' },
  figma: { icon: Pen, color: 'text-pink-400' },
  google_drive: { icon: HardDrive, color: 'text-blue-400' },
  github: { icon: Github, color: 'text-slate-300' },
  trello: { icon: Columns3, color: 'text-blue-400' },
  asana: { icon: Target, color: 'text-pink-500' },
  miro: { icon: Layers, color: 'text-amber-400' },
  loom: { icon: Video, color: 'text-violet-400' },
  autre: { icon: Link, color: 'text-slate-400' },
};

// ─── ProjectTimeline ─────────────────────────────────────────────────────────
const ProjectTimeline: React.FC<{ project: Project }> = ({ project }) => {
  const log = project.activityLog || [];
  if (log.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-500">
      <Activity className="w-8 h-8 mb-2 opacity-30" />
      <p className="text-sm">Aucune activité enregistrée</p>
    </div>
  );

  const TYPE_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>, color: string }> = {
    'projet_cree':  { icon: FolderPlus,    color: 'text-primary-400' },
    'tache_cree':   { icon: Plus,          color: 'text-accent-cyan' },
    'tache_statut': { icon: ArrowRight,    color: 'text-amber-400' },
    'tache_note':   { icon: MessageSquare, color: 'text-purple-400' },
    'tache_temps':  { icon: Clock,         color: 'text-blue-400' },
    'milestone':    { icon: Flag,          color: 'text-green-400' },
    'facture':      { icon: FileText,      color: 'text-emerald-400' },
    'commentaire':  { icon: MessageSquare, color: 'text-slate-400' },
  };

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
      {log.map((entry, i) => {
        const cfg = TYPE_ICONS[entry.type] || TYPE_ICONS['commentaire'];
        const Icon = cfg.icon;
        return (
          <div key={entry.id} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-lg bg-card border border-card-border flex items-center justify-center flex-shrink-0">
                <Icon className={clsx('w-3.5 h-3.5', cfg.color)} />
              </div>
              {i < log.length - 1 && <div className="w-px h-4 bg-card-border mt-1" />}
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-medium text-white">{entry.titre}</span>
                <span className="text-xs text-slate-500">{entry.auteurNom}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{entry.description}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">
                {new Date(entry.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const today = new Date().toISOString().split('T')[0];

const defaultNewProject = {
  nom: '',
  description: '',
  clientId: '',
  statut: 'planification' as ProjectStatus,
  priorite: 'normale' as Project['priorite'],
  categorie: '',
  dateDebut: today,
  dateFin: '',
  budget: 0,
  tags: [] as string[],
  freelancerIds: [] as string[],
};

// ─── ProjectTeam ─────────────────────────────────────────────────────────────
const ProjectTeam: React.FC<{
  project: Project;
  allFreelancers: Freelancer[];
  onAdd: (freelancerId: string) => void;
  onRemove: (freelancerId: string) => void;
}> = ({ project, allFreelancers, onAdd, onRemove }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const freelancerIds = project.freelancerIds || [];
  const attachedFreelancers = allFreelancers.filter(f => freelancerIds.includes(f.id));
  const availableFreelancers = allFreelancers.filter(f =>
    !freelancerIds.includes(f.id) &&
    (f.prenom + ' ' + f.nom + ' ' + f.specialite).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcul du coût estimé
  const projectDays = project.dateDebut && project.dateFin
    ? Math.max(1, Math.ceil((new Date(project.dateFin).getTime() - new Date(project.dateDebut).getTime()) / (1000 * 60 * 60 * 24 * 5 / 7)))
    : 0;

  // Tâches par freelancer (match par ID puis fallback par nom)
  const taskCountByFreelancer = (freelancerId: string) => {
    const f = allFreelancers.find(fl => fl.id === freelancerId);
    if (!f) return { total: 0, done: 0, heuresEstimees: 0 };
    const fullName = `${f.prenom} ${f.nom}`.toLowerCase();
    const tasks = (project.taches || []).filter(t =>
      (t.assigneAIds || []).includes(freelancerId) ||
      t.assigneA.toLowerCase() === fullName
    );
    const heuresEstimees = tasks.reduce((sum, t) => sum + (t.heuresEstimees || 0), 0);
    return { total: tasks.length, done: tasks.filter(t => t.statut === 'fait').length, heuresEstimees };
  };

  return (
    <div className="space-y-5 p-1">
      {/* Équipe attachée */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-white">Prestataires sur ce projet</h4>
          <span className="text-xs text-slate-500">{attachedFreelancers.length} membre{attachedFreelancers.length > 1 ? 's' : ''}</span>
        </div>
        {attachedFreelancers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 bg-obsidian-900/50 rounded-xl border border-card-border/50 text-slate-500">
            <Users className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Aucun prestataire attaché</p>
            <p className="text-xs text-slate-600 mt-1">Utilisez la recherche ci-dessous pour en ajouter</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attachedFreelancers.map(f => {
              const counts = taskCountByFreelancer(f.id);
              const progress = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
              const estimatedCost = projectDays > 0 ? f.tjm * projectDays : 0;
              const assignedHours = counts.heuresEstimees;
              const taskBasedCost = f.tjm > 0 && assignedHours > 0 ? f.tjm * assignedHours / 8 : 0;
              return (
                <div key={f.id} className="flex items-center gap-3 p-3 bg-card border border-card-border rounded-xl hover:border-primary-500/30 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-400 font-bold text-sm">{(f.prenom || 'F')[0]}{(f.nom || 'L')[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{f.prenom} {f.nom}</span>
                      <span className="text-xs text-slate-500">{f.specialite}</span>
                      {f.tjm > 0 && <span className="text-xs text-amber-400">{f.tjm}€/j</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">{counts.total} tâche{counts.total > 1 ? 's' : ''} · {counts.done} terminée{counts.done > 1 ? 's' : ''}</span>
                      {taskBasedCost > 0 && (
                        <span className="text-xs text-slate-400">
                          {f.tjm}€/j × {(assignedHours / 8).toFixed(1)}j = {taskBasedCost.toFixed(0)}€
                        </span>
                      )}
                      {taskBasedCost === 0 && estimatedCost > 0 && (
                        <span className="text-xs text-emerald-400">~{estimatedCost.toLocaleString('fr-FR')}€ estimé</span>
                      )}
                    </div>
                    {counts.total > 0 && (
                      <div className="mt-1.5 h-1 rounded-full bg-obsidian-900 overflow-hidden w-32">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onRemove(f.id)}
                    className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Retirer du projet"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ajout de prestataire */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-3">Ajouter un prestataire</h4>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom ou spécialité..."
            className="w-full bg-obsidian-900 border border-card-border rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/60 transition-all"
          />
        </div>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {availableFreelancers.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-3">
              {searchTerm ? 'Aucun résultat' : 'Tous les prestataires sont déjà attachés'}
            </p>
          ) : (
            availableFreelancers.map(f => (
              <button
                key={f.id}
                onClick={() => { onAdd(f.id); setSearchTerm(''); }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-primary-500/10 hover:border-primary-500/30 border border-transparent transition-all text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-obsidian-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-slate-300 font-bold text-xs">{(f.prenom || 'F')[0]}{(f.nom || 'L')[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white font-medium">{f.prenom} {f.nom}</span>
                  <span className="text-xs text-slate-500 ml-2">{f.specialite}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${f.statut === 'actif' ? 'bg-emerald-500/20 text-emerald-400' : f.statut === 'en mission' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'}`}>
                  {f.statut}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Alerte sur-assignement */}
      {attachedFreelancers.some(f => {
        const allTasksForFreelancer = (project.taches || []).filter(t =>
          ((t.assigneAIds || []).includes(f.id) || t.assigneA.toLowerCase() === `${f.prenom} ${f.nom}`.toLowerCase()) && t.statut !== 'fait'
        );
        return allTasksForFreelancer.length > 5;
      }) && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">Un ou plusieurs prestataires ont plus de 5 tâches actives. Vérifiez la charge de travail.</p>
        </div>
      )}
    </div>
  );
};

export const Projects: React.FC = () => {
  const store = useStore();
  const { projects, updateProject, deleteProject, updateTask, addTask, deleteTask, searchQuery, clients, addProject, addFreelancerToProject, removeFreelancerFromProject, freelancers, addObjective, updateObjective, deleteObjective, addSubCategory, deleteSubCategory, addLienAvancement, deleteLienAvancement, updateLivrable, currentUser } = store;
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [expandedProject, setExpandedProject] = useState<string | null>(projects[0]?.id || null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'tous'>('tous');
  const [view, setView] = useState<'list' | 'kanban' | 'gantt'>('list');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [addTaskModal, setAddTaskModal] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ titre: '', description: '', assigneA: '', assigneAIds: [] as string[], dateEcheance: '', heuresEstimees: 8, priorite: 'normale' as Task['priorite'], statut: 'todo' as Task['statut'], tags: [] as string[] });
  const [taskFreelancerFilter, setTaskFreelancerFilter] = useState<string>('all');
  const [projectTab, setProjectTab] = useState<Record<string, 'tasks' | 'equipe' | 'objectives' | 'timeline' | 'livrables' | 'budget' | 'liens' | 'chat' | 'fichiers'>>({});

  // Lien d'avancement modal
  const [lienModalOpen, setLienModalOpen] = useState<string | null>(null);
  const [newLien, setNewLien] = useState({ titre: '', url: '', type: 'autre' as LienAvancementType, description: '', statutVisible: true, freelancerIds: [] as string[] });

  // Objectives modal
  const [addObjModal, setAddObjModal] = useState<string | null>(null);
  const [newObj, setNewObj] = useState({ titre: '', description: '', dateEcheance: '', priorite: 'normale' as Task['priorite'], assigneAIds: [] as string[], taskIds: [] as string[] });

  // Sub-category modal
  const [addSubCatModal, setAddSubCatModal] = useState<string | null>(null);
  const [newSubCat, setNewSubCat] = useState({ nom: '', description: '', couleur: '#7c3aed' });
  const SUB_CAT_COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  // ── Add Project Modal ──────────────────────────────────────────────────────
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProject, setNewProject] = useState(defaultNewProject);

  // ── Edit Project Modal ─────────────────────────────────────────────────────
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(defaultNewProject);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);

  const openEditModal = (project: Project) => {
    setEditProjectId(project.id);
    setEditProject({
      nom: project.nom,
      description: project.description,
      clientId: project.clientId,
      statut: project.statut,
      priorite: project.priorite,
      categorie: project.categorie,
      dateDebut: project.dateDebut,
      dateFin: project.dateFin,
      budget: project.budget,
      tags: [...(project.tags || [])],
      freelancerIds: [...(project.freelancerIds || [])],
    });
    setIsEditModalOpen(true);
  };

  const handleEditProject = () => {
    if (!editProjectId || !editProject.nom.trim()) return;
    const selectedClient = clients.find(c => c.id === editProject.clientId);
    const clientNom = selectedClient ? (selectedClient.entreprise || selectedClient.nom) : '';
    updateProject(editProjectId, {
      nom: editProject.nom,
      description: editProject.description,
      clientId: editProject.clientId,
      clientNom,
      statut: editProject.statut,
      priorite: editProject.priorite,
      categorie: editProject.categorie,
      dateDebut: editProject.dateDebut,
      dateFin: editProject.dateFin,
      budget: editProject.budget,
      tags: editProject.tags,
    });
    setIsEditModalOpen(false);
    setEditProjectId(null);
  };

  const handleDeleteProject = (id: string) => {
    deleteProject(id);
    setConfirmDelete(null);
  };

  const handleAddProject = () => {
    if (!newProject.nom.trim()) return;
    const selectedClient = clients.find(c => c.id === newProject.clientId);
    const clientNom = selectedClient ? (selectedClient.entreprise || selectedClient.nom) : '';
    addProject({
      nom: newProject.nom,
      description: newProject.description,
      clientId: newProject.clientId,
      clientNom,
      statut: newProject.statut,
      priorite: newProject.priorite,
      categorie: newProject.categorie,
      dateDebut: newProject.dateDebut,
      dateFin: newProject.dateFin,
      budget: newProject.budget,
      depenses: 0,
      progression: 0,
      taches: [],
      milestones: [],
      equipe: [],
      freelancerIds: newProject.freelancerIds || [],
      tags: newProject.tags,
      activityLog: [],
    });
    setIsAddModalOpen(false);
    setNewProject(defaultNewProject);
  };

  const filtered = useMemo(() => {
    let list = [...projects];
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      list = list.filter(p => p.nom.toLowerCase().includes(q) || p.clientNom.toLowerCase().includes(q));
    }
    if (statusFilter !== 'tous') list = list.filter(p => p.statut === statusFilter);
    return list.sort((a, b) => {
      const pOrder = { urgente: 0, haute: 1, normale: 2, faible: 3 };
      return pOrder[a.priorite] - pOrder[b.priorite];
    });
  }, [projects, debouncedSearchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: projects.length,
    enCours: projects.filter(p => p.statut === 'en cours').length,
    termines: projects.filter(p => p.statut === 'terminé').length,
    budgetTotal: projects.reduce((s, p) => s + p.budget, 0),
    depensesTotal: projects.reduce((s, p) => s + p.depenses, 0),
  }), [projects]);

  const priorityBadge: Record<string, any> = { urgente: 'error', haute: 'warning', normale: 'info', faible: 'default' };
  const barColor: Record<string, 'purple' | 'cyan' | 'green' | 'orange'> = { urgente: 'orange', haute: 'orange', normale: 'purple', faible: 'cyan' };

  const todayMs = Date.now();

  const projetsEnRetard = useMemo(() => {
    return projects.filter(p => {
      if (p.statut === 'terminé' || p.statut === 'annulé') return false;
      return new Date(p.dateFin).getTime() < todayMs;
    });
  }, [projects, todayMs]);

  const getDaysLate = (dateFin: string): number => {
    const diff = todayMs - new Date(dateFin).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  const isLate = (p: { statut: string; dateFin: string }): boolean => {
    if (p.statut === 'terminé' || p.statut === 'annulé') return false;
    return new Date(p.dateFin).getTime() < todayMs;
  };

  const handleTaskStatus = (projectId: string, taskId: string, currentStatus: Task['statut']) => {
    const next: Record<Task['statut'], Task['statut']> = { 'todo': 'en cours', 'en cours': 'fait', 'fait': 'todo' };
    updateTask(projectId, taskId, { statut: next[currentStatus] });
    // Update project progression
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const updatedTasks = project.taches.map(t => t.id === taskId ? { ...t, statut: next[currentStatus] } : t);
      const done = updatedTasks.filter(t => t.statut === 'fait').length;
      const progression = Math.round((done / updatedTasks.length) * 100);
      updateProject(projectId, { progression });
    }
  };

  const handleAddTask = (projectId: string) => {
    addTask(projectId, { ...newTask, heuresReelles: 0, notes: [] });
    setAddTaskModal(null);
    setNewTask({ titre: '', description: '', assigneA: '', assigneAIds: [], dateEcheance: '', heuresEstimees: 8, priorite: 'normale', statut: 'todo', tags: [] });
  };

  return (
    <div className="space-y-6">

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Projets" value={stats.total} icon={FolderKanban} color="purple" />
        <StatCard title="En Cours" value={stats.enCours} icon={BarChart3} color="cyan" />
        <StatCard title="Terminés" value={stats.termines} icon={CheckSquare} color="green" />
        <StatCard title="Budget Total" value={`${(stats.budgetTotal / 1000).toFixed(0)}k€`} icon={Euro} color="orange" subtitle={`Dépenses: ${(stats.depensesTotal / 1000).toFixed(0)}k€`} />
        <StatCard title="Marge nette" value={`${(stats.budgetTotal - stats.depensesTotal).toLocaleString('fr-FR')} €`} icon={TrendingUp} color="green" />
      </div>

      {/* ── Alerte projets en retard ─────────────────────────────────────── */}
      {projetsEnRetard.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="font-semibold">{projetsEnRetard.length} projet{projetsEnRetard.length > 1 ? 's' : ''} en retard</span>
          <span className="text-amber-400/70 text-xs">— {projetsEnRetard.slice(0, 3).map(p => p.nom).join(', ')}{projetsEnRetard.length > 3 ? '…' : ''}</span>
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(['tous', 'planification', 'en cours', 'en révision', 'terminé', 'en pause'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                statusFilter === status
                  ? 'bg-primary-500/20 text-primary-300 border-primary-500/40'
                  : 'bg-card text-slate-400 border-card-border hover:text-white'
              )}
            >
              {status === 'tous' ? 'Tous' : status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-1.5 text-slate-500">
                {status === 'tous' ? projects.length : projects.filter(p => p.statut === status).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-obsidian-700 border border-card-border rounded-xl p-1">
            <button
              onClick={() => setView('list')}
              className={view === 'list' ? 'bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold' : 'text-slate-400 px-3 py-1.5 text-xs'}
            >
              <List className="w-3.5 h-3.5 inline mr-1" /> Liste
            </button>
            <button
              onClick={() => setView('kanban')}
              className={view === 'kanban' ? 'bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold' : 'text-slate-400 px-3 py-1.5 text-xs'}
            >
              <Columns className="w-3.5 h-3.5 inline mr-1" /> Kanban
            </button>
            <button
              onClick={() => setView('gantt')}
              className={view === 'gantt' ? 'bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold' : 'text-slate-400 px-3 py-1.5 text-xs'}
            >
              <GanttChart className="w-3.5 h-3.5 inline mr-1" /> Gantt
            </button>
          </div>
          {/* Export CSV Button */}
          <button
            onClick={() => exportProjectsCSV(filtered)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 border border-card-border rounded-xl hover:text-white hover:border-slate-500 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          {/* New Project Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-glow-purple"
          >
            <Plus className="w-4 h-4" />
            Nouveau Projet
          </button>
        </div>
      </div>

      {/* ── Kanban View ──────────────────────────────────────────────────── */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map(({ statut, borderColor, titleColor }) => {
            const colProjects = filtered.filter(p => p.statut === statut);
            return (
              <div
                key={statut}
                className={clsx('flex-shrink-0 w-64 bg-obsidian-800 border rounded-2xl p-3 flex flex-col gap-2', borderColor)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={clsx('text-xs font-bold uppercase tracking-wider', titleColor)}>
                    {statusConfig[statut].label}
                  </span>
                  <span className="text-slate-500 text-xs">{colProjects.length}</span>
                </div>
                {colProjects.map(project => {
                  const late = isLate(project);
                  const daysLate = late ? getDaysLate(project.dateFin) : 0;
                  return (
                    <div
                      key={project.id}
                      className={clsx(
                        'bg-card border rounded-xl p-3 cursor-pointer transition-all',
                        late ? 'border-amber-500/40 hover:border-amber-500/60' : 'border-card-border hover:border-primary-500/30'
                      )}
                    >
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <p className="text-white text-sm font-semibold truncate flex-1">{project.nom}</p>
                        {late && (
                          <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-2.5 h-2.5" /> Retard
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mb-2">{project.clientNom}{late && daysLate > 0 ? ` · ${daysLate}j de retard` : ''}</p>
                      <ProgressBar value={project.progression} color="purple" size="sm" />
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant={priorityBadge[project.priorite]}>{project.priorite}</Badge>
                        <span className="text-xs text-slate-500">
                          {project.taches.filter(t => t.statut === 'fait').length}/{project.taches.length} tâches
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-card-border/40">
                        <button
                          onClick={e => { e.stopPropagation(); openEditModal(project); }}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-primary-300 border border-card-border px-2 py-1 rounded-lg hover:bg-primary-500/10 transition-all"
                        >
                          <Edit2 className="w-3 h-3" /> Modifier
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDelete(project.id); }}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-accent-red border border-card-border px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3 h-3" /> Supprimer
                        </button>
                      </div>
                    </div>
                  );
                })}
                {colProjects.length === 0 && (
                  <p className="text-slate-600 text-xs text-center py-4">Aucun projet</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Gantt View ──────────────────────────────────────────────────── */}
      {view === 'gantt' && (() => {
        // Calculate timeline bounds
        const allDates = filtered.flatMap(p => {
          const dates: number[] = [];
          if (p.dateDebut) dates.push(new Date(p.dateDebut).getTime());
          if (p.dateFin) dates.push(new Date(p.dateFin).getTime());
          p.taches.forEach(t => {
            if (t.dateEcheance) dates.push(new Date(t.dateEcheance).getTime());
          });
          return dates;
        }).filter(d => !isNaN(d));

        const now = Date.now();
        const minDate = allDates.length > 0 ? Math.min(...allDates, now) : now - 30 * 86400000;
        const maxDate = allDates.length > 0 ? Math.max(...allDates, now) : now + 90 * 86400000;
        const pad = Math.max((maxDate - minDate) * 0.05, 7 * 86400000);
        const start = minDate - pad;
        const end = maxDate + pad;
        const totalSpan = end - start;
        const toPercent = (ts: number) => ((ts - start) / totalSpan) * 100;
        const nowPercent = toPercent(now);

        // Month labels
        const months: { label: string; left: number }[] = [];
        const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        const cursorDate = new Date(start);
        cursorDate.setDate(1);
        cursorDate.setMonth(cursorDate.getMonth() + 1);
        while (cursorDate.getTime() < end) {
          months.push({ label: `${MOIS_COURTS[cursorDate.getMonth()]} ${cursorDate.getFullYear()}`, left: toPercent(cursorDate.getTime()) });
          cursorDate.setMonth(cursorDate.getMonth() + 1);
        }

        return (
          <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
            {/* Timeline header */}
            <div className="relative h-8 bg-obsidian-800 border-b border-card-border">
              {months.map((m, i) => (
                <span key={i} className="absolute top-1.5 text-[10px] text-slate-500 font-medium whitespace-nowrap" style={{ left: `${m.left}%` }}>
                  {m.label}
                </span>
              ))}
              {/* Today marker */}
              <div className="absolute top-0 bottom-0 w-px bg-accent-red/60" style={{ left: `${nowPercent}%` }} />
            </div>

            {/* Project rows */}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-sm">Aucun projet à afficher</div>
            )}
            {filtered.map((project) => {
              const sc = statusConfig[project.statut];
              const pStart = project.dateDebut ? new Date(project.dateDebut).getTime() : now;
              const pEnd = project.dateFin ? new Date(project.dateFin).getTime() : pStart + 30 * 86400000;
              const left = toPercent(pStart);
              const width = Math.max(toPercent(pEnd) - left, 0.5);

              return (
                <div key={project.id} className="group">
                  {/* Project bar */}
                  <div className="relative h-10 border-b border-card-border/50 hover:bg-obsidian-800/50 transition-colors">
                    <div className="absolute left-2 top-1.5 text-xs text-white font-medium truncate z-10" style={{ maxWidth: `${Math.max(left - 2, 0)}%` }}>
                      {project.nom}
                    </div>
                    <div
                      className="absolute top-2 h-6 rounded-md flex items-center overflow-hidden cursor-pointer"
                      style={{ left: `${left}%`, width: `${width}%`, backgroundColor: statusHex[project.statut] }}
                      title={`${project.nom} — ${project.statut}`}
                      onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                    >
                      {/* Progress fill */}
                      <div
                        className="absolute inset-y-0 left-0 bg-white/20 rounded-l-md"
                        style={{ width: `${project.progression}%` }}
                      />
                      <span className="relative text-[10px] text-white font-semibold px-2 truncate">
                        {left > 30 ? '' : project.nom} {project.progression}%
                      </span>
                    </div>
                    {/* Today line */}
                    <div className="absolute top-0 bottom-0 w-px bg-accent-red/30" style={{ left: `${nowPercent}%` }} />
                  </div>

                  {/* Task bars (collapsed by default) */}
                  {expandedProject === project.id && project.taches.map((task) => {
                    const tEnd = task.dateEcheance ? new Date(task.dateEcheance).getTime() : pEnd;
                    const tStart = Math.max(pStart, tEnd - 7 * 86400000); // estimate 1 week before deadline
                    const tLeft = toPercent(tStart);
                    const tWidth = Math.max(toPercent(tEnd) - tLeft, 0.3);
                    const isDone = task.statut === 'fait';
                    return (
                      <div key={task.id} className="relative h-7 border-b border-card-border/30 bg-obsidian-800/30">
                        <div className="absolute left-6 top-1 text-[10px] text-slate-400 truncate z-10" style={{ maxWidth: `${Math.max(tLeft - 4, 0)}%` }}>
                          {task.titre}
                        </div>
                        <div
                          className={clsx('absolute top-1 h-5 rounded', isDone ? 'bg-emerald-500/60' : 'bg-cyan-500/40')}
                          style={{ left: `${tLeft}%`, width: `${tWidth}%` }}
                          title={`${task.titre} — ${task.statut}`}
                        >
                          <span className="text-[9px] text-white/80 px-1.5 truncate block leading-5">
                            {tLeft > 30 ? '' : task.titre}
                          </span>
                        </div>
                        <div className="absolute top-0 bottom-0 w-px bg-accent-red/20" style={{ left: `${nowPercent}%` }} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Project List ─────────────────────────────────────────────────── */}
      {view === 'list' && (
        <div className="space-y-4">
          {filtered.map((project) => {
            const sc = statusConfig[project.statut];
            const StatusIcon = sc.icon;
            const isExpanded = expandedProject === project.id;
            const budgetPercent = Math.round((project.depenses / project.budget) * 100);
            const tasksDone = project.taches.filter(t => t.statut === 'fait').length;
            const projectLate = isLate(project);
            const projectDaysLate = projectLate ? getDaysLate(project.dateFin) : 0;

            return (
              <div key={project.id} className={clsx('bg-card border rounded-2xl overflow-hidden transition-all', projectLate ? 'border-amber-500/30 hover:border-amber-500/50' : 'border-card-border hover:border-primary-500/20')}>
                {/* Project Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {isExpanded
                          ? <ChevronDown className="w-5 h-5 text-primary-400" />
                          : <ChevronRight className="w-5 h-5 text-slate-400" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-display font-bold text-white text-base">{project.nom}</h3>
                          <Badge variant={priorityBadge[project.priorite]}>{project.priorite}</Badge>
                          <Badge variant={sc.variant}>{sc.label}</Badge>
                          {projectLate && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              {projectDaysLate > 0 ? `${projectDaysLate}j de retard` : 'Retard'}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs mb-3">{project.clientNom} · {project.categorie}</p>

                        {/* Progress */}
                        <ProgressBar value={project.progression} color={barColor[project.priorite]} size="md" showLabel />
                      </div>
                    </div>

                    {/* Right Info */}
                    <div className="flex-shrink-0 text-right hidden md:flex flex-col items-end gap-2">
                      <div>
                        <p className="text-white font-bold text-lg">{project.budget.toLocaleString('fr-FR')} €</p>
                        <p className="text-slate-400 text-xs">Budget</p>
                        <div className={clsx('mt-1 text-xs font-medium', budgetPercent > 90 ? 'text-accent-red' : budgetPercent > 70 ? 'text-amber-400' : 'text-accent-green')}>
                          {budgetPercent}% dépensé
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(project)}
                          title="Modifier"
                          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary-300 border border-card-border px-2.5 py-1.5 rounded-lg hover:bg-primary-500/10 transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Modifier
                        </button>
                        <button
                          onClick={() => setConfirmDelete(project.id)}
                          title="Supprimer"
                          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-accent-red border border-card-border px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Supprimer
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Meta Row */}
                  <div className="flex items-center gap-4 mt-4 ml-8 flex-wrap">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(project.dateDebut).toLocaleDateString('fr-FR')} → {new Date(project.dateFin).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>{tasksDone}/{project.taches.length} tâches</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{project.taches.reduce((s, t) => s + t.heuresReelles, 0)}h / {project.taches.reduce((s, t) => s + t.heuresEstimees, 0)}h estimées</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {project.equipe.map((member) => (
                        <span key={member} className="text-xs bg-obsidian-600 text-slate-300 px-2 py-0.5 rounded-full border border-card-border">
                          {member}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expanded: Tasks & Milestones */}
                {isExpanded && (
                  <div className="border-t border-card-border bg-obsidian-800/50">
                    {/* Tab bar */}
                    <div className="flex items-center gap-1 px-5 pt-3 border-b border-card-border/50">
                      {([
                        { id: 'tasks', label: 'Tâches', icon: CheckSquare },
                        { id: 'objectives', label: 'Objectifs', icon: Crosshair },
                        { id: 'equipe', label: 'Équipe', icon: Users },
                        { id: 'livrables', label: 'Livrables', icon: Package },
                        { id: 'budget', label: 'Budget', icon: Wallet },
                        { id: 'liens', label: 'Liens Prestataires', icon: Link },
                        { id: 'chat', label: 'Chat', icon: MessageCircle },
                        { id: 'fichiers', label: 'Fichiers', icon: Paperclip },
                        { id: 'timeline', label: 'Timeline', icon: Activity },
                      ] as const).map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setProjectTab(prev => ({ ...prev, [project.id]: tab.id }))}
                          className={clsx(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-semibold border-b-2 transition-all',
                            (projectTab[project.id] ?? 'tasks') === tab.id
                              ? 'border-primary-500 text-primary-400'
                              : 'border-transparent text-slate-500 hover:text-white'
                          )}
                        >
                          <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Timeline tab */}
                    {(projectTab[project.id] ?? 'tasks') === 'timeline' && (
                      <div className="p-5">
                        <ProjectTimeline project={project} />
                      </div>
                    )}

                    {/* Objectives tab */}
                    {(projectTab[project.id] ?? 'tasks') === 'objectives' && (
                      <div className="p-5 space-y-5">
                        {/* Sub-categories */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-white flex items-center gap-2"><Layers className="w-4 h-4 text-primary-400" /> Sous-catégories</h4>
                            <button
                              onClick={() => { setAddSubCatModal(project.id); setNewSubCat({ nom: '', description: '', couleur: '#7c3aed' }); }}
                              className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 border border-primary-500/30 px-2 py-1 rounded-lg hover:bg-primary-500/10 transition-all"
                            >
                              <Plus className="w-3 h-3" /> Ajouter
                            </button>
                          </div>
                          {(project.subCategories || []).length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-3">Aucune sous-catégorie</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {(project.subCategories || []).map(sc => (
                                <div key={sc.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-card-border bg-card">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sc.couleur }} />
                                  <span className="text-xs text-white font-medium">{sc.nom}</span>
                                  <button onClick={() => deleteSubCategory(project.id, sc.id)} className="text-slate-600 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Objectives */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-white flex items-center gap-2"><Crosshair className="w-4 h-4 text-accent-cyan" /> Objectifs ({(project.objectives || []).length})</h4>
                            <button
                              onClick={() => { setAddObjModal(project.id); setNewObj({ titre: '', description: '', dateEcheance: '', priorite: 'normale', assigneAIds: [], taskIds: [] }); }}
                              className="flex items-center gap-1 text-xs text-accent-cyan hover:text-cyan-300 border border-accent-cyan/30 px-2 py-1 rounded-lg hover:bg-accent-cyan/10 transition-all"
                            >
                              <Plus className="w-3 h-3" /> Nouvel objectif
                            </button>
                          </div>
                          {(project.objectives || []).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 bg-obsidian-900/50 rounded-xl border border-card-border/50 text-slate-500">
                              <Crosshair className="w-8 h-8 mb-2 opacity-30" />
                              <p className="text-sm">Aucun objectif défini</p>
                              <p className="text-xs text-slate-600 mt-1">Les objectifs regroupent des tâches et sont visibles par les freelancers</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {(project.objectives || []).map(obj => {
                                const linkedTasks = project.taches.filter(t => obj.taskIds.includes(t.id));
                                const doneTasks = linkedTasks.filter(t => t.statut === 'fait').length;
                                const progress = linkedTasks.length > 0 ? Math.round((doneTasks / linkedTasks.length) * 100) : 0;
                                const assignedNames = (obj.assigneAIds || []).map(id => {
                                  const f = freelancers.find(fl => fl.id === id);
                                  return f ? `${f.prenom} ${f.nom}` : '';
                                }).filter(Boolean);
                                const objStatusCls = obj.statut === 'fait' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                  : obj.statut === 'en cours' ? 'bg-primary-500/20 border-primary-500/30 text-primary-400'
                                  : 'bg-slate-500/20 border-slate-500/30 text-slate-400';

                                return (
                                  <div key={obj.id} className="bg-card border border-card-border rounded-xl p-4 hover:border-primary-500/30 transition-all">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h5 className="text-sm font-semibold text-white">{obj.titre}</h5>
                                          <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-semibold border', objStatusCls)}>
                                            {obj.statut === 'fait' ? 'Terminé' : obj.statut === 'en cours' ? 'En cours' : 'À faire'}
                                          </span>
                                        </div>
                                        {obj.description && <p className="text-xs text-slate-400 line-clamp-2">{obj.description}</p>}
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <select
                                          value={obj.statut}
                                          onChange={e => updateObjective(project.id, obj.id, { statut: e.target.value as Objective['statut'] })}
                                          className="bg-obsidian-700 border border-card-border rounded-lg text-xs text-white px-2 py-1 focus:outline-none"
                                        >
                                          <option value="todo">À faire</option>
                                          <option value="en cours">En cours</option>
                                          <option value="fait">Terminé</option>
                                        </select>
                                        <button onClick={() => deleteObjective(project.id, obj.id)} className="p-1 text-slate-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                      </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="mb-2">
                                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                        <span>{doneTasks}/{linkedTasks.length} tâches</span>
                                        <span>{progress}%</span>
                                      </div>
                                      <div className="h-1.5 rounded-full bg-obsidian-900 overflow-hidden">
                                        <div className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-primary-500 transition-all" style={{ width: `${progress}%` }} />
                                      </div>
                                    </div>
                                    {/* Assigned freelancers */}
                                    {assignedNames.length > 0 && (
                                      <div className="flex items-center gap-1 flex-wrap mt-2">
                                        <Users className="w-3 h-3 text-slate-500" />
                                        {assignedNames.map(name => (
                                          <span key={name} className="text-[10px] bg-obsidian-700 text-slate-300 px-2 py-0.5 rounded-full border border-card-border">{name}</span>
                                        ))}
                                      </div>
                                    )}
                                    {/* Linked tasks */}
                                    {linkedTasks.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {linkedTasks.map(t => (
                                          <div key={t.id} className="flex items-center gap-2 text-xs">
                                            {t.statut === 'fait'
                                              ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                              : t.statut === 'en cours'
                                              ? <Circle className="w-3 h-3 text-primary-400 fill-current opacity-50" />
                                              : <Circle className="w-3 h-3 text-slate-500" />}
                                            <span className={clsx(t.statut === 'fait' ? 'text-slate-500 line-through' : 'text-slate-300')}>{t.titre}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {obj.dateEcheance && (
                                      <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
                                        <Calendar className="w-3 h-3" />
                                        <span>Échéance : {new Date(obj.dateEcheance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Équipe tab */}
                    {(projectTab[project.id] ?? 'tasks') === 'equipe' && (
                      <div className="p-5">
                        <ProjectTeam
                          project={project}
                          allFreelancers={freelancers}
                          onAdd={(fid) => addFreelancerToProject(project.id, fid)}
                          onRemove={(fid) => removeFreelancerFromProject(project.id, fid)}
                        />
                      </div>
                    )}

                    {/* Livrables tab */}
                    {(projectTab[project.id] ?? 'tasks') === 'livrables' && (
                      <div className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary-400" />
                            Livrables ({(project.livrables || []).length})
                          </h4>
                          <button
                            onClick={() => {
                              const newLivrable: Livrable = {
                                id: crypto.randomUUID(),
                                titre: 'Nouveau livrable',
                                type: 'post',
                                plateforme: 'Instagram',
                                datePrevue: new Date().toISOString().split('T')[0],
                                statut: 'planifié',
                                description: '',
                              };
                              updateProject(project.id, {
                                livrables: [...(project.livrables || []), newLivrable],
                              });
                            }}
                            className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 border border-primary-500/30 px-2 py-1 rounded-lg hover:bg-primary-500/10 transition-all"
                          >
                            <Plus className="w-3 h-3" /> Ajouter
                          </button>
                        </div>

                        {(project.livrables || []).length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Aucun livrable défini</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(project.livrables || []).map(liv => {
                              const statusColors: Record<LivrableStatut, string> = {
                                'planifié': 'bg-slate-500/15 border-slate-500/30 text-slate-400',
                                'en production': 'bg-primary-500/15 border-primary-500/30 text-primary-400',
                                'en revue': 'bg-amber-500/15 border-amber-500/30 text-amber-400',
                                'validé': 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
                                'publié': 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
                              };
                              const assignedF = freelancers.find(f => f.id === liv.freelancerId);
                              const reviewStatusBadge: Record<string, string> = {
                                'approved': 'bg-emerald-500/15 text-emerald-300',
                                'revision_requested': 'bg-amber-500/15 text-amber-300',
                                'pending': 'bg-slate-500/15 text-slate-400',
                                'rejected': 'bg-red-500/15 text-red-300',
                              };
                              return (
                                <div key={liv.id} className="p-3 rounded-xl bg-obsidian-700 border border-card-border/50 group">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-white">{liv.titre}</p>
                                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className="text-xs bg-obsidian-600 text-slate-400 px-1.5 py-0.5 rounded">{liv.type}</span>
                                        <span className="text-xs text-slate-500">{liv.plateforme}</span>
                                        {assignedF && <span className="text-xs text-slate-500">· {assignedF.prenom} {assignedF.nom}</span>}
                                        <span className="text-xs text-slate-500">· {new Date(liv.datePrevue).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                        {liv.reviewStatus && (
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${reviewStatusBadge[liv.reviewStatus] || ''}`}>
                                            {liv.reviewStatus === 'approved' ? 'Approuvé' : liv.reviewStatus === 'revision_requested' ? 'Révision demandée' : liv.reviewStatus === 'rejected' ? 'Rejeté' : 'En attente'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <select
                                      value={liv.statut}
                                      onChange={(e) => {
                                        const updated = (project.livrables || []).map(l =>
                                          l.id === liv.id ? { ...l, statut: e.target.value as LivrableStatut } : l
                                        );
                                        updateProject(project.id, { livrables: updated });
                                      }}
                                      className={`text-xs px-2 py-1 rounded-lg border cursor-pointer ${statusColors[liv.statut]} bg-transparent`}
                                    >
                                      <option value="planifié">Planifié</option>
                                      <option value="en production">En production</option>
                                      <option value="en revue">En revue</option>
                                      <option value="validé">Validé</option>
                                      <option value="publié">Publié</option>
                                    </select>
                                    <button
                                      onClick={() => {
                                        updateProject(project.id, {
                                          livrables: (project.livrables || []).filter(l => l.id !== liv.id),
                                        });
                                      }}
                                      className="text-slate-600 hover:text-accent-red transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  {liv.statut === 'en revue' && (
                                    <div className="flex gap-2 mt-2">
                                      <button
                                        onClick={() => updateLivrable(project.id, liv.id, {
                                          statut: 'validé',
                                          reviewStatus: 'approved',
                                          reviewDate: new Date().toISOString(),
                                          reviewedBy: `${currentUser?.prenom || ''} ${currentUser?.nom || ''}`.trim()
                                        })}
                                        className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-[10px] font-semibold hover:bg-emerald-500/30"
                                      >
                                        <CheckCircle2 className="w-3 h-3" /> Approuver
                                      </button>
                                      <button
                                        onClick={() => {
                                          const comment = prompt('Commentaire de révision:');
                                          if (comment !== null) {
                                            updateLivrable(project.id, liv.id, {
                                              statut: 'en production',
                                              reviewStatus: 'revision_requested',
                                              reviewComment: comment,
                                              reviewDate: new Date().toISOString(),
                                              reviewedBy: `${currentUser?.prenom || ''} ${currentUser?.nom || ''}`.trim()
                                            });
                                          }
                                        }}
                                        className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-[10px] font-semibold hover:bg-amber-500/30"
                                      >
                                        <AlertCircle className="w-3 h-3" /> Révision
                                      </button>
                                    </div>
                                  )}
                                  {liv.reviewStatus === 'revision_requested' && liv.reviewComment && (
                                    <p className="text-[10px] text-amber-400 mt-1 italic">💬 {liv.reviewComment}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Budget tab */}
                    {(projectTab[project.id] ?? 'tasks') === 'budget' && (() => {
                      const depenses = project.depensesProjet || [];
                      const totalDepenses = depenses.reduce((s, d) => s + d.montant, 0);
                      const restant = project.budget - totalDepenses;
                      const pctUsed = project.budget > 0 ? Math.round((totalDepenses / project.budget) * 100) : 0;
                      // Group by freelancer
                      const byFreelancer: Record<string, number> = {};
                      depenses.forEach(d => {
                        const key = d.freelancerId || '__agence__';
                        byFreelancer[key] = (byFreelancer[key] || 0) + d.montant;
                      });

                      return (
                        <div className="p-5 space-y-5">
                          {/* Budget summary cards */}
                          <div className="grid grid-cols-4 gap-3">
                            <div className="bg-obsidian-700 border border-card-border/50 rounded-xl p-3">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Budget total</p>
                              <p className="text-lg font-bold text-white">{project.budget.toLocaleString('fr-FR')} €</p>
                            </div>
                            <div className="bg-obsidian-700 border border-card-border/50 rounded-xl p-3">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Dépensé</p>
                              <p className={`text-lg font-bold ${pctUsed > 90 ? 'text-accent-red' : 'text-amber-400'}`}>{totalDepenses.toLocaleString('fr-FR')} €</p>
                            </div>
                            <div className="bg-obsidian-700 border border-card-border/50 rounded-xl p-3">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Restant</p>
                              <p className={`text-lg font-bold ${restant < 0 ? 'text-accent-red' : 'text-accent-green'}`}>{restant.toLocaleString('fr-FR')} €</p>
                            </div>
                            <div className="bg-obsidian-700 border border-card-border/50 rounded-xl p-3">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Utilisation</p>
                              <p className={`text-lg font-bold ${pctUsed > 90 ? 'text-accent-red' : pctUsed > 70 ? 'text-amber-400' : 'text-accent-green'}`}>{pctUsed}%</p>
                            </div>
                          </div>

                          <ProgressBar value={totalDepenses} max={project.budget || 1} color={pctUsed > 90 ? 'orange' : 'green'} size="md" />

                          {/* Breakdown by freelancer */}
                          {Object.keys(byFreelancer).length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-3">Répartition par prestataire</h4>
                              <div className="space-y-2">
                                {Object.entries(byFreelancer).map(([fid, amount]) => {
                                  const fl = freelancers.find(f => f.id === fid);
                                  const pct = project.budget > 0 ? Math.round((amount / project.budget) * 100) : 0;
                                  return (
                                    <div key={fid} className="flex items-center gap-3 p-2 rounded-lg bg-obsidian-700 border border-card-border/30">
                                      <div className="flex-1">
                                        <p className="text-xs text-white font-medium">{fl ? `${fl.prenom} ${fl.nom}` : 'Agence'}</p>
                                        <div className="h-1.5 rounded-full bg-obsidian-900 mt-1 overflow-hidden">
                                          <div className="h-full rounded-full bg-gradient-to-r from-primary-600 to-cyan-500" style={{ width: `${pct}%` }} />
                                        </div>
                                      </div>
                                      <span className="text-xs font-semibold text-white">{amount.toLocaleString('fr-FR')} €</span>
                                      <span className="text-[10px] text-slate-500">{pct}%</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Expense list */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-white">Dépenses ({depenses.length})</h4>
                              <button
                                onClick={() => {
                                  const newDepense: DepenseProjet = {
                                    id: crypto.randomUUID(),
                                    description: 'Nouvelle dépense',
                                    montant: 0,
                                    date: new Date().toISOString().split('T')[0],
                                    categorie: 'Prestation',
                                  };
                                  updateProject(project.id, {
                                    depensesProjet: [...depenses, newDepense],
                                    depenses: totalDepenses,
                                  });
                                }}
                                className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 border border-primary-500/30 px-2 py-1 rounded-lg hover:bg-primary-500/10 transition-all"
                              >
                                <Plus className="w-3 h-3" /> Ajouter
                              </button>
                            </div>
                            {depenses.length === 0 ? (
                              <div className="text-center py-6 text-slate-500">
                                <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Aucune dépense enregistrée</p>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {depenses.map(dep => (
                                  <div key={dep.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-obsidian-700 border border-card-border/30 group">
                                    <Euro className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-white font-medium">{dep.description}</p>
                                      <p className="text-[10px] text-slate-500">
                                        {dep.categorie} · {new Date(dep.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                      </p>
                                    </div>
                                    <span className="text-xs font-semibold text-amber-400">{dep.montant.toLocaleString('fr-FR')} €</span>
                                    <button
                                      onClick={() => {
                                        const updated = depenses.filter(d => d.id !== dep.id);
                                        const newTotal = updated.reduce((s, d) => s + d.montant, 0);
                                        updateProject(project.id, { depensesProjet: updated, depenses: newTotal });
                                      }}
                                      className="text-slate-600 hover:text-accent-red transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Liens d'avancement tab */}
                    {(projectTab[project.id] ?? 'tasks') === 'liens' && (
                      <div className="p-5 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Link className="w-4 h-4 text-primary-400" />
                            Liens d'avancement
                          </h3>
                          <button onClick={() => setLienModalOpen(project.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/20 text-primary-300 rounded-lg text-xs font-semibold hover:bg-primary-500/30 transition-all">
                            <Plus className="w-3.5 h-3.5" />
                            Ajouter
                          </button>
                        </div>

                        {(project.liensAvancement || []).length === 0 ? (
                          <p className="text-slate-500 text-sm text-center py-8">Aucun lien partagé</p>
                        ) : (
                          <div className="space-y-2">
                            {(project.liensAvancement || []).map(lien => {
                              const iconConfig = LIEN_ICONS[lien.type] || LIEN_ICONS.autre;
                              return (
                                <div key={lien.id} className="flex items-center gap-3 p-3 bg-obsidian-700 border border-card-border rounded-xl hover:border-primary-500/30 transition-all">
                                  <div className={`w-8 h-8 rounded-lg bg-obsidian-800 flex items-center justify-center ${iconConfig.color}`}>
                                    <iconConfig.icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{lien.titre}</p>
                                    <p className="text-xs text-slate-500 truncate">{lien.url}</p>
                                  </div>
                                  <a href={lien.url} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 transition-colors">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                  <button onClick={() => deleteLienAvancement(project.id, lien.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Chat tab */}
                    {(projectTab[project.id] ?? 'tasks') === 'chat' && (
                      <ProjectChat projectId={project.id} projectNom={project.nom} />
                    )}

                    {/* Fichiers tab */}
                    {(projectTab[project.id] ?? 'tasks') === 'fichiers' && (
                      <FileManager projectId={project.id} />
                    )}

                    {/* Tasks & Milestones tab */}
                    {(projectTab[project.id] ?? 'tasks') === 'tasks' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-x divide-card-border">

                      {/* Tasks */}
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-white text-sm">Tâches ({project.taches.length})</h4>
                          <button
                            onClick={() => setAddTaskModal(project.id)}
                            className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 border border-primary-500/30 px-2 py-1 rounded-lg hover:bg-primary-500/10 transition-all"
                          >
                            <Plus className="w-3 h-3" />
                            Ajouter
                          </button>
                        </div>
                        {/* Freelancer filter */}
                        {(project.freelancerIds?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                            <button
                              onClick={() => setTaskFreelancerFilter('all')}
                              className={clsx('px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all', taskFreelancerFilter === 'all' ? 'bg-primary-500/20 border-primary-500/40 text-primary-400' : 'border-card-border text-slate-500 hover:text-white')}
                            >
                              Tous
                            </button>
                            {freelancers.filter(f => project.freelancerIds?.includes(f.id)).map(f => (
                              <button
                                key={f.id}
                                onClick={() => setTaskFreelancerFilter(f.id)}
                                className={clsx('px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all', taskFreelancerFilter === f.id ? 'bg-primary-500/20 border-primary-500/40 text-primary-400' : 'border-card-border text-slate-500 hover:text-white')}
                              >
                                {f.prenom} {f.nom.charAt(0)}.
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="space-y-2">
                          {project.taches.filter(task => {
                            if (taskFreelancerFilter === 'all') return true;
                            return (task.assigneAIds || []).includes(taskFreelancerFilter) ||
                              task.assigneA.toLowerCase().includes(
                                (() => { const f = freelancers.find(fl => fl.id === taskFreelancerFilter); return f ? `${f.prenom} ${f.nom}`.toLowerCase() : ''; })()
                              );
                          }).map((task) => {
                            const ts = taskStatusConfig[task.statut];
                            return (
                              <div key={task.id} className={clsx('flex items-center gap-3 p-3 rounded-xl border transition-all', ts.bg)}>
                                <button
                                  onClick={() => handleTaskStatus(project.id, task.id, task.statut)}
                                  className={clsx('flex-shrink-0 transition-colors', ts.color)}
                                >
                                  {task.statut === 'fait' ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                  ) : task.statut === 'en cours' ? (
                                    <Circle className="w-4 h-4 fill-current opacity-50" />
                                  ) : (
                                    <Circle className="w-4 h-4" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={clsx('text-sm font-medium', task.statut === 'fait' ? 'line-through text-slate-500' : 'text-white')}>{task.titre}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {task.assigneA ? (
                                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                                        <span className="w-4 h-4 rounded-full bg-primary-500/20 text-primary-400 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                                          {task.assigneA.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                        </span>
                                        {task.assigneA}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-slate-600 italic">Non assigné</span>
                                    )}
                                    {task.dateEcheance && (
                                      <span className="text-xs text-slate-500">· {new Date(task.dateEcheance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-xs text-slate-500">{task.heuresReelles}h/{task.heuresEstimees}h</span>
                                  <button onClick={() => deleteTask(project.id, task.id)} className="text-slate-600 hover:text-accent-red transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {project.taches.length === 0 && (
                            <p className="text-slate-500 text-xs text-center py-4">Aucune tâche. Cliquez sur + Ajouter</p>
                          )}
                        </div>
                      </div>

                      {/* Milestones */}
                      <div className="p-5">
                        <h4 className="font-semibold text-white text-sm mb-4">Milestones ({project.milestones.length})</h4>
                        <div className="space-y-2">
                          {project.milestones.map((ms) => {
                            const isPast = new Date(ms.dateEcheance) < new Date('2026-03-22');
                            const isLate = !ms.complete && isPast;
                            return (
                              <div key={ms.id} className={clsx(
                                'flex items-center gap-3 p-3 rounded-xl border transition-all',
                                ms.complete ? 'bg-emerald-500/10 border-emerald-500/20' :
                                isLate ? 'bg-accent-red/10 border-accent-red/20' :
                                'bg-obsidian-700 border-card-border/50'
                              )}>
                                <button
                                  onClick={() => updateProject(project.id, { milestones: project.milestones.map(m => m.id === ms.id ? { ...m, complete: !m.complete } : m) })}
                                  className={ms.complete ? 'text-emerald-400' : isLate ? 'text-red-400' : 'text-slate-500'}
                                >
                                  {ms.complete ? <CheckCircle2 className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={clsx('text-sm font-medium', ms.complete ? 'line-through text-slate-500' : 'text-white')}>{ms.titre}</p>
                                  <p className={clsx('text-xs', isLate ? 'text-red-400' : 'text-slate-500')}>
                                    {isLate ? '⚠ En retard — ' : ''}{new Date(ms.dateEcheance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Budget Breakdown */}
                        <div className="mt-5 pt-4 border-t border-card-border/50">
                          <h4 className="font-semibold text-white text-sm mb-3">Budget</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Budget total</span>
                              <span className="text-white font-semibold">{project.budget.toLocaleString('fr-FR')} €</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Dépensé</span>
                              <span className={clsx('font-semibold', budgetPercent > 90 ? 'text-accent-red' : 'text-amber-400')}>
                                {project.depenses.toLocaleString('fr-FR')} €
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Restant</span>
                              <span className="text-accent-green font-semibold">{(project.budget - project.depenses).toLocaleString('fr-FR')} €</span>
                            </div>
                            <ProgressBar
                              value={project.depenses}
                              max={project.budget}
                              color={budgetPercent > 90 ? 'orange' : budgetPercent > 70 ? 'orange' : 'green'}
                              size="md"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="bg-card border border-card-border rounded-2xl py-16 text-center">
              <FolderKanban className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400 font-medium">Aucun projet trouvé</p>
              <p className="text-slate-600 text-sm mt-1">Modifiez vos filtres ou créez un nouveau projet</p>
            </div>
          )}
        </div>
      )}

      {/* ── Add Task Modal ────────────────────────────────────────────────── */}
      <Modal isOpen={!!addTaskModal} onClose={() => setAddTaskModal(null)} title="Nouvelle Tâche" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Titre <span className="text-accent-red">*</span></label>
            <input value={newTask.titre} onChange={e => setNewTask(p => ({ ...p, titre: e.target.value }))} className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="Titre de la tâche..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Assigné à</label>
              {(() => {
                const proj = projects.find(p => p.id === addTaskModal);
                const projectFreelancers = freelancers.filter(f =>
                  (proj?.freelancerIds || []).includes(f.id)
                );
                const equipeMembers = (proj?.equipe || []).map(name => ({ id: `equipe-${name}`, label: name }));
                const hasOptions = projectFreelancers.length > 0 || equipeMembers.length > 0;
                return hasOptions ? (
                  <select
                    value={newTask.assigneAIds[0] || ''}
                    onChange={e => {
                      const selectedId = e.target.value;
                      if (!selectedId) {
                        setNewTask(p => ({ ...p, assigneA: '', assigneAIds: [] }));
                        return;
                      }
                      const fl = freelancers.find(f => f.id === selectedId);
                      if (fl) {
                        setNewTask(p => ({ ...p, assigneA: `${fl.prenom} ${fl.nom}`, assigneAIds: [fl.id] }));
                      } else {
                        // Membre équipe agence
                        const name = equipeMembers.find(m => m.id === selectedId)?.label || selectedId;
                        setNewTask(p => ({ ...p, assigneA: name, assigneAIds: [] }));
                      }
                    }}
                    className={INPUT_CLASS}
                  >
                    <option value="">— Non assigné —</option>
                    {projectFreelancers.length > 0 && (
                      <optgroup label="Prestataires du projet">
                        {projectFreelancers.map(f => (
                          <option key={f.id} value={f.id}>{f.prenom} {f.nom} — {f.specialite}</option>
                        ))}
                      </optgroup>
                    )}
                    {equipeMembers.length > 0 && (
                      <optgroup label="Équipe agence">
                        {equipeMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newTask.assigneA}
                    onChange={e => setNewTask(p => ({ ...p, assigneA: e.target.value, assigneAIds: [] }))}
                    placeholder="Ajoutez d'abord des prestataires au projet"
                    className={INPUT_CLASS}
                  />
                );
              })()}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Échéance</label>
              <input type="date" value={newTask.dateEcheance} onChange={e => setNewTask(p => ({ ...p, dateEcheance: e.target.value }))} className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Priorité</label>
              <select value={newTask.priorite} onChange={e => setNewTask(p => ({ ...p, priorite: e.target.value as any }))} className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500">
                <option value="faible">Faible</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Heures estimées</label>
              <input type="number" value={newTask.heuresEstimees} onChange={e => setNewTask(p => ({ ...p, heuresEstimees: Number(e.target.value) }))} className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500" min="0.5" step="0.5" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setAddTaskModal(null)} className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:bg-card-hover hover:text-white transition-all">Annuler</button>
            <button onClick={() => addTaskModal && handleAddTask(addTaskModal)} disabled={!newTask.titre} className="flex-1 py-2.5 rounded-xl bg-gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">Créer la tâche</button>
          </div>
        </div>
      </Modal>

      {/* ── Confirm Delete ─────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) handleDeleteProject(confirmDelete); }}
        title="Supprimer le projet ?"
        message="Cette action est irréversible. Toutes les données associées seront perdues."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />

      {/* ── Edit Project Modal ───────────────────────────────────────────── */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditProjectId(null); }} title="Modifier le Projet" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom <span className="text-accent-red">*</span></label>
            <input
              value={editProject.nom}
              onChange={e => setEditProject(p => ({ ...p, nom: e.target.value }))}
              className={INPUT_CLASS}
              placeholder="Nom du projet..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
            <textarea
              value={editProject.description}
              onChange={e => setEditProject(p => ({ ...p, description: e.target.value }))}
              className={INPUT_CLASS}
              rows={3}
              placeholder="Description du projet..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Client</label>
              <select
                value={editProject.clientId}
                onChange={e => setEditProject(p => ({ ...p, clientId: e.target.value }))}
                className={INPUT_CLASS}
              >
                <option value="">— Aucun client —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.entreprise || c.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Statut</label>
              <select
                value={editProject.statut}
                onChange={e => setEditProject(p => ({ ...p, statut: e.target.value as ProjectStatus }))}
                className={INPUT_CLASS}
              >
                <option value="planification">Planification</option>
                <option value="en cours">En cours</option>
                <option value="en révision">En révision</option>
                <option value="terminé">Terminé</option>
                <option value="en pause">En pause</option>
                <option value="annulé">Annulé</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Priorité</label>
              <select
                value={editProject.priorite}
                onChange={e => setEditProject(p => ({ ...p, priorite: e.target.value as Project['priorite'] }))}
                className={INPUT_CLASS}
              >
                <option value="faible">Faible</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Catégorie</label>
              <input
                value={editProject.categorie}
                onChange={e => setEditProject(p => ({ ...p, categorie: e.target.value }))}
                className={INPUT_CLASS}
                placeholder="Ex: Web, Mobile, Design..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date début</label>
              <input
                type="date"
                value={editProject.dateDebut}
                onChange={e => setEditProject(p => ({ ...p, dateDebut: e.target.value }))}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date fin estimée</label>
              <input
                type="date"
                value={editProject.dateFin}
                onChange={e => setEditProject(p => ({ ...p, dateFin: e.target.value }))}
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Budget (€)</label>
            <input
              type="number"
              value={editProject.budget}
              onChange={e => setEditProject(p => ({ ...p, budget: Number(e.target.value) }))}
              className={INPUT_CLASS}
              min="0"
              step="100"
              placeholder="0"
            />
          </div>
          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tags</label>
            <TagPicker
              selected={editProject.tags}
              onChange={(tags) => setEditProject(p => ({ ...p, tags }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setIsEditModalOpen(false); setEditProjectId(null); }}
              className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:bg-card-hover hover:text-white transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleEditProject}
              disabled={!editProject.nom.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Add Project Modal ────────────────────────────────────────────── */}
      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setNewProject(defaultNewProject); }} title="Nouveau Projet" size="lg">
        <div className="space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom <span className="text-accent-red">*</span></label>
            <input
              value={newProject.nom}
              onChange={e => setNewProject(p => ({ ...p, nom: e.target.value }))}
              className={INPUT_CLASS}
              placeholder="Nom du projet..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
            <textarea
              value={newProject.description}
              onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))}
              className={INPUT_CLASS}
              rows={3}
              placeholder="Description du projet..."
            />
          </div>

          {/* Client + Statut */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Client</label>
              <select
                value={newProject.clientId}
                onChange={e => setNewProject(p => ({ ...p, clientId: e.target.value }))}
                className={INPUT_CLASS}
              >
                <option value="">— Aucun client —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.entreprise || c.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Statut</label>
              <select
                value={newProject.statut}
                onChange={e => setNewProject(p => ({ ...p, statut: e.target.value as ProjectStatus }))}
                className={INPUT_CLASS}
              >
                <option value="planification">Planification</option>
                <option value="en cours">En cours</option>
                <option value="en révision">En révision</option>
                <option value="terminé">Terminé</option>
                <option value="en pause">En pause</option>
                <option value="annulé">Annulé</option>
              </select>
            </div>
          </div>

          {/* Priorité + Catégorie */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Priorité</label>
              <select
                value={newProject.priorite}
                onChange={e => setNewProject(p => ({ ...p, priorite: e.target.value as Project['priorite'] }))}
                className={INPUT_CLASS}
              >
                <option value="faible">Faible</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Catégorie</label>
              <input
                value={newProject.categorie}
                onChange={e => setNewProject(p => ({ ...p, categorie: e.target.value }))}
                className={INPUT_CLASS}
                placeholder="Ex: Web, Mobile, Design..."
              />
            </div>
          </div>

          {/* Date début + Date fin */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date début</label>
              <input
                type="date"
                value={newProject.dateDebut}
                onChange={e => setNewProject(p => ({ ...p, dateDebut: e.target.value }))}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date fin</label>
              <input
                type="date"
                value={newProject.dateFin}
                onChange={e => setNewProject(p => ({ ...p, dateFin: e.target.value }))}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Budget (€)</label>
            <input
              type="number"
              value={newProject.budget}
              onChange={e => setNewProject(p => ({ ...p, budget: Number(e.target.value) }))}
              className={INPUT_CLASS}
              min="0"
              step="100"
              placeholder="0"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tags</label>
            <TagPicker
              selected={newProject.tags}
              onChange={(tags) => setNewProject(p => ({ ...p, tags }))}
            />
          </div>

          {/* Équipe — Freelancers */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Équipe (prestataires)</label>
            {newProject.freelancerIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {newProject.freelancerIds.map(fid => {
                  const fl = freelancers.find(f => f.id === fid);
                  if (!fl) return null;
                  return (
                    <span key={fid} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-primary-500/15 text-primary-400">
                      {fl.prenom} {fl.nom}
                      <button onClick={() => setNewProject(p => ({ ...p, freelancerIds: p.freelancerIds.filter(id => id !== fid) }))} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                    </span>
                  );
                })}
              </div>
            )}
            <select
              value=""
              onChange={e => {
                if (e.target.value && !newProject.freelancerIds.includes(e.target.value)) {
                  setNewProject(p => ({ ...p, freelancerIds: [...p.freelancerIds, e.target.value] }));
                }
              }}
              className={INPUT_CLASS}
            >
              <option value="">— Ajouter un prestataire —</option>
              {freelancers.filter(f => !newProject.freelancerIds.includes(f.id)).map(f => (
                <option key={f.id} value={f.id}>{f.prenom} {f.nom} — {f.specialite}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setIsAddModalOpen(false); setNewProject(defaultNewProject); }}
              className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:bg-card-hover hover:text-white transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleAddProject}
              disabled={!newProject.nom.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              Créer le projet
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Add SubCategory Modal ──────────────────────────────────────── */}
      <Modal isOpen={!!addSubCatModal} onClose={() => setAddSubCatModal(null)} title="Nouvelle sous-catégorie" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom <span className="text-accent-red">*</span></label>
            <input
              value={newSubCat.nom}
              onChange={e => setNewSubCat(s => ({ ...s, nom: e.target.value }))}
              className={INPUT_CLASS}
              placeholder="Ex: Design, Développement..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
            <input
              value={newSubCat.description}
              onChange={e => setNewSubCat(s => ({ ...s, description: e.target.value }))}
              className={INPUT_CLASS}
              placeholder="Description optionnelle..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Couleur</label>
            <div className="flex gap-2">
              {SUB_CAT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewSubCat(s => ({ ...s, couleur: c }))}
                  className={clsx('w-8 h-8 rounded-lg border-2 transition-all', newSubCat.couleur === c ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setAddSubCatModal(null)} className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:bg-card-hover hover:text-white transition-all">Annuler</button>
            <button
              onClick={() => {
                if (!addSubCatModal || !newSubCat.nom.trim()) return;
                addSubCategory(addSubCatModal, { nom: newSubCat.nom, description: newSubCat.description, couleur: newSubCat.couleur, ordre: (projects.find(p => p.id === addSubCatModal)?.subCategories || []).length });
                setAddSubCatModal(null);
              }}
              disabled={!newSubCat.nom.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              Créer
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Add Objective Modal ────────────────────────────────────────── */}
      <Modal isOpen={!!addObjModal} onClose={() => setAddObjModal(null)} title="Nouvel objectif" size="lg">
        {(() => {
          const project = projects.find(p => p.id === addObjModal);
          if (!project) return null;
          const projectFreelancersList = freelancers.filter(f => (project.freelancerIds || []).includes(f.id));
          return (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Titre <span className="text-accent-red">*</span></label>
                <input
                  value={newObj.titre}
                  onChange={e => setNewObj(o => ({ ...o, titre: e.target.value }))}
                  className={INPUT_CLASS}
                  placeholder="Ex: Livrer la maquette V1..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
                <textarea
                  value={newObj.description}
                  onChange={e => setNewObj(o => ({ ...o, description: e.target.value }))}
                  className={INPUT_CLASS}
                  rows={2}
                  placeholder="Détails de l'objectif..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Échéance</label>
                  <input
                    type="date"
                    value={newObj.dateEcheance}
                    onChange={e => setNewObj(o => ({ ...o, dateEcheance: e.target.value }))}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Priorité</label>
                  <select
                    value={newObj.priorite}
                    onChange={e => setNewObj(o => ({ ...o, priorite: e.target.value as Task['priorite'] }))}
                    className={INPUT_CLASS}
                  >
                    <option value="faible">Faible</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>
              {/* Freelancer assignment (multi-select) */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Freelancers assignés</label>
                {projectFreelancersList.length === 0 ? (
                  <p className="text-xs text-slate-500">Aucun freelancer sur ce projet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {projectFreelancersList.map(f => {
                      const isSelected = newObj.assigneAIds.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          onClick={() => setNewObj(o => ({
                            ...o,
                            assigneAIds: isSelected ? o.assigneAIds.filter(id => id !== f.id) : [...o.assigneAIds, f.id]
                          }))}
                          className={clsx(
                            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                            isSelected ? 'bg-primary-500/20 border-primary-500/50 text-primary-300' : 'bg-card border-card-border text-slate-400 hover:border-primary-500/30'
                          )}
                        >
                          {f.prenom} {f.nom}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Task linking (multi-select) */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tâches liées</label>
                {(project.taches || []).length === 0 ? (
                  <p className="text-xs text-slate-500">Aucune tâche dans ce projet</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {(project.taches || []).map(t => {
                      const isLinked = newObj.taskIds.includes(t.id);
                      const tCfg = taskStatusConfig[t.statut];
                      return (
                        <button
                          key={t.id}
                          onClick={() => setNewObj(o => ({
                            ...o,
                            taskIds: isLinked ? o.taskIds.filter(id => id !== t.id) : [...o.taskIds, t.id]
                          }))}
                          className={clsx(
                            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all text-left',
                            isLinked ? 'bg-accent-cyan/10 border-accent-cyan/30' : 'bg-card border-card-border hover:border-accent-cyan/20'
                          )}
                        >
                          <CheckSquare className={clsx('w-3.5 h-3.5 flex-shrink-0', isLinked ? 'text-accent-cyan' : 'text-slate-600')} />
                          <span className={clsx('flex-1', isLinked ? 'text-white' : 'text-slate-400')}>{t.titre}</span>
                          <span className={clsx('px-1.5 py-0.5 rounded text-[10px] border', tCfg.bg, tCfg.color)}>{tCfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setAddObjModal(null)} className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:bg-card-hover hover:text-white transition-all">Annuler</button>
                <button
                  onClick={() => {
                    if (!addObjModal || !newObj.titre.trim()) return;
                    addObjective(addObjModal, {
                      titre: newObj.titre,
                      description: newObj.description,
                      statut: 'todo',
                      dateEcheance: newObj.dateEcheance,
                      priorite: newObj.priorite,
                      assigneAIds: newObj.assigneAIds,
                      taskIds: newObj.taskIds,
                    });
                    setAddObjModal(null);
                  }}
                  disabled={!newObj.titre.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-accent-cyan to-primary-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  Créer l'objectif
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Add Lien d'avancement Modal ──────────────────────────────── */}
      <Modal isOpen={!!lienModalOpen} onClose={() => { setLienModalOpen(null); setNewLien({ titre: '', url: '', type: 'autre', description: '', statutVisible: true, freelancerIds: [] }); }} title="Nouveau lien d'avancement" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Titre <span className="text-accent-red">*</span></label>
            <input
              value={newLien.titre}
              onChange={e => setNewLien(l => ({ ...l, titre: e.target.value }))}
              className={INPUT_CLASS}
              placeholder="Ex: Maquette Figma, Repo GitHub..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">URL <span className="text-accent-red">*</span></label>
            <input
              type="url"
              value={newLien.url}
              onChange={e => setNewLien(l => ({ ...l, url: e.target.value }))}
              className={INPUT_CLASS}
              placeholder="https://..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Type</label>
              <select
                value={newLien.type}
                onChange={e => setNewLien(l => ({ ...l, type: e.target.value as LienAvancementType }))}
                className={INPUT_CLASS}
              >
                <option value="notion">Notion</option>
                <option value="figma">Figma</option>
                <option value="google_drive">Google Drive</option>
                <option value="github">GitHub</option>
                <option value="trello">Trello</option>
                <option value="asana">Asana</option>
                <option value="miro">Miro</option>
                <option value="loom">Loom</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Visible prestataires</label>
              <button
                onClick={() => setNewLien(l => ({ ...l, statutVisible: !l.statutVisible }))}
                className={clsx(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all',
                  newLien.statutVisible
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-obsidian-700 border-card-border text-slate-500'
                )}
              >
                <span>{newLien.statutVisible ? 'Visible' : 'Masqué'}</span>
                <div className={clsx('w-8 h-4 rounded-full transition-all relative', newLien.statutVisible ? 'bg-emerald-500' : 'bg-slate-600')}>
                  <div className={clsx('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all', newLien.statutVisible ? 'left-4' : 'left-0.5')} />
                </div>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description (optionnel)</label>
            <textarea
              value={newLien.description}
              onChange={e => setNewLien(l => ({ ...l, description: e.target.value }))}
              className={INPUT_CLASS}
              rows={2}
              placeholder="Description du lien..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setLienModalOpen(null); setNewLien({ titre: '', url: '', type: 'autre', description: '', statutVisible: true, freelancerIds: [] }); }}
              className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:bg-card-hover hover:text-white transition-all"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (!lienModalOpen || !newLien.titre.trim() || !newLien.url.trim()) return;
                addLienAvancement(lienModalOpen, {
                  titre: newLien.titre,
                  url: newLien.url,
                  type: newLien.type,
                  description: newLien.description || undefined,
                  statutVisible: newLien.statutVisible,
                  freelancerIds: newLien.freelancerIds,
                  ajoutePar: '',
                });
                setLienModalOpen(null);
                setNewLien({ titre: '', url: '', type: 'autre', description: '', statutVisible: true, freelancerIds: [] });
              }}
              disabled={!newLien.titre.trim() || !newLien.url.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              Ajouter le lien
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

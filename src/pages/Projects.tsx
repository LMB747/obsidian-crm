import React, { useState, useMemo } from 'react';
import {
  Plus, FolderKanban, CheckSquare, Clock, Euro,
  Calendar, Users, ChevronDown, ChevronRight,
  Circle, CheckCircle2, AlertCircle, Pause,
  Edit2, Trash2, Target, ArrowUpRight, BarChart3,
  List, Columns, AlertTriangle, Download
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Project, ProjectStatus, Task } from '../types';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Modal } from '../components/ui/Modal';
import { StatCard } from '../components/ui/StatCard';
import { exportProjectsCSV } from '../utils/csvExport';
import { useDebounce } from '../hooks/useDebounce';
import clsx from 'clsx';

const statusConfig: Record<ProjectStatus, { label: string; variant: any; icon: React.FC<any>; color: string }> = {
  'planification': { label: 'Planification', variant: 'info',    icon: Circle,        color: 'text-cyan-400' },
  'en cours':      { label: 'En cours',      variant: 'purple',  icon: BarChart3,     color: 'text-primary-400' },
  'en révision':   { label: 'En révision',   variant: 'warning', icon: AlertCircle,   color: 'text-amber-400' },
  'terminé':       { label: 'Terminé',       variant: 'success', icon: CheckCircle2,  color: 'text-emerald-400' },
  'en pause':      { label: 'En pause',      variant: 'default', icon: Pause,         color: 'text-slate-400' },
  'annulé':        { label: 'Annulé',        variant: 'error',   icon: AlertCircle,   color: 'text-red-400' },
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
};

export const Projects: React.FC = () => {
  const store = useStore();
  const { projects, updateProject, deleteProject, updateTask, addTask, deleteTask, searchQuery, clients, addProject } = store;
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [expandedProject, setExpandedProject] = useState<string | null>(projects[0]?.id || null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'tous'>('tous');
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [addTaskModal, setAddTaskModal] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ titre: '', description: '', assigneA: '', dateEcheance: '', heuresEstimees: 8, priorite: 'normale' as Task['priorite'], statut: 'todo' as Task['statut'], tags: [] as string[] });

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
      tags: [],
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
    addTask(projectId, { ...newTask, heuresReelles: 0 });
    setAddTaskModal(null);
    setNewTask({ titre: '', description: '', assigneA: '', dateEcheance: '', heuresEstimees: 8, priorite: 'normale', statut: 'todo', tags: [] });
  };

  return (
    <div className="space-y-6">

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Projets" value={stats.total} icon={FolderKanban} color="purple" />
        <StatCard title="En Cours" value={stats.enCours} icon={BarChart3} color="cyan" />
        <StatCard title="Terminés" value={stats.termines} icon={CheckSquare} color="green" />
        <StatCard title="Budget Total" value={`${(stats.budgetTotal / 1000).toFixed(0)}k€`} icon={Euro} color="orange" subtitle={`Dépenses: ${(stats.depensesTotal / 1000).toFixed(0)}k€`} />
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-x divide-card-border">

                      {/* Tasks */}
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-white text-sm">Tâches ({project.taches.length})</h4>
                          <button
                            onClick={() => setAddTaskModal(project.id)}
                            className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 border border-primary-500/30 px-2 py-1 rounded-lg hover:bg-primary-500/10 transition-all"
                          >
                            <Plus className="w-3 h-3" />
                            Ajouter
                          </button>
                        </div>
                        <div className="space-y-2">
                          {project.taches.map((task) => {
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
                                    <span className="text-xs text-slate-500">{task.assigneA}</span>
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
              <input value={newTask.assigneA} onChange={e => setNewTask(p => ({ ...p, assigneA: e.target.value }))} className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="Nom ou rôle" />
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

      {/* ── Confirm Delete Modal ─────────────────────────────────────────── */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirmer la suppression" size="sm">
        <div className="space-y-4">
          <p className="text-slate-300 text-sm">
            Êtes-vous sûr de vouloir supprimer le projet{' '}
            <span className="font-semibold text-white">
              {projects.find(p => p.id === confirmDelete)?.nom}
            </span>{' '}
            ? Cette action est irréversible.
          </p>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setConfirmDelete(null)}
              className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:bg-card-hover hover:text-white transition-all"
            >
              Annuler
            </button>
            <button
              onClick={() => confirmDelete && handleDeleteProject(confirmDelete)}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
            >
              Supprimer
            </button>
          </div>
        </div>
      </Modal>

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
    </div>
  );
};

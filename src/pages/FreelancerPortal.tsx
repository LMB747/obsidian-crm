import React, { useMemo } from 'react';
import {
  Target, CheckCircle2, Clock, PlayCircle,
  AlertCircle, Calendar, TrendingUp, Briefcase,
  ChevronRight, ListTodo
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store/useStore';
import { Task, Project } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  urgente: { label: 'Urgente',  className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  haute:   { label: 'Haute',    className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  normale: { label: 'Normale',  className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  faible:  { label: 'Faible',   className: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
};

const STATUS_CONFIG = {
  'todo':     { label: 'À faire',  className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',     icon: ListTodo },
  'en cours': { label: 'En cours', className: 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30', icon: PlayCircle },
  'fait':     { label: 'Terminé',  className: 'bg-green-500/20 text-green-400 border-green-500/30',     icon: CheckCircle2 },
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  'planification': 'bg-slate-500/20 text-slate-400',
  'en cours':      'bg-accent-cyan/20 text-accent-cyan',
  'en révision':   'bg-amber-500/20 text-amber-400',
  'terminé':       'bg-green-500/20 text-green-400',
  'en pause':      'bg-orange-500/20 text-orange-400',
  'annulé':        'bg-red-500/20 text-red-400',
};

interface TaskCardProps {
  task: Task;
  project: Project;
  onStatusChange: (taskId: string, projectId: string, statut: Task['statut']) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, project, onStatusChange }) => {
  const priorityCfg = PRIORITY_CONFIG[task.priorite];
  const statusCfg   = STATUS_CONFIG[task.statut];
  const StatusIcon  = statusCfg.icon;

  const progress = task.heuresEstimees > 0
    ? Math.min(100, Math.round((task.heuresReelles / task.heuresEstimees) * 100))
    : 0;

  const isOverdue = task.dateEcheance && task.statut !== 'fait'
    && new Date(task.dateEcheance) < new Date();

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 hover:border-primary-500/30 transition-all space-y-4">
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Project badge */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', PROJECT_STATUS_COLORS[project.statut] ?? 'bg-slate-500/20 text-slate-400')}>
              {project.nom}
            </span>
            <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold border', priorityCfg.className)}>
              {priorityCfg.label}
            </span>
          </div>
          <h3 className="font-semibold text-white text-sm leading-snug">{task.titre}</h3>
          {task.description && (
            <p className="text-slate-400 text-xs mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>

        {/* Status badge */}
        <span className={clsx('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0', statusCfg.className)}>
          <StatusIcon className="w-3 h-3" />
          {statusCfg.label}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        {task.dateEcheance && (
          <span className={clsx('flex items-center gap-1', isOverdue ? 'text-red-400' : '')}>
            <Calendar className="w-3.5 h-3.5" />
            {new Date(task.dateEcheance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
            {isOverdue && <AlertCircle className="w-3.5 h-3.5" />}
          </span>
        )}
        {task.heuresEstimees > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {task.heuresReelles}h / {task.heuresEstimees}h
          </span>
        )}
      </div>

      {/* Progress bar */}
      {task.heuresEstimees > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Progression</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-obsidian-900 overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all',
                progress >= 100 ? 'bg-green-400' : 'bg-gradient-to-r from-primary-500 to-purple-500'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status buttons */}
      <div className="flex gap-2 pt-1">
        {(['todo', 'en cours', 'fait'] as Task['statut'][]).map(s => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <button
              key={s}
              onClick={() => onStatusChange(task.id, project.id, s)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                task.statut === s
                  ? cfg.className
                  : 'border-card-border text-slate-500 hover:text-white hover:border-slate-500'
              )}
            >
              <Icon className="w-3 h-3" />
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── FreelancerPortal ─────────────────────────────────────────────────────────
export const FreelancerPortal: React.FC = () => {
  const { currentUser, projects, updateTask, setActiveSection, timerSessions } = useStore();

  if (!currentUser) return null;

  const fullName = `${currentUser.prenom} ${currentUser.nom}`;

  // Find all tasks assigned to this user
  const assignedTasks = useMemo(() => {
    const result: { task: Task; project: Project }[] = [];
    for (const project of projects) {
      for (const task of project.taches) {
        const assignee = task.assigneA.toLowerCase();
        if (
          assignee.includes(fullName.toLowerCase()) ||
          assignee.includes(currentUser.nom.toLowerCase()) ||
          assignee.includes(currentUser.prenom.toLowerCase())
        ) {
          result.push({ task, project });
        }
      }
    }
    return result;
  }, [projects, currentUser, fullName]);

  // Stats
  const stats = useMemo(() => {
    const total     = assignedTasks.length;
    const inProgress = assignedTasks.filter(({ task }) => task.statut === 'en cours').length;
    const done      = assignedTasks.filter(({ task }) => task.statut === 'fait').length;
    // Heures depuis les sessions de travail sur les projets assignés
    const projectIds = new Set(assignedTasks.map(({ project }) => project.id));
    const heures = timerSessions
      .filter(s => projectIds.has(s.projectId))
      .reduce((sum, s) => sum + Math.round((s.dureeMinutes / 60) * 10) / 10, 0);
    return { total, inProgress, done, heures: Math.round(heures * 10) / 10 };
  }, [assignedTasks, timerSessions]);

  // Group tasks by project
  const tasksByProject = useMemo(() => {
    const map = new Map<string, { project: Project; tasks: Task[] }>();
    for (const { task, project } of assignedTasks) {
      if (!map.has(project.id)) {
        map.set(project.id, { project, tasks: [] });
      }
      map.get(project.id)!.tasks.push(task);
    }
    return [...map.values()];
  }, [assignedTasks]);

  const handleStatusChange = (taskId: string, projectId: string, statut: Task['statut']) => {
    updateTask(projectId, taskId, { statut });
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">
              Bonjour, {currentUser.prenom} 👋
            </h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30">
              Freelancer
            </span>
          </div>
          <p className="text-slate-400 text-sm">Voici vos missions en cours</p>
        </div>

        {currentUser.permissions.includes('worktracking') && (
          <button
            onClick={() => setActiveSection('worktracking')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-card-border hover:border-primary-500/30 text-slate-300 hover:text-white text-sm font-medium transition-all"
          >
            <Clock className="w-4 h-4" />
            Accéder au suivi de temps
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Stats mini cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tâches assignées', value: stats.total,      icon: Target,       color: 'text-white',        bg: 'bg-primary-500/10 border-primary-500/20' },
          { label: 'En cours',         value: stats.inProgress, icon: PlayCircle,   color: 'text-accent-cyan',  bg: 'bg-accent-cyan/10 border-accent-cyan/20' },
          { label: 'Terminées',        value: stats.done,       icon: CheckCircle2, color: 'text-green-400',    bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Heures enreg.',    value: `${stats.heures}h`, icon: TrendingUp, color: 'text-amber-400',    bg: 'bg-amber-500/10 border-amber-500/20' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={clsx('bg-card rounded-xl p-4 border', stat.bg)}>
              <div className="flex items-center gap-2.5 mb-2">
                <Icon className={clsx('w-4 h-4', stat.color)} />
                <p className="text-xs text-slate-400">{stat.label}</p>
              </div>
              <p className={clsx('text-2xl font-bold', stat.color)}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Missions section */}
      {tasksByProject.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Briefcase className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-semibold mb-1">Aucune mission assignée</p>
          <p className="text-sm text-slate-600">Vous n'avez pas encore de tâches assignées.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {tasksByProject.map(({ project, tasks }) => (
            <div key={project.id}>
              {/* Project header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-primary-400" />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="font-bold text-white">{project.nom}</h2>
                  <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium', PROJECT_STATUS_COLORS[project.statut] ?? 'bg-slate-500/20 text-slate-400')}>
                    {project.statut}
                  </span>
                  <span className="text-slate-500 text-xs">{project.clientNom}</span>
                </div>
                <div className="flex-1 h-px bg-card-border" />
                <span className="text-slate-500 text-xs flex-shrink-0">{tasks.length} tâche{tasks.length > 1 ? 's' : ''}</span>
              </div>

              {/* Task grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {tasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    project={project}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Target, CheckCircle2, Clock, PlayCircle,
  AlertCircle, Calendar, TrendingUp, Briefcase,
  ChevronRight, ListTodo, MessageSquare, Send, ChevronDown, ChevronUp, X,
  Crosshair, FileText, Euro, Timer, Link, Play, Pause, MessageCircle,
  Plus, Receipt, Package
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store/useStore';
import { toast } from '../components/ui/Toast';
import { ProjectChat } from '../components/chat/ProjectChat';
import { Task, Project, Objective, LienAvancementType } from '../types';

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
  'archivé':       'bg-blue-500/20 text-blue-400',
};

interface TaskCardProps {
  task: Task;
  project: Project;
  onStatusChange: (taskId: string, projectId: string, statut: Task['statut']) => void;
  onAddNote: (projectId: string, taskId: string, texte: string) => void;
  currentUserName: string;
}

const formatElapsed = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const TaskCard: React.FC<TaskCardProps> = ({ task, project, onStatusChange, onAddNote }) => {
  const { addTimerSession, timerSessions } = useStore();
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Timer state
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!timerStart) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - timerStart) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerStart]);

  const isTimerActive = timerStart !== null;

  const toggleTimer = () => {
    if (isTimerActive) {
      // Stop timer and log session
      const durationMinutes = Math.round(elapsed / 60);
      if (durationMinutes > 0) {
        addTimerSession({
          projectId: project.id,
          projectNom: project.nom,
          taskId: task.id,
          taskTitre: task.titre,
          dureeMinutes: durationMinutes,
          date: new Date().toISOString(),
        });
      }
      setTimerStart(null);
      setElapsed(0);
    } else {
      setTimerStart(Date.now());
      setElapsed(0);
    }
  };

  const totalMinutes = useMemo(() => {
    return timerSessions
      .filter(s => s.taskId === task.id)
      .reduce((sum, s) => sum + s.dureeMinutes, 0);
  }, [timerSessions, task.id]);

  const priorityCfg = PRIORITY_CONFIG[task.priorite];
  const statusCfg   = STATUS_CONFIG[task.statut];
  const StatusIcon  = statusCfg.icon;

  const progress = task.heuresEstimees > 0
    ? Math.min(100, Math.round((task.heuresReelles / task.heuresEstimees) * 100))
    : 0;

  const isOverdue = task.dateEcheance && task.statut !== 'fait'
    && new Date(task.dateEcheance) < new Date();

  const notes = task.notes || [];
  const recentNotes = notes.slice(0, 3);

  const handleSubmitNote = () => {
    if (!noteText.trim()) return;
    onAddNote(project.id, task.id, noteText.trim());
    setNoteText('');
    setSubmitting(false);
  };

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 hover:border-primary-500/30 transition-all space-y-4">
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
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
        {notes.length > 0 && (
          <span className="flex items-center gap-1 text-primary-400">
            <MessageSquare className="w-3.5 h-3.5" />
            {notes.length} note{notes.length > 1 ? 's' : ''}
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
              className={clsx('h-full rounded-full transition-all', progress >= 100 ? 'bg-green-400' : 'bg-gradient-to-r from-primary-500 to-purple-500')}
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

      {/* Notes section */}
      <div className="border-t border-card-border/50 pt-3 space-y-2">
        {/* Show recent notes */}
        {recentNotes.length > 0 && (
          <div className="space-y-1.5">
            {recentNotes.map(note => (
              <div key={note.id} className="flex items-start gap-2 p-2 rounded-lg bg-obsidian-900/60">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center mt-0.5">
                  <span className="text-primary-400 text-[10px] font-bold">{note.auteurNom.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-relaxed">{note.texte}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {note.auteurNom} · {new Date(note.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {notes.length > 3 && (
              <button onClick={() => setShowNotes(v => !v)} className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors">
                {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showNotes ? 'Masquer' : `Voir ${notes.length - 3} note(s) de plus`}
              </button>
            )}
          </div>
        )}

        {/* Add note input */}
        {submitting ? (
          <div className="flex gap-2">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Décrivez votre avancement..."
              rows={2}
              className="flex-1 bg-obsidian-900 border border-card-border rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-primary-500/60 resize-none"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitNote(); } }}
            />
            <div className="flex flex-col gap-1">
              <button
                onClick={handleSubmitNote}
                disabled={!noteText.trim()}
                className="p-2 rounded-lg bg-primary-500 hover:bg-primary-400 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setSubmitting(false); setNoteText(''); }}
                className="p-2 rounded-lg bg-card border border-card-border text-slate-400 hover:text-white transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setSubmitting(true)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary-400 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Ajouter une note d'avancement
          </button>
        )}
      </div>

      {/* Timer row */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-card-border">
        <button onClick={toggleTimer} className="p-1.5 rounded-lg bg-obsidian-700 border border-card-border text-slate-400 hover:text-white hover:border-primary-500/30 transition-all">
          {isTimerActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        {isTimerActive && <span className="text-xs text-primary-300 font-mono">{formatElapsed(elapsed)}</span>}
        {!isTimerActive && totalMinutes > 0 && <span className="text-xs text-slate-500">{totalMinutes}min logguées</span>}
      </div>
    </div>
  );
};

// ─── FreelancerPortal ─────────────────────────────────────────────────────────
export const FreelancerPortal: React.FC = () => {
  const { currentUser, projects, updateTask, addTaskNote, setActiveSection, timerSessions, updateObjective, freelancers, addLienAvancement, invoices } = useStore();

  const [showProposeLien, setShowProposeLien] = useState<string | null>(null);
  const [proposeLienForm, setProposeLienForm] = useState({ titre: '', url: '', type: 'autre' as LienAvancementType, description: '' });

  if (!currentUser) return null;

  const fullName = `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim();

  // Find all tasks assigned to this user (par ID, par nom, ou par projet)
  // Collecter TOUS les IDs possibles : userId, freelancerId, et l'ID du prestataire trouvé par email/nom
  // Normaliser les noms pour matching robuste (trim + collapse espaces multiples)
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

  const matchedFreelancer = useMemo(() => {
    // D'abord par freelancerId direct
    if (currentUser.freelancerId) {
      const f = freelancers.find(fl => fl.id === currentUser.freelancerId);
      if (f) return f;
    }
    // Ensuite par email (case-insensitive)
    if (currentUser.email) {
      const emailLower = currentUser.email.toLowerCase();
      const f = freelancers.find(fl => fl.email?.toLowerCase() === emailLower);
      if (f) return f;
    }
    // Enfin par nom (normalisé)
    if (fullName.length > 1) {
      const normalizedName = normalize(fullName);
      const f = freelancers.find(fl =>
        normalize(`${fl.prenom} ${fl.nom}`) === normalizedName ||
        normalize(fl.nom) === normalize(currentUser.nom || '')
      );
      if (f) return f;
    }
    return null;
  }, [currentUser, freelancers, fullName]);

  const myIds = useMemo(() => {
    const ids = [currentUser.id, currentUser.freelancerId, matchedFreelancer?.id].filter(Boolean) as string[];
    return [...new Set(ids)];
  }, [currentUser.id, currentUser.freelancerId, matchedFreelancer?.id]);

  const assignedTasks = useMemo(() => {
    const result: { task: Task; project: Project }[] = [];
    const addedTaskIds = new Set<string>();

    for (const project of projects) {
      // Le freelancer est-il membre du projet ?
      const isInProject = project.freelancerIds?.some(fid => myIds.includes(fid));

      for (const task of project.taches) {
        // Match par assigneAIds (IDs)
        const matchById = (task.assigneAIds || []).some(id => myIds.includes(id));
        // Match par nom textuel (legacy)
        const assignee = (task.assigneA || '').toLowerCase();
        const matchByName = fullName && fullName.length > 1 && (
          assignee.includes(fullName.toLowerCase()) ||
          assignee.includes((currentUser.nom || '').toLowerCase())
        );
        // Match par appartenance au projet (le freelancer voit toutes les tâches de ses projets)
        const matchByProject = isInProject;

        if ((matchById || matchByName || matchByProject) && !addedTaskIds.has(task.id)) {
          result.push({ task, project });
          addedTaskIds.add(task.id);
        }
      }
    }
    return result;
  }, [projects, currentUser, fullName, myIds]);

  // Stats
  const stats = useMemo(() => {
    const total      = assignedTasks.length;
    const inProgress = assignedTasks.filter(({ task }) => task.statut === 'en cours').length;
    const done       = assignedTasks.filter(({ task }) => task.statut === 'fait').length;
    // Heures depuis les sessions de travail sur les projets assignés
    const projectIds = new Set(assignedTasks.map(({ project }) => project.id));
    const heures = timerSessions
      .filter(s => projectIds.has(s.projectId))
      .reduce((sum, s) => sum + Math.round((s.dureeMinutes / 60) * 10) / 10, 0);
    return { total, inProgress, done, heures: Math.round(heures * 10) / 10 };
  }, [assignedTasks, timerSessions]);

  // Upcoming deadlines (next 14 days)
  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const in14d = new Date();
    in14d.setDate(in14d.getDate() + 14);
    return assignedTasks
      .filter(({ task }) => task.statut !== 'fait' && task.dateEcheance)
      .filter(({ task }) => {
        const d = new Date(task.dateEcheance);
        return d >= now && d <= in14d;
      })
      .sort((a, b) => new Date(a.task.dateEcheance).getTime() - new Date(b.task.dateEcheance).getTime())
      .slice(0, 5);
  }, [assignedTasks]);

  // Earnings estimate
  const freelancerProfile = matchedFreelancer;

  const earnings = useMemo(() => {
    if (!freelancerProfile) return 0;
    const totalHours = stats.heures;
    return Math.round((totalHours / 8) * freelancerProfile.tjm);
  }, [stats.heures, freelancerProfile]);

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

  // Find all objectives assigned to this freelancer
  const assignedObjectives = useMemo(() => {
    const result: { objective: Objective; project: Project }[] = [];
    for (const project of projects) {
      for (const obj of (project.objectives || [])) {
        if ((obj.assigneAIds || []).includes(currentUser.id)) {
          result.push({ objective: obj, project });
        }
      }
    }
    return result;
  }, [projects, currentUser]);

  const handleStatusChange = (taskId: string, projectId: string, statut: Task['statut']) => {
    const prevTask = projects.find(p => p.id === projectId)?.taches.find(t => t.id === taskId);
    updateTask(projectId, taskId, { statut });
    // Ajoute une note automatique de changement de statut
    if (prevTask && prevTask.statut !== statut) {
      const statusLabels: Record<string, string> = { 'todo': 'À faire', 'en cours': 'En cours', 'fait': 'Terminé' };
      addTaskNote(projectId, taskId, {
        auteurId: currentUser.id,
        auteurNom: `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() || currentUser.email,
        texte: `Statut changé : ${statusLabels[prevTask.statut]} → ${statusLabels[statut]}`,
        date: new Date().toISOString(),
        type: 'statut_change',
        ancienStatut: prevTask.statut,
        nouveauStatut: statut,
      });
    }
  };

  const handleAddNote = (projectId: string, taskId: string, texte: string) => {
    addTaskNote(projectId, taskId, {
      auteurId: currentUser.id,
      auteurNom: `${currentUser.prenom} ${currentUser.nom}`,
      texte,
      date: new Date().toISOString(),
      type: 'note',
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">
              Bonjour, {currentUser.prenom || currentUser.nom || currentUser.email} 👋
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
          { label: 'Tâches assignées', value: stats.total,       icon: Target,       color: 'text-white',       bg: 'bg-primary-500/10 border-primary-500/20' },
          { label: 'En cours',         value: stats.inProgress,  icon: PlayCircle,   color: 'text-accent-cyan', bg: 'bg-accent-cyan/10 border-accent-cyan/20' },
          { label: 'Terminées',        value: stats.done,        icon: CheckCircle2, color: 'text-green-400',   bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Heures enreg.',    value: `${stats.heures}h`, icon: TrendingUp,  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
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

      {/* ── Quick Actions + Upcoming Deadlines ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">Actions rapides</h3>
          <div className="space-y-2">
            {currentUser.permissions.includes('worktracking') && (
              <button
                onClick={() => setActiveSection('worktracking')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-obsidian-700 border border-card-border hover:border-primary-500/30 text-sm text-slate-300 hover:text-white transition-all"
              >
                <Timer className="w-4 h-4 text-primary-400" />
                Démarrer le chronomètre
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-600" />
              </button>
            )}
            {currentUser.permissions.includes('documents') && (
              <button
                onClick={() => setActiveSection('documents')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-obsidian-700 border border-card-border hover:border-primary-500/30 text-sm text-slate-300 hover:text-white transition-all"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                Mes documents
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-600" />
              </button>
            )}
            {freelancerProfile && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Euro className="w-4 h-4 text-emerald-400" />
                <div>
                  <p className="text-xs text-slate-400">Revenus estimés</p>
                  <p className="text-sm font-bold text-emerald-400">{earnings.toLocaleString('fr-FR')} €</p>
                </div>
                <span className="ml-auto text-[10px] text-slate-500">{freelancerProfile.tjm} €/j</span>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Prochaines échéances</h3>
            <span className="text-slate-500 text-xs ml-auto">{upcomingDeadlines.length} à venir</span>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Aucune échéance dans les 14 prochains jours</p>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map(({ task, project }) => {
                const d = new Date(task.dateEcheance);
                const daysLeft = Math.ceil((d.getTime() - Date.now()) / 86400000);
                return (
                  <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-obsidian-700/50 border border-card-border/50">
                    <div className={clsx(
                      'w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 text-xs font-bold',
                      daysLeft <= 2 ? 'bg-red-500/20 text-red-400' : daysLeft <= 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-300'
                    )}>
                      <span className="text-[10px] font-normal">{d.toLocaleDateString('fr-FR', { month: 'short' })}</span>
                      <span>{d.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{task.titre}</p>
                      <p className="text-slate-500 text-xs">{project.nom}</p>
                    </div>
                    <span className={clsx(
                      'text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
                      daysLeft <= 2 ? 'bg-red-500/20 text-red-400' : daysLeft <= 5 ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'
                    )}>
                      {daysLeft === 0 ? "Aujourd'hui" : daysLeft === 1 ? 'Demain' : `J-${daysLeft}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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

              {/* Project overview card */}
              <div className="bg-card border border-card-border rounded-xl p-5 mb-4">
                {/* Progression */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">Progression</span>
                  <span className="text-xs font-bold text-primary-300">{project.progression}%</span>
                </div>
                <div className="h-2 rounded-full bg-obsidian-900 overflow-hidden mb-4">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-primary-500 transition-all" style={{ width: `${project.progression}%` }} />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-obsidian-700/50 rounded-lg p-2.5">
                    <p className="text-[10px] text-slate-500 mb-0.5">Budget</p>
                    <p className="text-sm font-bold text-white">{project.budget.toLocaleString('fr-FR')} €</p>
                  </div>
                  <div className="bg-obsidian-700/50 rounded-lg p-2.5">
                    <p className="text-[10px] text-slate-500 mb-0.5">Dépensé</p>
                    <p className="text-sm font-bold text-white">{project.depenses.toLocaleString('fr-FR')} €</p>
                  </div>
                  <div className="bg-obsidian-700/50 rounded-lg p-2.5">
                    <p className="text-[10px] text-slate-500 mb-0.5">Période</p>
                    <p className="text-xs font-medium text-white">{project.dateDebut?.slice(5)} → {project.dateFin?.slice(5)}</p>
                  </div>
                  <div className="bg-obsidian-700/50 rounded-lg p-2.5">
                    <p className="text-[10px] text-slate-500 mb-0.5">Équipe</p>
                    <p className="text-sm font-bold text-white">{project.freelancerIds?.length || 0} membre{(project.freelancerIds?.length || 0) > 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Milestones */}
                {project.milestones?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Jalons</p>
                    <div className="flex flex-wrap gap-2">
                      {project.milestones.map(m => (
                        <span key={m.id} className={clsx(
                          'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium',
                          m.complete ? 'bg-emerald-500/15 text-emerald-400' : 'bg-obsidian-700 text-slate-400 border border-card-border'
                        )}>
                          {m.complete ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {m.titre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Livrables */}
                {(project.livrables || []).length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Livrables</p>
                    <div className="space-y-1.5">
                      {(project.livrables || []).map(l => (
                        <div key={l.id} className="flex items-center gap-2 p-2 rounded-lg bg-obsidian-700/30">
                          <Package className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                          <span className="text-xs text-white flex-1 truncate">{l.titre}</span>
                          <span className="text-[10px] text-slate-500">{l.type} • {l.plateforme}</span>
                          <span className={clsx(
                            'px-1.5 py-0.5 rounded text-[9px] font-semibold',
                            l.statut === 'validé' || l.statut === 'publié' ? 'bg-emerald-500/20 text-emerald-300' :
                            l.statut === 'en revue' ? 'bg-amber-500/20 text-amber-300' :
                            l.statut === 'en production' ? 'bg-blue-500/20 text-blue-300' :
                            'bg-slate-500/20 text-slate-400'
                          )}>
                            {l.statut}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Task grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {tasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    project={project}
                    onStatusChange={handleStatusChange}
                    onAddNote={handleAddNote}
                    currentUserName={fullName}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Mes Ressources ──────────────────────────────────────────── */}
      {(() => {
        const myProjects = projects.filter(p => p.freelancerIds?.includes(currentUser.freelancerId || currentUser.id));
        const allLinks = myProjects
          .flatMap(p => (p.liensAvancement || [])
            .filter(l => l.statutVisible && (l.freelancerIds.length === 0 || l.freelancerIds.includes(currentUser.freelancerId || currentUser.id)))
            .map(l => ({ ...l, projectNom: p.nom }))
          );

        if (allLinks.length === 0 && myProjects.length === 0) return null;

        return (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Link className="w-5 h-5 text-primary-400" />
              Mes Ressources
            </h2>

            {/* Propose link buttons per project */}
            <div className="flex flex-wrap gap-2 mb-4">
              {myProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => setShowProposeLien(prev => prev === p.id ? null : p.id)}
                  className="flex items-center gap-1 px-2 py-1 bg-primary-500/20 text-primary-300 rounded-lg text-[10px] font-semibold hover:bg-primary-500/30"
                >
                  <Plus className="w-3 h-3" /> Proposer un lien ({p.nom})
                </button>
              ))}
            </div>

            {/* Inline form for proposing a link */}
            {showProposeLien && (() => {
              const targetProject = myProjects.find(p => p.id === showProposeLien);
              if (!targetProject) return null;
              return (
                <div className="bg-card border border-card-border rounded-xl p-4 mb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Proposer un lien pour {targetProject.nom}</p>
                    <button onClick={() => setShowProposeLien(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>
                  <input
                    type="text"
                    placeholder="Titre du lien"
                    value={proposeLienForm.titre}
                    onChange={e => setProposeLienForm(f => ({ ...f, titre: e.target.value }))}
                    className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <input
                    type="url"
                    placeholder="URL"
                    value={proposeLienForm.url}
                    onChange={e => setProposeLienForm(f => ({ ...f, url: e.target.value }))}
                    className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <select
                    value={proposeLienForm.type}
                    onChange={e => setProposeLienForm(f => ({ ...f, type: e.target.value as LienAvancementType }))}
                    className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                  <input
                    type="text"
                    placeholder="Description (optionnel)"
                    value={proposeLienForm.description}
                    onChange={e => setProposeLienForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <button
                    onClick={() => {
                      if (!proposeLienForm.titre || !proposeLienForm.url) return;
                      addLienAvancement(showProposeLien, {
                        titre: proposeLienForm.titre,
                        url: proposeLienForm.url,
                        type: proposeLienForm.type,
                        description: proposeLienForm.description,
                        freelancerIds: [],
                        ajoutePar: currentUser?.id || '',
                        statutVisible: false,
                      });
                      toast.success('Lien propose — en attente de validation');
                      setProposeLienForm({ titre: '', url: '', type: 'autre', description: '' });
                      setShowProposeLien(null);
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-primary-500 text-white rounded-xl text-xs font-semibold hover:bg-primary-600 transition-all"
                  >
                    <Plus className="w-3 h-3" /> Soumettre
                  </button>
                </div>
              );
            })()}

            {allLinks.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {allLinks.map(lien => (
                  <a key={lien.id} href={lien.url} target="_blank" rel="noopener noreferrer"
                    className="bg-card border border-card-border rounded-xl p-4 hover:border-primary-500/30 transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-obsidian-700 flex items-center justify-center">
                        <Link className="w-4 h-4 text-primary-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-primary-300">{lien.titre}</p>
                        <p className="text-[10px] text-slate-500">{lien.projectNom}</p>
                      </div>
                    </div>
                    {lien.description && <p className="text-xs text-slate-400 line-clamp-2">{lien.description}</p>}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Chat par projet ──────────────────────────────────────────── */}
      {projects.filter(p => p.freelancerIds?.includes(currentUser?.freelancerId || currentUser?.id || '')).map(project => (
        <div key={`chat-${project.id}`} className="mt-6">
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-card-border flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary-400" />
              <h3 className="text-sm font-bold text-white">Chat — {project.nom}</h3>
            </div>
            <ProjectChat projectId={project.id} projectNom={project.nom} />
          </div>
        </div>
      ))}

      {/* ── Mes Factures ──────────────────────────────────────────── */}
      {(() => {
        const myProjects = projects.filter(p =>
          p.freelancerIds?.includes(currentUser?.freelancerId || currentUser?.id || '')
        );
        const myInvoices = invoices.filter(i =>
          myProjects.some(p => p.id === i.projectId)
        );

        if (myInvoices.length === 0) return null;

        return (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Receipt className="w-5 h-5 text-primary-400" />
              Mes Factures
            </h2>
            <div className="space-y-2">
              {myInvoices.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 p-3 bg-card border border-card-border rounded-xl">
                  <Receipt className="w-5 h-5 text-primary-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{inv.numero}</p>
                    <p className="text-[10px] text-slate-500">{inv.clientNom}</p>
                  </div>
                  <p className="text-sm font-bold text-white">{inv.total.toLocaleString('fr-FR')} &euro;</p>
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                    inv.statut === 'payée' ? 'bg-emerald-500/20 text-emerald-300' :
                    inv.statut === 'en retard' ? 'bg-red-500/20 text-red-300' :
                    'bg-amber-500/20 text-amber-300'
                  )}>
                    {inv.statut}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Objectives Section ──────────────────────────────────────── */}
      {assignedObjectives.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-cyan/20 flex items-center justify-center flex-shrink-0">
              <Crosshair className="w-4 h-4 text-accent-cyan" />
            </div>
            <h2 className="font-bold text-white">Mes objectifs</h2>
            <div className="flex-1 h-px bg-card-border" />
            <span className="text-slate-500 text-xs flex-shrink-0">{assignedObjectives.length} objectif{assignedObjectives.length > 1 ? 's' : ''}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {assignedObjectives.map(({ objective: obj, project }) => {
              const linkedTasks = project.taches.filter(t => obj.taskIds.includes(t.id));
              const doneTasks = linkedTasks.filter(t => t.statut === 'fait').length;
              const progress = linkedTasks.length > 0 ? Math.round((doneTasks / linkedTasks.length) * 100) : 0;
              const objStatusCls = obj.statut === 'fait' ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : obj.statut === 'en cours' ? 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30'
                : 'bg-slate-500/20 text-slate-400 border-slate-500/30';

              return (
                <div key={obj.id} className="bg-card border border-card-border rounded-xl p-5 hover:border-accent-cyan/30 transition-all space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium mb-1.5 inline-block', PROJECT_STATUS_COLORS[project.statut] ?? 'bg-slate-500/20 text-slate-400')}>
                        {project.nom}
                      </span>
                      <h3 className="font-semibold text-white text-sm">{obj.titre}</h3>
                      {obj.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{obj.description}</p>}
                    </div>
                    <span className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0', objStatusCls)}>
                      {obj.statut === 'fait' ? 'Terminé' : obj.statut === 'en cours' ? 'En cours' : 'À faire'}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {obj.dateEcheance && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(obj.dateEcheance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                    <span>{doneTasks}/{linkedTasks.length} tâches terminées</span>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Progression</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-obsidian-900 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-primary-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {/* Linked tasks mini list */}
                  {linkedTasks.length > 0 && (
                    <div className="space-y-1">
                      {linkedTasks.slice(0, 4).map(t => {
                        const tCfg = STATUS_CONFIG[t.statut];
                        const TIcon = tCfg.icon;
                        return (
                          <div key={t.id} className="flex items-center gap-2 text-xs">
                            <TIcon className={clsx('w-3 h-3', tCfg.className.includes('green') ? 'text-green-400' : tCfg.className.includes('cyan') ? 'text-accent-cyan' : 'text-slate-400')} />
                            <span className={clsx('flex-1 truncate', t.statut === 'fait' ? 'text-slate-500 line-through' : 'text-slate-300')}>{t.titre}</span>
                          </div>
                        );
                      })}
                      {linkedTasks.length > 4 && <p className="text-[10px] text-slate-600">+{linkedTasks.length - 4} autres tâches</p>}
                    </div>
                  )}

                  {/* Status buttons */}
                  <div className="flex gap-2 pt-1">
                    {(['todo', 'en cours', 'fait'] as Objective['statut'][]).map(s => {
                      const label = s === 'fait' ? 'Terminé' : s === 'en cours' ? 'En cours' : 'À faire';
                      const cfg = STATUS_CONFIG[s];
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={s}
                          onClick={() => updateObjective(project.id, obj.id, { statut: s })}
                          className={clsx(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                            obj.statut === s
                              ? cfg.className
                              : 'border-card-border text-slate-500 hover:text-white hover:border-slate-500'
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useMemo } from 'react';
import { Clock, CheckSquare, AlertCircle, BarChart3, Calendar, TrendingUp, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useStore } from '../store/useStore';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StatCard } from '../components/ui/StatCard';
import { WorkTimer } from '../components/WorkTimer/WorkTimer';
import { TimerHistory } from '../components/WorkTimer/TimerHistory';
import { exportTimerSessionsCsv } from '../lib/csvExport';
import clsx from 'clsx';

const taskStatusColors = {
  'todo': '#64748b',
  'en cours': '#7c3aed',
  'fait': '#10b981',
};

const priorityColors: Record<string, string> = {
  urgente: '#ef4444',
  haute: '#f59e0b',
  normale: '#7c3aed',
  faible: '#06b6d4',
};

export const WorkTracking: React.FC = () => {
  const { projects, timerSessions } = useStore();

  const allTasks = useMemo(() => {
    return projects.flatMap(p =>
      p.taches.map(t => ({
        ...t,
        projectNom: p.nom,
        projectId: p.id,
        clientNom: p.clientNom,
      }))
    );
  }, [projects]);

  const stats = useMemo(() => {
    const today = new Date(new Date().toISOString().split('T')[0]);
    const totalHours = allTasks.reduce((s, t) => s + t.heuresEstimees, 0);
    const workedHours = allTasks.reduce((s, t) => s + t.heuresReelles, 0);
    const doneTasks = allTasks.filter(t => t.statut === 'fait').length;
    const inProgressTasks = allTasks.filter(t => t.statut === 'en cours').length;
    const todoTasks = allTasks.filter(t => t.statut === 'todo').length;
    const overdueTasks = allTasks.filter(t => t.statut !== 'fait' && t.dateEcheance && new Date(t.dateEcheance) < today).length;
    return { totalHours, workedHours, doneTasks, inProgressTasks, todoTasks, overdueTasks, total: allTasks.length };
  }, [allTasks]);

  // Hours per project bar data
  const hoursPerProject = projects.map(p => ({
    nom: p.nom.length > 20 ? p.nom.slice(0, 20) + '…' : p.nom,
    estimées: p.taches.reduce((s, t) => s + t.heuresEstimees, 0),
    réelles: p.taches.reduce((s, t) => s + t.heuresReelles, 0),
  }));

  // Task status pie
  const taskPieData = [
    { name: 'À faire', value: stats.todoTasks, color: '#64748b' },
    { name: 'En cours', value: stats.inProgressTasks, color: '#7c3aed' },
    { name: 'Terminé', value: stats.doneTasks, color: '#10b981' },
  ].filter(d => d.value > 0);

  // Urgent/overdue tasks
  const urgentTasks = allTasks
    .filter(t => t.statut !== 'fait' && (t.priorite === 'urgente' || t.priorite === 'haute'))
    .sort((a, b) => {
      const pOrder = { urgente: 0, haute: 1, normale: 2, faible: 3 };
      return pOrder[a.priorite] - pOrder[b.priorite];
    })
    .slice(0, 8);

  const inProgressTasks = allTasks.filter(t => t.statut === 'en cours').slice(0, 6);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-obsidian-700 border border-card-border rounded-xl p-3">
          <p className="text-white font-semibold text-xs mb-1">{label}</p>
          {payload.map((e: any) => (
            <p key={e.name} className="text-xs" style={{ color: e.fill }}>{e.name}: {e.value}h</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-white text-xl">Suivi des Travaux</h2>
          <p className="text-slate-400 text-xs mt-0.5">Chronomètre · Tâches · Heures par projet</p>
        </div>
        {timerSessions.length > 0 && (
          <button
            onClick={() => exportTimerSessionsCsv(timerSessions)}
            className="flex items-center gap-2 border border-card-border text-slate-300 text-sm font-medium px-3 py-2 rounded-xl hover:border-primary-500/40 hover:text-white transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export sessions CSV
          </button>
        )}
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Heures travaillées" value={`${stats.workedHours}h`} subtitle={`/ ${stats.totalHours}h estimées`} icon={Clock} color="purple" />
        <StatCard title="Tâches terminées" value={stats.doneTasks} subtitle={`/ ${stats.total} tâches`} icon={CheckSquare} color="green" />
        <StatCard title="En cours" value={stats.inProgressTasks} icon={BarChart3} color="cyan" />
        <StatCard title="En retard" value={stats.overdueTasks} icon={AlertCircle} color={stats.overdueTasks > 0 ? 'red' : 'green'} />
      </div>

      {/* ── Global Progress ──────────────────────────────────────────────── */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display font-bold text-white">Progression Globale</h3>
            <p className="text-slate-400 text-xs">Toutes tâches confondues</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-display font-bold text-white">
              {Math.round((stats.doneTasks / (stats.total || 1)) * 100)}%
            </p>
            <p className="text-slate-400 text-xs">complété</p>
          </div>
        </div>
        <ProgressBar
          value={stats.doneTasks}
          max={stats.total || 1}
          color="green"
          size="md"
        />
        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" />{stats.todoTasks} à faire</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary-400" />{stats.inProgressTasks} en cours</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent-green" />{stats.doneTasks} terminées</span>
        </div>
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Hours per Project */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-2xl p-5">
          <h3 className="font-display font-bold text-white mb-1">Heures par Projet</h3>
          <p className="text-slate-400 text-xs mb-4">Estimées vs réelles</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hoursPerProject} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e42" vertical={false} />
              <XAxis dataKey="nom" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}h`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="estimées" name="Estimées" fill="#1e1e42" radius={[4, 4, 0, 0]} />
              <Bar dataKey="réelles" name="Réelles" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Task Status Pie */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <h3 className="font-display font-bold text-white mb-1">Statut des Tâches</h3>
          <p className="text-slate-400 text-xs mb-4">{stats.total} tâches au total</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {taskPieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0e0e22', border: '1px solid #1e1e42', borderRadius: '8px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {taskPieData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                  <span className="text-slate-400 text-xs">{entry.name}</span>
                </div>
                <span className="text-white text-xs font-semibold">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tasks Tables ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* In Progress Tasks */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <h3 className="font-display font-bold text-white mb-4">Tâches en Cours</h3>
          <div className="space-y-3">
            {inProgressTasks.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">Aucune tâche en cours</p>
            )}
            {inProgressTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 p-3 bg-obsidian-700 rounded-xl border border-primary-500/20">
                <div className="w-2 h-2 rounded-full bg-primary-400 mt-1.5 flex-shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{task.titre}</p>
                  <p className="text-slate-500 text-xs">{task.projectNom}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">{task.assigneA}</span>
                    {task.dateEcheance && (
                      <span className={clsx('text-xs flex items-center gap-1', new Date(task.dateEcheance) < new Date(new Date().toISOString().split('T')[0]) ? 'text-accent-red' : 'text-slate-500')}>
                        <Calendar className="w-3 h-3" />
                        {new Date(task.dateEcheance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-primary-400 font-semibold">{task.heuresReelles}h</p>
                  <p className="text-xs text-slate-500">/{task.heuresEstimees}h</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Tasks */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <h3 className="font-display font-bold text-white mb-4">Tâches Prioritaires</h3>
          <div className="space-y-3">
            {urgentTasks.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">Aucune tâche prioritaire en attente</p>
            )}
            {urgentTasks.map((task) => {
              const isOverdue = task.dateEcheance && new Date(task.dateEcheance) < new Date(new Date().toISOString().split('T')[0]);
              return (
                <div key={task.id} className={clsx(
                  'flex items-start gap-3 p-3 rounded-xl border',
                  isOverdue ? 'bg-accent-red/10 border-accent-red/20' : 'bg-obsidian-700 border-card-border/50'
                )}>
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: priorityColors[task.priorite] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{task.titre}</p>
                    <p className="text-slate-500 text-xs">{task.projectNom}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={task.priorite === 'urgente' ? 'error' : 'warning'} size="sm">{task.priorite}</Badge>
                      {task.dateEcheance && (
                        <span className={clsx('text-xs flex items-center gap-1', isOverdue ? 'text-accent-red' : 'text-slate-500')}>
                          <Calendar className="w-3 h-3" />
                          {isOverdue ? '⚠ ' : ''}{new Date(task.dateEcheance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Work Timer + History ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WorkTimer />
        <div className="lg:col-span-2">
          <TimerHistory />
        </div>
      </div>

      {/* ── Per Project Summary ───────────────────────────────────────────── */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-card-border">
          <h3 className="font-display font-bold text-white">Résumé par Projet</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Projet</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tâches</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Heures</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Progression</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/50">
              {projects.map((project) => {
                const done = project.taches.filter(t => t.statut === 'fait').length;
                return (
                  <tr key={project.id} className="hover:bg-card-hover transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-white text-sm font-semibold">{project.nom}</p>
                      <p className="text-slate-500 text-xs">{project.clientNom}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-white text-sm font-semibold">{done}/{project.taches.length}</span>
                    </td>
                    <td className="px-4 py-4 text-center hidden md:table-cell">
                      <span className="text-white text-sm font-semibold">
                        {project.taches.reduce((s, t) => s + t.heuresReelles, 0)}h
                      </span>
                      <span className="text-slate-500 text-xs">
                        /{project.taches.reduce((s, t) => s + t.heuresEstimees, 0)}h
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={project.progression} size="xs" color="purple" className="flex-1" />
                        <span className="text-white text-xs font-bold w-8">{project.progression}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center hidden lg:table-cell">
                      <Badge variant={{ 'en cours': 'purple', 'terminé': 'success', 'planification': 'info', 'en révision': 'warning', 'en pause': 'default', 'annulé': 'error' }[project.statut] as any}>
                        {project.statut}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

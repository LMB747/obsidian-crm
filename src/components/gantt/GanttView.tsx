import React, { useMemo } from 'react';
import { format, differenceInDays, eachDayOfInterval, isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { CheckCircle2, Clock } from 'lucide-react';

interface GanttTask {
  id: string;
  titre: string;
  dateDebut: string;
  dateFin: string;
  progression: number;
  statut: string;
  assigneA?: string;
  dependsOn?: string[];
  color?: string;
}

interface GanttViewProps {
  tasks: GanttTask[];
  projectDebut: string;
  projectFin: string;
}

const STATUT_COLORS: Record<string, string> = {
  'todo': 'bg-slate-500',
  'en cours': 'bg-blue-500',
  'fait': 'bg-emerald-500',
};

const DAY_WIDTH = 32;

export const GanttView: React.FC<GanttViewProps> = ({ tasks, projectDebut, projectFin }) => {
  const timeline = useMemo(() => {
    const start = new Date(projectDebut);
    const end = new Date(projectFin);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return { days: [] as Date[], start: new Date(), totalDays: 0 };
    const days = eachDayOfInterval({ start, end });
    return { days, start, totalDays: days.length };
  }, [projectDebut, projectFin]);

  if (timeline.totalDays === 0 || timeline.totalDays > 365) {
    return <p className="text-sm text-slate-500 text-center py-8">Periode invalide ou trop longue pour la vue Gantt</p>;
  }

  const getBarStyle = (task: GanttTask) => {
    const taskStart = new Date(task.dateDebut);
    const taskEnd = new Date(task.dateFin);
    const offsetDays = Math.max(0, differenceInDays(taskStart, timeline.start));
    const duration = Math.max(1, differenceInDays(taskEnd, taskStart) + 1);
    return {
      left: offsetDays * DAY_WIDTH,
      width: duration * DAY_WIDTH - 4,
    };
  };

  // Group days by month for header
  const months = useMemo(() => {
    const m: { label: string; span: number }[] = [];
    let current = '';
    timeline.days.forEach(day => {
      const label = format(day, 'MMM yyyy', { locale: fr });
      if (label !== current) {
        m.push({ label, span: 1 });
        current = label;
      } else {
        m[m.length - 1].span++;
      }
    });
    return m;
  }, [timeline.days]);

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full">
        {/* Task names column */}
        <div className="w-48 flex-shrink-0 border-r border-card-border">
          <div className="h-14 border-b border-card-border flex items-end px-3 pb-2">
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Taches</span>
          </div>
          {tasks.map(task => (
            <div key={task.id} className="h-10 flex items-center px-3 border-b border-card-border/30">
              <div className="flex items-center gap-2 min-w-0">
                {task.statut === 'fait'
                  ? <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  : task.statut === 'en cours'
                  ? <Clock className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  : <div className="w-3 h-3 rounded-full border border-slate-500 flex-shrink-0" />}
                <span className="text-xs text-white truncate">{task.titre}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-x-auto">
          {/* Month headers */}
          <div className="flex h-7 border-b border-card-border/50">
            {months.map((m, i) => (
              <div
                key={i}
                style={{ width: m.span * DAY_WIDTH }}
                className="text-[10px] text-slate-400 font-semibold px-2 flex items-center border-r border-card-border/30 capitalize"
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Day headers */}
          <div className="flex h-7 border-b border-card-border">
            {timeline.days.map((day, i) => (
              <div
                key={i}
                style={{ width: DAY_WIDTH }}
                className={clsx(
                  'text-[9px] text-center flex items-center justify-center border-r border-card-border/20',
                  isWeekend(day) ? 'text-slate-600 bg-obsidian-900/50' : 'text-slate-500'
                )}
              >
                {format(day, 'd')}
              </div>
            ))}
          </div>

          {/* Task bars */}
          {tasks.map((task, taskIndex) => {
            const bar = getBarStyle(task);
            const barColor = STATUT_COLORS[task.statut] || 'bg-slate-500';
            return (
              <div key={task.id} className="h-10 relative border-b border-card-border/10">
                {/* Weekend stripes */}
                {timeline.days.map((day, i) => (
                  isWeekend(day) ? (
                    <div key={i} className="absolute top-0 bottom-0 bg-obsidian-900/30" style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }} />
                  ) : null
                ))}
                {/* Bar */}
                <div
                  className="absolute top-2 h-6 rounded-md flex items-center overflow-hidden group cursor-pointer"
                  style={{ left: bar.left + 2, width: Math.max(bar.width, 8) }}
                  title={`${task.titre} (${task.progression}%)`}
                >
                  {/* Background */}
                  <div className={clsx('absolute inset-0 opacity-30 rounded-md', barColor)} />
                  {/* Progress fill */}
                  <div
                    className={clsx('absolute top-0 bottom-0 left-0 rounded-md opacity-70', barColor)}
                    style={{ width: `${task.progression}%` }}
                  />
                  {/* Label */}
                  {bar.width > 60 && (
                    <span className="relative z-10 text-[9px] text-white font-medium px-2 truncate">
                      {task.titre}
                    </span>
                  )}
                </div>
                {/* Dependency arrows */}
                {task.dependsOn?.map(depId => {
                  const depTask = tasks.find(t => t.id === depId);
                  if (!depTask) return null;
                  const depBar = getBarStyle(depTask);
                  const fromX = depBar.left + depBar.width + 2;
                  const toX = bar.left;
                  const depIndex = tasks.indexOf(depTask);
                  if (fromX >= toX || depIndex < 0) return null;
                  return (
                    <svg key={depId} className="absolute top-0 left-0 pointer-events-none" style={{ width: timeline.totalDays * DAY_WIDTH, height: 40 }} >
                      <line
                        x1={fromX} y1={20 + (depIndex - taskIndex) * 40}
                        x2={toX} y2={20}
                        stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="4,2" opacity={0.5}
                      />
                      <circle cx={toX} cy={20} r={3} fill="#7c3aed" opacity={0.7} />
                    </svg>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

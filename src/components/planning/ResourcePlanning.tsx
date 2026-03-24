import React, { useMemo } from 'react';
import { eachDayOfInterval, format, isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { AlertTriangle, Users } from 'lucide-react';

interface ResourcePlanningProps {
  freelancers: Array<{ id: string; nom: string; prenom: string }>;
  projects: Array<{
    id: string;
    nom: string;
    dateDebut: string;
    dateFin: string;
    freelancerIds: string[];
    taches: Array<{
      id: string;
      assigneAIds?: string[];
      dateDebut?: string;
      dateEcheance?: string;
      heuresEstimees: number;
    }>;
  }>;
}

const COLORS = [
  'bg-blue-500/40', 'bg-violet-500/40', 'bg-emerald-500/40', 'bg-amber-500/40',
  'bg-pink-500/40', 'bg-cyan-500/40', 'bg-red-500/40', 'bg-lime-500/40',
];

const DAY_W = 28;

export const ResourcePlanning: React.FC<ResourcePlanningProps> = ({ freelancers, projects }) => {
  // Build timeline for next 30 days
  const timeline = useMemo(() => {
    const start = new Date();
    const end = new Date(Date.now() + 30 * 86400000);
    return eachDayOfInterval({ start, end });
  }, []);

  // Build workload map: freelancerId -> date -> [{projectNom, hours}]
  const workload = useMemo(() => {
    const map: Record<string, Record<string, { projectNom: string; hours: number; color: string }[]>> = {};

    freelancers.forEach(f => { map[f.id] = {}; });

    projects.forEach((project, pi) => {
      const color = COLORS[pi % COLORS.length];
      project.taches.forEach(task => {
        const assignees = task.assigneAIds || [];
        if (assignees.length === 0) return;
        const start = new Date(task.dateDebut || project.dateDebut);
        const end = new Date(task.dateEcheance || project.dateFin);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
        const days = eachDayOfInterval({ start, end }).filter(d => !isWeekend(d));
        const hoursPerDay = days.length > 0 ? task.heuresEstimees / days.length : 0;

        assignees.forEach(fId => {
          if (!map[fId]) return;
          days.forEach(day => {
            const key = format(day, 'yyyy-MM-dd');
            if (!map[fId][key]) map[fId][key] = [];
            map[fId][key].push({ projectNom: project.nom, hours: hoursPerDay, color });
          });
        });
      });
    });

    return map;
  }, [freelancers, projects]);

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full">
        {/* Freelancer names */}
        <div className="w-40 flex-shrink-0 border-r border-card-border">
          <div className="h-10 border-b border-card-border flex items-center px-3">
            <Users className="w-3.5 h-3.5 text-primary-400 mr-2" />
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Ressources</span>
          </div>
          {freelancers.map(f => (
            <div key={f.id} className="h-10 flex items-center px-3 border-b border-card-border/30">
              <span className="text-xs text-white truncate">{f.prenom} {f.nom}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div>
          {/* Day headers */}
          <div className="flex h-10 border-b border-card-border">
            {timeline.map((day, i) => (
              <div
                key={i}
                style={{ width: DAY_W }}
                className={clsx(
                  'text-[8px] text-center flex flex-col items-center justify-center border-r border-card-border/20',
                  isWeekend(day) ? 'text-slate-600 bg-obsidian-900/50' : 'text-slate-500'
                )}
              >
                <span>{format(day, 'EEE', { locale: fr }).slice(0, 2)}</span>
                <span className="font-semibold">{format(day, 'd')}</span>
              </div>
            ))}
          </div>

          {/* Rows */}
          {freelancers.map(f => (
            <div key={f.id} className="flex h-10 border-b border-card-border/10">
              {timeline.map((day, i) => {
                const key = format(day, 'yyyy-MM-dd');
                const entries = workload[f.id]?.[key] || [];
                const totalHours = entries.reduce((s, e) => s + e.hours, 0);
                const overloaded = totalHours > 8;

                return (
                  <div
                    key={i}
                    style={{ width: DAY_W }}
                    className={clsx(
                      'relative border-r border-card-border/10 flex items-center justify-center',
                      isWeekend(day) && 'bg-obsidian-900/30',
                      overloaded && 'ring-1 ring-red-500/50'
                    )}
                    title={entries.map(e => `${e.projectNom}: ${e.hours.toFixed(1)}h`).join('\n')}
                  >
                    {entries.length > 0 && (
                      <div className={clsx('w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold text-white', entries[0].color)}>
                        {totalHours > 0 ? Math.round(totalHours) : ''}
                      </div>
                    )}
                    {overloaded && <AlertTriangle className="absolute top-0.5 right-0.5 w-2 h-2 text-red-400" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

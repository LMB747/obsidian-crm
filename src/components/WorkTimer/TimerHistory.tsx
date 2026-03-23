import React from 'react';
import { Clock, Briefcase } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const TimerHistory: React.FC = () => {
  const { timerSessions } = useStore();

  // Group by date
  const grouped = timerSessions.slice(0, 20).reduce<Record<string, typeof timerSessions>>((acc, s) => {
    const d = s.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(s);
    return acc;
  }, {});

  const today = new Date().toISOString().split('T')[0];
  const todayMinutes = (grouped[today] ?? []).reduce((s, x) => s + x.dureeMinutes, 0);
  const todayHours = (todayMinutes / 60).toFixed(1);

  const fmtDate = (d: string) => {
    if (d === today) return "Aujourd'hui";
    try { return new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }); }
    catch { return d; }
  };

  const fmtDuration = (min: number) => {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  return (
    <div className="bg-card border border-card-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-white">Historique des sessions</h3>
          <p className="text-slate-400 text-xs">Temps enregistré automatiquement</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-display font-bold text-accent-green">{todayHours}h</p>
          <p className="text-slate-500 text-xs">aujourd'hui</p>
        </div>
      </div>

      {timerSessions.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Aucune session enregistrée</p>
          <p className="text-slate-600 text-xs mt-1">Démarre le chronomètre pour suivre ton temps</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, sessions]) => {
            const totalMin = sessions.reduce((s, x) => s + x.dureeMinutes, 0);
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{fmtDate(date)}</span>
                  <span className="text-xs text-primary-400 font-semibold">{fmtDuration(totalMin)}</span>
                </div>
                <div className="space-y-1.5">
                  {sessions.map(s => (
                    <div key={s.id} className="flex items-center gap-3 px-3 py-2 bg-obsidian-700/60 rounded-xl border border-card-border/50">
                      <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-3.5 h-3.5 text-primary-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{s.taskTitre}</p>
                        <p className="text-slate-500 text-[11px] truncate">{s.projectNom}</p>
                      </div>
                      <span className="text-xs font-mono text-accent-green font-semibold flex-shrink-0">
                        {fmtDuration(s.dureeMinutes)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

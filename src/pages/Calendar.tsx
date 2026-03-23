import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, FolderKanban, FileText, CheckSquare, Package } from 'lucide-react';
import { useStore } from '../store/useStore';

// ─── Types ───────────────────────────────────────────────────────────────────

type EventType = 'project' | 'invoice' | 'task' | 'livrable';

interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  type: EventType;
  section: string; // for navigation
}

const TYPE_CONFIG: Record<EventType, { color: string; dot: string; icon: React.FC<{ className?: string }> }> = {
  project:  { color: 'text-purple-300', dot: 'bg-purple-500',  icon: FolderKanban },
  invoice:  { color: 'text-emerald-300', dot: 'bg-emerald-500', icon: FileText },
  task:     { color: 'text-cyan-300',    dot: 'bg-cyan-500',    icon: CheckSquare },
  livrable: { color: 'text-amber-300',   dot: 'bg-amber-500',   icon: Package },
};

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday = 0, Sunday = 6 */
function getFirstDayOffset(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const Calendar: React.FC = () => {
  const { projects, invoices, setActiveSection } = useStore();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // ── Aggregate events ──
  const events = useMemo(() => {
    const list: CalendarEvent[] = [];

    // Project deadlines
    projects.forEach(p => {
      if (p.dateFin) {
        list.push({ id: p.id, date: p.dateFin, label: `${p.nom} — deadline`, type: 'project', section: 'projects' });
      }
      // Task deadlines
      p.taches?.forEach(t => {
        if (t.dateEcheance && t.statut !== 'fait') {
          list.push({ id: t.id, date: t.dateEcheance, label: `${t.titre} (${p.nom})`, type: 'task', section: 'projects' });
        }
      });
      // Livrables
      p.livrables?.forEach(l => {
        if (l.datePrevue) {
          list.push({ id: l.id, date: l.datePrevue, label: `${l.titre} (${p.nom})`, type: 'livrable', section: 'projects' });
        }
      });
    });

    // Invoice due dates
    invoices.forEach(inv => {
      if (inv.dateEcheance && inv.statut !== 'payée' && inv.statut !== 'annulée') {
        list.push({ id: inv.id, date: inv.dateEcheance, label: `${inv.numero} — ${inv.clientNom}`, type: 'invoice', section: 'invoices' });
      }
    });

    return list;
  }, [projects, invoices]);

  // ── Events grouped by date (for current month) ──
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    const prefix = `${year}-${pad(month + 1)}`;
    events.forEach(e => {
      if (e.date.startsWith(prefix)) {
        (map[e.date] ??= []).push(e);
      }
    });
    return map;
  }, [events, year, month]);

  const daysInMonth = getDaysInMonth(year, month);
  const offset = getFirstDayOffset(year, month);
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(null);
  };

  const handleEventClick = (ev: CalendarEvent) => {
    setActiveSection(ev.section);
  };

  // Events for the selected day
  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] || []) : [];

  // Count events this month
  const totalEventsThisMonth = Object.values(eventsByDate).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Calendrier</h1>
          <p className="text-sm text-slate-400 mt-1">
            {totalEventsThisMonth} événement{totalEventsThisMonth !== 1 ? 's' : ''} ce mois
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-obsidian-700 text-slate-300 hover:bg-obsidian-600 border border-card-border transition-colors">
            Aujourd'hui
          </button>
          <button onClick={prevMonth} className="p-2 rounded-lg bg-obsidian-700 text-slate-300 hover:bg-obsidian-600 border border-card-border transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-[180px] text-center font-display font-semibold text-white text-lg">
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-lg bg-obsidian-700 text-slate-300 hover:bg-obsidian-600 border border-card-border transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-4 text-xs">
        {(Object.entries(TYPE_CONFIG) as [EventType, typeof TYPE_CONFIG[EventType]][]).map(([type, cfg]) => (
          <span key={type} className="flex items-center gap-1.5 text-slate-400">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            {type === 'project' ? 'Projet' : type === 'invoice' ? 'Facture' : type === 'task' ? 'Tâche' : 'Livrable'}
          </span>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Calendar Grid ── */}
        <div className="flex-1 bg-obsidian-800 rounded-2xl border border-card-border p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty offset cells */}
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`off-${i}`} className="aspect-square" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDay;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={`
                    aspect-square rounded-xl p-1 flex flex-col items-center justify-start gap-0.5 transition-all text-sm relative
                    ${isToday ? 'ring-2 ring-purple-500/60' : ''}
                    ${isSelected ? 'bg-purple-500/20 border border-purple-500/40' : 'hover:bg-obsidian-700 border border-transparent'}
                    ${dayEvents.length > 0 ? 'cursor-pointer' : 'cursor-default'}
                  `}
                >
                  <span className={`text-xs font-medium ${isToday ? 'text-purple-400 font-bold' : 'text-slate-300'}`}>
                    {day}
                  </span>

                  {/* Event dots (max 3 visible) */}
                  {dayEvents.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-0.5 mt-auto">
                      {dayEvents.slice(0, 3).map((ev, idx) => (
                        <span key={idx} className={`w-1.5 h-1.5 rounded-full ${TYPE_CONFIG[ev.type].dot}`} />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[8px] text-slate-500 leading-none">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Side Panel: selected day events ── */}
        <div className="lg:w-80 bg-obsidian-800 rounded-2xl border border-card-border p-4">
          <h2 className="text-sm font-semibold text-slate-400 mb-3">
            {selectedDay
              ? new Date(selectedDay + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
              : 'Sélectionnez un jour'}
          </h2>

          {selectedDay && selectedEvents.length === 0 && (
            <p className="text-xs text-slate-500 italic">Aucun événement ce jour</p>
          )}

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {selectedEvents.map(ev => {
              const cfg = TYPE_CONFIG[ev.type];
              const Icon = cfg.icon;
              return (
                <button
                  key={`${ev.type}-${ev.id}`}
                  onClick={() => handleEventClick(ev)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl bg-obsidian-700/50 hover:bg-obsidian-600/50 border border-card-border transition-colors text-left group"
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg bg-obsidian-900/50 ${cfg.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                      {ev.label}
                    </p>
                    <p className={`text-xs ${cfg.color} mt-0.5`}>
                      {ev.type === 'project' ? 'Deadline projet' : ev.type === 'invoice' ? 'Échéance facture' : ev.type === 'task' ? 'Échéance tâche' : 'Date livrable'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Upcoming events summary (when no day selected) */}
          {!selectedDay && (
            <div className="space-y-2">
              {events
                .filter(e => e.date >= todayStr)
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 8)
                .map(ev => {
                  const cfg = TYPE_CONFIG[ev.type];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={`${ev.type}-${ev.id}`}
                      onClick={() => handleEventClick(ev)}
                      className="w-full flex items-start gap-3 p-3 rounded-xl bg-obsidian-700/50 hover:bg-obsidian-600/50 border border-card-border transition-colors text-left group"
                    >
                      <div className={`mt-0.5 p-1.5 rounded-lg bg-obsidian-900/50 ${cfg.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                          {ev.label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(ev.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </button>
                  );
                })}
              {events.filter(e => e.date >= todayStr).length === 0 && (
                <p className="text-xs text-slate-500 italic">Aucun événement à venir</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

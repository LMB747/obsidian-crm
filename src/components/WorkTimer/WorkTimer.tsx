import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Timer, ChevronDown, Check, Coffee, Zap } from 'lucide-react';
import { useStore } from '../../store/useStore';
import clsx from 'clsx';

type TimerState = 'idle' | 'running' | 'paused';
type TimerMode = 'chrono' | 'pomodoro';

const POMODORO_WORK = 25 * 60;   // 25 min
const POMODORO_BREAK = 5 * 60;   // 5 min

export const WorkTimer: React.FC = () => {
  const { projects, addTimerSession } = useStore();

  const [state, setState]           = useState<TimerState>('idle');
  const [elapsed, setElapsed]       = useState(0); // seconds
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTaskId, setSelectedTaskId]       = useState('');
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [justSaved, setJustSaved]   = useState(false);

  // Pomodoro state
  const [mode, setMode] = useState<TimerMode>('chrono');
  const [pomodoroPhase, setPomodoroPhase] = useState<'work' | 'break'>('work');
  const [pomodoroCount, setPomodoroCount] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedTask    = selectedProject?.taches.find(t => t.id === selectedTaskId);
  const activeTasks     = selectedProject?.taches.filter(t => t.statut !== 'fait') ?? [];

  const pomodoroTarget = pomodoroPhase === 'work' ? POMODORO_WORK : POMODORO_BREAK;
  const pomodoroRemaining = Math.max(0, pomodoroTarget - elapsed);

  // ── Timer tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (state === 'running') {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const delta = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(accumulatedRef.current + delta);
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (state === 'paused') {
        accumulatedRef.current = elapsed;
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state]);

  // ── Pomodoro phase transition ──────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'pomodoro' || state !== 'running') return;
    if (elapsed >= pomodoroTarget) {
      // Phase complete
      if (pomodoroPhase === 'work') {
        // Save work session
        const dureeMinutes = Math.round(POMODORO_WORK / 60);
        addTimerSession({
          projectId: selectedProjectId,
          projectNom: selectedProject?.nom ?? '',
          taskId: selectedTaskId,
          taskTitre: selectedTask?.titre ?? 'Pomodoro',
          dureeMinutes,
          date: new Date().toISOString().split('T')[0],
        });
        setPomodoroCount(c => c + 1);
        setPomodoroPhase('break');
        // Try notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Pomodoro terminé !', { body: 'Pause de 5 minutes' });
        }
      } else {
        setPomodoroPhase('work');
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Pause terminée !', { body: 'Reprise du travail' });
        }
      }
      // Reset timer for new phase
      setElapsed(0);
      accumulatedRef.current = 0;
      startTimeRef.current = Date.now();
    }
  }, [elapsed, mode, state, pomodoroPhase, pomodoroTarget]);

  // ── Format HH:MM:SS ────────────────────────────────────────────────────────
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (!selectedProjectId) { setShowProjectPicker(true); return; }
    // Request notification permission for pomodoro
    if (mode === 'pomodoro' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setState('running');
  };

  const handlePause = () => setState('paused');
  const handleResume = () => setState('running');

  const handleStop = useCallback(() => {
    if (mode === 'chrono' && elapsed < 10) {
      setState('idle');
      setElapsed(0);
      accumulatedRef.current = 0;
      return;
    }
    if (mode === 'chrono') {
      const dureeMinutes = Math.max(1, Math.round(elapsed / 60));
      addTimerSession({
        projectId:   selectedProjectId,
        projectNom:  selectedProject?.nom ?? '',
        taskId:      selectedTaskId,
        taskTitre:   selectedTask?.titre ?? 'Sans tâche',
        dureeMinutes,
        date: new Date().toISOString().split('T')[0],
      });
    }
    // For pomodoro, partial work is saved on stop if > 1 min
    if (mode === 'pomodoro' && pomodoroPhase === 'work' && elapsed >= 60) {
      const dureeMinutes = Math.max(1, Math.round(elapsed / 60));
      addTimerSession({
        projectId:   selectedProjectId,
        projectNom:  selectedProject?.nom ?? '',
        taskId:      selectedTaskId,
        taskTitre:   selectedTask?.titre ?? 'Pomodoro (partiel)',
        dureeMinutes,
        date: new Date().toISOString().split('T')[0],
      });
    }
    setState('idle');
    setElapsed(0);
    accumulatedRef.current = 0;
    setPomodoroPhase('work');
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }, [elapsed, selectedProjectId, selectedProject, selectedTaskId, selectedTask, addTimerSession, mode, pomodoroPhase]);

  const displayTime = mode === 'pomodoro' ? pomodoroRemaining : elapsed;
  const progressPct = mode === 'pomodoro'
    ? (elapsed / pomodoroTarget) * 100
    : Math.min(100, (elapsed % 3600) / 3600 * 100);

  const ringColor = mode === 'pomodoro'
    ? (pomodoroPhase === 'break' ? '#06b6d4' : state === 'running' ? '#ef4444' : '#f59e0b')
    : (state === 'running' ? '#10b981' : state === 'paused' ? '#f59e0b' : '#7c3aed');

  return (
    <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-card-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center',
            state === 'running' ? (mode === 'pomodoro' ? 'bg-red-500/20' : 'bg-accent-green/20') : state === 'paused' ? 'bg-amber-500/20' : 'bg-primary-500/20'
          )}>
            <Timer className={clsx('w-4 h-4',
              state === 'running' ? (mode === 'pomodoro' ? 'text-red-400' : 'text-accent-green') : state === 'paused' ? 'text-amber-400' : 'text-primary-400'
            )} />
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-sm">Chronomètre</h3>
            <p className="text-slate-500 text-xs">
              {mode === 'pomodoro' ? `Pomodoro ${pomodoroCount} — ${pomodoroPhase === 'work' ? 'Travail' : 'Pause'}` : 'Suivre le temps en direct'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {justSaved && (
            <div className="flex items-center gap-1.5 bg-accent-green/20 border border-accent-green/30 px-3 py-1.5 rounded-full">
              <Check className="w-3 h-3 text-accent-green" />
              <span className="text-accent-green text-xs font-semibold">Enregistré !</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* ── Mode Toggle ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-obsidian-700 border border-card-border rounded-xl p-1">
          <button
            onClick={() => { if (state === 'idle') setMode('chrono'); }}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              mode === 'chrono' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
            )}
          >
            <Timer className="w-3 h-3" /> Chrono
          </button>
          <button
            onClick={() => { if (state === 'idle') { setMode('pomodoro'); setPomodoroPhase('work'); setPomodoroCount(0); setElapsed(0); accumulatedRef.current = 0; } }}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              mode === 'pomodoro' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
            )}
          >
            <Zap className="w-3 h-3" /> Pomodoro
          </button>
        </div>

        {/* ── Project / Task Selector ────────────────────────────────────────── */}
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Projet</label>
            <button
              onClick={() => setShowProjectPicker(p => !p)}
              className="w-full flex items-center justify-between bg-obsidian-700 border border-card-border text-sm rounded-xl px-3 py-2 hover:border-primary-500/40 transition-all"
            >
              <span className={selectedProject ? 'text-white' : 'text-slate-500'}>
                {selectedProject ? selectedProject.nom : '— Choisir un projet —'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {showProjectPicker && (
              <div className="mt-1 bg-obsidian-700 border border-card-border rounded-xl overflow-hidden shadow-lg z-10">
                {projects.filter(p => p.statut === 'en cours' || p.statut === 'planification').map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProjectId(p.id);
                      setSelectedTaskId('');
                      setShowProjectPicker(false);
                    }}
                    className={clsx(
                      'w-full text-left px-3 py-2 text-sm hover:bg-primary-500/10 transition-colors',
                      selectedProjectId === p.id ? 'text-primary-400 font-semibold' : 'text-white'
                    )}
                  >
                    {p.nom}
                    <span className="text-slate-500 text-xs ml-2">{p.clientNom}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProject && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tâche (optionnel)</label>
              <select
                value={selectedTaskId}
                onChange={e => setSelectedTaskId(e.target.value)}
                className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">— Sans tâche spécifique —</option>
                {activeTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.titre}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── Timer Display ─────────────────────────────────────────────────── */}
        <div className="relative">
          <div className="flex flex-col items-center py-4">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" fill="none" stroke="#1e1e42" strokeWidth="8" />
                <circle
                  cx="64" cy="64" r="56" fill="none"
                  stroke={ringColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - Math.min(progressPct, 100) / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={clsx('font-mono font-bold text-2xl',
                  mode === 'pomodoro' && pomodoroPhase === 'break' ? 'text-cyan-400' :
                  state === 'running' ? (mode === 'pomodoro' ? 'text-red-400' : 'text-accent-green') :
                  state === 'paused' ? 'text-amber-400' : 'text-white'
                )}>
                  {fmt(displayTime)}
                </span>
                <span className="text-slate-500 text-[10px] mt-0.5">
                  {mode === 'pomodoro'
                    ? (pomodoroPhase === 'break' ? 'pause' : state === 'running' ? 'focus' : 'prêt')
                    : (state === 'running' ? 'en cours' : state === 'paused' ? 'en pause' : 'prêt')
                  }
                </span>
                {mode === 'pomodoro' && pomodoroPhase === 'break' && state === 'running' && (
                  <Coffee className="w-4 h-4 text-cyan-400 mt-1" />
                )}
              </div>
            </div>
            {mode === 'pomodoro' && pomodoroCount > 0 && (
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: pomodoroCount }).map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-red-400" />
                ))}
                <span className="text-slate-500 text-[10px] ml-1">{pomodoroCount} pomodoro{pomodoroCount > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Controls ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-3">
          {state === 'idle' && (
            <button
              onClick={handleStart}
              className={clsx(
                'flex items-center gap-2 px-6 py-2.5 border font-semibold text-sm rounded-xl transition-all',
                mode === 'pomodoro'
                  ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
                  : 'bg-accent-green/20 border-accent-green/40 text-accent-green hover:bg-accent-green/30'
              )}
            >
              <Play className="w-4 h-4 fill-current" />
              {mode === 'pomodoro' ? 'Focus' : 'Démarrer'}
            </button>
          )}

          {state === 'running' && (
            <>
              <button
                onClick={handlePause}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 font-semibold text-sm rounded-xl hover:bg-amber-500/30 transition-all"
              >
                <Pause className="w-4 h-4 fill-current" />
                Pause
              </button>
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent-red/20 border border-accent-red/40 text-accent-red font-semibold text-sm rounded-xl hover:bg-accent-red/30 transition-all"
              >
                <Square className="w-4 h-4 fill-current" />
                Arrêter
              </button>
            </>
          )}

          {state === 'paused' && (
            <>
              <button
                onClick={handleResume}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent-green/20 border border-accent-green/40 text-accent-green font-semibold text-sm rounded-xl hover:bg-accent-green/30 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                Reprendre
              </button>
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent-red/20 border border-accent-red/40 text-accent-red font-semibold text-sm rounded-xl hover:bg-accent-red/30 transition-all"
              >
                <Square className="w-4 h-4 fill-current" />
                Enregistrer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

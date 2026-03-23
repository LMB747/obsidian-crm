import React, { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  addToast: (toastData) => {
    const id = uuidv4();
    set((state) => ({ toasts: [...state.toasts, { ...toastData, id }] }));
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

// ─── Static helpers ──────────────────────────────────────────────────────────

export const toast = {
  success: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'success', title, message, duration });
  },
  error: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'error', title, message, duration });
  },
  warning: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'warning', title, message, duration });
  },
  info: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'info', title, message, duration });
  },
};

// ─── Config per type ─────────────────────────────────────────────────────────

const typeConfig = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-accent-green',
    borderColor: 'border-l-accent-green',
    barColor: 'bg-accent-green',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-accent-red',
    borderColor: 'border-l-accent-red',
    barColor: 'bg-accent-red',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-accent-orange',
    borderColor: 'border-l-accent-orange',
    barColor: 'bg-accent-orange',
  },
  info: {
    icon: Info,
    iconColor: 'text-primary-400',
    borderColor: 'border-l-primary-400',
    barColor: 'bg-primary-400',
  },
} as const;

// ─── ToastItem ────────────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const DEFAULT_DURATION = 3500;

export const ToastItem: React.FC<ToastItemProps> = ({ toast: t, onRemove }) => {
  const duration = t.duration ?? DEFAULT_DURATION;
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => onRemove(t.id), 300);
  };

  useEffect(() => {
    // Trigger enter animation on next frame
    const enterFrame = requestAnimationFrame(() => setVisible(true));

    timerRef.current = setTimeout(dismiss, duration);

    return () => {
      cancelAnimationFrame(enterFrame);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const config = typeConfig[t.type];
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        'relative w-80 bg-obsidian-700 border border-card-border border-l-4 rounded-xl shadow-card overflow-hidden',
        'transition-all duration-300 ease-out',
        config.borderColor,
        visible && !leaving
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-8'
      )}
    >
      {/* Body */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', config.iconColor)} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-snug">{t.title}</p>
          {t.message && (
            <p className="text-slate-400 text-xs mt-0.5 leading-snug">{t.message}</p>
          )}
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-card-hover transition-all"
          aria-label="Fermer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-card-border">
        <div
          className={clsx('h-full', config.barColor)}
          style={{
            animation: `toastProgress ${duration}ms linear forwards`,
          }}
        />
      </div>

      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
};

// ─── ToastContainer ───────────────────────────────────────────────────────────

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
};

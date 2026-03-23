import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react';
import clsx from 'clsx';

type AlertType = 'warning' | 'error' | 'info' | 'success';

interface AlertBannerProps {
  type: AlertType;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
  className?: string;
}

const CONFIG: Record<AlertType, { icon: React.FC<{ className?: string }>; bg: string; border: string; text: string; iconColor: string }> = {
  warning: { icon: AlertTriangle, bg: 'bg-amber-500/10',    border: 'border-amber-500/20',    text: 'text-amber-300',   iconColor: 'text-amber-400' },
  error:   { icon: AlertCircle,   bg: 'bg-red-500/10',      border: 'border-red-500/20',      text: 'text-red-300',     iconColor: 'text-red-400' },
  info:    { icon: Info,          bg: 'bg-primary-500/10',  border: 'border-primary-500/20',  text: 'text-primary-300', iconColor: 'text-primary-400' },
  success: { icon: CheckCircle2,  bg: 'bg-emerald-500/10',  border: 'border-emerald-500/20',  text: 'text-emerald-300', iconColor: 'text-emerald-400' },
};

export const AlertBanner: React.FC<AlertBannerProps> = ({ type, title, message, action, onDismiss, className }) => {
  const c = CONFIG[type];
  const Icon = c.icon;
  return (
    <div className={clsx('flex items-center gap-3 px-4 py-3 rounded-xl border animate-fade-in', c.bg, c.border, className)}>
      <Icon className={clsx('w-4 h-4 flex-shrink-0', c.iconColor)} />
      <div className="flex-1 min-w-0">
        <span className={clsx('font-semibold text-sm', c.text)}>{title}</span>
        {message && <span className={clsx('text-xs ml-2 opacity-80', c.text)}>{message}</span>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className={clsx('text-xs underline flex-shrink-0 hover:opacity-80', c.text)}
        >
          {action.label} →
        </button>
      )}
      {onDismiss && (
        <button onClick={onDismiss} className={clsx('flex-shrink-0 hover:opacity-70', c.iconColor)}>
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

import React from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  icon,
  children,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const colorMap = {
    danger:  { bg: 'bg-red-500/20', text: 'text-red-400', hover: 'hover:bg-red-500/30', icon: 'text-red-400', border: 'border-red-500/40' },
    warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', hover: 'hover:bg-amber-500/30', icon: 'text-amber-400', border: 'border-amber-500/40' },
    info:    { bg: 'bg-blue-500/20', text: 'text-blue-400', hover: 'hover:bg-blue-500/30', icon: 'text-blue-400', border: 'border-blue-500/40' },
  };
  const colors = colorMap[variant];

  const defaultIcon = variant === 'info'
    ? <Info className={`w-5 h-5 ${colors.icon}`} />
    : <AlertTriangle className={`w-5 h-5 ${colors.icon}`} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-obsidian-800 border border-card-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <button onClick={onCancel} className="absolute top-3 right-3 text-slate-500 hover:text-white p-1 rounded-lg">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
            {icon || defaultIcon}
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">{title}</h3>
            <p className="text-slate-400 text-xs mt-1">{message}</p>
          </div>
        </div>
        {children && <div className="mt-4">{children}</div>}
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl border border-card-border text-slate-400 text-sm hover:bg-card-hover transition-all">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`flex-1 py-2 rounded-xl ${colors.bg} ${colors.text} text-sm font-semibold ${colors.hover} transition-all`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook for easy usage
export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const confirm = (opts: { title: string; message: string; confirmLabel?: string; variant?: 'danger' | 'warning' | 'info'; onConfirm: () => void }) => {
    setState({ isOpen: true, ...opts });
  };

  const dialog = (
    <ConfirmDialog
      isOpen={state.isOpen}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      variant={state.variant}
      onConfirm={() => { state.onConfirm(); setState(s => ({ ...s, isOpen: false })); }}
      onCancel={() => setState(s => ({ ...s, isOpen: false }))}
    />
  );

  return { confirm, dialog };
}

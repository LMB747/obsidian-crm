import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'cyan' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

const variants = {
  default: 'bg-slate-700/60 text-slate-300 border-slate-600/40',
  success: 'bg-accent-green/15 text-emerald-400 border-accent-green/30',
  warning: 'bg-accent-orange/15 text-amber-400 border-accent-orange/30',
  error: 'bg-accent-red/15 text-red-400 border-accent-red/30',
  info: 'bg-accent-cyan/15 text-cyan-400 border-accent-cyan/30',
  purple: 'bg-primary-500/15 text-primary-300 border-primary-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  outline: 'bg-transparent text-slate-400 border-slate-600',
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'sm', className }) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium border rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

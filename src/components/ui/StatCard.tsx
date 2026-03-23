import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: 'purple' | 'cyan' | 'green' | 'orange' | 'red';
  gradient?: string;
  className?: string;
}

const colorMap = {
  purple: {
    icon: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
    glow: 'shadow-glow-purple',
    trend: 'text-primary-400',
  },
  cyan: {
    icon: 'bg-accent-cyan/20 text-cyan-400 border-accent-cyan/30',
    glow: 'shadow-glow-cyan',
    trend: 'text-cyan-400',
  },
  green: {
    icon: 'bg-accent-green/20 text-emerald-400 border-accent-green/30',
    glow: 'shadow-glow-green',
    trend: 'text-emerald-400',
  },
  orange: {
    icon: 'bg-accent-orange/20 text-amber-400 border-accent-orange/30',
    glow: '',
    trend: 'text-amber-400',
  },
  red: {
    icon: 'bg-accent-red/20 text-red-400 border-accent-red/30',
    glow: '',
    trend: 'text-red-400',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'purple',
  className,
}) => {
  const colors = colorMap[color];
  const isPositiveTrend = trend && trend.value >= 0;

  return (
    <div
      className={clsx(
        'bg-card border border-card-border rounded-2xl p-5 hover:border-primary-500/30 hover:bg-card-hover transition-all duration-300 group',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={clsx(
            'w-11 h-11 rounded-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110',
            colors.icon
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={clsx('flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg', isPositiveTrend ? 'bg-accent-green/10 text-emerald-400' : 'bg-accent-red/10 text-red-400')}>
            {isPositiveTrend ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositiveTrend ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>

      <div>
        <p className="text-2xl font-display font-bold text-white mb-0.5">{value}</p>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        {trend && (
          <p className="text-xs text-slate-500 mt-1">{trend.label}</p>
        )}
      </div>
    </div>
  );
};

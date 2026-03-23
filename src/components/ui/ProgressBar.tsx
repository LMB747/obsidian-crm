import React from 'react';
import clsx from 'clsx';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'purple' | 'cyan' | 'green' | 'orange' | 'red';
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const colors = {
  purple: 'bg-gradient-primary',
  cyan: 'bg-gradient-cyan',
  green: 'bg-gradient-green',
  orange: 'bg-gradient-orange',
  red: 'bg-red-500',
};

const heights = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2.5',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = 'purple',
  size = 'sm',
  showLabel = false,
  animated = true,
  className,
}) => {
  const percentage = Math.min(Math.round((value / max) * 100), 100);

  return (
    <div className={clsx('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs text-slate-400">Progression</span>
          <span className="text-xs font-semibold text-white">{percentage}%</span>
        </div>
      )}
      <div className={clsx('w-full bg-obsidian-500 rounded-full overflow-hidden', heights[size])}>
        <div
          className={clsx('h-full rounded-full transition-all duration-700 ease-out', colors[color], animated && 'relative overflow-hidden')}
          style={{ width: `${percentage}%` }}
        >
          {animated && (
            <div className="absolute inset-0 bg-white/20 animate-pulse" style={{ animationDuration: '2s' }} />
          )}
        </div>
      </div>
    </div>
  );
};

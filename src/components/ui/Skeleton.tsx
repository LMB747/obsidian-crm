import React from 'react';
import clsx from 'clsx';

// Base skeleton avec animation pulse
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('animate-pulse bg-obsidian-600/60 rounded-lg', className)} />
);

// Skeleton pour une carte KPI du dashboard
export const StatCardSkeleton: React.FC = () => (
  <div className="bg-card border border-card-border rounded-2xl p-5 space-y-3">
    <div className="flex justify-between items-start">
      <Skeleton className="w-20 h-3" />
      <Skeleton className="w-9 h-9 rounded-xl" />
    </div>
    <Skeleton className="w-24 h-7" />
    <Skeleton className="w-32 h-3" />
  </div>
);

// Skeleton pour une ligne de tableau
export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <div className="flex items-center gap-4 px-4 py-3 border-b border-card-border/50">
    <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
    {Array.from({ length: cols - 1 }).map((_, i) => (
      <Skeleton key={i} className={clsx('h-3', i === 0 ? 'w-32' : i === 1 ? 'w-24' : 'w-16')} />
    ))}
  </div>
);

// Skeleton page entière (utilisé dans Suspense)
export const PageSkeleton: React.FC = () => (
  <div className="p-6 space-y-6 animate-fade-in">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="w-48 h-6" />
        <Skeleton className="w-64 h-3" />
      </div>
      <Skeleton className="w-36 h-10 rounded-xl" />
    </div>
    {/* KPI cards */}
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
    </div>
    {/* Table */}
    <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-card-border">
        <Skeleton className="w-40 h-4" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} />)}
    </div>
  </div>
);

// Skeleton pour une carte projet kanban
export const KanbanCardSkeleton: React.FC = () => (
  <div className="bg-obsidian-700 border border-card-border rounded-xl p-3 space-y-2">
    <Skeleton className="w-3/4 h-3" />
    <Skeleton className="w-1/2 h-3" />
    <div className="flex gap-2 mt-2">
      <Skeleton className="w-16 h-4 rounded-full" />
      <Skeleton className="w-12 h-4 rounded-full" />
    </div>
  </div>
);

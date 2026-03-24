/**
 * ActivityTimeline — chronologie d'activité pour fiches client/projet/freelancer
 * Affiche les événements triés par date avec icônes par type.
 */
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText, Pencil, Mail, StickyNote, CheckSquare,
  CreditCard, Plus, Send, UserPlus, Briefcase,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ActivityType =
  | 'creation' | 'modification' | 'document' | 'facture'
  | 'email' | 'note' | 'tache' | 'paiement' | 'envoi' | 'assignation';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  description: string;
  date: string;
  auteur?: string;
  metadata?: Record<string, any>;
}

// ─── Config ─────────────────────────────────────────────────────────────────

const typeConfig: Record<ActivityType, { icon: React.ElementType; color: string }> = {
  creation:     { icon: Plus,       color: 'text-accent-green' },
  modification: { icon: Pencil,     color: 'text-primary-400' },
  document:     { icon: FileText,   color: 'text-amber-400' },
  facture:      { icon: CreditCard, color: 'text-accent-cyan' },
  email:        { icon: Mail,       color: 'text-pink-400' },
  note:         { icon: StickyNote, color: 'text-violet-400' },
  tache:        { icon: CheckSquare,color: 'text-blue-400' },
  paiement:     { icon: CreditCard, color: 'text-accent-green' },
  envoi:        { icon: Send,       color: 'text-amber-400' },
  assignation:  { icon: UserPlus,   color: 'text-cyan-400' },
};

// ─── Component ──────────────────────────────────────────────────────────────

interface ActivityTimelineProps {
  events: ActivityEvent[];
  maxItems?: number;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ events, maxItems }) => {
  const sorted = [...events]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, maxItems);

  if (sorted.length === 0) {
    return (
      <div className="text-center py-6">
        <Briefcase className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-xs text-slate-500">Aucune activité enregistrée</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-primary-500/40 via-primary-500/20 to-transparent" />

      {sorted.map(event => {
        const config = typeConfig[event.type] || typeConfig.modification;
        const Icon = config.icon;

        return (
          <div key={event.id} className="relative mb-3 last:mb-0">
            {/* Dot on line */}
            <div className={clsx(
              'absolute -left-6 top-2 w-[18px] h-[18px] rounded-full border-2 border-obsidian-900 flex items-center justify-center',
              'bg-obsidian-700'
            )}>
              <Icon className={clsx('w-2.5 h-2.5', config.color)} />
            </div>

            {/* Card */}
            <div className="bg-obsidian-700/50 border border-card-border rounded-lg px-3 py-2">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-slate-500">
                  {formatDistanceToNow(new Date(event.date), { addSuffix: true, locale: fr })}
                </span>
                {event.auteur && (
                  <span className="text-[10px] text-slate-600">{event.auteur}</span>
                )}
              </div>
              <p className="text-xs text-white leading-snug">{event.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Search, Users, Briefcase, FolderOpen, FileText, X,
  LayoutDashboard, Moon, BarChart3, Settings, Clock, FilePlus2,
  TrendingUp, ScanSearch, Shield, Plus, Zap, ArrowRight, CalendarDays,
  CheckSquare, UserSearch,
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../store/useStore';
import { useProspectionStore } from '../../store/useProspectionStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  category: string;
  icon?: React.FC<{ className?: string }>;
  action: () => void;
}

interface ItemGroup {
  category: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  items: PaletteItem[];
}

// ─── Fuzzy match ──────────────────────────────────────────────────────────────

function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  // Exact start match = best
  if (t.startsWith(q)) return 3;
  // Contains = good
  if (t.includes(q)) return 2;
  // Fuzzy = ok
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length ? 1 : 0;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const NAV_SECTIONS: { id: string; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'dashboard',    label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'clients',      label: 'Clients CRM',    icon: Users },
  { id: 'freelancers',  label: 'Prestataires',   icon: Briefcase },
  { id: 'projects',     label: 'Projets',        icon: FolderOpen },
  { id: 'worktracking', label: 'Suivi Travaux',  icon: Clock },
  { id: 'invoices',     label: 'Facturation',    icon: FileText },
  { id: 'documents',    label: 'Documents',      icon: FilePlus2 },
  { id: 'snooze',       label: 'Pay to Snooze',  icon: Moon },
  { id: 'calendar',     label: 'Calendrier',     icon: CalendarDays },
  { id: 'analytics',    label: 'Analytiques',    icon: BarChart3 },
  { id: 'media-buying', label: 'Media Buying',   icon: TrendingUp },
  { id: 'prospection',  label: 'Prospection IA', icon: ScanSearch },
  { id: 'admin',        label: 'Administration', icon: Shield },
  { id: 'settings',     label: 'Parametres',     icon: Settings },
];

const QUICK_ACTIONS: { id: string; label: string; sublabel: string; section: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'new-client',     label: 'Nouveau client',      sublabel: 'Ajouter au CRM',        section: 'clients',     icon: Plus },
  { id: 'new-project',    label: 'Nouveau projet',      sublabel: 'Creer un projet',       section: 'projects',    icon: Plus },
  { id: 'new-freelancer', label: 'Nouveau prestataire', sublabel: 'Ajouter un freelance',  section: 'freelancers', icon: Plus },
  { id: 'new-invoice',    label: 'Nouvelle facture',    sublabel: 'Creer une facture',     section: 'documents',   icon: Plus },
  { id: 'new-devis',      label: 'Nouveau devis',       sublabel: 'Generer un devis',      section: 'documents',   icon: Plus },
  { id: 'start-timer',    label: 'Demarrer un timer',   sublabel: 'Suivi du temps',        section: 'worktracking', icon: Zap },
];

const MAX_PER_CATEGORY = 4;

// ─── Component ────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const { clients, freelancers, projects, invoices, setActiveSection } = useStore();
  const prospects = useProspectionStore(s => s.prospects);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build result groups based on query
  const groups: ItemGroup[] = React.useMemo(() => {
    const q = query.trim();
    const ql = q.toLowerCase();

    const navigate = (section: string) => () => {
      setActiveSection(section);
      onClose();
    };

    // ── No query → show quick actions + navigation ──
    if (!q) {
      const actionItems: PaletteItem[] = QUICK_ACTIONS.map((a) => ({
        id: a.id,
        label: a.label,
        sublabel: a.sublabel,
        category: 'actions',
        icon: a.icon,
        action: navigate(a.section),
      }));

      const navItems: PaletteItem[] = NAV_SECTIONS.map((s) => ({
        id: `nav-${s.id}`,
        label: s.label,
        category: 'navigation',
        icon: s.icon,
        action: navigate(s.id),
      }));

      return [
        { category: 'actions',    label: 'Actions rapides', icon: Zap,          items: actionItems },
        { category: 'navigation', label: 'Navigation',      icon: ArrowRight,   items: navItems },
      ];
    }

    // ── With query → search everything ──
    const bestMatch = (texts: string[]): number =>
      Math.max(...texts.map((t) => fuzzyScore(t, ql)));

    // Navigation matches
    const navMatches: PaletteItem[] = NAV_SECTIONS
      .filter((s) => fuzzyMatch(s.label, ql) || fuzzyMatch(s.id, ql))
      .map((s) => ({
        id: `nav-${s.id}`,
        label: s.label,
        sublabel: 'Aller a la section',
        category: 'navigation',
        icon: s.icon,
        action: navigate(s.id),
      }));

    // Action matches
    const actionMatches: PaletteItem[] = QUICK_ACTIONS
      .filter((a) => fuzzyMatch(a.label, ql) || fuzzyMatch(a.sublabel, ql))
      .map((a) => ({
        id: a.id,
        label: a.label,
        sublabel: a.sublabel,
        category: 'actions',
        icon: a.icon,
        action: navigate(a.section),
      }));

    // Entity searches
    const clientResults: PaletteItem[] = clients
      .filter((c) => fuzzyMatch(c.nom, ql) || fuzzyMatch(c.entreprise, ql) || fuzzyMatch(c.email, ql))
      .sort((a, b) => bestMatch([b.nom, b.entreprise]) - bestMatch([a.nom, a.entreprise]))
      .slice(0, MAX_PER_CATEGORY)
      .map((c) => ({
        id: c.id,
        label: c.nom,
        sublabel: c.entreprise,
        category: 'clients',
        action: navigate('clients'),
      }));

    const freelancerResults: PaletteItem[] = freelancers
      .filter((f) => fuzzyMatch(`${f.prenom} ${f.nom}`, ql) || fuzzyMatch(f.entreprise, ql) || fuzzyMatch(f.email, ql))
      .sort((a, b) => bestMatch([`${b.prenom} ${b.nom}`, b.entreprise]) - bestMatch([`${a.prenom} ${a.nom}`, a.entreprise]))
      .slice(0, MAX_PER_CATEGORY)
      .map((f) => ({
        id: f.id,
        label: `${f.prenom} ${f.nom}`,
        sublabel: f.entreprise,
        category: 'freelancers',
        action: navigate('freelancers'),
      }));

    const projectResults: PaletteItem[] = projects
      .filter((p) => fuzzyMatch(p.nom, ql) || fuzzyMatch(p.clientNom, ql) || fuzzyMatch(p.description, ql))
      .sort((a, b) => bestMatch([b.nom, b.clientNom]) - bestMatch([a.nom, a.clientNom]))
      .slice(0, MAX_PER_CATEGORY)
      .map((p) => ({
        id: p.id,
        label: p.nom,
        sublabel: p.clientNom,
        category: 'projects',
        action: navigate('projects'),
      }));

    const invoiceResults: PaletteItem[] = invoices
      .filter((i) => fuzzyMatch(i.numero, ql) || fuzzyMatch(i.clientNom, ql) || fuzzyMatch(i.statut, ql))
      .sort((a, b) => bestMatch([b.numero, b.clientNom]) - bestMatch([a.numero, a.clientNom]))
      .slice(0, MAX_PER_CATEGORY)
      .map((i) => ({
        id: i.id,
        label: i.numero,
        sublabel: `${i.clientNom} — ${i.total.toLocaleString('fr-FR')} €`,
        category: 'invoices',
        action: navigate('invoices'),
      }));

    // Prospect searches
    const prospectResults: PaletteItem[] = prospects
      .filter((p) => fuzzyMatch(`${p.prenom} ${p.nom}`, ql) || fuzzyMatch(p.entreprise, ql) || (p.email && fuzzyMatch(p.email, ql)))
      .sort((a, b) => bestMatch([`${b.prenom} ${b.nom}`, b.entreprise]) - bestMatch([`${a.prenom} ${a.nom}`, a.entreprise]))
      .slice(0, MAX_PER_CATEGORY)
      .map((p) => ({
        id: p.id,
        label: `${p.prenom} ${p.nom}`,
        sublabel: p.entreprise,
        category: 'prospects',
        action: navigate('prospection'),
      }));

    // Task searches (across all projects)
    const taskResults: PaletteItem[] = projects
      .flatMap((proj) => proj.taches.map((t) => ({ ...t, projectNom: proj.nom })))
      .filter((t) => fuzzyMatch(t.titre, ql))
      .sort((a, b) => fuzzyScore(b.titre, ql) - fuzzyScore(a.titre, ql))
      .slice(0, MAX_PER_CATEGORY)
      .map((t) => ({
        id: t.id,
        label: t.titre,
        sublabel: t.projectNom,
        category: 'tasks',
        action: navigate('projects'),
      }));

    return [
      { category: 'actions',     label: 'Actions',       icon: Zap,        items: actionMatches },
      { category: 'navigation',  label: 'Navigation',    icon: ArrowRight,  items: navMatches },
      { category: 'clients',     label: 'Clients',       icon: Users,       items: clientResults },
      { category: 'freelancers', label: 'Prestataires',  icon: Briefcase,   items: freelancerResults },
      { category: 'projects',    label: 'Projets',       icon: FolderOpen,  items: projectResults },
      { category: 'invoices',    label: 'Factures',      icon: FileText,    items: invoiceResults },
      { category: 'prospects',   label: 'Prospects',     icon: UserSearch,  items: prospectResults },
      { category: 'tasks',       label: 'Tâches',        icon: CheckSquare, items: taskResults },
    ].filter((g) => g.items.length > 0);
  }, [query, clients, freelancers, projects, invoices, prospects, setActiveSection, onClose]);

  // Flat list of all visible items for keyboard navigation
  const flatItems = groups.flatMap((g) => g.items);
  const totalItems = flatItems.length;

  const handleSelect = useCallback(
    (item: PaletteItem) => {
      item.action();
    },
    []
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(totalItems, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          handleSelect(flatItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flatItems, selectedIndex, totalItems, handleSelect, onClose]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  // Compute running index across groups for keyboard highlighting
  let runningIndex = 0;

  return (
    <div className="fixed inset-0 z-[9998] flex items-start justify-center px-4 pt-[15vh]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-[560px] bg-obsidian-800 border border-card-border rounded-2xl shadow-card-hover overflow-hidden animate-palette-in"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-card-border">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher ou taper une commande…"
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-base outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-card border border-card-border text-[10px] text-slate-500 font-mono">
            Ctrl+K
          </kbd>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-card-hover transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {groups.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500 text-sm">
              Aucun resultat pour &laquo; {query} &raquo;
            </div>
          ) : (
            groups.map((group) => {
              const GroupIcon = group.icon;

              return (
                <div key={group.category} className="mb-1">
                  {/* Group header */}
                  <div className="flex items-center gap-2 px-4 py-1.5">
                    <GroupIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {group.label}
                    </span>
                  </div>

                  {/* Group items */}
                  {group.items.map((item) => {
                    const itemIndex = runningIndex++;
                    const isSelected = itemIndex === selectedIndex;
                    const ItemIcon = item.icon;

                    return (
                      <button
                        key={item.id}
                        data-index={itemIndex}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          isSelected
                            ? 'bg-card-hover text-white'
                            : 'text-slate-300 hover:bg-card-hover hover:text-white'
                        )}
                      >
                        {ItemIcon && (
                          <ItemIcon className={clsx('w-4 h-4 flex-shrink-0', isSelected ? 'text-primary-400' : 'text-slate-500')} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.label}</p>
                          {item.sublabel && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {item.sublabel}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <span className="flex-shrink-0 text-xs text-slate-500 bg-card border border-card-border rounded px-1.5 py-0.5">
                            ↵
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-card-border text-xs text-slate-600">
          <span><kbd className="font-sans">↑↓</kbd> naviguer</span>
          <span><kbd className="font-sans">↵</kbd> selectionner</span>
          <span><kbd className="font-sans">Esc</kbd> fermer</span>
        </div>
      </div>

      <style>{`
        @keyframes paletteIn {
          from { opacity: 0; transform: scale(0.97) translateY(-8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .animate-palette-in {
          animation: paletteIn 0.18s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

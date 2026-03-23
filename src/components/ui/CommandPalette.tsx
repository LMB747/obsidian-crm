import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Search, Users, Briefcase, FolderOpen, FileText, X } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../store/useStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaletteResult {
  id: string;
  label: string;
  sublabel?: string;
  section: string;
  category: string;
}

interface ResultGroup {
  category: string;
  icon: React.FC<{ className?: string }>;
  items: PaletteResult[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  clients:     { label: 'Clients',      icon: Users },
  freelancers: { label: 'Prestataires', icon: Briefcase },
  projects:    { label: 'Projets',      icon: FolderOpen },
  invoices:    { label: 'Factures',     icon: FileText },
};

const MAX_PER_CATEGORY = 3;

// ─── Component ────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const { clients, freelancers, projects, invoices, setActiveSection } = useStore();
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
  const groups: ResultGroup[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    const match = (text: string) => !q || text.toLowerCase().includes(q);

    const clientResults: PaletteResult[] = clients
      .filter((c) => match(c.nom) || match(c.entreprise) || match(c.email))
      .slice(0, MAX_PER_CATEGORY)
      .map((c) => ({
        id: c.id,
        label: c.nom,
        sublabel: c.entreprise,
        section: 'clients',
        category: 'clients',
      }));

    const freelancerResults: PaletteResult[] = freelancers
      .filter((f) => match(`${f.prenom} ${f.nom}`) || match(f.entreprise) || match(f.email))
      .slice(0, MAX_PER_CATEGORY)
      .map((f) => ({
        id: f.id,
        label: `${f.prenom} ${f.nom}`,
        sublabel: f.entreprise,
        section: 'freelancers',
        category: 'freelancers',
      }));

    const projectResults: PaletteResult[] = projects
      .filter((p) => match(p.nom) || match(p.clientNom) || match(p.description))
      .slice(0, MAX_PER_CATEGORY)
      .map((p) => ({
        id: p.id,
        label: p.nom,
        sublabel: p.clientNom,
        section: 'projects',
        category: 'projects',
      }));

    const invoiceResults: PaletteResult[] = invoices
      .filter((i) => match(i.numero) || match(i.clientNom) || match(i.statut))
      .slice(0, MAX_PER_CATEGORY)
      .map((i) => ({
        id: i.id,
        label: i.numero,
        sublabel: `${i.clientNom} — ${i.total.toLocaleString('fr-FR')} €`,
        section: 'invoices',
        category: 'invoices',
      }));

    return [
      { category: 'clients',     icon: CATEGORY_CONFIG.clients.icon,     items: clientResults },
      { category: 'freelancers', icon: CATEGORY_CONFIG.freelancers.icon, items: freelancerResults },
      { category: 'projects',    icon: CATEGORY_CONFIG.projects.icon,    items: projectResults },
      { category: 'invoices',    icon: CATEGORY_CONFIG.invoices.icon,    items: invoiceResults },
    ].filter((g) => g.items.length > 0);
  }, [query, clients, freelancers, projects, invoices]);

  // Flat list of all visible items for keyboard navigation
  const flatItems = groups.flatMap((g) => g.items);
  const totalItems = flatItems.length;

  const handleSelect = useCallback(
    (item: PaletteResult) => {
      setActiveSection(item.section);
      onClose();
    },
    [setActiveSection, onClose]
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
            placeholder="Rechercher clients, projets, prestataires, factures…"
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-base outline-none"
          />
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
              {query
                ? `Aucun résultat pour « ${query} »`
                : 'Commencez à taper pour rechercher…'}
            </div>
          ) : (
            groups.map((group) => {
              const GroupIcon = group.icon;
              const categoryLabel = CATEGORY_CONFIG[group.category]?.label ?? group.category;

              return (
                <div key={group.category} className="mb-1">
                  {/* Group header */}
                  <div className="flex items-center gap-2 px-4 py-1.5">
                    <GroupIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {categoryLabel}
                    </span>
                  </div>

                  {/* Group items */}
                  {group.items.map((item) => {
                    const itemIndex = runningIndex++;
                    const isSelected = itemIndex === selectedIndex;

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
          <span><kbd className="font-sans">↵</kbd> sélectionner</span>
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

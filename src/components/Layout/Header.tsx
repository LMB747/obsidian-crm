import React, { useState, useEffect } from 'react';
import { Search, X, Menu } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useDebounce } from '../../hooks/useDebounce';
import { NotificationCenter } from '../ui/NotificationCenter';
import clsx from 'clsx';

const sectionTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Vue d\'ensemble Obsidian Agency' },
  clients: { title: 'Clients CRM', subtitle: 'Gestion et suivi de votre portefeuille client' },
  projects: { title: 'Projets', subtitle: 'Suivi de l\'avancement des projets' },
  worktracking: { title: 'Suivi des Travaux', subtitle: 'Tâches, temps et livrables' },
  invoices:  { title: 'Facturation', subtitle: 'Devis, factures et paiements' },
  documents: { title: 'Documents', subtitle: 'Générer Factures · Devis · Contrats avec vos templates Obsidian' },
  snooze:    { title: 'Pay to Snooze', subtitle: 'Gestion des abonnements et utilisateurs' },
  analytics: { title: 'Analytiques', subtitle: 'Indicateurs de performance et tendances' },
  settings: { title: 'Paramètres', subtitle: 'Configuration de votre espace de travail' },
};

export const Header: React.FC<{ onMenuToggle?: () => void }> = ({ onMenuToggle }) => {
  const { activeSection, setSearchQuery } = useStore();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  const section = sectionTitles[activeSection] || { title: 'Obsidian CRM', subtitle: '' };

  return (
    <header className="h-[72px] bg-obsidian-800 border-b border-card-border flex items-center justify-between px-6 sticky top-0 z-10">
      {/* ── Left: Title ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-card transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
        <h1 className="font-display font-bold text-white text-xl leading-tight">{section.title}</h1>
        <p className="text-slate-400 text-xs hidden sm:block">{section.subtitle}</p>
        </div>
      </div>

      {/* ── Right: Actions ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="bg-card border border-card-border text-white text-sm rounded-xl pl-9 pr-4 py-2 w-52 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-slate-500 hover:text-white" />
            </button>
          )}
        </div>

        {/* Notifications */}
        <NotificationCenter />

        {/* Date */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-card border border-card-border rounded-xl">
          <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse-slow" />
          <span className="text-slate-300 text-xs font-medium">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>
    </header>
  );
};

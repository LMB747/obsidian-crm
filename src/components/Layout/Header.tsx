import React, { useState, useEffect } from 'react';
import { Search, Bell, Plus, ChevronDown, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useDebounce } from '../../hooks/useDebounce';
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

export const Header: React.FC = () => {
  const { activeSection, setSearchQuery, notifications } = useStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifList, setNotifList] = useState(notifications);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  const section = sectionTitles[activeSection] || { title: 'Obsidian CRM', subtitle: '' };
  const unreadCount = notifList.filter((n) => !n.lu).length;

  const markAllRead = () => {
    setNotifList((prev) => prev.map((n) => ({ ...n, lu: true })));
  };

  const typeColors: Record<string, string> = {
    success: 'bg-accent-green/20 border-accent-green/30 text-accent-green',
    warning: 'bg-accent-orange/20 border-accent-orange/30 text-accent-orange',
    error: 'bg-accent-red/20 border-accent-red/30 text-accent-red',
    info: 'bg-primary-500/20 border-primary-500/30 text-primary-400',
  };

  return (
    <header className="h-[72px] bg-obsidian-800 border-b border-card-border flex items-center justify-between px-6 sticky top-0 z-10">
      {/* ── Left: Title ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="font-display font-bold text-white text-xl leading-tight">{section.title}</h1>
        <p className="text-slate-400 text-xs">{section.subtitle}</p>
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
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 rounded-xl bg-card border border-card-border flex items-center justify-center text-slate-400 hover:text-white hover:border-primary-500/50 transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-red rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Panel */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-obsidian-700 border border-card-border rounded-2xl shadow-card-hover overflow-hidden z-50 animate-slide-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
                <p className="font-semibold text-white text-sm">Notifications</p>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-primary-400 hover:text-primary-300">
                      Tout marquer lu
                    </button>
                  )}
                  <button onClick={() => setShowNotifications(false)}>
                    <X className="w-4 h-4 text-slate-400 hover:text-white" />
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifList.length === 0 ? (
                  <p className="text-center text-slate-500 py-6 text-sm">Aucune notification</p>
                ) : (
                  notifList.map((notif) => (
                    <div
                      key={notif.id}
                      className={clsx(
                        'px-4 py-3 border-b border-card-border/50 hover:bg-card/50 transition-colors',
                        !notif.lu && 'bg-primary-500/5'
                      )}
                    >
                      <div className={clsx('inline-block px-2 py-0.5 rounded-full text-xs border mb-1', typeColors[notif.type])}>
                        {notif.type}
                      </div>
                      <p className={clsx('text-sm font-medium', notif.lu ? 'text-slate-400' : 'text-white')}>
                        {notif.titre}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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

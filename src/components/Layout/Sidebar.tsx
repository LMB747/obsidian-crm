import React from 'react';
import {
  LayoutDashboard, Users, FolderKanban, FileText,
  Moon, Settings, ChevronLeft, ChevronRight,
  Zap, BarChart3, Bell, LogOut, Clock, FilePlus2, Briefcase,
  Shield, Target, TrendingUp, ScanSearch, CalendarDays, BookOpen
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { SectionPermission } from '../../types';
import clsx from 'clsx';

const navItems: { id: string; label: string; icon: React.FC<{ className?: string }>; badge: string | null }[] = [
  { id: 'dashboard',    label: 'Dashboard',     icon: LayoutDashboard, badge: null },
  { id: 'clients',      label: 'Clients CRM',   icon: Users,           badge: null },
  { id: 'freelancers',  label: 'Prestataires',  icon: Briefcase,       badge: null },
  { id: 'projects',     label: 'Projets',        icon: FolderKanban,    badge: null },
  { id: 'worktracking', label: 'Suivi Travaux',  icon: Clock,           badge: null },
  { id: 'invoices',     label: 'Facturation',    icon: FileText,        badge: '1'  },
  { id: 'documents',    label: 'Documents',      icon: FilePlus2,       badge: null },
  { id: 'snooze',       label: 'Pay to Snooze',  icon: Moon,            badge: null },
  { id: 'calendar',     label: 'Calendrier',     icon: CalendarDays,    badge: null },
  { id: 'analytics',    label: 'Analytiques',    icon: BarChart3,       badge: null },
  { id: 'media-buying', label: 'Media Buying',   icon: TrendingUp,      badge: null },
  { id: 'prospection',  label: 'Prospection IA', icon: ScanSearch,      badge: 'IA' },
  { id: 'personal',     label: 'Mon Espace',     icon: BookOpen,        badge: null },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  freelancer: 'Freelancer',
  viewer: 'Observateur',
};

export const Sidebar: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const {
    activeSection, setActiveSection,
    sidebarOpen, setSidebarOpen,
    currentUser, logout,
  } = useStore();

  const navigate = (section: string) => {
    setActiveSection(section);
    onNavigate?.();
  };

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter(item => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return currentUser.permissions.includes(item.id as SectionPermission);
  });

  const initials = currentUser
    ? `${(currentUser.prenom || 'O')[0]}${(currentUser.nom || 'A')[0]}`.toUpperCase()
    : 'OA';

  const displayName = currentUser
    ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() || currentUser.email
    : 'Obsidian Agency';

  const roleLabel = currentUser ? (ROLE_LABELS[currentUser.role] ?? currentUser.role) : 'Admin';

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen bg-obsidian-800 border-r border-card-border transition-all duration-300 ease-in-out relative z-20',
        sidebarOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-card-border min-h-[72px]">
        <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-purple flex-shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <p className="font-display font-bold text-white text-sm leading-tight tracking-wide">OBSIDIAN</p>
            <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">Agency</p>
          </div>
        )}
      </div>

      {/* ── Toggle ───────────────────────────────────────────────────────── */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute -right-3 top-[84px] w-6 h-6 rounded-full bg-obsidian-600 border border-card-border flex items-center justify-center text-slate-400 hover:text-white transition-colors z-30"
      >
        {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {sidebarOpen && (
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-3 mb-3">
            Navigation
          </p>
        )}

        {/* Mes Missions button for freelancers */}
        {currentUser?.role === 'freelancer' && (
          <button
            onClick={() => navigate('freelancer-portal')}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative mb-2',
              activeSection === 'freelancer-portal'
                ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                : 'text-slate-400 hover:bg-card hover:text-white border border-transparent'
            )}
            title={!sidebarOpen ? 'Mes Missions' : undefined}
          >
            <Target
              className={clsx(
                'w-5 h-5 flex-shrink-0 transition-colors',
                activeSection === 'freelancer-portal' ? 'text-accent-cyan' : 'group-hover:text-white'
              )}
            />
            {sidebarOpen && (
              <span className="font-semibold text-sm flex-1 text-left">Mes Missions</span>
            )}
            {!sidebarOpen && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-obsidian-600 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-card-border transition-opacity z-50">
                Mes Missions
              </div>
            )}
          </button>
        )}

        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                isActive
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30 shadow-glow-purple'
                  : 'text-slate-400 hover:bg-card hover:text-white border border-transparent'
              )}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon
                className={clsx(
                  'w-5 h-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-primary-400' : 'group-hover:text-white'
                )}
              />
              {sidebarOpen && (
                <span className="font-medium text-sm flex-1 text-left">{item.label}</span>
              )}
              {sidebarOpen && item.badge && (
                isNaN(Number(item.badge))
                  ? <span className="px-1.5 py-0.5 rounded-md bg-primary-600/30 text-primary-300 text-[10px] font-bold border border-primary-500/30">{item.badge}</span>
                  : <span className="w-5 h-5 rounded-full bg-accent-red text-white text-xs flex items-center justify-center font-bold">{item.badge}</span>
              )}
              {/* Tooltip for collapsed mode */}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-obsidian-600 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-card-border transition-opacity z-50">
                  {item.label}
                  {item.badge && <span className="ml-1 text-accent-red">({item.badge})</span>}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Bottom ───────────────────────────────────────────────────────── */}
      <div className="px-3 py-4 border-t border-card-border space-y-1">
        {/* Admin button (admin role only) */}
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => navigate('admin')}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
              activeSection === 'admin'
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30 shadow-glow-purple'
                : 'text-slate-400 hover:bg-card hover:text-white border border-transparent'
            )}
            title={!sidebarOpen ? 'Administration' : undefined}
          >
            <Shield className={clsx('w-5 h-5 flex-shrink-0', activeSection === 'admin' ? 'text-primary-400' : 'group-hover:text-white')} />
            {sidebarOpen && <span className="font-medium text-sm">Administration</span>}
            {!sidebarOpen && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-obsidian-600 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-card-border transition-opacity z-50">
                Administration
              </div>
            )}
          </button>
        )}

        {/* Settings button */}
        {(currentUser && (currentUser.role === 'admin' || currentUser.permissions.includes('settings'))) && (
          <button
            onClick={() => navigate('settings')}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
              activeSection === 'settings'
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30 shadow-glow-purple'
                : 'text-slate-400 hover:bg-card hover:text-white border border-transparent'
            )}
            title={!sidebarOpen ? 'Paramètres' : undefined}
          >
            <Settings className={clsx('w-5 h-5 flex-shrink-0', activeSection === 'settings' ? 'text-primary-400' : 'group-hover:text-white')} />
            {sidebarOpen && <span className="font-medium text-sm">Paramètres</span>}
          </button>
        )}

        {/* User Profile + Logout */}
        <div className={clsx(
          'flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl bg-card border border-card-border',
          !sidebarOpen && 'justify-center'
        )}>
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{displayName}</p>
              <p className="text-slate-500 text-xs truncate">{roleLabel}</p>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={logout}
              title="Déconnexion"
              className="text-slate-500 hover:text-white cursor-pointer flex-shrink-0 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Logout button when collapsed */}
        {!sidebarOpen && (
          <button
            onClick={logout}
            title="Déconnexion"
            className="w-full flex items-center justify-center px-3 py-2.5 rounded-xl text-slate-500 hover:text-white hover:bg-card border border-transparent transition-all group relative"
          >
            <LogOut className="w-5 h-5" />
            <div className="absolute left-full ml-2 px-2 py-1 bg-obsidian-600 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-card-border transition-opacity z-50">
              Déconnexion
            </div>
          </button>
        )}
      </div>
    </aside>
  );
};

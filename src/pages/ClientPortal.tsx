import React, { useState, useMemo } from 'react';
import {
  Eye, FileText, CheckCircle2, Clock, AlertCircle,
  TrendingUp, Package, Receipt, MessageCircle, ExternalLink,
  Lock, ArrowRight, Briefcase,
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const INPUT_CLASS = 'w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all';

const ClientPortal: React.FC = () => {
  const { clients, projects, invoices, getClientPortalByToken } = useStore();
  const [tokenInput, setTokenInput] = useState('');
  const [token, setToken] = useState<string | null>(() => {
    const hash = window.location.hash;
    const match = hash.match(/portal\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  });
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'progress' | 'livrables' | 'invoices'>('progress');

  const access = useMemo(() => token ? getClientPortalByToken(token) : undefined, [token, getClientPortalByToken]);
  const client = useMemo(() => access ? clients.find(c => c.id === access.clientId) : undefined, [access, clients]);
  const portalProjects = useMemo(() => access ? projects.filter(p => access.projectIds.includes(p.id)) : [], [access, projects]);
  const portalInvoices = useMemo(() => {
    if (!access) return [];
    return invoices.filter(i => access.projectIds.includes(i.projectId || ''));
  }, [access, invoices]);

  const handleTokenSubmit = () => {
    const found = getClientPortalByToken(tokenInput.trim());
    if (found) {
      setToken(tokenInput.trim());
      setError('');
    } else {
      setError('Token invalide ou expiré');
    }
  };

  // Token input screen
  if (!access) {
    return (
      <div className="min-h-screen bg-obsidian-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-card-border rounded-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-primary-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Portail Client</h1>
            <p className="text-sm text-slate-400 mt-1">Entrez votre code d'acces</p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTokenSubmit()}
              placeholder="Votre code d'acces..."
              className={INPUT_CLASS}
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              onClick={handleTokenSubmit}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-accent-cyan to-primary-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Acceder <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Portal view
  const totalBudget = portalProjects.reduce((s, p) => s + p.budget, 0);
  const avgProgress = portalProjects.length ? Math.round(portalProjects.reduce((s, p) => s + p.progression, 0) / portalProjects.length) : 0;
  const totalLivrables = portalProjects.reduce((s, p) => s + (p.livrables?.length || 0), 0);

  const TABS = [
    { id: 'progress' as const, label: 'Progression', icon: TrendingUp },
    { id: 'livrables' as const, label: 'Livrables', icon: Package },
    { id: 'invoices' as const, label: 'Factures', icon: Receipt },
  ];

  const STATUS_COLORS: Record<string, string> = {
    'planifié': 'bg-slate-500/20 text-slate-300',
    'en production': 'bg-blue-500/20 text-blue-300',
    'en revue': 'bg-amber-500/20 text-amber-300',
    'validé': 'bg-emerald-500/20 text-emerald-300',
    'publié': 'bg-green-500/20 text-green-300',
  };

  return (
    <div className="min-h-screen bg-obsidian-900">
      {/* Header */}
      <div className="bg-card border-b border-card-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-primary-400 font-semibold uppercase tracking-wider">Portail Client</p>
            <h1 className="text-lg font-bold text-white">{client?.entreprise || client?.nom}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <Briefcase className="w-4 h-4" />
            {portalProjects.length} projet{portalProjects.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-card-border rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Progression moyenne</p>
            <p className="text-2xl font-bold text-white">{avgProgress}%</p>
            <div className="mt-2 h-1.5 rounded-full bg-obsidian-900 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-primary-500" style={{ width: `${avgProgress}%` }} />
            </div>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Livrables</p>
            <p className="text-2xl font-bold text-white">{totalLivrables}</p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Budget total</p>
            <p className="text-2xl font-bold text-white">{totalBudget.toLocaleString('fr-FR')} &euro;</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-card-border pb-2">
          {TABS.filter(t => {
            if (t.id === 'invoices' && !access.permissions.includes('view_invoices')) return false;
            if (t.id === 'livrables' && !access.permissions.includes('view_deliverables')) return false;
            return true;
          }).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-semibold border-b-2 transition-all',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-white'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content: Progress */}
        {activeTab === 'progress' && (
          <div className="space-y-4">
            {portalProjects.map(project => (
              <div key={project.id} className="bg-card border border-card-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">{project.nom}</h3>
                  <span className="text-xs text-primary-300 font-semibold">{project.progression}%</span>
                </div>
                <div className="h-2 rounded-full bg-obsidian-900 overflow-hidden mb-4">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-primary-500 transition-all" style={{ width: `${project.progression}%` }} />
                </div>
                <p className="text-xs text-slate-400 mb-3">{project.description}</p>
                {/* Milestones */}
                {project.milestones?.length > 0 && (
                  <div className="space-y-1.5 mt-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Jalons</p>
                    {project.milestones.map(m => (
                      <div key={m.id} className="flex items-center gap-2 text-xs">
                        {m.complete
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          : <Clock className="w-3.5 h-3.5 text-slate-500" />}
                        <span className={m.complete ? 'text-slate-400 line-through' : 'text-white'}>{m.titre}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab content: Livrables */}
        {activeTab === 'livrables' && (
          <div className="space-y-3">
            {portalProjects.flatMap(p => (p.livrables || []).map(l => ({ ...l, projectNom: p.nom }))).map(livrable => (
              <div key={livrable.id} className="flex items-center gap-3 p-3 bg-card border border-card-border rounded-xl">
                <Package className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{livrable.titre}</p>
                  <p className="text-[10px] text-slate-500">{livrable.projectNom} &bull; {livrable.type} &bull; {livrable.plateforme}</p>
                </div>
                <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-semibold', STATUS_COLORS[livrable.statut] || 'bg-slate-500/20 text-slate-300')}>
                  {livrable.statut}
                </span>
              </div>
            ))}
            {portalProjects.flatMap(p => p.livrables || []).length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">Aucun livrable</p>
            )}
          </div>
        )}

        {/* Tab content: Invoices */}
        {activeTab === 'invoices' && (
          <div className="space-y-3">
            {portalInvoices.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 p-3 bg-card border border-card-border rounded-xl">
                <Receipt className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{inv.numero}</p>
                  <p className="text-[10px] text-slate-500">{format(new Date(inv.dateEmission), 'dd MMM yyyy', { locale: fr })}</p>
                </div>
                <p className="text-sm font-bold text-white">{inv.total.toLocaleString('fr-FR')} &euro;</p>
                <span className={clsx(
                  'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                  inv.statut === 'payée' ? 'bg-emerald-500/20 text-emerald-300' :
                  inv.statut === 'en retard' ? 'bg-red-500/20 text-red-300' :
                  'bg-amber-500/20 text-amber-300'
                )}>
                  {inv.statut}
                </span>
              </div>
            ))}
            {portalInvoices.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">Aucune facture</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientPortal;

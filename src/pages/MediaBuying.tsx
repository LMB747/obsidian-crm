import React, { useState, useMemo, useCallback } from 'react';
import clsx from 'clsx';
import {
  TrendingUp, BarChart3, DollarSign, Target, Zap, Plus, X, Edit2,
  Pause, Play, Trash2, AlertTriangle, CheckCircle, Clock, Search,
  Filter, ChevronDown, Link, Image, Video, Layers, RefreshCw,
  ExternalLink, Eye, MoreVertical, FileText, Download, Printer,
  LayoutTemplate, ChevronRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useMediaBuyingStore } from '../store/useMediaBuyingStore';
import { useStore } from '../store/useStore';
import {
  Campaign, CampaignObjective, CampaignStatus, Platform,
  BidStrategy, KPITarget, PlatformConnector
} from '../types/mediaBuying';
import { MediaBuyingReportViewer } from './MediaBuyingReportViewer';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard',   label: 'Dashboard',      icon: BarChart3 },
  { id: 'campaigns',   label: 'Campagnes',       icon: Target },
  { id: 'budget',      label: 'Budget Tracker',  icon: DollarSign },
  { id: 'creatives',   label: 'Créatifs',        icon: Image },
  { id: 'connectors',  label: 'Connecteurs API', icon: Link },
  { id: 'reports',     label: 'Rapports',        icon: FileText },
] as const;

type TabId = typeof TABS[number]['id'];

const PLATFORM_META: Record<Platform, { label: string; color: string; bg: string }> = {
  meta:      { label: 'Meta',       color: '#1877F2', bg: 'bg-blue-500/20 text-blue-400' },
  google:    { label: 'Google',     color: '#EA4335', bg: 'bg-red-500/20 text-red-400' },
  tiktok:    { label: 'TikTok',     color: '#69C9D0', bg: 'bg-cyan-500/20 text-cyan-400' },
  linkedin:  { label: 'LinkedIn',   color: '#0A66C2', bg: 'bg-blue-600/20 text-blue-300' },
  twitter:   { label: 'X / Twitter',color: '#1D9BF0', bg: 'bg-sky-500/20 text-sky-400' },
  snapchat:  { label: 'Snapchat',   color: '#FFFC00', bg: 'bg-yellow-400/20 text-yellow-300' },
  pinterest: { label: 'Pinterest',  color: '#E60023', bg: 'bg-rose-600/20 text-rose-400' },
  microsoft: { label: 'Microsoft',  color: '#00A4EF', bg: 'bg-blue-400/20 text-blue-300' },
  amazon:    { label: 'Amazon',     color: '#FF9900', bg: 'bg-orange-500/20 text-orange-400' },
  dv360:     { label: 'DV360',      color: '#4285F4', bg: 'bg-indigo-500/20 text-indigo-400' },
  apple:     { label: 'Apple',      color: '#888888', bg: 'bg-slate-500/20 text-slate-300' },
  spotify:   { label: 'Spotify',    color: '#1DB954', bg: 'bg-green-500/20 text-green-400' },
  reddit:    { label: 'Reddit',     color: '#FF4500', bg: 'bg-orange-600/20 text-orange-400' },
  taboola:   { label: 'Taboola',    color: '#1C6EAC', bg: 'bg-blue-600/20 text-blue-300' },
};

const OBJECTIVE_LABELS: Record<CampaignObjective, string> = {
  awareness:     'Notoriété',
  traffic:       'Trafic',
  engagement:    'Engagement',
  leads:         'Leads',
  conversions:   'Conversions',
  app_installs:  'Installs App',
  video_views:   'Vues Vidéo',
  catalog_sales: 'Ventes Catalogue',
};

const STATUS_STYLES: Record<CampaignStatus, string> = {
  active:    'bg-accent-green/20 text-accent-green',
  draft:     'bg-slate-500/20 text-slate-400',
  scheduled: 'bg-blue-500/20 text-blue-400',
  paused:    'bg-amber-500/20 text-amber-400',
  completed: 'bg-primary-500/20 text-primary-300',
  archived:  'bg-slate-600/20 text-slate-500',
  error:     'bg-red-500/20 text-red-400',
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  active:    'Actif',
  draft:     'Brouillon',
  scheduled: 'Planifié',
  paused:    'En pause',
  completed: 'Terminé',
  archived:  'Archivé',
  error:     'Erreur',
};

const BID_STRATEGY_LABELS: Record<BidStrategy, string> = {
  lowest_cost:          'Coût le plus bas',
  cost_cap:             'Plafond de coût',
  bid_cap:              'Plafond d\'enchère',
  target_roas:          'ROAS cible',
  maximize_conversions: 'Maximiser conversions',
};

const KPI_METRICS = ['cpa', 'roas', 'ctr', 'cpc', 'cpm', 'cpl', 'video_views'];

// ─── Chart data helpers (derived from real campaigns) ────────────────────────
function buildMonthlyData(campaigns: Campaign[]): { month: string; spend: number; conversions: number }[] {
  if (campaigns.length === 0) return [];
  // Aggregate per-campaign metrics as a single entry per campaign name (simplified)
  return campaigns
    .filter(c => c.metrics)
    .slice(0, 6)
    .map(c => ({
      month: c.name.slice(0, 12),
      spend: c.metrics?.spend ?? 0,
      conversions: c.metrics?.conversions ?? 0,
    }));
}

// Creative type — no mock data, only real creatives added by the user
interface CreativeItem {
  id: string;
  title: string;
  type: 'image' | 'video' | 'carousel';
  platform: Platform;
  ctr: number;
  spend: number;
  performance: 'best' | 'good' | 'average' | 'poor';
}

const PERF_STYLES: Record<CreativeItem['performance'], string> = {
  best:    'bg-accent-green/20 text-accent-green',
  good:    'bg-blue-500/20 text-blue-400',
  average: 'bg-amber-500/20 text-amber-400',
  poor:    'bg-red-500/20 text-red-400',
};

const PERF_LABELS: Record<CreativeItem['performance'], string> = {
  best:    'Excellent',
  good:    'Bon',
  average: 'Moyen',
  poor:    'Faible',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, decimals = 0) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-obsidian-700 border border-card-border rounded-xl p-3">
        <p className="text-white font-semibold text-xs mb-1">{label}</p>
        {payload.map((e) => (
          <p key={e.name} className="text-xs" style={{ color: e.color }}>
            {e.name}: {typeof e.value === 'number' ? e.value.toLocaleString('fr-FR') : e.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.FC<{ className?: string }>;
  color: string;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, sub, icon: Icon, color }) => (
  <div className="bg-card border border-card-border rounded-2xl p-5 flex items-center gap-4">
    <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="min-w-0">
      <p className="text-slate-400 text-xs font-medium">{label}</p>
      <p className="text-white text-xl font-bold">{value}</p>
      {sub && <p className="text-slate-500 text-xs">{sub}</p>}
    </div>
  </div>
);

// ─── Platform badge ───────────────────────────────────────────────────────────

const PlatformBadge: React.FC<{ platform: Platform }> = ({ platform }) => (
  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', PLATFORM_META[platform].bg)}>
    {PLATFORM_META[platform].label}
  </span>
);

const StatusBadge: React.FC<{ status: CampaignStatus }> = ({ status }) => (
  <span className={clsx('text-xs px-2 py-1 rounded-full font-medium', STATUS_STYLES[status])}>
    {STATUS_LABELS[status]}
  </span>
);

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

const DashboardTab: React.FC<{ campaigns: Campaign[] }> = ({ campaigns }) => {
  const activeCampaigns = campaigns.filter((c) => c.status === 'active');

  const totalSpend  = campaigns.reduce((s, c) => s + (c.metrics?.spend ?? 0), 0);
  const totalConv   = campaigns.reduce((s, c) => s + (c.metrics?.conversions ?? 0), 0);
  const totalImpr   = campaigns.reduce((s, c) => s + (c.metrics?.impressions ?? 0), 0);
  const avgRoas     = activeCampaigns.length > 0
    ? activeCampaigns.reduce((s, c) => s + (c.metrics?.roas ?? 0), 0) / activeCampaigns.length
    : 0;
  const avgCpa      = totalConv > 0 ? totalSpend / totalConv : 0;

  // Alert logic: campaigns with ROAS < KPI target, or CPA > KPI target
  const alertCampaigns = activeCampaigns.filter((c) => {
    if (!c.metrics) return false;
    return c.kpis.some((kpi) => {
      const actual =
        kpi.metric === 'roas' ? c.metrics!.roas :
        kpi.metric === 'cpa'  ? c.metrics!.cpa :
        kpi.metric === 'ctr'  ? c.metrics!.ctr :
        kpi.metric === 'cpc'  ? c.metrics!.cpc :
        kpi.metric === 'cpm'  ? c.metrics!.cpm : null;
      if (actual === null) return false;
      if (kpi.operator === '<') return actual >= kpi.target * 1.1;
      if (kpi.operator === '>') return actual <= kpi.target * 0.9;
      return false;
    });
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard label="Total Dépensé"   value={fmtEur(totalSpend)}  sub="toutes campagnes"   icon={DollarSign}  color="bg-primary-500/20 text-primary-400" />
        <KPICard label="ROAS Moyen"      value={`×${fmt(avgRoas, 2)}`} sub="campagnes actives" icon={TrendingUp}   color="bg-accent-green/20 text-accent-green" />
        <KPICard label="Impressions"     value={fmt(totalImpr)}      sub="cumul"              icon={Eye}          color="bg-blue-500/20 text-blue-400" />
        <KPICard label="Conversions"     value={fmt(totalConv)}      sub="cumul"              icon={CheckCircle}  color="bg-accent-cyan/20 text-accent-cyan" />
        <KPICard label="CPA Moyen"       value={fmtEur(avgCpa)}      sub="coût par conversion"icon={Target}       color="bg-amber-500/20 text-amber-400" />
      </div>

      {/* Area chart — derived from real campaign data */}
      <div className="bg-card border border-card-border rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">Performance par campagne</h3>
        {buildMonthlyData(campaigns).length === 0 ? (
          <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">Aucune donnée — créez des campagnes pour voir les graphiques</div>
        ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={buildMonthlyData(campaigns)}>
            <defs>
              <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            <Area type="monotone" dataKey="spend"       name="Spend (€)"    stroke="#7c3aed" fill="url(#colorSpend)" strokeWidth={2} />
            <Area type="monotone" dataKey="conversions" name="Conversions"   stroke="#06b6d4" fill="url(#colorConv)"  strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active campaigns list */}
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Campagnes actives</h3>
          {activeCampaigns.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune campagne active</p>
          ) : (
            <div className="space-y-3">
              {activeCampaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-obsidian-700/50 rounded-xl border border-card-border/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {c.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
                    </div>
                  </div>
                  {c.metrics && (
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-white text-sm font-semibold">{fmtEur(c.metrics.spend)}</p>
                      <p className="text-slate-400 text-xs">ROAS ×{fmt(c.metrics.roas, 1)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Alertes KPI
          </h3>
          {alertCampaigns.length === 0 ? (
            <div className="flex items-center gap-2 text-accent-green text-sm">
              <CheckCircle className="w-4 h-4" />
              Toutes les campagnes respectent leurs KPIs
            </div>
          ) : (
            <div className="space-y-3">
              {alertCampaigns.map((c) => (
                <div key={c.id} className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <p className="text-white text-sm font-medium">{c.name}</p>
                  {c.kpis.map((kpi, i) => {
                    const actual =
                      kpi.metric === 'roas' ? c.metrics?.roas :
                      kpi.metric === 'cpa'  ? c.metrics?.cpa : null;
                    if (actual === null || actual === undefined) return null;
                    const failing =
                      (kpi.operator === '<' && actual >= kpi.target * 1.1) ||
                      (kpi.operator === '>' && actual <= kpi.target * 0.9);
                    if (!failing) return null;
                    return (
                      <p key={i} className="text-amber-400 text-xs mt-1">
                        {kpi.metric.toUpperCase()} actuel: {fmt(actual, 2)} — objectif: {kpi.operator} {kpi.target}
                      </p>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Campaign Modal ───────────────────────────────────────────────────────────

interface CampaignModalProps {
  onClose: () => void;
  initial?: Campaign;
}

const EMPTY_CAMPAIGN: Omit<Campaign, 'id' | 'dateCreation'> = {
  name: '',
  objective: 'conversions',
  status: 'draft',
  platforms: [],
  budget: { total: 0, daily: undefined, currency: 'EUR', type: 'lifetime' },
  dateDebut: '',
  dateFin: '',
  clientId: undefined,
  clientNom: undefined,
  assignedTo: '',
  kpis: [],
  tags: [],
  notes: '',
  metrics: undefined,
  bidStrategy: 'lowest_cost',
};

const CampaignModal: React.FC<CampaignModalProps> = ({ onClose, initial }) => {
  const { addCampaign, updateCampaign } = useMediaBuyingStore();
  const { clients } = useStore();

  const [form, setForm] = useState<Omit<Campaign, 'id' | 'dateCreation'>>(
    initial
      ? { name: initial.name, objective: initial.objective, status: initial.status,
          platforms: initial.platforms, budget: initial.budget, dateDebut: initial.dateDebut,
          dateFin: initial.dateFin, clientId: initial.clientId, clientNom: initial.clientNom,
          assignedTo: initial.assignedTo, kpis: initial.kpis, tags: initial.tags,
          notes: initial.notes, metrics: initial.metrics, bidStrategy: initial.bidStrategy }
      : EMPTY_CAMPAIGN
  );

  const [tagInput, setTagInput] = useState('');

  const togglePlatform = (p: Platform) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p)
        ? f.platforms.filter((x) => x !== p)
        : [...f.platforms, p],
    }));
  };

  const addKPI = () => {
    setForm((f) => ({
      ...f,
      kpis: [...f.kpis, { metric: 'cpa', target: 0, operator: '<' }],
    }));
  };

  const updateKPI = (i: number, patch: Partial<KPITarget>) => {
    setForm((f) => {
      const kpis = [...f.kpis];
      kpis[i] = { ...kpis[i], ...patch };
      return { ...f, kpis };
    });
  };

  const removeKPI = (i: number) => {
    setForm((f) => ({ ...f, kpis: f.kpis.filter((_, idx) => idx !== i) }));
  };

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      setForm((f) => ({ ...f, tags: [...f.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  };

  const handleClientChange = (id: string) => {
    const client = clients.find((c) => c.id === id);
    setForm((f) => ({ ...f, clientId: id || undefined, clientNom: client?.nom ?? undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initial) {
      updateCampaign(initial.id, form);
    } else {
      addCampaign(form);
    }
    onClose();
  };

  const inputCls = 'w-full bg-obsidian-700 border border-card-border rounded-xl px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors';
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1';
  const selectCls = inputCls + ' cursor-pointer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-obsidian-800 border border-card-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-card-border">
          <h2 className="text-white font-semibold text-lg">
            {initial ? 'Modifier la campagne' : 'Nouvelle campagne'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name + Objective */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nom de la campagne *</label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="Ex: Black Friday 2025 — Meta"
              />
            </div>
            <div>
              <label className={labelCls}>Objectif *</label>
              <select
                className={selectCls}
                value={form.objective}
                onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value as CampaignObjective }))}
              >
                {Object.entries(OBJECTIVE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status + Bid Strategy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Statut</label>
              <select
                className={selectCls}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CampaignStatus }))}
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Stratégie d'enchère</label>
              <select
                className={selectCls}
                value={form.bidStrategy}
                onChange={(e) => setForm((f) => ({ ...f, bidStrategy: e.target.value as BidStrategy }))}
              >
                {Object.entries(BID_STRATEGY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className={labelCls}>Plateformes</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PLATFORM_META) as Platform[]).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={clsx(
                    'text-xs px-3 py-1.5 rounded-full font-medium border transition-all',
                    form.platforms.includes(p)
                      ? 'border-primary-500 bg-primary-500/20 text-primary-300'
                      : 'border-card-border text-slate-400 hover:border-slate-400'
                  )}
                >
                  {PLATFORM_META[p].label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Budget total (€)</label>
              <input
                type="number"
                className={inputCls}
                value={form.budget.total || ''}
                onChange={(e) => setForm((f) => ({ ...f, budget: { ...f.budget, total: Number(e.target.value) } }))}
                placeholder="10000"
              />
            </div>
            <div>
              <label className={labelCls}>Budget quotidien (€)</label>
              <input
                type="number"
                className={inputCls}
                value={form.budget.daily ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, budget: { ...f.budget, daily: e.target.value ? Number(e.target.value) : undefined } }))}
                placeholder="500"
              />
            </div>
            <div>
              <label className={labelCls}>Devise</label>
              <select
                className={selectCls}
                value={form.budget.currency}
                onChange={(e) => setForm((f) => ({ ...f, budget: { ...f.budget, currency: e.target.value } }))}
              >
                {['EUR', 'USD', 'GBP', 'CHF'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Type de budget</label>
              <select
                className={selectCls}
                value={form.budget.type}
                onChange={(e) => setForm((f) => ({ ...f, budget: { ...f.budget, type: e.target.value as 'lifetime' | 'daily' } }))}
              >
                <option value="lifetime">Lifetime</option>
                <option value="daily">Quotidien</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date de début</label>
              <input
                type="date"
                className={inputCls}
                value={form.dateDebut}
                onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Date de fin</label>
              <input
                type="date"
                className={inputCls}
                value={form.dateFin}
                onChange={(e) => setForm((f) => ({ ...f, dateFin: e.target.value }))}
              />
            </div>
          </div>

          {/* Client + Assigned */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Client associé</label>
              <select
                className={selectCls}
                value={form.clientId ?? ''}
                onChange={(e) => handleClientChange(e.target.value)}
              >
                <option value="">— Aucun —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom} — {c.entreprise}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Assigné à</label>
              <input
                className={inputCls}
                value={form.assignedTo}
                onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                placeholder="Sophie Martin"
              />
            </div>
          </div>

          {/* KPI Targets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls + ' mb-0'}>KPI Cibles</label>
              <button
                type="button"
                onClick={addKPI}
                className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                <Plus className="w-3 h-3" /> Ajouter un KPI
              </button>
            </div>
            <div className="space-y-2">
              {form.kpis.map((kpi, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    className={clsx(selectCls, 'flex-1')}
                    value={kpi.metric}
                    onChange={(e) => updateKPI(i, { metric: e.target.value })}
                  >
                    {KPI_METRICS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                  </select>
                  <select
                    className={clsx(selectCls, 'w-20')}
                    value={kpi.operator}
                    onChange={(e) => updateKPI(i, { operator: e.target.value as KPITarget['operator'] })}
                  >
                    <option value="<">&lt;</option>
                    <option value=">">&gt;</option>
                    <option value="=">=</option>
                  </select>
                  <input
                    type="number"
                    className={clsx(inputCls, 'w-24')}
                    value={kpi.target || ''}
                    onChange={(e) => updateKPI(i, { target: Number(e.target.value) })}
                    placeholder="0"
                  />
                  <button type="button" onClick={() => removeKPI(i)} className="text-slate-500 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={labelCls}>Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-xs bg-primary-500/20 text-primary-300 px-2 py-1 rounded-full">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              className={inputCls}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={addTag}
              placeholder="Appuyer sur Entrée pour ajouter un tag"
            />
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              className={inputCls + ' resize-none h-20'}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Informations complémentaires..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white border border-card-border hover:border-slate-400 transition-all text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium transition-colors text-sm"
            >
              {initial ? 'Enregistrer' : 'Créer la campagne'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Campaigns Tab ────────────────────────────────────────────────────────────

const CampaignsTab: React.FC<{ campaigns: Campaign[] }> = ({ campaigns }) => {
  const { updateCampaign, deleteCampaign } = useMediaBuyingStore();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Campaign | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<Platform | ''>('');
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | ''>('');
  const [filterObjective, setFilterObjective] = useState<CampaignObjective | ''>('');

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterPlatform && !c.platforms.includes(filterPlatform as Platform)) return false;
      if (filterStatus && c.status !== filterStatus) return false;
      if (filterObjective && c.objective !== filterObjective) return false;
      return true;
    });
  }, [campaigns, search, filterPlatform, filterStatus, filterObjective]);

  const counts = useMemo(() => ({
    total:     campaigns.length,
    active:    campaigns.filter((c) => c.status === 'active').length,
    draft:     campaigns.filter((c) => c.status === 'draft').length,
    paused:    campaigns.filter((c) => c.status === 'paused').length,
    completed: campaigns.filter((c) => c.status === 'completed').length,
  }), [campaigns]);

  const togglePause = (c: Campaign) => {
    updateCampaign(c.id, { status: c.status === 'active' ? 'paused' : 'active' });
  };

  const handleEdit = (c: Campaign) => {
    setEditTarget(c);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditTarget(undefined);
  };

  const selectCls = 'bg-obsidian-700 border border-card-border rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-primary-500 transition-colors';

  return (
    <>
      {(showModal) && (
        <CampaignModal onClose={handleModalClose} initial={editTarget} />
      )}

      <div className="space-y-5">
        {/* Stats bar */}
        <div className="flex flex-wrap items-center gap-3">
          {[
            { label: 'Total',     count: counts.total,     cls: 'text-slate-300' },
            { label: 'Actives',   count: counts.active,    cls: 'text-accent-green' },
            { label: 'Brouillons',count: counts.draft,     cls: 'text-slate-400' },
            { label: 'En pause',  count: counts.paused,    cls: 'text-amber-400' },
            { label: 'Terminées', count: counts.completed, cls: 'text-primary-300' },
          ].map((s) => (
            <span key={s.label} className={clsx('text-sm font-medium', s.cls)}>
              {s.count} <span className="text-slate-500 font-normal">{s.label}</span>
            </span>
          ))}
          <div className="ml-auto">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Campagne
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full bg-obsidian-700 border border-card-border rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
              placeholder="Rechercher une campagne..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className={selectCls} value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value as Platform | '')}>
            <option value="">Toutes plateformes</option>
            {(Object.keys(PLATFORM_META) as Platform[]).map((p) => (
              <option key={p} value={p}>{PLATFORM_META[p].label}</option>
            ))}
          </select>
          <select className={selectCls} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as CampaignStatus | '')}>
            <option value="">Tous statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={selectCls} value={filterObjective} onChange={(e) => setFilterObjective(e.target.value as CampaignObjective | '')}>
            <option value="">Tous objectifs</option>
            {Object.entries(OBJECTIVE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  {['Campagne', 'Statut', 'Objectif', 'Budget', 'Métriques', 'Dates', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      Aucune campagne trouvée
                    </td>
                  </tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} className="border-b border-card-border/50 hover:bg-obsidian-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{c.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.clientNom && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/25 font-medium">
                            {c.clientNom}
                          </span>
                        )}
                        {c.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-slate-300 bg-obsidian-700 px-2 py-1 rounded-full">
                        {OBJECTIVE_LABELS[c.objective]}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-white font-medium">{fmtEur(c.budget.total)}</p>
                      {c.budget.daily && <p className="text-slate-400 text-xs">{fmtEur(c.budget.daily)}/jour</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.metrics ? (
                        <div>
                          <p className="text-white">{fmtEur(c.metrics.spend)} dépensé</p>
                          <p className="text-slate-400 text-xs">ROAS ×{fmt(c.metrics.roas, 1)} — CPA {fmtEur(c.metrics.cpa)}</p>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-400 text-xs">
                      <p>{c.dateDebut}</p>
                      <p>→ {c.dateFin}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-obsidian-600 rounded-lg transition-all"
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => togglePause(c)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
                          title={c.status === 'active' ? 'Mettre en pause' : 'Activer'}
                        >
                          {c.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => deleteCampaign(c.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Budget Tracker Tab ───────────────────────────────────────────────────────

const BudgetTab: React.FC<{ campaigns: Campaign[] }> = ({ campaigns }) => {
  const totalBudget = campaigns.reduce((s, c) => s + c.budget.total, 0);
  const totalSpend  = campaigns.reduce((s, c) => s + (c.metrics?.spend ?? 0), 0);
  const totalLeft   = totalBudget - totalSpend;
  const pct         = totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0;

  // Spend by platform
  const byPlatform: Record<string, number> = {};
  campaigns.forEach((c) => {
    if (!c.metrics) return;
    c.platforms.forEach((p) => {
      byPlatform[p] = (byPlatform[p] ?? 0) + c.metrics!.spend / c.platforms.length;
    });
  });

  const platformChartData = Object.entries(byPlatform).map(([p, spend]) => ({
    platform: PLATFORM_META[p as Platform]?.label ?? p,
    spend: Math.round(spend),
  })).sort((a, b) => b.spend - a.spend);

  // Alert: campaigns > 90% budget consumed
  const highPacing = campaigns.filter((c) => {
    if (!c.metrics || !c.budget.total) return false;
    return (c.metrics.spend / c.budget.total) >= 0.9;
  });

  return (
    <div className="space-y-6">
      {/* Global summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPICard label="Budget total"   value={fmtEur(totalBudget)} icon={DollarSign} color="bg-primary-500/20 text-primary-400" />
        <KPICard label="Dépensé"        value={fmtEur(totalSpend)}  icon={TrendingUp}  color="bg-accent-green/20 text-accent-green" />
        <KPICard label="Restant"        value={fmtEur(totalLeft)}   icon={Clock}       color="bg-blue-500/20 text-blue-400" />
        <KPICard label="% Consommé"     value={`${pct}%`}           icon={BarChart3}   color="bg-amber-500/20 text-amber-400" />
      </div>

      {/* Global progress bar */}
      <div className="bg-card border border-card-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-sm">Consommation globale</span>
          <span className="text-white font-semibold">{pct}%</span>
        </div>
        <div className="w-full bg-obsidian-700 rounded-full h-3">
          <div
            className={clsx('h-3 rounded-full transition-all', pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-accent-green')}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by platform */}
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Dépenses par plateforme</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={platformChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="platform" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="spend" name="Spend (€)" fill="#7c3aed" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily spend trend — requires real tracking data */}
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Dépenses journalières</h3>
          <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">
            Disponible avec l'intégration API des plateformes publicitaires
          </div>
        </div>
      </div>

      {/* Alert: high pacing */}
      {highPacing.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-semibold text-sm">Alertes pacing — budget &gt; 90% consommé</span>
          </div>
          <div className="space-y-2">
            {highPacing.map((c) => {
              const p = c.budget.total > 0 ? Math.round(((c.metrics?.spend ?? 0) / c.budget.total) * 100) : 0;
              return (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-white">{c.name}</span>
                  <span className="text-red-400 font-medium">{p}% consommé</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed table */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-card-border">
          <h3 className="text-white font-semibold">Détail par campagne</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border">
                {['Campagne', 'Plateforme', 'Budget alloué', 'Dépensé', 'Restant', 'Pacing'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const spend = c.metrics?.spend ?? 0;
                const left  = c.budget.total - spend;
                const p     = c.budget.total > 0 ? Math.round((spend / c.budget.total) * 100) : 0;
                return (
                  <tr key={c.id} className="border-b border-card-border/50 hover:bg-obsidian-700/30 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.platforms.map((pl) => <PlatformBadge key={pl} platform={pl} />)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white">{fmtEur(c.budget.total)}</td>
                    <td className="px-4 py-3 text-white">{fmtEur(spend)}</td>
                    <td className="px-4 py-3 text-slate-300">{fmtEur(left)}</td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-obsidian-700 rounded-full h-1.5">
                          <div
                            className={clsx('h-1.5 rounded-full', p >= 90 ? 'bg-red-500' : p >= 70 ? 'bg-amber-500' : 'bg-accent-green')}
                            style={{ width: `${Math.min(p, 100)}%` }}
                          />
                        </div>
                        <span className={clsx('text-xs font-medium', p >= 90 ? 'text-red-400' : p >= 70 ? 'text-amber-400' : 'text-accent-green')}>
                          {p}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Creatives Tab ────────────────────────────────────────────────────────────

interface CreativeModalProps {
  onClose: () => void;
}

const CreativeModal: React.FC<CreativeModalProps> = ({ onClose }) => {
  const inputCls = 'w-full bg-obsidian-700 border border-card-border rounded-xl px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors';
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-obsidian-800 border border-card-border rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-card-border">
          <h2 className="text-white font-semibold">Ajouter un créatif</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
          <div>
            <label className={labelCls}>Titre</label>
            <input className={inputCls} placeholder="Bannière BF 2025" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls}>
                <option value="image">Image</option>
                <option value="video">Vidéo</option>
                <option value="carousel">Carousel</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Plateforme</label>
              <select className={inputCls}>
                {(Object.keys(PLATFORM_META) as Platform[]).map((p) => (
                  <option key={p} value={p}>{PLATFORM_META[p].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>URL ou chemin</label>
            <input className={inputCls} placeholder="https://..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white border border-card-border text-sm transition-all">Annuler</button>
            <button type="submit" className="px-6 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-sm transition-colors">Ajouter</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TYPE_ICON: Record<CreativeItem['type'], React.FC<{ className?: string }>> = {
  image:    Image,
  video:    Video,
  carousel: Layers,
};

const CreativesTab: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<CreativeItem['type'] | ''>('');
  const [filterPlatform, setFilterPlatform] = useState<Platform | ''>('');
  const [filterPerf, setFilterPerf] = useState<CreativeItem['performance'] | ''>('');

  // No mock data — creatives will come from real store when implemented
  const allCreatives: CreativeItem[] = [];
  const filtered = allCreatives.filter((c) => {
    if (filterType && c.type !== filterType) return false;
    if (filterPlatform && c.platform !== filterPlatform) return false;
    if (filterPerf && c.performance !== filterPerf) return false;
    return true;
  });

  const selectCls = 'bg-obsidian-700 border border-card-border rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-primary-500 transition-colors';

  return (
    <>
      {showModal && <CreativeModal onClose={() => setShowModal(false)} />}
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <select className={selectCls} value={filterType} onChange={(e) => setFilterType(e.target.value as CreativeItem['type'] | '')}>
            <option value="">Tous types</option>
            <option value="image">Image</option>
            <option value="video">Vidéo</option>
            <option value="carousel">Carousel</option>
          </select>
          <select className={selectCls} value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value as Platform | '')}>
            <option value="">Toutes plateformes</option>
            {(Object.keys(PLATFORM_META) as Platform[]).map((p) => (
              <option key={p} value={p}>{PLATFORM_META[p].label}</option>
            ))}
          </select>
          <select className={selectCls} value={filterPerf} onChange={(e) => setFilterPerf(e.target.value as CreativeItem['performance'] | '')}>
            <option value="">Toutes perfs</option>
            <option value="best">Excellent</option>
            <option value="good">Bon</option>
            <option value="average">Moyen</option>
            <option value="poor">Faible</option>
          </select>
          <div className="ml-auto">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter un créatif
            </button>
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Image className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400 font-medium">Aucun créatif</p>
            <p className="text-slate-500 text-sm mt-1">Ajoutez vos créatifs publicitaires pour suivre leurs performances</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const TypeIcon = TYPE_ICON[c.type];
            return (
              <div key={c.id} className="bg-card border border-card-border rounded-2xl p-5 hover:border-primary-500/40 transition-all group">
                <div className="w-full h-28 bg-obsidian-700/60 rounded-xl flex items-center justify-center mb-4 group-hover:bg-obsidian-700 transition-colors">
                  <TypeIcon className="w-10 h-10 text-slate-500" />
                </div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-white font-medium text-sm leading-tight">{c.title}</p>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', PERF_STYLES[c.performance])}>
                    {PERF_LABELS[c.performance]}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <PlatformBadge platform={c.platform} />
                  <span className="text-xs text-slate-500 capitalize">{c.type}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>CTR: <span className="text-white font-medium">{c.ctr}%</span></span>
                  <span>Dépensé: <span className="text-white font-medium">{fmtEur(c.spend)}</span></span>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </>
  );
};

// ─── Connector Modal ──────────────────────────────────────────────────────────

interface ConnectorModalProps {
  connector: PlatformConnector;
  onClose: () => void;
}

const ConnectorModal: React.FC<ConnectorModalProps> = ({ connector, onClose }) => {
  const { updateConnector } = useMediaBuyingStore();
  const [apiKey, setApiKey] = useState('');
  const [accountId, setAccountId] = useState('');
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);

  const inputCls = 'w-full bg-obsidian-700 border border-card-border rounded-xl px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors';
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1';

  // Note: real API validation requires backend integration with each platform
  const handleTest = () => {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTested(false);
    setTimeout(() => {
      setTesting(false);
      // Mark as tested — actual validation happens when using the API
      setTested(true);
    }, 800);
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    updateConnector(connector.platform, {
      connected: true,
      accountId,
      accountName: `Compte ${connector.label}`,
      lastSync: new Date().toISOString().slice(0, 10),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-obsidian-800 border border-card-border rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-card-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: connector.color }}>
              {connector.icon}
            </div>
            <div>
              <h2 className="text-white font-semibold">Connecter {connector.label}</h2>
              <p className="text-slate-500 text-xs">Intégration API</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleConnect} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>API Key / Token *</label>
            <input
              className={inputCls}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="••••••••••••••••"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Account ID</label>
            <input
              className={inputCls}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Ex: act_123456789"
            />
          </div>
          <button
            type="button"
            onClick={handleTest}
            disabled={!apiKey || testing}
            className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={clsx('w-4 h-4', testing && 'animate-spin')} />
            {testing ? 'Test en cours...' : 'Tester la connexion'}
          </button>
          {tested && (
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <CheckCircle className="w-4 h-4" /> Clé enregistrée — la validation se fait lors de l'utilisation
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white border border-card-border text-sm transition-all">Annuler</button>
            <button type="submit" className="px-6 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-sm transition-colors">Connecter</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Connectors Tab ───────────────────────────────────────────────────────────

const API_DOCS: Partial<Record<Platform, string>> = {
  meta:      'https://developers.facebook.com/docs/marketing-api/',
  google:    'https://developers.google.com/google-ads/api/docs/start',
  tiktok:    'https://ads.tiktok.com/marketing_api/docs',
  linkedin:  'https://learn.microsoft.com/en-us/linkedin/marketing/',
  twitter:   'https://developer.twitter.com/en/docs/twitter-ads-api',
  snapchat:  'https://marketingapi.snapchat.com/docs/',
  pinterest: 'https://developers.pinterest.com/docs/api/v5/',
  microsoft: 'https://learn.microsoft.com/en-us/advertising/guides/',
  amazon:    'https://advertising.amazon.com/API/docs/en-us/',
  spotify:   'https://developer.spotify.com/documentation/web-api/',
};

const ConnectorsTab: React.FC = () => {
  const { connectors, updateConnector } = useMediaBuyingStore();
  const [connectModal, setConnectModal] = useState<PlatformConnector | null>(null);

  const handleDisconnect = (platform: string) => {
    updateConnector(platform, { connected: false, accountId: undefined, accountName: undefined, lastSync: undefined });
  };

  return (
    <>
      {connectModal && (
        <ConnectorModal connector={connectModal} onClose={() => setConnectModal(null)} />
      )}
      <div className="space-y-6">
        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {connectors.map((conn) => (
            <div
              key={conn.platform}
              className={clsx(
                'bg-card border rounded-2xl p-5 flex flex-col gap-3 transition-all',
                conn.connected ? 'border-accent-green/30' : 'border-card-border'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: conn.color }}
                >
                  {conn.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium text-sm">{conn.label}</p>
                  <span className={clsx('text-xs font-medium', conn.connected ? 'text-accent-green' : 'text-slate-500')}>
                    {conn.connected ? 'Connecté' : 'Non connecté'}
                  </span>
                </div>
              </div>

              {conn.connected && conn.accountName && (
                <div className="text-xs text-slate-400 bg-obsidian-700/50 rounded-lg p-2">
                  <p className="font-medium text-slate-300">{conn.accountName}</p>
                  {conn.accountId && <p>ID: {conn.accountId}</p>}
                  {conn.lastSync && <p>Sync: {conn.lastSync}</p>}
                </div>
              )}

              <div className="flex items-center gap-2 mt-auto">
                {conn.connected ? (
                  <button
                    onClick={() => handleDisconnect(conn.platform)}
                    className="flex-1 py-1.5 text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    Déconnecter
                  </button>
                ) : (
                  <button
                    onClick={() => setConnectModal(conn)}
                    className="flex-1 py-1.5 text-xs font-medium text-primary-300 border border-primary-500/30 hover:bg-primary-500/10 rounded-xl transition-all"
                  >
                    Connecter
                  </button>
                )}
                {API_DOCS[conn.platform] && (
                  <a
                    href={API_DOCS[conn.platform]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-500 hover:text-white transition-colors"
                    title="Documentation API"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Documentation section */}
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Documentation des APIs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(API_DOCS).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-obsidian-700/50 hover:bg-obsidian-700 border border-card-border/50 hover:border-card-border rounded-xl transition-all group"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ background: connectors.find((c) => c.platform === platform)?.color ?? '#555' }}
                >
                  {connectors.find((c) => c.platform === platform)?.icon}
                </div>
                <span className="text-slate-300 group-hover:text-white text-sm transition-colors flex-1">
                  {connectors.find((c) => c.platform === platform)?.label ?? platform} API
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Reports Tab ──────────────────────────────────────────────────────────────

interface ReportConfig {
  id: string;
  title: string;
  subtitle: string;
  template: 'performance' | 'budget' | 'roi' | 'platform' | 'full' | 'allin';
  period: '7d' | '30d' | '90d' | 'custom';
  dateFrom?: string;
  dateTo?: string;
  platforms: Platform[];
  includeCharts: boolean;
  includeTable: boolean;
  includeKPIs: boolean;
  clientNom?: string;
  agencyNom: string;
  createdAt: string;
}

const REPORT_TEMPLATES: {
  id: ReportConfig['template'];
  emoji: string;
  label: string;
  description: string;
  defaults: Partial<ReportConfig>;
}[] = [
  {
    id: 'full',
    emoji: '🏆',
    label: 'Performance Complète',
    description: 'KPIs + graphiques + tableau toutes plateformes',
    defaults: { includeKPIs: true, includeCharts: true, includeTable: true },
  },
  {
    id: 'budget',
    emoji: '💰',
    label: 'Analyse Budget',
    description: 'Focus dépenses, pacing, ROI',
    defaults: { includeKPIs: true, includeCharts: true, includeTable: false },
  },
  {
    id: 'roi',
    emoji: '📈',
    label: 'Rapport ROI',
    description: 'ROAS, CPA, conversions par plateforme',
    defaults: { includeKPIs: true, includeCharts: true, includeTable: true },
  },
  {
    id: 'platform',
    emoji: '📊',
    label: 'Comparaison Plateformes',
    description: 'Métriques côte-à-côte par plateforme',
    defaults: { includeKPIs: true, includeCharts: true, includeTable: true },
  },
  {
    id: 'performance',
    emoji: '📋',
    label: 'Rapport Client',
    description: 'Synthèse executive pour présentation client',
    defaults: { includeKPIs: true, includeCharts: false, includeTable: true },
  },
  {
    id: 'allin',
    emoji: '⚡',
    label: 'Rapport Complet (All-In)',
    description: 'Toutes les campagnes, plateformes, KPIs et analyses par période',
    defaults: { includeKPIs: true, includeCharts: true, includeTable: true },
  },
];

const ALL_PLATFORMS: Platform[] = [
  'meta', 'google', 'tiktok', 'linkedin', 'twitter',
  'snapchat', 'pinterest', 'microsoft', 'amazon', 'dv360',
];

// ─── generateReportHTML ───────────────────────────────────────────────────────

function generateReportHTML(config: ReportConfig, campaigns: Campaign[]): string {
  const filtered = campaigns.filter(
    (c) =>
      c.metrics &&
      (config.platforms.length === 0 ||
        c.platforms.some((p) => config.platforms.includes(p)))
  );

  const totalImpressions = filtered.reduce((s, c) => s + (c.metrics?.impressions ?? 0), 0);
  const totalSpend       = filtered.reduce((s, c) => s + (c.metrics?.spend ?? 0), 0);
  const totalConversions = filtered.reduce((s, c) => s + (c.metrics?.conversions ?? 0), 0);
  const totalClicks      = filtered.reduce((s, c) => s + (c.metrics?.clicks ?? 0), 0);
  const avgRoas = filtered.length
    ? filtered.reduce((s, c) => s + (c.metrics?.roas ?? 0), 0) / filtered.length
    : 0;
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  const fmt = (n: number) => n.toLocaleString('fr-FR');
  const fmtMoney = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const fmtDec = (n: number) => n.toFixed(2);

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Spend per platform for bar chart
  const platformSpend: Record<string, number> = {};
  filtered.forEach((c) => {
    c.platforms.forEach((p) => {
      platformSpend[p] = (platformSpend[p] ?? 0) + (c.metrics?.spend ?? 0) / c.platforms.length;
    });
  });
  const maxPlatformSpend = Math.max(...Object.values(platformSpend), 1);

  // Conversions per objective for donut
  const objectiveConversions: Record<string, number> = {};
  filtered.forEach((c) => {
    const key = OBJECTIVE_LABELS[c.objective] ?? c.objective;
    objectiveConversions[key] = (objectiveConversions[key] ?? 0) + (c.metrics?.conversions ?? 0);
  });

  const donutColors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
  const totalDonut = Object.values(objectiveConversions).reduce((s, v) => s + v, 0) || 1;
  const donutRadius = 70;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let donutOffset = 0;
  const donutSegments = Object.entries(objectiveConversions).map(([label, val], i) => {
    const pct = val / totalDonut;
    const dash = pct * donutCircumference;
    const gap  = donutCircumference - dash;
    const seg = `<circle cx="90" cy="90" r="${donutRadius}" fill="none" stroke="${donutColors[i % donutColors.length]}"
      stroke-width="28" stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
      stroke-dashoffset="${(-donutOffset).toFixed(2)}" />`;
    donutOffset += dash;
    return seg;
  });

  const kpiCards = config.includeKPIs ? `
    <div class="section">
      <h2 class="section-title">Indicateurs Clés de Performance</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Impressions Totales</div>
          <div class="kpi-value">${fmt(totalImpressions)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Dépenses Totales</div>
          <div class="kpi-value">${fmtMoney(totalSpend)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">ROAS Moyen</div>
          <div class="kpi-value">${fmtDec(avgRoas)}x</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">CPA Moyen</div>
          <div class="kpi-value">${fmtMoney(avgCpa)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Conversions Totales</div>
          <div class="kpi-value">${fmt(totalConversions)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">CTR Moyen</div>
          <div class="kpi-value">${fmtDec(avgCtr)}%</div>
        </div>
      </div>
    </div>` : '';

  const barChartSection = config.includeCharts && Object.keys(platformSpend).length > 0 ? `
    <div class="section">
      <h2 class="section-title">Dépenses par Plateforme</h2>
      <div class="bar-chart">
        ${Object.entries(platformSpend)
          .sort((a, b) => b[1] - a[1])
          .map(([plat, val]) => {
            const pct = (val / maxPlatformSpend) * 100;
            const platLabel = PLATFORM_META[plat as Platform]?.label ?? plat;
            return `
            <div class="bar-row">
              <div class="bar-label">${platLabel}</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${pct.toFixed(1)}%"></div>
              </div>
              <div class="bar-value">${fmtMoney(val)}</div>
            </div>`;
          }).join('')}
      </div>
    </div>` : '';

  const donutSection = config.includeCharts && Object.keys(objectiveConversions).length > 0 ? `
    <div class="section">
      <h2 class="section-title">Conversions par Objectif</h2>
      <div class="donut-wrapper">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="${donutRadius}" fill="none" stroke="#1e1e3f" stroke-width="28"/>
          ${donutSegments.join('\n')}
          <text x="90" y="85" text-anchor="middle" fill="#e2e8f0" font-size="18" font-weight="bold" font-family="sans-serif">${fmt(totalConversions)}</text>
          <text x="90" y="105" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="sans-serif">conversions</text>
        </svg>
        <div class="donut-legend">
          ${Object.entries(objectiveConversions).map(([label, val], i) => `
            <div class="legend-row">
              <span class="legend-dot" style="background:${donutColors[i % donutColors.length]}"></span>
              <span class="legend-label">${label}</span>
              <span class="legend-val">${fmt(val)}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>` : '';

  const tableSection = config.includeTable ? `
    <div class="section">
      <h2 class="section-title">Détail des Campagnes</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Campagne</th>
              <th>Plateforme(s)</th>
              <th>Status</th>
              <th class="num">Spend</th>
              <th class="num">Impressions</th>
              <th class="num">Clics</th>
              <th class="num">CTR</th>
              <th class="num">CPC</th>
              <th class="num">Conv.</th>
              <th class="num">CPA</th>
              <th class="num">ROAS</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((c) => `
            <tr>
              <td>${c.name}</td>
              <td>${c.platforms.map(p => PLATFORM_META[p]?.label ?? p).join(', ')}</td>
              <td><span class="status-badge">${STATUS_LABELS[c.status]}</span></td>
              <td class="num">${fmtMoney(c.metrics?.spend ?? 0)}</td>
              <td class="num">${fmt(c.metrics?.impressions ?? 0)}</td>
              <td class="num">${fmt(c.metrics?.clicks ?? 0)}</td>
              <td class="num">${fmtDec(c.metrics?.ctr ?? 0)}%</td>
              <td class="num">${fmtMoney(c.metrics?.cpc ?? 0)}</td>
              <td class="num">${fmt(c.metrics?.conversions ?? 0)}</td>
              <td class="num">${fmtMoney(c.metrics?.cpa ?? 0)}</td>
              <td class="num">${fmtDec(c.metrics?.roas ?? 0)}x</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.title} — ${config.agencyNom}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #060610;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }
    .page {
      max-width: 1100px;
      margin: 0 auto;
      padding: 40px 32px;
    }
    /* ── Header ── */
    .report-header {
      display: flex;
      align-items: flex-start;
      gap: 20px;
      border-bottom: 1px solid #2d2d5e;
      padding-bottom: 28px;
      margin-bottom: 36px;
    }
    .logo-block {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .logo-zap {
      width: 44px; height: 44px;
      background: linear-gradient(135deg, #8b5cf6, #06b6d4);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .logo-zap svg { width: 24px; height: 24px; fill: white; }
    .logo-text { font-size: 18px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
    .logo-sub  { font-size: 11px; color: #8b5cf6; text-transform: uppercase; letter-spacing: 1.5px; }
    .header-info { flex: 1; }
    .report-type { font-size: 11px; color: #8b5cf6; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
    .report-title { font-size: 26px; font-weight: 700; color: #fff; margin-bottom: 4px; }
    .report-subtitle { font-size: 13px; color: #94a3b8; }
    .header-meta { text-align: right; font-size: 12px; color: #64748b; }
    .header-meta strong { display: block; color: #94a3b8; margin-bottom: 2px; }
    /* ── Section ── */
    .section { margin-bottom: 40px; }
    .section-title {
      font-size: 15px; font-weight: 600; color: #c4b5fd;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #1e1e3f;
      display: flex; align-items: center; gap: 8px;
    }
    .section-title::before {
      content: '';
      width: 3px; height: 16px;
      background: linear-gradient(180deg, #8b5cf6, #06b6d4);
      border-radius: 2px;
      display: inline-block;
    }
    /* ── KPI Grid ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .kpi-card {
      background: #111128;
      border: 1px solid #2d2d5e;
      border-radius: 12px;
      padding: 20px;
    }
    .kpi-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .kpi-value { font-size: 28px; font-weight: 700; color: #fff; }
    /* ── Bar Chart ── */
    .bar-chart { display: flex; flex-direction: column; gap: 10px; }
    .bar-row { display: grid; grid-template-columns: 110px 1fr 90px; align-items: center; gap: 12px; }
    .bar-label { font-size: 12px; color: #94a3b8; text-align: right; }
    .bar-track { background: #1e1e3f; border-radius: 4px; height: 10px; overflow: hidden; }
    .bar-fill  { height: 100%; background: linear-gradient(90deg, #8b5cf6, #06b6d4); border-radius: 4px; }
    .bar-value { font-size: 12px; color: #c4b5fd; font-weight: 600; text-align: right; }
    /* ── Donut ── */
    .donut-wrapper { display: flex; align-items: center; gap: 32px; }
    .donut-legend { display: flex; flex-direction: column; gap: 10px; }
    .legend-row { display: flex; align-items: center; gap: 10px; }
    .legend-dot  { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .legend-label { font-size: 13px; color: #94a3b8; flex: 1; }
    .legend-val  { font-size: 13px; font-weight: 600; color: #e2e8f0; }
    /* ── Table ── */
    .table-wrapper { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #0f0f2a; }
    th {
      padding: 10px 12px;
      text-align: left;
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px;
      color: #64748b; font-weight: 600;
      border-bottom: 1px solid #2d2d5e;
    }
    th.num { text-align: right; }
    td {
      padding: 9px 12px;
      border-bottom: 1px solid #1a1a35;
      color: #cbd5e1;
      vertical-align: middle;
    }
    td.num { text-align: right; color: #e2e8f0; }
    tbody tr:hover { background: #111128; }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
      background: #1e3a5f;
      color: #60a5fa;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    /* ── Footer ── */
    .report-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #2d2d5e;
      padding-top: 16px;
      margin-top: 40px;
      font-size: 11px;
      color: #475569;
    }
    @media print {
      body { background: #060610 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .bar-fill, .kpi-card, .report-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="report-header">
      <div class="logo-block">
        <div class="logo-zap">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
          </svg>
        </div>
        <div>
          <div class="logo-text">${config.agencyNom}</div>
          <div class="logo-sub">Media Buying</div>
        </div>
      </div>
      <div class="header-info">
        <div class="report-type">Rapport · ${REPORT_TEMPLATES.find(t => t.id === config.template)?.label ?? config.template}</div>
        <div class="report-title">${config.title}</div>
        <div class="report-subtitle">${config.subtitle}</div>
      </div>
      <div class="header-meta">
        <strong>Généré le</strong>${today}
        ${config.clientNom ? `<br/><br/><strong>Client</strong>${config.clientNom}` : ''}
      </div>
    </div>

    ${kpiCards}
    ${barChartSection}
    ${donutSection}
    ${tableSection}

    <!-- Footer -->
    <div class="report-footer">
      <span>${config.agencyNom} · Confidentiel</span>
      <span>Généré le ${today}</span>
      <span>Page 1 / 1</span>
    </div>
  </div>
</body>
</html>`;
}

// ─── ReportsTab Component ─────────────────────────────────────────────────────

const INITIAL_BUILDER: Omit<ReportConfig, 'id' | 'createdAt'> = {
  title: '',
  subtitle: '',
  template: 'full',
  period: '30d',
  platforms: [],
  includeCharts: true,
  includeTable: true,
  includeKPIs: true,
  clientNom: '',
  agencyNom: 'Obsidian Agency',
};

const ReportsTab: React.FC<{ campaigns: Campaign[] }> = ({ campaigns }) => {
  const { settings } = useStore();

  const [savedReports, setSavedReports] = useState<ReportConfig[]>(() => {
    try {
      const raw = localStorage.getItem('obsidian-reports');
      return raw ? (JSON.parse(raw) as ReportConfig[]) : [];
    } catch {
      return [];
    }
  });

  const [showBuilder, setShowBuilder] = useState(false);
  const [showViewer, setShowViewer]   = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null);
  const [builderConfig, setBuilderConfig] = useState<Omit<ReportConfig, 'id' | 'createdAt'>>({
    ...INITIAL_BUILDER,
    agencyNom: settings.nom ?? 'Obsidian Agency',
  });

  // Persist saved reports
  React.useEffect(() => {
    localStorage.setItem('obsidian-reports', JSON.stringify(savedReports));
  }, [savedReports]);

  const openBuilder = (template: ReportConfig['template']) => {
    const tpl = REPORT_TEMPLATES.find((t) => t.id === template);
    setBuilderConfig({
      ...INITIAL_BUILDER,
      ...tpl?.defaults,
      template,
      agencyNom: settings.nom ?? 'Obsidian Agency',
      title: tpl?.label ?? '',
    });
    setShowBuilder(true);
  };

  const saveAndView = () => {
    const report: ReportConfig = {
      ...builderConfig,
      id: `report-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setSavedReports((prev) => [report, ...prev]);
    setShowBuilder(false);
    setSelectedReport(report);
    setShowViewer(true);
  };

  const handlePreview = () => {
    const preview: ReportConfig = {
      ...builderConfig,
      id: `preview-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setSelectedReport(preview);
    setShowBuilder(false);
    setShowViewer(true);
  };

  const handleDeleteReport = (id: string) => {
    setSavedReports((prev) => prev.filter((r) => r.id !== id));
  };

  const handleExportPDF = (config: ReportConfig) => {
    const html = generateReportHTML(config, campaigns);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  };

  const handleExportHTML = (config: ReportConfig) => {
    const html = generateReportHTML(config, campaigns);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `rapport_${config.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const togglePlatform = (p: Platform) => {
    setBuilderConfig((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }));
  };

  // ── Viewer overlay ─────────────────────────────────────────────────────────
  if (showViewer && selectedReport) {
    return (
      <MediaBuyingReportViewer
        config={selectedReport}
        campaigns={campaigns}
        onClose={() => { setShowViewer(false); setSelectedReport(null); }}
        onExportPDF={() => handleExportPDF(selectedReport)}
        onExportHTML={() => handleExportHTML(selectedReport)}
      />
    );
  }

  // ── Builder modal ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-display font-bold text-xl">Rapports de Campagne</h2>
          <p className="text-slate-400 text-sm mt-0.5">Générez des rapports exportables depuis vos données de campagne</p>
        </div>
        <button
          onClick={() => openBuilder('full')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-primary text-white text-sm font-medium shadow-glow-purple hover:shadow-glow-cyan transition-all"
        >
          <Plus className="w-4 h-4" />
          Nouveau Rapport
        </button>
      </div>

      {/* All-In quick launch card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-900/60 via-obsidian-800 to-cyan-900/40 border border-primary-500/30 rounded-2xl p-6 flex items-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-purple flex-shrink-0">
          <LayoutTemplate className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-display font-bold text-lg">Rapport All-In</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-500/30 text-primary-300 border border-primary-500/40 tracking-wide">NOUVEAU</span>
          </div>
          <p className="text-slate-400 text-sm">Rapport complet avec toutes les campagnes, plateformes, KPIs et analyses par période</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {(['7d', '30d', '90d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setBuilderConfig({
                    ...INITIAL_BUILDER,
                    ...REPORT_TEMPLATES.find(t => t.id === 'allin')?.defaults,
                    template: 'allin',
                    period: p,
                    agencyNom: settings.nom ?? 'Obsidian Agency',
                    title: `Rapport All-In — ${p === '7d' ? '7 derniers jours' : p === '30d' ? '30 derniers jours' : '90 derniers jours'}`,
                  });
                  setShowBuilder(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-card-border bg-obsidian-700/50 text-slate-300 hover:text-white hover:border-primary-500/40 transition-all"
              >
                {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : '90 jours'}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => openBuilder('allin')}
          className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-primary text-white text-sm font-medium shadow-glow-purple hover:shadow-glow-cyan transition-all"
        >
          <FileText className="w-4 h-4" />
          Générer le rapport All-In
        </button>
      </div>

      {/* Template cards */}
      <div>
        <h3 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">Choisir un Template</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {REPORT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => openBuilder(tpl.id)}
              className="group text-left p-4 bg-card border border-card-border rounded-2xl hover:border-primary-500/50 hover:bg-primary-500/5 transition-all"
            >
              <div className="text-2xl mb-3">{tpl.emoji}</div>
              <div className="text-white font-semibold text-sm mb-1 group-hover:text-primary-300 transition-colors">{tpl.label}</div>
              <div className="text-slate-500 text-xs leading-relaxed">{tpl.description}</div>
              <div className="mt-3 flex items-center gap-1 text-xs text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Créer</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Saved reports */}
      {savedReports.length > 0 && (
        <div>
          <h3 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">Rapports Sauvegardés</h3>
          <div className="space-y-3">
            {savedReports.map((report) => {
              const tpl = REPORT_TEMPLATES.find((t) => t.id === report.template);
              return (
                <div
                  key={report.id}
                  className="flex items-center gap-4 p-4 bg-card border border-card-border rounded-2xl hover:border-card-border/80 transition-all"
                >
                  <div className="text-xl">{tpl?.emoji ?? '📄'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{report.title}</div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      {tpl?.label} · {new Date(report.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setSelectedReport(report); setShowViewer(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-obsidian-700/50 hover:bg-obsidian-700 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Aperçu
                    </button>
                    <button
                      onClick={() => handleExportPDF(report)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-obsidian-700/50 hover:bg-obsidian-700 transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      PDF
                    </button>
                    <button
                      onClick={() => handleExportHTML(report)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-obsidian-700/50 hover:bg-obsidian-700 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      HTML
                    </button>
                    <button
                      onClick={() => handleDeleteReport(report.id)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-card-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-card-border">
              <div>
                <h3 className="text-white font-display font-bold text-lg">Configurer le Rapport</h3>
                <p className="text-slate-400 text-sm mt-0.5">
                  Template : {REPORT_TEMPLATES.find((t) => t.id === builderConfig.template)?.label}
                </p>
              </div>
              <button
                onClick={() => setShowBuilder(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-obsidian-700 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Titre du rapport</label>
                <input
                  type="text"
                  value={builderConfig.title}
                  onChange={(e) => setBuilderConfig((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Performance Campagnes Q1 2026"
                  className="w-full bg-obsidian-700/50 border border-card-border rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary-500/60"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Sous-titre / période de référence</label>
                <input
                  type="text"
                  value={builderConfig.subtitle}
                  onChange={(e) => setBuilderConfig((p) => ({ ...p, subtitle: e.target.value }))}
                  placeholder="Ex: Janvier – Mars 2026"
                  className="w-full bg-obsidian-700/50 border border-card-border rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary-500/60"
                />
              </div>

              {/* Period */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Période</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['7d', '30d', '90d', 'custom'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setBuilderConfig((prev) => ({ ...prev, period: p }))}
                      className={clsx(
                        'py-2 rounded-xl text-xs font-medium border transition-all',
                        builderConfig.period === p
                          ? 'border-primary-500/60 bg-primary-500/10 text-primary-300'
                          : 'border-card-border bg-obsidian-700/30 text-slate-400 hover:text-white hover:border-card-border/80'
                      )}
                    >
                      {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : p === '90d' ? '90 jours' : 'Personnalisé'}
                    </button>
                  ))}
                </div>
                {builderConfig.period === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Début</label>
                      <input
                        type="date"
                        value={builderConfig.dateFrom ?? ''}
                        onChange={(e) => setBuilderConfig((p) => ({ ...p, dateFrom: e.target.value }))}
                        className="w-full bg-obsidian-700/50 border border-card-border rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500/60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Fin</label>
                      <input
                        type="date"
                        value={builderConfig.dateTo ?? ''}
                        onChange={(e) => setBuilderConfig((p) => ({ ...p, dateTo: e.target.value }))}
                        className="w-full bg-obsidian-700/50 border border-card-border rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500/60"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Plateformes à inclure <span className="text-slate-500 font-normal">(toutes si vide)</span></label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={clsx(
                        'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                        builderConfig.platforms.includes(p)
                          ? 'border-primary-500/60 bg-primary-500/10 text-primary-300'
                          : 'border-card-border/50 text-slate-400 hover:text-white'
                      )}
                      style={builderConfig.platforms.includes(p) ? { borderColor: PLATFORM_META[p].color + '60', color: PLATFORM_META[p].color } : {}}
                    >
                      {PLATFORM_META[p].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Options</label>
                <div className="space-y-2">
                  {(
                    [
                      { key: 'includeKPIs',   label: 'Inclure les KPIs' },
                      { key: 'includeCharts', label: 'Inclure les graphiques' },
                      { key: 'includeTable',  label: 'Inclure le tableau détaillé' },
                    ] as { key: keyof Pick<ReportConfig, 'includeKPIs' | 'includeCharts' | 'includeTable'>; label: string }[]
                  ).map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer group">
                      <div
                        className={clsx(
                          'w-4 h-4 rounded border flex items-center justify-center transition-all',
                          builderConfig[key]
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-card-border bg-obsidian-700/50'
                        )}
                        onClick={() => setBuilderConfig((p) => ({ ...p, [key]: !p[key] }))}
                      >
                        {builderConfig[key] && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Client / Agency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom client</label>
                  <input
                    type="text"
                    value={builderConfig.clientNom ?? ''}
                    onChange={(e) => setBuilderConfig((p) => ({ ...p, clientNom: e.target.value }))}
                    placeholder="Nom du client"
                    className="w-full bg-obsidian-700/50 border border-card-border rounded-xl px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary-500/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom agence</label>
                  <input
                    type="text"
                    value={builderConfig.agencyNom}
                    onChange={(e) => setBuilderConfig((p) => ({ ...p, agencyNom: e.target.value }))}
                    className="w-full bg-obsidian-700/50 border border-card-border rounded-xl px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary-500/60"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-card-border">
              <button
                onClick={() => setShowBuilder(false)}
                className="px-4 py-2 rounded-xl border border-card-border text-slate-300 hover:text-white text-sm font-medium transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handlePreview}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary-500/40 text-primary-300 hover:bg-primary-500/10 text-sm font-medium transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                Aperçu
              </button>
              <button
                onClick={saveAndView}
                disabled={!builderConfig.title.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-primary text-white text-sm font-medium shadow-glow-purple disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                Générer &amp; Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const MediaBuying: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const { campaigns } = useMediaBuyingStore();

  const activeCampaignCount = useMemo(
    () => campaigns.filter((c) => c.status === 'active').length,
    [campaigns]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-purple">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-display font-bold text-2xl">Media Buying</h1>
            <p className="text-slate-400 text-sm">
              {activeCampaignCount} campagne{activeCampaignCount !== 1 ? 's' : ''} active{activeCampaignCount !== 1 ? 's' : ''}
              {' '}— {campaigns.length} au total
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-card-border overflow-x-auto pb-0 scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap -mb-px',
                  activeTab === tab.id
                    ? 'border-primary-400 text-primary-300'
                    : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {activeTab === 'dashboard'  && <DashboardTab campaigns={campaigns} />}
        {activeTab === 'campaigns'  && <CampaignsTab campaigns={campaigns} />}
        {activeTab === 'budget'     && <BudgetTab    campaigns={campaigns} />}
        {activeTab === 'creatives'  && <CreativesTab />}
        {activeTab === 'connectors' && <ConnectorsTab />}
        {activeTab === 'reports'    && <ReportsTab campaigns={campaigns} />}
      </div>
    </div>
  );
};

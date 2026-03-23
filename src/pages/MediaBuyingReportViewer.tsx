import React, { useState, useMemo } from 'react';
import {
  X, Printer, Download, Zap, Eye, EyeOff,
  AlertTriangle, CheckCircle, Info, TrendingUp, DollarSign,
  MousePointerClick, BarChart2, Users, Target, Calendar,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Campaign, Platform } from '../types/mediaBuying';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ReportConfig {
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

// ─── Helpers ───────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Partial<Record<Platform, string>> = {
  meta: 'Meta', google: 'Google', tiktok: 'TikTok', linkedin: 'LinkedIn',
  twitter: 'X / Twitter', snapchat: 'Snapchat', pinterest: 'Pinterest',
  microsoft: 'Microsoft', amazon: 'Amazon', dv360: 'DV360',
  apple: 'Apple', spotify: 'Spotify', reddit: 'Reddit', taboola: 'Taboola',
};

const PLATFORM_COLORS: Partial<Record<Platform, string>> = {
  meta: '#1877F2', google: '#EA4335', tiktok: '#69C9D0', linkedin: '#0A66C2',
  twitter: '#1D9BF0', snapchat: '#FFFC00', pinterest: '#E60023',
  microsoft: '#00A4EF', amazon: '#FF9900', dv360: '#4285F4',
  apple: '#888888', spotify: '#1DB954', reddit: '#FF4500', taboola: '#1C6EAC',
};

const OBJECTIVE_LABELS: Record<string, string> = {
  awareness: 'Notoriété', traffic: 'Trafic', engagement: 'Engagement',
  leads: 'Leads', conversions: 'Conversions', app_installs: 'Installs App',
  video_views: 'Vues Vidéo', catalog_sales: 'Ventes Catalogue',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif', draft: 'Brouillon', scheduled: 'Planifié',
  paused: 'En pause', completed: 'Terminé', archived: 'Archivé', error: 'Erreur',
};

const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

const fmt = (n: number) => n.toLocaleString('fr-FR');
const fmtMoney = (n: number) =>
  n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fmtDec2 = (n: number) => n.toFixed(2);
const fmtDate = (d: Date) =>
  d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

// ─── Custom tooltip ────────────────────────────────────────────────────────

const DarkTooltip: React.FC<{
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-obsidian-900 border border-card-border rounded-xl px-3 py-2 text-xs shadow-lg">
      {label && <p className="text-slate-400 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' && p.value > 100 ? fmtMoney(p.value) : fmtDec2(p.value)}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── AllInReport ───────────────────────────────────────────────────────────

interface AllInReportProps {
  campaigns: Campaign[];
  config: ReportConfig;
  agencyName: string;
}

const AllInReport: React.FC<AllInReportProps> = ({ campaigns, config, agencyName }) => {
  // Filter campaigns by period
  const periodCampaigns = useMemo(() => {
    if (!config.dateFrom && !config.dateTo) return campaigns;
    return campaigns.filter((c) => {
      const start = new Date(c.dateDebut);
      const end = new Date(c.dateFin);
      const from = config.dateFrom ? new Date(config.dateFrom) : new Date('2000-01-01');
      const to = config.dateTo ? new Date(config.dateTo) : new Date('2099-12-31');
      return start <= to && end >= from;
    });
  }, [campaigns, config]);

  // Global KPIs
  const totalSpend = periodCampaigns.reduce((s, c) => s + (c.metrics?.spend || 0), 0);
  const totalImpressions = periodCampaigns.reduce((s, c) => s + (c.metrics?.impressions || 0), 0);
  const totalClicks = periodCampaigns.reduce((s, c) => s + (c.metrics?.clicks || 0), 0);
  const totalConversions = periodCampaigns.reduce((s, c) => s + (c.metrics?.conversions || 0), 0);
  const totalLeads = periodCampaigns.reduce((s, c) => s + (c.metrics?.leads || 0), 0);
  const totalConvValue = periodCampaigns.reduce((s, c) => s + (c.metrics?.conversionValue || 0), 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgROAS = totalSpend > 0 ? totalConvValue / totalSpend : 0;
  const totalBudget = periodCampaigns.reduce((s, c) => s + (c.budget?.total || 0), 0);
  const budgetUsedPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpend / totalBudget) * 100)) : 0;

  // Per-platform data
  const platformData = useMemo(() => {
    const map: Record<string, { spend: number; clicks: number; impressions: number; conversions: number; convValue: number; campaigns: number }> = {};
    for (const c of periodCampaigns) {
      const platforms = c.platforms.length > 0 ? c.platforms : ['unknown'];
      for (const p of platforms) {
        if (!map[p]) map[p] = { spend: 0, clicks: 0, impressions: 0, conversions: 0, convValue: 0, campaigns: 0 };
        map[p].spend += (c.metrics?.spend || 0) / platforms.length;
        map[p].clicks += (c.metrics?.clicks || 0) / platforms.length;
        map[p].impressions += (c.metrics?.impressions || 0) / platforms.length;
        map[p].conversions += (c.metrics?.conversions || 0) / platforms.length;
        map[p].convValue += (c.metrics?.conversionValue || 0) / platforms.length;
        map[p].campaigns++;
      }
    }
    return Object.entries(map).map(([platform, data]) => ({
      platform,
      name: PLATFORM_LABELS[platform as Platform] || platform,
      ...data,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
      roas: data.spend > 0 ? data.convValue / data.spend : 0,
    })).sort((a, b) => b.spend - a.spend);
  }, [periodCampaigns]);

  // Per-objective data
  const objectiveData = useMemo(() => {
    const map: Record<string, { spend: number; conversions: number; leads: number; count: number }> = {};
    for (const c of periodCampaigns) {
      if (!map[c.objective]) map[c.objective] = { spend: 0, conversions: 0, leads: 0, count: 0 };
      map[c.objective].spend += c.metrics?.spend || 0;
      map[c.objective].conversions += c.metrics?.conversions || 0;
      map[c.objective].leads += c.metrics?.leads || 0;
      map[c.objective].count++;
    }
    return Object.entries(map).map(([objective, data]) => ({
      objective,
      name: OBJECTIVE_LABELS[objective] || objective,
      ...data,
    }));
  }, [periodCampaigns]);

  // Recommendations
  const recommendations: { type: 'warning' | 'error' | 'info'; message: string }[] = useMemo(() => {
    const recs: { type: 'warning' | 'error' | 'info'; message: string }[] = [];
    for (const c of periodCampaigns) {
      if (!c.metrics) continue;
      if (c.metrics.roas > 0 && c.metrics.roas < 1 && c.status === 'active') {
        recs.push({ type: 'error', message: `"${c.name}" : ROAS de ${c.metrics.roas.toFixed(2)} — campagne non rentable. Revoir le ciblage ou les créatifs.` });
      }
      if (c.metrics.ctr < 0.5 && c.metrics.impressions > 1000) {
        recs.push({ type: 'warning', message: `"${c.name}" : CTR très faible (${c.metrics.ctr.toFixed(2)}%). Testez de nouveaux visuels ou accroches.` });
      }
      const budgetUsed = c.budget?.total > 0 ? c.metrics.spend / c.budget.total : 0;
      if (budgetUsed > 0.9 && c.status === 'active') {
        recs.push({ type: 'info', message: `"${c.name}" : Budget consommé à ${Math.round(budgetUsed * 100)}%. Prévoir une augmentation si performances satisfaisantes.` });
      }
    }
    if (recs.length === 0) recs.push({ type: 'info', message: 'Toutes les campagnes actives présentent des performances satisfaisantes.' });
    return recs;
  }, [periodCampaigns]);

  const activeCampaigns = periodCampaigns.filter((c) => c.status === 'active').length;
  const completedCampaigns = periodCampaigns.filter((c) => c.status === 'completed').length;
  const pausedCampaigns = periodCampaigns.filter((c) => c.status === 'paused').length;

  const topCampaigns = [...periodCampaigns]
    .filter((c) => c.metrics)
    .sort((a, b) => (b.metrics?.roas || 0) - (a.metrics?.roas || 0))
    .slice(0, 10);

  // Budget by campaign chart data
  const budgetChartData = periodCampaigns
    .filter((c) => c.budget?.total > 0)
    .map((c) => ({
      name: c.name.length > 16 ? c.name.slice(0, 16) + '…' : c.name,
      Budget: c.budget.total,
      Dépensé: c.metrics?.spend || 0,
    }))
    .slice(0, 10);

  // Pie data for budget by platform
  const platformPieData = platformData.map((p, i) => ({
    name: p.name,
    value: Math.round(p.spend),
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  // Timeline (sorted by start date)
  const timelineCampaigns = [...periodCampaigns].sort(
    (a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime()
  );

  const today = fmtDate(new Date());

  const SectionHeader: React.FC<{ num: string; title: string }> = ({ num, title }) => (
    <div className="flex items-center gap-3 mb-5">
      <span className="px-2 py-0.5 rounded-md bg-primary-500/20 text-primary-300 text-xs font-bold tracking-widest">{num}</span>
      <h2 className="text-primary-300 font-display font-semibold text-base uppercase tracking-wider">{title}</h2>
      <div className="flex-1 h-px bg-card-border" />
    </div>
  );

  return (
    <div className="space-y-10">
      {/* Report Header */}
      <div className="flex items-start gap-6 pb-8 border-b border-card-border">
        <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-purple flex-shrink-0">
          <Zap className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-primary-400 text-xs uppercase tracking-widest font-semibold mb-1">
            {agencyName} · Rapport All-In
          </p>
          <h1 className="text-white font-display font-bold text-3xl leading-tight">{config.title}</h1>
          {config.subtitle && <p className="text-slate-400 text-base mt-1">{config.subtitle}</p>}
          <p className="text-slate-500 text-sm mt-2">Généré le {today}</p>
        </div>
        <div className="text-right text-xs text-slate-500 flex-shrink-0">
          {config.clientNom && (
            <div className="mb-1">
              <span className="text-slate-400 font-medium">Client :</span>{' '}
              <span className="text-slate-300">{config.clientNom}</span>
            </div>
          )}
          <div>
            <span className="text-slate-400 font-medium">Campagnes :</span>{' '}
            <span className="text-slate-300">{periodCampaigns.length}</span>
          </div>
          <div className="flex gap-3 mt-2 justify-end">
            <span className="px-2 py-0.5 rounded-full text-xs bg-accent-green/20 text-accent-green">{activeCampaigns} actives</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-primary-500/20 text-primary-300">{completedCampaigns} terminées</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400">{pausedCampaigns} en pause</span>
          </div>
        </div>
      </div>

      {/* Section 1 — Résumé Exécutif */}
      <section>
        <SectionHeader num="01" title="Résumé Exécutif" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Dépensé', value: fmtMoney(totalSpend), icon: DollarSign, color: 'text-primary-400', bg: 'bg-primary-500/15' },
            { label: 'Impressions', value: fmt(totalImpressions), icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/15' },
            { label: 'Clics', value: fmt(totalClicks), icon: MousePointerClick, color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
            { label: 'CTR Moyen', value: `${fmtDec2(avgCTR)}%`, icon: TrendingUp, color: 'text-accent-green', bg: 'bg-accent-green/15' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-card-border rounded-2xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.bg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-slate-500 text-xs">{kpi.label}</p>
                <p className="text-white font-bold text-lg leading-tight">{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'CPC Moyen', value: fmtMoney(avgCPC), icon: BarChart2, color: 'text-amber-400', bg: 'bg-amber-500/15' },
            { label: 'Conversions', value: fmt(totalConversions), icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/15' },
            { label: 'ROAS Moyen', value: `${fmtDec2(avgROAS)}x`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
            { label: 'Total Leads', value: fmt(totalLeads), icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/15' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-card-border rounded-2xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.bg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-slate-500 text-xs">{kpi.label}</p>
                <p className="text-white font-bold text-lg leading-tight">{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Budget global bar */}
        {totalBudget > 0 && (
          <div className="mt-4 bg-card border border-card-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-slate-400">Budget global consommé — {fmtMoney(totalSpend)} / {fmtMoney(totalBudget)}</span>
              <span className={`font-bold ${budgetUsedPct >= 90 ? 'text-red-400' : budgetUsedPct >= 70 ? 'text-amber-400' : 'text-accent-green'}`}>{budgetUsedPct}%</span>
            </div>
            <div className="w-full bg-obsidian-900 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${budgetUsedPct >= 90 ? 'bg-red-500' : budgetUsedPct >= 70 ? 'bg-amber-500' : 'bg-gradient-to-r from-primary-500 to-cyan-400'}`}
                style={{ width: `${budgetUsedPct}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Section 2 — Performance par Plateforme */}
      {platformData.length > 0 && (
        <section>
          <SectionHeader num="02" title="Performance par Plateforme" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar chart spend by platform */}
            <div className="bg-card border border-card-border rounded-2xl p-5">
              <h3 className="text-slate-300 font-semibold text-sm mb-4">Dépenses par Plateforme</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={platformData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3f" horizontal={false} />
                  <XAxis type="number" stroke="#475569" tick={{ fontSize: 10 }} tickFormatter={(v) => fmtMoney(v)} />
                  <YAxis dataKey="name" type="category" stroke="#475569" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="spend" name="Spend (€)" radius={[0, 4, 4, 0]}>
                    {platformData.map((_entry, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart budget by platform */}
            {platformPieData.length > 0 && (
              <div className="bg-card border border-card-border rounded-2xl p-5">
                <h3 className="text-slate-300 font-semibold text-sm mb-4">Répartition du Budget</h3>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={platformPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        {platformPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5 text-xs flex-1">
                    {platformPieData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                        <span className="text-slate-400 flex-1">{d.name}</span>
                        <span className="text-white font-semibold">{fmtMoney(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Platform metrics table */}
          <div className="mt-4 bg-card border border-card-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-card-border bg-obsidian-900/50">
                    {['Plateforme', 'Campagnes', 'Spend', 'Clics', 'CTR', 'CPC', 'ROAS'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {platformData.map((p) => (
                    <tr key={p.platform} className="border-b border-card-border/50 hover:bg-obsidian-700/30">
                      <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-slate-400">{p.campaigns}</td>
                      <td className="px-4 py-3 text-white tabular-nums">{fmtMoney(p.spend)}</td>
                      <td className="px-4 py-3 text-slate-300 tabular-nums">{fmt(Math.round(p.clicks))}</td>
                      <td className="px-4 py-3 text-slate-300 tabular-nums">{fmtDec2(p.ctr)}%</td>
                      <td className="px-4 py-3 text-slate-300 tabular-nums">{fmtMoney(p.cpc)}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums" style={{ color: p.roas >= 4 ? '#10b981' : p.roas >= 2 ? '#f59e0b' : '#ef4444' }}>
                        {fmtDec2(p.roas)}x
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Section 3 — Performance par Objectif */}
      {objectiveData.length > 0 && (
        <section>
          <SectionHeader num="03" title="Performance par Objectif" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {objectiveData.map((obj, i) => (
              <div key={obj.objective} className="bg-card border border-card-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-white font-semibold text-sm">{obj.name}</span>
                  <span className="ml-auto text-xs text-slate-500">{obj.count} camp.</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dépensé</span>
                    <span className="text-white font-medium">{fmtMoney(obj.spend)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Conversions</span>
                    <span className="text-white font-medium">{fmt(obj.conversions)}</span>
                  </div>
                  {obj.leads > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Leads</span>
                      <span className="text-white font-medium">{fmt(obj.leads)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 4 — Suivi Budgétaire */}
      {budgetChartData.length > 0 && (
        <section>
          <SectionHeader num="04" title="Suivi Budgétaire" />
          <div className="bg-card border border-card-border rounded-2xl p-5">
            <h3 className="text-slate-300 font-semibold text-sm mb-4">Budget alloué vs Dépensé par Campagne</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={budgetChartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3f" />
                <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 10 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 10 }} tickFormatter={(v) => fmtMoney(v)} />
                <Tooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <Bar dataKey="Budget" fill="#8b5cf6" fillOpacity={0.4} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Dépensé" fill="#06b6d4" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Budget % per campaign */}
          <div className="mt-4 space-y-2">
            {periodCampaigns.filter((c) => c.budget?.total > 0).map((c) => {
              const spent = c.metrics?.spend || 0;
              const pct = Math.min(100, Math.round((spent / c.budget.total) * 100));
              return (
                <div key={c.id} className="bg-card border border-card-border rounded-xl p-3 flex items-center gap-3">
                  <span className="text-white text-xs font-medium flex-1 truncate">{c.name}</span>
                  <span className="text-slate-400 text-xs whitespace-nowrap">{fmtMoney(spent)} / {fmtMoney(c.budget.total)}</span>
                  <div className="w-24 bg-obsidian-900 rounded-full h-2 flex-shrink-0">
                    <div
                      className={`h-2 rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-accent-green'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-8 text-right ${pct >= 90 ? 'text-red-400' : pct >= 70 ? 'text-amber-400' : 'text-accent-green'}`}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 5 — Top Campagnes */}
      {topCampaigns.length > 0 && (
        <section>
          <SectionHeader num="05" title="Top Campagnes (par ROAS)" />
          <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-card-border bg-obsidian-900/50">
                    {['Nom', 'Plateforme(s)', 'Statut', 'Budget', 'Dépensé', 'CTR', 'CPC', 'ROAS', 'Conv.'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topCampaigns.map((c, i) => (
                    <tr key={c.id} className="border-b border-card-border/50 hover:bg-obsidian-700/30">
                      <td className="px-4 py-3 font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 tabular-nums">{i + 1}</span>
                          <span className="truncate max-w-[160px]" title={c.name}>{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{c.platforms.map((p) => PLATFORM_LABELS[p] ?? p).join(', ')}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-card border border-card-border text-slate-300">
                          {STATUS_LABELS[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 tabular-nums">{fmtMoney(c.budget?.total || 0)}</td>
                      <td className="px-4 py-3 text-white tabular-nums">{fmtMoney(c.metrics?.spend ?? 0)}</td>
                      <td className="px-4 py-3 text-slate-300 tabular-nums">{fmtDec2(c.metrics?.ctr ?? 0)}%</td>
                      <td className="px-4 py-3 text-slate-300 tabular-nums">{fmtMoney(c.metrics?.cpc ?? 0)}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums" style={{ color: (c.metrics?.roas ?? 0) >= 4 ? '#10b981' : (c.metrics?.roas ?? 0) >= 2 ? '#f59e0b' : '#ef4444' }}>
                        {fmtDec2(c.metrics?.roas ?? 0)}x
                      </td>
                      <td className="px-4 py-3 text-slate-300 tabular-nums">{fmt(c.metrics?.conversions ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Section 6 — Analyse des KPIs cibles */}
      {periodCampaigns.some((c) => c.kpis && c.kpis.length > 0) && (
        <section>
          <SectionHeader num="06" title="Analyse des KPIs Cibles" />
          <div className="space-y-3">
            {periodCampaigns.filter((c) => c.kpis && c.kpis.length > 0).map((c) => (
              <div key={c.id} className="bg-card border border-card-border rounded-2xl p-4">
                <p className="text-white font-medium text-sm mb-3">{c.name}</p>
                <div className="flex flex-wrap gap-2">
                  {c.kpis.map((kpi, ki) => {
                    const actual =
                      kpi.metric === 'roas' ? c.metrics?.roas :
                      kpi.metric === 'cpa'  ? c.metrics?.cpa :
                      kpi.metric === 'ctr'  ? c.metrics?.ctr :
                      kpi.metric === 'cpc'  ? c.metrics?.cpc :
                      kpi.metric === 'cpm'  ? c.metrics?.cpm : undefined;
                    let achieved = false;
                    if (actual !== undefined) {
                      if (kpi.operator === '<') achieved = actual < kpi.target;
                      else if (kpi.operator === '>') achieved = actual > kpi.target;
                      else achieved = actual === kpi.target;
                    }
                    return (
                      <div
                        key={ki}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border ${achieved ? 'border-accent-green/30 bg-accent-green/10' : 'border-red-500/30 bg-red-500/10'}`}
                      >
                        {achieved
                          ? <CheckCircle className="w-3.5 h-3.5 text-accent-green flex-shrink-0" />
                          : <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        }
                        <span className={achieved ? 'text-accent-green' : 'text-red-400'}>
                          {kpi.metric.toUpperCase()} {kpi.operator} {kpi.target}
                        </span>
                        {actual !== undefined && (
                          <span className="text-slate-400">— actuel : {fmtDec2(actual)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 7 — Timeline des Campagnes */}
      {timelineCampaigns.length > 0 && (
        <section>
          <SectionHeader num="07" title="Timeline des Campagnes" />
          <div className="space-y-2">
            {timelineCampaigns.map((c) => (
              <div key={c.id} className="flex items-center gap-4 p-3 bg-card border border-card-border rounded-xl">
                <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-white text-sm font-medium truncate block">{c.name}</span>
                  <span className="text-slate-500 text-xs">{c.dateDebut} → {c.dateFin}</span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {c.platforms.slice(0, 3).map((p) => (
                    <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-obsidian-700 text-slate-300">
                      {PLATFORM_LABELS[p] ?? p}
                    </span>
                  ))}
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-card border border-card-border text-slate-300 flex-shrink-0">
                  {STATUS_LABELS[c.status] ?? c.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 8 — Recommandations Automatiques */}
      <section>
        <SectionHeader num="08" title="Recommandations Automatiques" />
        <div className="space-y-3">
          {recommendations.map((rec, i) => {
            const isError = rec.type === 'error';
            const isWarning = rec.type === 'warning';
            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-4 rounded-2xl border text-sm ${
                  isError
                    ? 'border-red-500/30 bg-red-500/10'
                    : isWarning
                    ? 'border-amber-500/30 bg-amber-500/10'
                    : 'border-blue-500/30 bg-blue-500/10'
                }`}
              >
                {isError
                  ? <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  : isWarning
                  ? <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  : <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                }
                <span className={isError ? 'text-red-300' : isWarning ? 'text-amber-300' : 'text-blue-300'}>
                  {rec.message}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-card-border text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-primary-400" />
          <span>{agencyName} · Rapport All-In · Confidentiel</span>
        </div>
        <span>{today}</span>
        <span>{periodCampaigns.length} campagnes</span>
      </div>
    </div>
  );
};

// ─── Component ─────────────────────────────────────────────────────────────

export const MediaBuyingReportViewer: React.FC<{
  config: ReportConfig;
  campaigns: Campaign[];
  onClose: () => void;
  onExportPDF: () => void;
  onExportHTML: () => void;
}> = ({ config, campaigns, onClose, onExportPDF, onExportHTML }) => {
  const [printMode, setPrintMode] = useState(false);

  const filtered = campaigns.filter(
    (c) =>
      c.metrics &&
      (config.platforms.length === 0 ||
        c.platforms.some((p) => config.platforms.includes(p)))
  );

  // ── Aggregates ────────────────────────────────────────────────────────────
  const totalImpressions = filtered.reduce((s, c) => s + (c.metrics?.impressions ?? 0), 0);
  const totalSpend       = filtered.reduce((s, c) => s + (c.metrics?.spend ?? 0), 0);
  const totalConversions = filtered.reduce((s, c) => s + (c.metrics?.conversions ?? 0), 0);
  const totalClicks      = filtered.reduce((s, c) => s + (c.metrics?.clicks ?? 0), 0);
  const avgRoas = filtered.length
    ? filtered.reduce((s, c) => s + (c.metrics?.roas ?? 0), 0) / filtered.length
    : 0;
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  // ── Chart data ────────────────────────────────────────────────────────────
  // Monthly spend + conversions (mock progression based on real totals)
  const spendPerCampaign = filtered.map((c) => ({
    name: c.name.slice(0, 18) + (c.name.length > 18 ? '…' : ''),
    Spend: c.metrics?.spend ?? 0,
    Conversions: c.metrics?.conversions ?? 0,
  }));

  // Spend per platform
  const platformSpendMap: Record<string, number> = {};
  filtered.forEach((c) => {
    c.platforms.forEach((p) => {
      platformSpendMap[p] = (platformSpendMap[p] ?? 0) + (c.metrics?.spend ?? 0) / c.platforms.length;
    });
  });
  const platformSpendData = Object.entries(platformSpendMap)
    .sort((a, b) => b[1] - a[1])
    .map(([plat, val]) => ({
      name: PLATFORM_LABELS[plat as Platform] ?? plat,
      Spend: Math.round(val),
      fill: PLATFORM_COLORS[plat as Platform] ?? '#8b5cf6',
    }));

  // Conversions per objective
  const objectiveMap: Record<string, number> = {};
  filtered.forEach((c) => {
    const key = OBJECTIVE_LABELS[c.objective] ?? c.objective;
    objectiveMap[key] = (objectiveMap[key] ?? 0) + (c.metrics?.conversions ?? 0);
  });
  const pieData = Object.entries(objectiveMap).map(([name, value]) => ({ name, value }));

  // ROAS per campaign (line chart)
  const roasData = filtered.map((c) => ({
    name: c.name.slice(0, 14) + (c.name.length > 14 ? '…' : ''),
    ROAS: c.metrics?.roas ?? 0,
  }));

  const today = fmtDate(new Date());

  return (
    <div className="fixed inset-0 z-50 bg-obsidian-900 overflow-y-auto">
      {/* Toolbar */}
      {!printMode && (
        <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-3 bg-obsidian-900/95 backdrop-blur-sm border-b border-card-border">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-obsidian-700 text-sm font-medium transition-all"
          >
            <X className="w-4 h-4" />
            Fermer
          </button>
          <div className="flex-1 text-white font-medium text-sm truncate px-2">
            {config.title}
          </div>
          <button
            onClick={() => setPrintMode((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-obsidian-700 text-sm font-medium transition-all"
          >
            {printMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {printMode ? 'Afficher barre' : 'Mode impression'}
          </button>
          <button
            onClick={onExportHTML}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-obsidian-700 border border-card-border text-sm font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            Exporter HTML
          </button>
          <button
            onClick={onExportPDF}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-primary text-white text-sm font-medium shadow-glow-purple hover:shadow-glow-cyan transition-all"
          >
            <Printer className="w-4 h-4" />
            Imprimer / PDF
          </button>
        </div>
      )}

      {/* Report body */}
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* All-In Report */}
        {config.template === 'allin' && (
          <AllInReport campaigns={campaigns} config={config} agencyName={config.agencyNom} />
        )}

        {/* Standard Report — only for non allin templates */}
        {config.template !== 'allin' && (
        <>
        {/* Report Header */}
        <div className="flex items-start gap-6 pb-8 border-b border-card-border">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-purple flex-shrink-0">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-primary-400 text-xs uppercase tracking-widest font-semibold mb-1">
              {config.agencyNom} · Media Buying Report
            </p>
            <h1 className="text-white font-display font-bold text-3xl leading-tight">{config.title}</h1>
            {config.subtitle && (
              <p className="text-slate-400 text-base mt-1">{config.subtitle}</p>
            )}
            <p className="text-slate-500 text-sm mt-2">Généré le {today}</p>
          </div>
          <div className="text-right text-xs text-slate-500 flex-shrink-0">
            {config.clientNom && (
              <div className="mb-1">
                <span className="text-slate-400 font-medium">Client :</span>{' '}
                <span className="text-slate-300">{config.clientNom}</span>
              </div>
            )}
            <div>
              <span className="text-slate-400 font-medium">Campagnes :</span>{' '}
              <span className="text-slate-300">{filtered.length}</span>
            </div>
          </div>
        </div>

        {/* KPIs */}
        {config.includeKPIs && (
          <section>
            <h2 className="text-primary-300 font-display font-semibold text-base uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-4 rounded bg-gradient-primary inline-block" />
              Indicateurs Clés de Performance
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Impressions', value: fmt(totalImpressions) },
                { label: 'Dépenses', value: fmtMoney(totalSpend) },
                { label: 'ROAS Moyen', value: `${fmtDec2(avgRoas)}x` },
                { label: 'CPA Moyen', value: fmtMoney(avgCpa) },
                { label: 'Conversions', value: fmt(totalConversions) },
                { label: 'CTR Moyen', value: `${fmtDec2(avgCtr)}%` },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-1"
                >
                  <span className="text-slate-500 text-xs uppercase tracking-wide">{kpi.label}</span>
                  <span className="text-white font-bold text-xl leading-tight">{kpi.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Charts */}
        {config.includeCharts && filtered.length > 0 && (
          <section>
            <h2 className="text-primary-300 font-display font-semibold text-base uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-4 rounded bg-gradient-primary inline-block" />
              Graphiques de Performance
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Spend + Conversions per campaign */}
              <div className="bg-card border border-card-border rounded-2xl p-5">
                <h3 className="text-slate-300 font-semibold text-sm mb-4">Spend &amp; Conversions par Campagne</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={spendPerCampaign} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3f" />
                    <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
                    <Tooltip content={<DarkTooltip />} />
                    <Area type="monotone" dataKey="Spend" stroke="#8b5cf6" fill="url(#gradSpend)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Conversions" stroke="#06b6d4" fill="url(#gradConv)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Spend per platform */}
              <div className="bg-card border border-card-border rounded-2xl p-5">
                <h3 className="text-slate-300 font-semibold text-sm mb-4">Dépenses par Plateforme</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={platformSpendData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3f" horizontal={false} />
                    <XAxis type="number" stroke="#475569" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" stroke="#475569" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="Spend" radius={[0, 4, 4, 0]}>
                      {platformSpendData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie: conversions per objective */}
              {pieData.length > 0 && (
                <div className="bg-card border border-card-border rounded-2xl p-5">
                  <h3 className="text-slate-300 font-semibold text-sm mb-4">Conversions par Objectif</h3>
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((_entry, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<DarkTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-2 text-xs">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          <span className="text-slate-400">{d.name}</span>
                          <span className="text-white font-semibold ml-auto pl-3">{fmt(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ROAS per campaign */}
              {roasData.length > 0 && (
                <div className="bg-card border border-card-border rounded-2xl p-5">
                  <h3 className="text-slate-300 font-semibold text-sm mb-4">ROAS par Campagne</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={roasData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3f" />
                      <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
                      <Tooltip content={<DarkTooltip />} />
                      <Bar dataKey="ROAS" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Table */}
        {config.includeTable && filtered.length > 0 && (
          <section>
            <h2 className="text-primary-300 font-display font-semibold text-base uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-4 rounded bg-gradient-primary inline-block" />
              Détail des Campagnes
            </h2>
            <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-card-border bg-obsidian-900/50">
                      {['Campagne', 'Plateforme(s)', 'Status', 'Spend', 'Impressions', 'Clics', 'CTR', 'CPC', 'Conv.', 'CPA', 'ROAS'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-b border-card-border/50 hover:bg-obsidian-700/30 transition-colors">
                        <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate" title={c.name}>
                          {c.name}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {c.platforms.map((p) => PLATFORM_LABELS[p] ?? p).join(', ')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-card border border-card-border text-slate-300">
                            {STATUS_LABELS[c.status] ?? c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-white tabular-nums">{fmtMoney(c.metrics?.spend ?? 0)}</td>
                        <td className="px-4 py-3 text-right text-slate-300 tabular-nums">{fmt(c.metrics?.impressions ?? 0)}</td>
                        <td className="px-4 py-3 text-right text-slate-300 tabular-nums">{fmt(c.metrics?.clicks ?? 0)}</td>
                        <td className="px-4 py-3 text-right text-slate-300 tabular-nums">{fmtDec2(c.metrics?.ctr ?? 0)}%</td>
                        <td className="px-4 py-3 text-right text-slate-300 tabular-nums">{fmtMoney(c.metrics?.cpc ?? 0)}</td>
                        <td className="px-4 py-3 text-right text-slate-300 tabular-nums">{fmt(c.metrics?.conversions ?? 0)}</td>
                        <td className="px-4 py-3 text-right text-slate-300 tabular-nums">{fmtMoney(c.metrics?.cpa ?? 0)}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: (c.metrics?.roas ?? 0) >= 4 ? '#10b981' : (c.metrics?.roas ?? 0) >= 2 ? '#f59e0b' : '#ef4444' }}>
                          {fmtDec2(c.metrics?.roas ?? 0)}x
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-card-border text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-primary-400" />
            <span>{config.agencyNom} · Confidentiel</span>
          </div>
          <span>{today}</span>
          <span>Page 1 / 1</span>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

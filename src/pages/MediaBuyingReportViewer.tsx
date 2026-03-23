import React, { useState } from 'react';
import {
  X, Printer, Download, Zap, Eye, EyeOff,
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
  template: 'performance' | 'budget' | 'roi' | 'platform' | 'full';
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
      </div>
    </div>
  );
};

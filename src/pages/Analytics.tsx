import React, { useMemo } from 'react';
import { TrendingUp, Users, Euro, Moon, BarChart3, PieChart as PieChartIcon, DollarSign, AlertTriangle, Clock, TrendingDown, Target, Activity } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line
} from 'recharts';
import { useStore } from '../store/useStore';
import { StatCard } from '../components/ui/StatCard';
import { AlertBanner } from '../components/ui/AlertBanner';

const PIE_COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-obsidian-700 border border-card-border rounded-xl p-3">
        <p className="text-white font-semibold text-xs mb-1">{label}</p>
        {payload.map((e: any) => (
          <p key={e.name} className="text-xs" style={{ color: e.color || e.fill }}>
            {e.name}: {typeof e.value === 'number' ? `${e.value.toLocaleString('fr-FR')} ${e.name === 'abonnés' ? '' : '€'}` : e.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const INITIALS_COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export const Analytics: React.FC = () => {
  const { clients, projects, invoices, snoozeSubscriptions, freelancers } = useStore();

  // ─── KPI Cards ────────────────────────────────────────────────────────────
  const caEncaisse = invoices.filter(i => i.statut === 'payée').reduce((s, i) => s + i.total, 0);
  const clientsActifs = clients.filter(c => c.statut === 'actif' || c.statut === 'vip').length;
  const tauxCompletion = projects.length > 0
    ? Math.round((projects.filter(p => p.statut === 'terminé').length / projects.length) * 100)
    : 0;
  const mrrSnooze = snoozeSubscriptions
    .filter(s => s.statut === 'actif')
    .reduce((s, sub) => s + sub.montantMensuel, 0);

  // ─── 1. Sources Clients — PieChart ────────────────────────────────────────
  const clientSourceData = useMemo(() =>
    Object.entries(
      clients.reduce((acc, c) => {
        acc[c.source] = (acc[c.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value], index) => ({ name, value, color: PIE_COLORS[index % PIE_COLORS.length] }))
  , [clients]);

  // ─── 2. Radar Performance Agence ──────────────────────────────────────────
  const radarData = useMemo(() => {
    const totalProjects = projects.length;
    const totalInvoices = invoices.length;
    const allTaches = projects.flatMap(p => p.taches);
    const totalTaches = allTaches.length;
    const tachesFaites = allTaches.filter(t => t.statut === 'fait').length;
    const heuresEstimees = allTaches.reduce((s, t) => s + t.heuresEstimees, 0);
    const heuresReelles = allTaches.reduce((s, t) => s + t.heuresReelles, 0);
    const totalCA = clients.reduce((s, c) => s + c.chiffreAffaires, 0);
    const totalDepenses = projects.reduce((s, p) => s + p.depenses, 0);

    return [
      {
        dimension: 'Livraisons',
        value: totalProjects > 0
          ? Math.round((projects.filter(p => p.statut === 'terminé').length / totalProjects) * 100)
          : 0,
      },
      {
        dimension: 'Facturation',
        value: totalInvoices > 0
          ? Math.round((invoices.filter(i => i.statut === 'payée').length / totalInvoices) * 100)
          : 0,
      },
      {
        dimension: 'Efficacité',
        value: heuresEstimees > 0
          ? Math.min(100, Math.round((heuresEstimees / Math.max(heuresReelles, 1)) * 100))
          : 0,
      },
      {
        dimension: 'Tâches',
        value: totalTaches > 0 ? Math.round((tachesFaites / totalTaches) * 100) : 0,
      },
      {
        dimension: 'Rentabilité',
        value: totalCA > 0
          ? Math.min(100, Math.round(((totalCA - totalDepenses) / totalCA) * 100))
          : 0,
      },
      {
        dimension: 'Clients VIP',
        value: clients.length > 0
          ? Math.round((clients.filter(c => c.statut === 'vip').length / clients.length) * 100)
          : 0,
      },
    ];
  }, [clients, projects, invoices]);

  const globalScore = radarData.length > 0
    ? Math.round(radarData.reduce((s, d) => s + d.value, 0) / radarData.length)
    : 0;

  // ─── 3. BarChart Financier — 6 mois réels ─────────────────────────────────
  const monthlyFinancialData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i), 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      const revenu = invoices
        .filter(inv => inv.statut === 'payée' && (inv.datePaiement ?? inv.dateEmission).startsWith(key))
        .reduce((s, inv) => s + inv.total, 0);
      const depenses = projects
        .filter(p => p.dateDebut.startsWith(key) || p.dateFin.startsWith(key))
        .reduce((s, p) => s + p.depenses / Math.max(1, 6), 0);
      return {
        mois: label,
        revenu: Math.round(revenu),
        depenses: Math.round(depenses),
        benefice: Math.round(revenu - depenses),
      };
    });
  }, [invoices, projects]);

  // ─── 4. Prestataires ──────────────────────────────────────────────────────
  const topFreelancers = useMemo(() =>
    [...freelancers].sort((a, b) => b.totalFacture - a.totalFacture).slice(0, 5)
  , [freelancers]);

  const tjmMoyen = freelancers.length > 0
    ? Math.round(freelancers.reduce((s, f) => s + f.tjm, 0) / freelancers.length)
    : 0;

  const caTotalPrestataires = freelancers.reduce((s, f) => s + f.totalFacture, 0);

  // ─── 5. Win/Loss mensuel ───────────────────────────────────────────────────
  const winLossData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i), 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      const gagnes = invoices.filter(
        inv => inv.statut === 'payée' && (inv.datePaiement ?? inv.dateEmission).startsWith(key)
      ).length;
      const perdus = invoices.filter(
        inv => inv.statut === 'annulée' && inv.dateEmission.startsWith(key)
      ).length;
      return { mois: label, Gagnés: gagnes, Perdus: perdus };
    });
  }, [invoices]);

  // ─── 6. KPIs supplémentaires ──────────────────────────────────────────────
  const invoicesPaye = invoices.filter(i => i.statut === 'payée');
  const invoicesAnnulees = invoices.filter(i => i.statut === 'annulée');
  const tauxConversion = (invoicesPaye.length + invoicesAnnulees.length) > 0
    ? Math.round((invoicesPaye.length / (invoicesPaye.length + invoicesAnnulees.length)) * 100)
    : 0;

  const delaiMoyenPaiement = useMemo(() => {
    const withDates = invoicesPaye.filter(i => i.datePaiement && i.dateEmission);
    if (withDates.length === 0) return 0;
    const totalDays = withDates.reduce((s, i) => {
      const diff = new Date(i.datePaiement!).getTime() - new Date(i.dateEmission).getTime();
      return s + diff / (1000 * 60 * 60 * 24);
    }, 0);
    return Math.round(totalDays / withDates.length);
  }, [invoicesPaye]);

  const invoicesEnRetard = invoices.filter(i => i.statut === 'en retard');
  const montantEnRetard = invoicesEnRetard.reduce((s, i) => s + i.total, 0);

  // ─── 7. Alertes & Monitoring ──────────────────────────────────────────────
  const projetsStagnants = useMemo(() => {
    const threshold = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return projects.filter(p => {
      if (p.statut === 'terminé' || p.statut === 'annulé') return false;
      const lastActivity = new Date(p.dateFin).getTime();
      return (now - lastActivity) > threshold;
    });
  }, [projects]);

  const freelancersInactifs = useMemo(
    () => freelancers.filter(f => f.statut === 'inactif'),
    [freelancers]
  );

  const { setActiveSection } = useStore();

  // ═══ STATISTIQUES AVANCÉES ═══════════════════════════════════════════════

  // ── A. CA par client Top 10 ─────────────────────────────────────────────
  const topClientsCA = useMemo(() =>
    [...clients]
      .sort((a, b) => b.chiffreAffaires - a.chiffreAffaires)
      .slice(0, 10)
      .map(c => ({ nom: c.nom.length > 15 ? c.nom.slice(0, 15) + '…' : c.nom, ca: c.chiffreAffaires }))
  , [clients]);

  // ── B. CA par mois — courbe 12 mois ────────────────────────────────────
  const caParMois = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i), 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      const ca = invoices
        .filter(inv => inv.statut === 'payée' && (inv.datePaiement ?? inv.dateEmission).startsWith(key))
        .reduce((s, inv) => s + inv.total, 0);
      return { mois: label, CA: Math.round(ca) };
    });
  }, [invoices]);

  // ── C. Taux occupation freelancers ──────────────────────────────────────
  const freelancerOccupation = useMemo(() => {
    return freelancers.map(f => {
      const assignedTasks = projects.flatMap(p =>
        p.taches.filter(t => t.assigneAIds?.includes(f.id) || t.assigneA === `${f.prenom} ${f.nom}`)
      );
      const heuresEstimees = assignedTasks.reduce((s, t) => s + t.heuresEstimees, 0);
      const heuresReelles = assignedTasks.reduce((s, t) => s + t.heuresReelles, 0);
      const taux = heuresEstimees > 0 ? Math.round((heuresReelles / heuresEstimees) * 100) : 0;
      return {
        nom: `${f.prenom} ${f.nom}`.length > 18 ? `${f.prenom.charAt(0)}. ${f.nom}` : `${f.prenom} ${f.nom}`,
        taux,
        heuresReelles,
        heuresEstimees,
        statut: f.statut,
      };
    }).sort((a, b) => b.taux - a.taux).slice(0, 8);
  }, [freelancers, projects]);

  // ── D. Pipeline conversion prospection ──────────────────────────────────
  const pipelineData = useMemo(() => {
    const total = clients.length;
    const prospects = clients.filter(c => c.statut === 'prospect').length;
    const actifs = clients.filter(c => c.statut === 'actif').length;
    const vip = clients.filter(c => c.statut === 'vip').length;
    const inactifs = clients.filter(c => c.statut === 'inactif').length;
    return [
      { etape: 'Prospects', count: prospects, pct: total > 0 ? Math.round((prospects / total) * 100) : 0, color: '#64748b' },
      { etape: 'Actifs', count: actifs, pct: total > 0 ? Math.round((actifs / total) * 100) : 0, color: '#06b6d4' },
      { etape: 'VIP', count: vip, pct: total > 0 ? Math.round((vip / total) * 100) : 0, color: '#7c3aed' },
      { etape: 'Inactifs', count: inactifs, pct: total > 0 ? Math.round((inactifs / total) * 100) : 0, color: '#ef4444' },
    ];
  }, [clients]);

  // ── E. Répartition projets par statut — Pie ────────────────────────────
  const projectStatusData = useMemo(() => {
    const statusColors: Record<string, string> = {
      'planification': '#64748b',
      'en cours': '#06b6d4',
      'en révision': '#f59e0b',
      'terminé': '#10b981',
      'en pause': '#8b5cf6',
      'annulé': '#ef4444',
      'archivé': '#3b82f6',
    };
    return Object.entries(
      projects.filter(p => !p.isArchived && !p.isDeleted).reduce((acc, p) => {
        acc[p.statut] = (acc[p.statut] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value, color: statusColors[name] || '#64748b' }));
  }, [projects]);

  // ── F. Budget prévu vs réel ─────────────────────────────────────────────
  const budgetData = useMemo(() =>
    projects
      .filter(p => p.budget > 0 || p.depenses > 0)
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 8)
      .map(p => ({
        nom: p.nom.length > 15 ? p.nom.slice(0, 15) + '…' : p.nom,
        budget: p.budget,
        depenses: p.depenses,
        ecart: p.budget - p.depenses,
      }))
  , [projects]);

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="CA Encaissé"
          value={`${(caEncaisse / 1000).toFixed(1)}k€`}
          icon={Euro}
          color="green"
          trend={{ value: 9.8, label: 'vs mois dernier' }}
        />
        <StatCard
          title="Clients Actifs"
          value={clientsActifs}
          icon={Users}
          color="cyan"
          trend={{ value: 12, label: 'vs mois dernier' }}
        />
        <StatCard
          title="Taux Completion"
          value={`${tauxCompletion}%`}
          icon={BarChart3}
          color="purple"
        />
        <StatCard
          title="MRR Snooze"
          value={`$${mrrSnooze.toFixed(0)}`}
          icon={Moon}
          color="orange"
          trend={{ value: 33, label: 'vs mois dernier' }}
        />
      </div>

      {/* KPIs supplémentaires */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Taux de Conversion"
          value={`${tauxConversion}%`}
          icon={TrendingUp}
          color="green"
          subtitle="payées / (payées + annulées)"
        />
        <StatCard
          title="Délai Moyen Paiement"
          value={`${delaiMoyenPaiement}j`}
          icon={Clock}
          color="cyan"
          subtitle="Moyenne factures payées"
        />
        <StatCard
          title="Factures en Retard"
          value={invoicesEnRetard.length}
          icon={AlertTriangle}
          color="orange"
          subtitle={invoicesEnRetard.length > 0 ? `${montantEnRetard.toLocaleString('fr-FR')} € dus` : 'Aucun retard'}
        />
        <StatCard
          title="Factures Perdues"
          value={invoicesAnnulees.length}
          icon={TrendingDown}
          color="purple"
          subtitle="Statut annulée"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <h3 className="font-display font-bold text-white mb-1">Performance Financière</h3>
        <p className="text-slate-400 text-xs mb-4">6 derniers mois — Revenus, Dépenses, Bénéfice</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyFinancialData} margin={{ left: -20, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e42" vertical={false} />
            <XAxis dataKey="mois" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(v) => <span className="text-slate-400 text-xs capitalize">{v}</span>} />
            <Bar dataKey="revenu" name="Revenus" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            <Bar dataKey="depenses" name="Dépenses" fill="#1e1e42" radius={[4, 4, 0, 0]} />
            <Bar dataKey="benefice" name="Bénéfice" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Client Sources */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <h3 className="font-display font-bold text-white mb-1">Sources Clients</h3>
          <p className="text-slate-400 text-xs mb-4">Acquisition par canal</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={clientSourceData} cx="50%" cy="50%" outerRadius={70} paddingAngle={3} dataKey="value">
                {clientSourceData.map((entry, index) => (
                  <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0e0e22', border: '1px solid #1e1e42', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {clientSourceData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                  <span className="text-slate-400 text-xs">{entry.name}</span>
                </div>
                <span className="text-white text-xs font-semibold">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Radar */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <h3 className="font-display font-bold text-white mb-1">Performance Agence</h3>
          <p className="text-slate-400 text-xs mb-4">Score global {globalScore}/100</p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e1e42" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: '#64748b', fontSize: 10 }} />
              <Radar name="Score" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Clients */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <h3 className="font-display font-bold text-white mb-4">Top Clients</h3>
          <div className="space-y-3">
            {[...clients].sort((a, b) => b.chiffreAffaires - a.chiffreAffaires).slice(0, 5).map((client, index) => (
              <div key={client.id} className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${index === 0 ? 'bg-amber-400 text-black' : index === 1 ? 'bg-slate-400 text-black' : 'bg-amber-700 text-white'}`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{client.nom}</p>
                  <p className="text-slate-500 text-xs truncate">{client.entreprise}</p>
                </div>
                <span className="text-accent-green text-xs font-bold flex-shrink-0">
                  {client.chiffreAffaires > 0 ? `${client.chiffreAffaires.toLocaleString('fr-FR')} €` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Win/Loss Analysis */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <h3 className="font-display font-bold text-white mb-1">Win/Loss Analysis</h3>
        <p className="text-slate-400 text-xs mb-4">Factures payées vs annulées — 6 derniers mois</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={winLossData} margin={{ left: -20, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e42" vertical={false} />
            <XAxis dataKey="mois" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              content={({ active, payload, label }: any) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-obsidian-700 border border-card-border rounded-xl p-3">
                      <p className="text-white font-semibold text-xs mb-1">{label}</p>
                      {payload.map((e: any) => (
                        <p key={e.name} className="text-xs" style={{ color: e.fill }}>
                          {e.name} : {e.value}
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend formatter={(v) => <span className="text-slate-400 text-xs">{v}</span>} />
            <Bar dataKey="Gagnés" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Perdus" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Alertes & Monitoring */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <h3 className="font-display font-bold text-white mb-1">Alertes & Monitoring</h3>
        <p className="text-slate-400 text-xs mb-4">Points d'attention nécessitant une action</p>
        <div className="space-y-3">
          {projetsStagnants.length > 0 ? (
            <AlertBanner
              type="warning"
              title={`${projetsStagnants.length} projet${projetsStagnants.length > 1 ? 's' : ''} sans activité depuis + de 7 jours`}
              message={projetsStagnants.slice(0, 3).map(p => p.nom).join(', ') + (projetsStagnants.length > 3 ? '…' : '')}
              action={{ label: 'Voir', onClick: () => setActiveSection('projects') }}
            />
          ) : (
            <AlertBanner
              type="success"
              title="Aucun projet stagnant"
              message="Tous les projets actifs ont eu une activité récente"
            />
          )}

          {invoicesEnRetard.length > 0 ? (
            <AlertBanner
              type="error"
              title={`${invoicesEnRetard.length} facture${invoicesEnRetard.length > 1 ? 's' : ''} en retard de paiement`}
              message={`${montantEnRetard.toLocaleString('fr-FR')} € non encaissés`}
              action={{ label: 'Voir', onClick: () => setActiveSection('invoices') }}
            />
          ) : (
            <AlertBanner
              type="success"
              title="Aucune facture en retard"
              message="Toutes les factures sont à jour"
            />
          )}

          {freelancersInactifs.length > 0 ? (
            <AlertBanner
              type="info"
              title={`${freelancersInactifs.length} prestataire${freelancersInactifs.length > 1 ? 's' : ''} inactif${freelancersInactifs.length > 1 ? 's' : ''}`}
              message={freelancersInactifs.slice(0, 3).map(f => `${f.prenom} ${f.nom}`).join(', ') + (freelancersInactifs.length > 3 ? '…' : '')}
              action={{ label: 'Voir', onClick: () => setActiveSection('freelancers') }}
            />
          ) : (
            <AlertBanner
              type="success"
              title="Tous les prestataires sont actifs"
            />
          )}
        </div>
      </div>

      {/* ═══ STATISTIQUES AVANCÉES ═══════════════════════════════════════════ */}
      <div className="border-t border-card-border my-8" />
      <h2 className="text-xl font-display font-bold text-white mb-6">Statistiques Avancées</h2>

      {/* CA par mois — courbe 12 mois */}
      <div className="bg-card border border-card-border rounded-2xl p-5 mb-6">
        <h3 className="font-display font-bold text-white mb-1">Chiffre d'Affaires par Mois</h3>
        <p className="text-slate-400 text-xs mb-4">Évolution du CA sur 12 mois (factures payées)</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={caParMois} margin={{ left: -20, right: 10 }}>
            <defs>
              <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e42" vertical={false} />
            <XAxis dataKey="mois" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="CA" stroke="#7c3aed" fill="url(#caGradient)" strokeWidth={2} name="CA" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* CA par client Top 10 */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <h3 className="font-display font-bold text-white mb-1">Top 10 Clients par CA</h3>
          <p className="text-slate-400 text-xs mb-4">Chiffre d'affaires total par client</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topClientsCA} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e42" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="nom" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="ca" name="CA" fill="#7c3aed" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition projets par statut */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <h3 className="font-display font-bold text-white mb-1">Projets par Statut</h3>
          <p className="text-slate-400 text-xs mb-4">Répartition des {projects.length} projets</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={projectStatusData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3} dataKey="value">
                {projectStatusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0e0e22', border: '1px solid #1e1e42', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {projectStatusData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                <span className="text-slate-400 text-xs capitalize">{entry.name}</span>
                <span className="text-white text-xs font-semibold ml-auto">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pipeline conversion */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <h3 className="font-display font-bold text-white mb-1">Pipeline Conversion</h3>
          <p className="text-slate-400 text-xs mb-4">Funnel prospect → VIP</p>
          <div className="space-y-3">
            {pipelineData.map(stage => (
              <div key={stage.etape}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">{stage.etape}</span>
                  <span className="text-slate-400">{stage.count} ({stage.pct}%)</span>
                </div>
                <div className="w-full bg-obsidian-900 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(stage.pct, 2)}%`, background: stage.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-card-border flex justify-between text-xs">
            <span className="text-slate-400">Taux de conversion Prospect → Actif/VIP</span>
            <span className="text-accent-green font-bold">
              {clients.length > 0
                ? `${Math.round(((clients.filter(c => c.statut === 'actif' || c.statut === 'vip').length) / clients.length) * 100)}%`
                : '—'}
            </span>
          </div>
        </div>

        {/* Taux occupation freelancers */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <h3 className="font-display font-bold text-white mb-1">Taux d'Occupation Prestataires</h3>
          <p className="text-slate-400 text-xs mb-4">Heures réelles / heures estimées</p>
          <div className="space-y-3">
            {freelancerOccupation.length > 0 ? freelancerOccupation.map(f => (
              <div key={f.nom}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">{f.nom}</span>
                  <span className={`font-semibold ${f.taux > 100 ? 'text-red-400' : f.taux > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {f.taux}%
                  </span>
                </div>
                <div className="w-full bg-obsidian-900 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${f.taux > 100 ? 'bg-red-500' : f.taux > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(f.taux, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">{f.heuresReelles}h réelles / {f.heuresEstimees}h estimées</p>
              </div>
            )) : (
              <p className="text-xs text-slate-500 italic">Aucune donnée d'assignation disponible</p>
            )}
          </div>
        </div>
      </div>

      {/* Budget prévu vs réel */}
      <div className="bg-card border border-card-border rounded-2xl p-5 mb-6">
        <h3 className="font-display font-bold text-white mb-1">Budget Prévu vs Réel</h3>
        <p className="text-slate-400 text-xs mb-4">Comparaison budget / dépenses par projet</p>
        {budgetData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={budgetData} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e42" vertical={false} />
              <XAxis dataKey="nom" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(v) => <span className="text-slate-400 text-xs">{v}</span>} />
              <Bar dataKey="budget" name="Budget prévu" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="depenses" name="Dépenses réelles" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-slate-500 italic">Aucun projet avec budget défini</p>
        )}
      </div>

      {/* Prestataires & Ressources */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <h3 className="font-display font-bold text-white mb-1">Prestataires & Ressources</h3>
        <p className="text-slate-400 text-xs mb-4">Réseau de freelances actifs</p>

        {/* Mini stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-obsidian-800 rounded-xl p-3 text-center">
            <p className="text-slate-400 text-xs mb-1">Total prestataires</p>
            <p className="text-white font-bold text-xl">{freelancers.length}</p>
          </div>
          <div className="bg-obsidian-800 rounded-xl p-3 text-center">
            <p className="text-slate-400 text-xs mb-1">TJM moyen</p>
            <p className="text-white font-bold text-xl">{tjmMoyen.toLocaleString('fr-FR')} €</p>
          </div>
          <div className="bg-obsidian-800 rounded-xl p-3 text-center">
            <p className="text-slate-400 text-xs mb-1">CA total généré</p>
            <p className="text-white font-bold text-xl">{(caTotalPrestataires / 1000).toFixed(1)}k€</p>
          </div>
        </div>

        {/* Top 5 freelancers */}
        <div className="space-y-3">
          {topFreelancers.map((f, index) => {
            const initials = `${(f.prenom || 'F')[0]}${(f.nom || 'L')[0]}`.toUpperCase();
            const color = INITIALS_COLORS[index % INITIALS_COLORS.length];
            return (
              <div key={f.id} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: color }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{f.prenom} {f.nom}</p>
                  <p className="text-slate-500 text-xs truncate capitalize">{f.specialite}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-accent-green text-xs font-bold">{f.totalFacture.toLocaleString('fr-FR')} €</p>
                  <p className="text-slate-500 text-xs">{f.tjm} €/j</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

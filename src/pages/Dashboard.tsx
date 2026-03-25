import React, { useMemo } from 'react';
import {
  Users, FolderKanban, Euro, Clock,
  Moon, AlertCircle, CheckCircle2, Briefcase,
  ArrowUpRight, Activity, Zap, FilePlus2, FileText, Timer, AlertTriangle, TrendingUp,
  Target, CalendarDays
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
import { useStore, selectDashboardStats } from '../store/useStore';
import { useProspectionStore } from '../store/useProspectionStore';
import { StatCard } from '../components/ui/StatCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Badge } from '../components/ui/Badge';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-obsidian-700 border border-card-border rounded-xl p-3 shadow-card">
        <p className="text-white font-semibold text-sm mb-2">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString('fr-FR')} €
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const projectStatusColors: Record<string, string> = {
  'en cours': '#7c3aed',
  'planification': '#06b6d4',
  'en révision': '#f59e0b',
  'terminé': '#10b981',
  'en pause': '#6b7280',
};

export const Dashboard: React.FC = () => {
  const state = useStore();
  const stats = selectDashboardStats(state);
  const { projects, clients, activities, invoices, snoozeSubscriptions, freelancers, timerSessions, settings, setActiveSection, currentUser } = state;

  // Dynamic overdue invoices
  const overdueInvoices = invoices.filter(i => i.statut === 'en retard');
  const pendingInvoicesCount = invoices.filter(i => i.statut === 'envoyée').length;

  // Snooze commissions en attente
  const pendingCommissions = snoozeSubscriptions
    .flatMap(s => s.penalites ?? [])
    .filter(p => p.statut === 'pending')
    .reduce((sum, p) => sum + p.commission, 0);
  const pendingCommissionsCount = snoozeSubscriptions
    .flatMap(s => s.penalites ?? [])
    .filter(p => p.statut === 'pending').length;

  // Projets dont la date de fin est dans les 7 prochains jours
  const today = new Date();
  const in7days = new Date(today.getTime() + 7 * 86400000);
  const upcomingDeadlines = projects.filter(p => {
    if (p.isArchived || p.isDeleted) return false;
    if (!['en cours', 'en révision', 'planification'].includes(p.statut)) return false;
    const d = new Date(p.dateFin);
    return d >= today && d <= in7days;
  });

  // Heures cette semaine via timer sessions
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const hoursThisWeek = timerSessions
    .filter(s => new Date(s.date) >= weekStart)
    .reduce((sum, s) => sum + s.dureeMinutes, 0);
  const hoursThisWeekFormatted = `${Math.floor(hoursThisWeek / 60)}h${hoursThisWeek % 60 > 0 ? `${hoursThisWeek % 60}m` : ''}`;

  // Dynamic KPI trends
  const lastMonthKey = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7) })()
  const thisMonthKey = new Date().toISOString().slice(0, 7)

  const clientsThisMonth = clients.filter(c => c.dateCreation.startsWith(thisMonthKey)).length
  const clientsLastMonth = clients.filter(c => c.dateCreation.startsWith(lastMonthKey)).length
  const clientTrend = clientsLastMonth > 0 ? Math.round(((clientsThisMonth - clientsLastMonth) / clientsLastMonth) * 100) : clientsThisMonth > 0 ? 100 : 0

  const projetsActifsLastMonth = projects.filter(p => p.dateDebut.startsWith(lastMonthKey)).length
  const projetsActifsThisMonth = projects.filter(p => p.dateDebut.startsWith(thisMonthKey)).length
  const projetTrend = projetsActifsLastMonth > 0 ? Math.round(((projetsActifsThisMonth - projetsActifsLastMonth) / projetsActifsLastMonth) * 100) : projetsActifsThisMonth > 0 ? 100 : 0

  const caThisMonth = invoices.filter(i => i.statut === 'payée' && (i.datePaiement ?? i.dateEmission).startsWith(thisMonthKey)).reduce((s, i) => s + i.total, 0)
  const caLastMonth = invoices.filter(i => i.statut === 'payée' && (i.datePaiement ?? i.dateEmission).startsWith(lastMonthKey)).reduce((s, i) => s + i.total, 0)
  const caTrend = caLastMonth > 0 ? Math.round(((caThisMonth - caLastMonth) / caLastMonth) * 100) : caThisMonth > 0 ? 100 : 0

  const snoozeActifsCount = snoozeSubscriptions.filter(s => s.statut === 'actif').length
  const snoozeLastMonth = snoozeSubscriptions.filter(s => s.statut === 'actif' && s.dateDebut.startsWith(lastMonthKey)).length
  const snoozeTrend = snoozeLastMonth > 0 ? Math.round(((snoozeActifsCount - snoozeLastMonth) / snoozeLastMonth) * 100) : snoozeActifsCount > 0 ? 100 : 0

  // ── KPIs enrichis (Addendum 2B) ──────────────────────────────────────────

  // 1. Pipeline prospection
  const prospects = useProspectionStore(s => s.prospects);
  const pipelineCounts = useMemo(() => {
    const cols = ['identifie', 'contacte', 'en_discussion', 'proposition_envoyee', 'signe', 'refuse'] as const;
    const counts: Record<string, number> = {};
    cols.forEach(c => { counts[c] = prospects.filter(p => p.pipelineColumn === c).length; });
    const total = prospects.length || 1;
    return {
      identifie: counts.identifie,
      contacte: counts.contacte,
      signe: counts.signe,
      tauxConversion: prospects.length > 0 ? Math.round((counts.signe / total) * 100) : 0,
    };
  }, [prospects]);

  // 2. CA prévisionnel
  const caPrevisionnel = useMemo(() =>
    projects.filter(p => !p.isArchived && !p.isDeleted && ['en cours', 'planification'].includes(p.statut)).reduce((s, p) => s + p.budget, 0)
  , [projects]);

  // 3. Charge freelancers (tâches actives par freelancer)
  const freelancerChargeData = useMemo(() => {
    const chargeMap = new Map<string, { nom: string; count: number }>();
    projects.forEach(p => {
      p.taches.filter(t => t.statut !== 'fait').forEach(t => {
        // Check assigneAIds first, fallback to assigneA name match
        const ids = t.assigneAIds?.length ? t.assigneAIds : [];
        ids.forEach(fid => {
          const f = freelancers.find(fr => fr.id === fid);
          if (f) {
            const key = f.id;
            const existing = chargeMap.get(key);
            if (existing) existing.count++;
            else chargeMap.set(key, { nom: `${f.prenom.charAt(0)}. ${f.nom}`, count: 1 });
          }
        });
        if (!ids.length && t.assigneA) {
          const f = freelancers.find(fr => `${fr.prenom} ${fr.nom}` === t.assigneA);
          if (f) {
            const key = f.id;
            const existing = chargeMap.get(key);
            if (existing) existing.count++;
            else chargeMap.set(key, { nom: `${f.prenom.charAt(0)}. ${f.nom}`, count: 1 });
          }
        }
      });
    });
    return [...chargeMap.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [projects, freelancers]);

  // 4. Mini calendrier — 5 prochaines échéances
  const upcomingEvents = useMemo(() => {
    const todayStr = today.toISOString().slice(0, 10);
    const events: { date: string; label: string; type: string; section: string }[] = [];

    projects.forEach(p => {
      if (p.dateFin >= todayStr && !['terminé', 'annulé'].includes(p.statut)) {
        events.push({ date: p.dateFin, label: p.nom, type: 'projet', section: 'projects' });
      }
      p.taches?.forEach(t => {
        if (t.dateEcheance >= todayStr && t.statut !== 'fait') {
          events.push({ date: t.dateEcheance, label: t.titre, type: 'tâche', section: 'projects' });
        }
      });
    });
    invoices.forEach(inv => {
      if (inv.dateEcheance >= todayStr && inv.statut !== 'payée' && inv.statut !== 'annulée') {
        events.push({ date: inv.dateEcheance, label: `${inv.numero} — ${inv.clientNom}`, type: 'facture', section: 'invoices' });
      }
    });

    return events.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  }, [projects, invoices, today]);

  // Graphe revenus : 6 derniers mois depuis les vraies factures
  const monthlyChartData = useMemo(() => {
    const months: { mois: string; revenu: number; depenses: number; benefice: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      const revenu = invoices
        .filter(inv => inv.statut === 'payée' && (inv.datePaiement ?? inv.dateEmission).startsWith(key))
        .reduce((sum, inv) => sum + inv.total, 0);
      months.push({ mois: label, revenu, depenses: 0, benefice: revenu });
    }
    return months;
  }, [invoices]);

  // Mapping activité → section
  const activitySectionMap: Record<string, string> = {
    client: 'clients',
    projet: 'projects',
    facture: 'invoices',
    snooze: 'snooze',
  };

  // Pie data for project status
  const projectPieData = Object.entries(
    projects.reduce((acc, p) => {
      acc[p.statut] = (acc[p.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Client sources
  const clientSourceData = Object.entries(
    clients.reduce((acc, c) => {
      acc[c.source] = (acc[c.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const sourceColors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

  const activityTypeIcon: Record<string, React.FC<any>> = {
    client: Users,
    projet: FolderKanban,
    facture: Euro,
    snooze: Moon,
    système: Zap,
  };

  const activityColors: Record<string, string> = {
    client: 'text-accent-cyan',
    projet: 'text-primary-400',
    facture: 'text-accent-green',
    snooze: 'text-accent-orange',
    système: 'text-slate-400',
  };

  return (
    <div className="space-y-6">

      {/* ── Welcome Banner ──────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-r from-primary-500/20 via-obsidian-600 to-accent-cyan/10 border border-primary-500/20 rounded-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500 rounded-full filter blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-cyan rounded-full filter blur-3xl" />
        </div>
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              <span className="text-accent-green text-xs font-semibold uppercase tracking-wider">Tableau de bord actif</span>
            </div>
            <h2 className="font-display font-bold text-white text-2xl">Bonjour, {currentUser?.prenom || settings.nom || ''} 👋</h2>
            <p className="text-slate-400 text-sm mt-1">
              Vous avez <span className="text-white font-semibold">{stats.projetsEnCours} projets en cours</span> et{' '}
              <span className="text-amber-400 font-semibold">
                {overdueInvoices.length > 0
                  ? `${overdueInvoices.length} facture${overdueInvoices.length > 1 ? 's' : ''} en retard`
                  : 'aucune facture en retard'}
              </span>
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-slate-400 text-xs">MRR Snooze</p>
              <p className="font-display font-bold text-white text-xl">
                {stats.revenusSnooze.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </p>
            </div>
            <div className="w-px h-12 bg-card-border" />
            <div className="text-right">
              <p className="text-slate-400 text-xs">CA ce mois</p>
              <p className="font-display font-bold text-accent-green text-xl">
                {stats.chiffreAffairesMois.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Clients"
          value={stats.totalClients}
          subtitle={`${stats.clientsVIP} VIP · ${stats.clientsActifs} actifs`}
          icon={Users}
          trend={{ value: clientTrend, label: 'vs mois dernier' }}
          color="cyan"
        />
        <StatCard
          title="Projets Actifs"
          value={stats.projetsEnCours}
          subtitle={`${stats.totalProjets} projets total`}
          icon={FolderKanban}
          trend={{ value: projetTrend, label: 'vs mois dernier' }}
          color="purple"
        />
        <StatCard
          title="CA du Mois"
          value={`${stats.chiffreAffairesMois.toLocaleString('fr-FR')} €`}
          subtitle="Factures encaissées"
          icon={Euro}
          trend={{ value: caTrend, label: 'vs mois dernier' }}
          color="green"
        />
        <StatCard
          title="Abonnés Snooze"
          value={stats.snoozesActifs}
          subtitle={`MRR: $${stats.revenusSnooze.toFixed(2)}`}
          icon={Moon}
          trend={{ value: snoozeTrend, label: 'vs mois dernier' }}
          color="orange"
        />
      </div>

      {/* ── Alerte factures en retard (amber banner) ─────────────────────── */}
      {stats.facturesEnRetard > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm">
            <span className="font-bold">{stats.facturesEnRetard.toLocaleString('fr-FR')} €</span> de factures en retard de paiement
          </p>
          <button onClick={() => setActiveSection('invoices')} className="ml-auto text-xs text-amber-400 hover:text-amber-300 underline">
            Voir →
          </button>
        </div>
      )}

      {/* ── Quick Actions ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: FileText,  label: 'Nouvelle facture',  sub: 'Créer & envoyer',  section: 'documents', color: 'text-accent-green',  bg: 'bg-accent-green/10',  border: 'border-accent-green/20' },
          { icon: FilePlus2, label: 'Nouveau devis',     sub: 'Générer depuis CRM', section: 'documents', color: 'text-accent-cyan', bg: 'bg-accent-cyan/10',   border: 'border-accent-cyan/20' },
          { icon: Users,     label: 'Ajouter client',    sub: 'CRM enrichi',       section: 'clients',   color: 'text-primary-400', bg: 'bg-primary-500/10',   border: 'border-primary-500/20' },
          { icon: Timer,     label: 'Démarrer timer',    sub: 'Suivre le temps',   section: 'worktracking', color: 'text-amber-400', bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
        ].map(a => {
          const Icon = a.icon;
          return (
            <button
              key={a.section + a.label}
              onClick={() => setActiveSection(a.section)}
              className={`flex items-center gap-3 p-3.5 rounded-xl border ${a.bg} ${a.border} hover:scale-[1.02] transition-all text-left group`}
            >
              <div className={`w-9 h-9 rounded-xl ${a.bg} border ${a.border} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${a.color}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${a.color} truncate`}>{a.label}</p>
                <p className="text-[10px] text-slate-500">{a.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Alertes ─────────────────────────────────────────────────────── */}
      {overdueInvoices.length > 0 && (
        <div className="flex items-center gap-3 bg-accent-red/10 border border-accent-red/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-accent-red flex-shrink-0" />
          <div>
            <p className="text-red-400 font-semibold text-sm">
              {overdueInvoices.length} facture{overdueInvoices.length > 1 ? 's' : ''} en retard de paiement
            </p>
            <p className="text-slate-400 text-xs">
              {stats.facturesEnRetard.toLocaleString('fr-FR')} € dus —{' '}
              {overdueInvoices.map(i => i.clientNom).join(', ')}
            </p>
          </div>
          <button
            onClick={() => setActiveSection('invoices')}
            className="ml-auto text-xs text-red-400 hover:text-red-300 font-medium border border-accent-red/30 px-3 py-1.5 rounded-lg hover:bg-accent-red/10 transition-all whitespace-nowrap"
          >
            Voir les factures →
          </button>
        </div>
      )}
      {pendingInvoicesCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
          <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm">
            <span className="font-semibold">{pendingInvoicesCount} facture{pendingInvoicesCount > 1 ? 's' : ''} envoyée{pendingInvoicesCount > 1 ? 's' : ''}</span> en attente de règlement (
            {stats.facturesEnAttente.toLocaleString('fr-FR')} €)
          </p>
          <button onClick={() => setActiveSection('invoices')} className="ml-auto text-xs text-amber-400 hover:text-amber-300 font-medium whitespace-nowrap">
            Voir →
          </button>
        </div>
      )}

      {/* ── Alerte commissions Snooze en attente ─────────────────────────── */}
      {pendingCommissionsCount > 0 && (
        <div className="flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl px-4 py-3">
          <Moon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <div>
            <p className="text-cyan-300 text-sm font-semibold">
              {pendingCommissionsCount} commission{pendingCommissionsCount > 1 ? 's' : ''} Pay to Snooze en attente de capture
            </p>
            <p className="text-slate-400 text-xs">{pendingCommissions.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} à percevoir</p>
          </div>
          <button onClick={() => setActiveSection('snooze')} className="ml-auto text-xs text-cyan-400 hover:text-cyan-300 font-medium border border-cyan-500/30 px-3 py-1.5 rounded-lg hover:bg-cyan-500/10 transition-all whitespace-nowrap">
            Voir commissions →
          </button>
        </div>
      )}

      {/* ── Alertes deadlines proches ─────────────────────────────────────── */}
      {upcomingDeadlines.length > 0 && (
        <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3">
          <Clock className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <div>
            <p className="text-orange-300 text-sm font-semibold">
              {upcomingDeadlines.length} projet{upcomingDeadlines.length > 1 ? 's' : ''} à livrer dans les 7 jours
            </p>
            <p className="text-slate-400 text-xs">{upcomingDeadlines.map(p => p.nom).join(', ')}</p>
          </div>
          <button onClick={() => setActiveSection('projects')} className="ml-auto text-xs text-orange-400 hover:text-orange-300 font-medium border border-orange-500/30 px-3 py-1.5 rounded-lg hover:bg-orange-500/10 transition-all whitespace-nowrap">
            Voir projets →
          </button>
        </div>
      )}

      {/* ── Charts Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-bold text-white">Revenus — 6 derniers mois</h3>
              <p className="text-slate-400 text-xs">Factures marquées comme payées</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300"><span className="w-3 h-0.5 bg-primary-400 inline-block rounded" /> Revenus</span>
              <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-0.5 bg-accent-cyan/60 inline-block rounded" /> Dépenses</span>
              <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-0.5 bg-accent-green/60 inline-block rounded" /> Bénéfice</span>
            </div>
          </div>
          {monthlyChartData.every(m => m.revenu === 0) ? (
            <div className="flex flex-col items-center justify-center h-[220px] text-slate-500">
              <TrendingUp className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm font-medium">Aucune donnée de revenus</p>
              <p className="text-xs text-slate-600 mt-1">Créez et marquez des factures comme payées pour voir les tendances</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="depGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="benGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e42" vertical={false} />
                <XAxis dataKey="mois" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenu"   name="Revenus"  stroke="#7c3aed" strokeWidth={2} fill="url(#revGradient)" dot={false} activeDot={{ r: 5, fill: '#7c3aed' }} />
                <Area type="monotone" dataKey="depenses" name="Dépenses" stroke="#06b6d4" strokeWidth={1.5} fill="url(#depGradient)" dot={false} activeDot={{ r: 4, fill: '#06b6d4' }} strokeDasharray="4 2" />
                <Area type="monotone" dataKey="benefice" name="Bénéfice" stroke="#10b981" strokeWidth={2} fill="url(#benGradient)" dot={false} activeDot={{ r: 5, fill: '#10b981' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Project Status Pie + Client Sources */}
        <div className="bg-card border border-card-border rounded-2xl p-5 flex flex-col gap-5">
          {/* Project status */}
          <div>
            <h3 className="font-display font-bold text-white text-sm mb-3">Statut Projets</h3>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={projectPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                  {projectPieData.map((entry) => (
                    <Cell key={entry.name} fill={projectStatusColors[entry.name] || '#6b7280'} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ background: '#0e0e22', border: '1px solid #1e1e42', borderRadius: '8px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5">
              {projectPieData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: projectStatusColors[entry.name] || '#6b7280' }} />
                    <span className="text-slate-400 text-xs capitalize">{entry.name}</span>
                  </div>
                  <span className="text-white text-xs font-semibold">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-card-border" />

          {/* Client sources */}
          <div>
            <h3 className="font-display font-bold text-white text-sm mb-3">Sources Clients</h3>
            <div className="space-y-2">
              {clientSourceData.sort((a, b) => b.value - a.value).map((entry, i) => (
                <div key={entry.name}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-slate-400 text-xs capitalize">{entry.name}</span>
                    <span className="text-white text-xs font-semibold">{entry.value}</span>
                  </div>
                  <div className="h-1.5 bg-obsidian-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${clients.length > 0 ? (entry.value / clients.length) * 100 : 0}%`,
                        background: sourceColors[i % sourceColors.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Projects Progress + Activities ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Active Projects */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-white">Projets Actifs</h3>
            <button onClick={() => setActiveSection('projects')} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
              Voir tout <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {(() => {
              const activeProjects = projects.filter(p => !p.isArchived && !p.isDeleted && ['en cours', 'en révision', 'planification'].includes(p.statut)).slice(0, 4);
              if (activeProjects.length === 0) {
                return (
                  <div className="py-10 text-center">
                    <FolderKanban className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Aucun projet actif</p>
                    <button onClick={() => setActiveSection('projects')} className="mt-2 text-xs text-primary-400 hover:text-primary-300 transition-colors">
                      Créer un projet →
                    </button>
                  </div>
                );
              }
              const priorityColor: Record<string, string> = { urgente: 'error', haute: 'warning', normale: 'info', faible: 'default' };
              const barColor: Record<string, 'purple' | 'cyan' | 'green' | 'orange'> = { urgente: 'orange', haute: 'orange', normale: 'purple', faible: 'cyan' };
              const nowMs = Date.now();
              return activeProjects.map((project) => {
                const isProjectLate = new Date(project.dateFin).getTime() < nowMs;
                const daysLate = isProjectLate
                  ? Math.max(0, Math.floor((nowMs - new Date(project.dateFin).getTime()) / (1000 * 60 * 60 * 24)))
                  : 0;
                return (
                  <button
                    key={project.id}
                    onClick={() => setActiveSection('projects')}
                    className={`w-full text-left p-3 bg-obsidian-700 rounded-xl border hover:bg-obsidian-600 transition-all group ${isProjectLate ? 'border-amber-500/30 hover:border-amber-500/50' : 'border-card-border/50 hover:border-primary-500/30'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white text-sm font-semibold truncate group-hover:text-primary-300 transition-colors">{project.nom}</p>
                          {isProjectLate && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {daysLate > 0 ? `${daysLate}j retard` : 'Retard'}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs">{project.clientNom} · échéance {new Date(project.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <Badge variant={priorityColor[project.priorite] as any}>{project.priorite}</Badge>
                    </div>
                    <ProgressBar value={project.progression} color={barColor[project.priorite]} size="sm" />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500">
                        {project.taches.filter(t => t.statut === 'fait').length}/{project.taches.length} tâches · {project.budget > 0 ? `${((project.depenses / project.budget) * 100).toFixed(0)}% budget` : ''}
                      </span>
                      <span className="text-xs font-semibold text-white">{project.progression}%</span>
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-bold text-white">Activités Récentes</h3>
              <p className="text-slate-500 text-xs">{activities.length} événement{activities.length !== 1 ? 's' : ''} enregistré{activities.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" />
            </div>
          </div>
          {activities.length === 0 ? (
            <div className="py-10 text-center">
              <Activity className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Aucune activité récente</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {activities.slice(0, 7).map((activity) => {
                const Icon = activityTypeIcon[activity.type] || Zap;
                const targetSection = activitySectionMap[activity.type];
                return (
                  <button
                    key={activity.id}
                    onClick={() => targetSection && setActiveSection(targetSection)}
                    className={`w-full flex items-start gap-3 py-2.5 border-b border-card-border/30 last:border-0 text-left rounded-lg px-1 transition-colors ${targetSection ? 'hover:bg-obsidian-700/50 cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`w-7 h-7 rounded-lg bg-obsidian-700 border border-card-border flex items-center justify-center flex-shrink-0 mt-0.5 ${activityColors[activity.type]}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold">{activity.titre}</p>
                      <p className="text-slate-400 text-xs truncate">{activity.description}</p>
                    </div>
                    <p className="text-slate-500 text-xs whitespace-nowrap flex-shrink-0 mt-0.5">
                      {new Date(activity.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
          {activities.length > 7 && (
            <p className="text-center text-slate-600 text-xs mt-3">
              + {activities.length - 7} autre{activities.length - 7 !== 1 ? 's' : ''} activité{activities.length - 7 !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* ── KPIs Enrichis ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="CA Prévisionnel"
          value={caPrevisionnel >= 1000 ? `${(caPrevisionnel / 1000).toFixed(1)}k€` : `${caPrevisionnel}€`}
          subtitle="Projets en cours + planification"
          icon={Target}
          color="purple"
        />
        <StatCard
          title="Conversion Prospection"
          value={`${pipelineCounts.tauxConversion}%`}
          subtitle={`${pipelineCounts.signe} signé${pipelineCounts.signe > 1 ? 's' : ''} / ${prospects.length} prospects`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Pipeline Actif"
          value={pipelineCounts.contacte + pipelineCounts.identifie}
          subtitle={`${pipelineCounts.identifie} identifiés · ${pipelineCounts.contacte} contactés`}
          icon={Users}
          color="cyan"
        />
        <StatCard
          title="Prochaines Échéances"
          value={upcomingEvents.length}
          subtitle={upcomingEvents.length > 0 ? `Prochaine: ${new Date(upcomingEvents[0].date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : 'Aucune échéance'}
          icon={CalendarDays}
          color="orange"
        />
      </div>

      {/* ── Charge Freelancers + Mini Calendrier ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charge par freelancer */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <h3 className="font-display font-bold text-white mb-1">Charge Prestataires</h3>
          <p className="text-slate-400 text-xs mb-4">Tâches actives par freelancer</p>
          {freelancerChargeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={freelancerChargeData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e42" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="nom" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ background: '#0e0e22', border: '1px solid #1e1e42', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Bar dataKey="count" name="Tâches" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-slate-500">
              <Briefcase className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">Aucune tâche assignée</p>
            </div>
          )}
        </div>

        {/* Mini calendrier — 5 prochaines échéances */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-white">Prochaines Échéances</h3>
              <p className="text-slate-400 text-xs">5 prochains événements</p>
            </div>
            <button onClick={() => setActiveSection('calendar')} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
              Calendrier <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map((ev, i) => {
                const typeColor = ev.type === 'projet' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : ev.type === 'facture' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
                const dotColor = ev.type === 'projet' ? 'bg-purple-500' : ev.type === 'facture' ? 'bg-emerald-500' : 'bg-cyan-500';
                return (
                  <button
                    key={`${ev.type}-${i}`}
                    onClick={() => setActiveSection(ev.section)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-obsidian-700/50 transition-colors text-left group"
                  >
                    <div className="text-center flex-shrink-0 w-10">
                      <p className="text-white text-sm font-bold leading-tight">{new Date(ev.date + 'T00:00:00').getDate()}</p>
                      <p className="text-slate-500 text-[10px] uppercase">{new Date(ev.date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })}</p>
                    </div>
                    <div className={`w-1 h-8 rounded-full ${dotColor} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate group-hover:text-primary-300 transition-colors">{ev.label}</p>
                      <p className="text-slate-500 text-[10px] capitalize">{ev.type}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-slate-500">
              <CalendarDays className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">Aucune échéance à venir</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Stats Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveSection('projects')}
          className="bg-card border border-card-border rounded-2xl p-4 text-center hover:border-accent-green/30 transition-colors group"
        >
          <CheckCircle2 className="w-6 h-6 text-accent-green mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-2xl font-display font-bold text-white">{stats.projetsTermines}</p>
          <p className="text-xs text-slate-400">Projets livrés</p>
        </button>
        <button
          onClick={() => setActiveSection('invoices')}
          className="bg-card border border-card-border rounded-2xl p-4 text-center hover:border-amber-500/30 transition-colors group"
        >
          <Euro className="w-6 h-6 text-amber-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-2xl font-display font-bold text-white">
            {stats.facturesEnAttente >= 1000
              ? `${(stats.facturesEnAttente / 1000).toFixed(1)}k€`
              : `${stats.facturesEnAttente.toFixed(0)}€`}
          </p>
          <p className="text-xs text-slate-400">Factures en attente</p>
        </button>
        <button
          onClick={() => setActiveSection('worktracking')}
          className="bg-card border border-card-border rounded-2xl p-4 text-center hover:border-accent-cyan/30 transition-colors group"
        >
          <Clock className="w-6 h-6 text-accent-cyan mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-2xl font-display font-bold text-white">
            {hoursThisWeek > 0 ? hoursThisWeekFormatted : `${projects.reduce((s, p) => s + p.taches.reduce((ts, t) => ts + t.heuresReelles, 0), 0)}h`}
          </p>
          <p className="text-xs text-slate-400">{hoursThisWeek > 0 ? 'Heures cette semaine' : 'Heures travaillées'}</p>
        </button>
        <button
          onClick={() => setActiveSection('freelancers')}
          className="bg-card border border-card-border rounded-2xl p-4 text-center hover:border-primary-500/30 transition-colors group"
        >
          <Briefcase className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-2xl font-display font-bold text-white">{freelancers.filter(f => f.statut !== 'inactif').length}</p>
          <p className="text-xs text-slate-400">Prestataires actifs</p>
          <p className="text-xs text-slate-600">{freelancers.length} total</p>
        </button>
      </div>
    </div>
  );
};

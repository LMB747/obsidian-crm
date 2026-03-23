import React, { useState, useMemo, useCallback } from 'react';
import {
  Moon, Plus, Eye, TrendingUp, DollarSign, Users, Percent,
  AlertCircle, Check, X, Clock, ChevronRight, Award,
  Search, Filter, Download, Bell, Zap, BarChart3,
  ArrowUpRight, ArrowDownRight, RefreshCw, Edit3, Trash2,
  CreditCard, Activity, Star, Target, Settings,
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store/useStore';
import { SnoozeSubscription, SnoozePlan, SnoozeStatus, SnoozePenalite, SnoozeCycle, SnoozeEvent } from '../types';
import { Modal } from '../components/ui/Modal';
import { v4 as uuidv4 } from 'uuid';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_PLANS: SnoozePlan[] = ['freemium', 'premium_monthly', 'premium_annual'];

const safePlan = (plan: string): SnoozePlan =>
  VALID_PLANS.includes(plan as SnoozePlan) ? (plan as SnoozePlan) : 'freemium';

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
};

const formatDateShort = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  } catch { return d; }
};

const formatUSD = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const getInitials = (name: string) =>
  name.split(' ').map(p => p[0] ?? '').join('').toUpperCase().slice(0, 2);

const platformIcon = (p?: 'ios' | 'android' | 'web') => {
  if (p === 'ios') return '🍎';
  if (p === 'android') return '🤖';
  if (p === 'web') return '🌐';
  return '—';
};

const actionLabel: Record<string, string> = {
  activation: 'Activation',
  snooze: 'Snooze utilisé',
  réveil: 'Réveil',
  annulation: 'Annulation',
  renouvellement: 'Renouvellement',
  upgrade: 'Upgrade',
  downgrade: 'Downgrade',
  penalite: 'Pénalité',
};

// ─── Style maps (toujours valides même si plan inconnu) ───────────────────────

const planStyle: Record<SnoozePlan, { label: string; color: string; bg: string; border: string; dot: string; price: string }> = {
  freemium: {
    label: 'Freemium',
    color: 'text-slate-300',
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
    price: '$0/mois',
  },
  premium_monthly: {
    label: 'Premium Mensuel',
    color: 'text-primary-300',
    bg: 'bg-primary-500/15',
    border: 'border-primary-500/30',
    dot: 'bg-primary-400',
    price: '$9.99/mois',
  },
  premium_annual: {
    label: 'Premium Annuel',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/30',
    dot: 'bg-cyan-400',
    price: '$89.99/an',
  },
};

const statutStyle: Record<SnoozeStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  actif: { label: 'Actif', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  'en attente': { label: 'En attente', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  expiré: { label: 'Expiré', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', dot: 'bg-red-500' },
  annulé: { label: 'Annulé', color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/30', dot: 'bg-slate-500' },
};

const penaliteStyle: Record<SnoozePenalite['statut'], { label: string; color: string; bg: string; border: string }> = {
  pending: { label: 'En attente', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
  captured: { label: 'Capturée', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  refunded: { label: 'Remboursée', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
};

const eventDot: Record<string, string> = {
  activation: 'bg-emerald-500',
  snooze: 'bg-cyan-500',
  réveil: 'bg-amber-500',
  annulation: 'bg-red-500',
  renouvellement: 'bg-primary-500',
  upgrade: 'bg-cyan-400',
  downgrade: 'bg-orange-500',
  penalite: 'bg-pink-500',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const PlanBadge: React.FC<{ plan: string }> = ({ plan }) => {
  const s = planStyle[safePlan(plan)];
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold border', s.color, s.bg, s.border)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
};

const StatutBadge: React.FC<{ statut: string }> = ({ statut }) => {
  const s = statutStyle[statut as SnoozeStatus] ?? statutStyle['annulé'];
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold border', s.color, s.bg, s.border)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
};

const PenaliteBadge: React.FC<{ statut: SnoozePenalite['statut'] }> = ({ statut }) => {
  const s = penaliteStyle[statut];
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border', s.color, s.bg, s.border)}>
      {s.label}
    </span>
  );
};

// ─── MiniChart (CSS bars) ─────────────────────────────────────────────────────

const MiniChart: React.FC<{ data: { label: string; mrr: number; commissions: number }[] }> = ({ data }) => {
  const maxVal = Math.max(...data.map(d => d.mrr + d.commissions), 1);
  return (
    <div className="flex items-end gap-1.5 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-full flex flex-col-reverse gap-px" style={{ height: '52px' }}>
            <div
              className="w-full bg-cyan-500/70 rounded-t-sm transition-all"
              style={{ height: `${(d.commissions / maxVal) * 100}%`, minHeight: d.commissions > 0 ? '2px' : '0' }}
              title={`Commissions: ${formatUSD(d.commissions)}`}
            />
            <div
              className="w-full bg-primary-500/70 rounded-t-sm transition-all"
              style={{ height: `${(d.mrr / maxVal) * 100}%`, minHeight: d.mrr > 0 ? '2px' : '0' }}
              title={`MRR: ${formatUSD(d.mrr)}`}
            />
          </div>
          <span className="text-[9px] text-slate-600">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const PayToSnooze: React.FC = () => {
  const { snoozeSubscriptions, addSnoozeSubscription, updateSnoozeSubscription, settings } = useStore();

  // ── UI State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'abonnements' | 'commissions' | 'analytiques' | 'revenuecat'>('abonnements');
  const [selectedSub, setSelectedSub] = useState<SnoozeSubscription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPenaliteModalOpen, setIsPenaliteModalOpen] = useState(false);
  const [penaliteTargetSub, setPenaliteTargetSub] = useState<SnoozeSubscription | null>(null);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState<SnoozePlan | 'tous'>('tous');
  const [filterStatut, setFilterStatut] = useState<SnoozeStatus | 'tous'>('tous');

  // ── New subscription form ──────────────────────────────────────────────────
  const [newSub, setNewSub] = useState({
    utilisateur: '', email: '', plan: 'freemium' as SnoozePlan,
    plateforme: 'web' as 'ios' | 'android' | 'web', revenueCatId: '', notes: '',
  });

  // ── RevenueCat sync ────────────────────────────────────────────────────────
  const [rcSyncing, setRcSyncing] = useState(false);
  const [rcSyncResult, setRcSyncResult] = useState<{ synced: number; errors: number; timestamp: string } | null>(null);

  // ── New penalty form ───────────────────────────────────────────────────────
  const [newPenalite, setNewPenalite] = useState({
    montant: '', description: '', statut: 'pending' as SnoozePenalite['statut'],
  });

  // ── Computed stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const subs = snoozeSubscriptions.map(s => ({ ...s, plan: safePlan(s.plan) }));
    const actifs = subs.filter(s => s.statut === 'actif');
    const premium = actifs.filter(s => s.plan !== 'freemium');

    const mrr =
      actifs.filter(s => s.plan === 'premium_monthly').length * 9.99 +
      actifs.filter(s => s.plan === 'premium_annual').length * 7.50;
    const arr = mrr * 12;

    const allP = subs.flatMap(s => s.penalites ?? []);
    const commissionsCaptured = allP.filter(p => p.statut === 'captured').reduce((a, p) => a + p.commission, 0);
    const commissionsPending  = allP.filter(p => p.statut === 'pending').reduce((a, p) => a + p.commission, 0);
    const totalPenalties = allP.reduce((a, p) => a + p.montantPenalite, 0);

    const tauxPremium = subs.length > 0 ? (premium.length / subs.length) * 100 : 0;
    const freemiumCount = subs.filter(s => s.plan === 'freemium').length;
    const monthlyCount  = subs.filter(s => s.plan === 'premium_monthly').length;
    const annualCount   = subs.filter(s => s.plan === 'premium_annual').length;

    return {
      total: subs.length, actifs: actifs.length,
      mrr, arr, commissionsCaptured, commissionsPending, totalPenalties,
      tauxPremium, freemiumCount, monthlyCount, annualCount,
      churn: subs.filter(s => s.statut === 'expiré' || s.statut === 'annulé').length,
    };
  }, [snoozeSubscriptions]);

  // ── Filtered subs ──────────────────────────────────────────────────────────
  const filteredSubs = useMemo(() => {
    let list = snoozeSubscriptions.map(s => ({ ...s, plan: safePlan(s.plan) as SnoozePlan }));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.utilisateur.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.revenueCatId ?? '').toLowerCase().includes(q)
      );
    }
    if (filterPlan !== 'tous') list = list.filter(s => s.plan === filterPlan);
    if (filterStatut !== 'tous') list = list.filter(s => s.statut === filterStatut);
    return list;
  }, [snoozeSubscriptions, search, filterPlan, filterStatut]);

  // ── All penalties sorted ───────────────────────────────────────────────────
  const allPenalites = useMemo(() =>
    snoozeSubscriptions
      .flatMap(s => (s.penalites ?? []).map(p => ({ ...p, utilisateur: s.utilisateur, subId: s.id })))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [snoozeSubscriptions]
  );

  // ── RevenueCat stats ───────────────────────────────────────────────────────
  const rcStats = useMemo(() => {
    const withRc = snoozeSubscriptions.filter(s => !!s.revenueCatId);
    return {
      total: withRc.length, connected: withRc.length > 0,
      ios: withRc.filter(s => s.plateforme === 'ios').length,
      android: withRc.filter(s => s.plateforme === 'android').length,
      web: withRc.filter(s => s.plateforme === 'web').length,
    };
  }, [snoozeSubscriptions]);

  // ── Real monthly data for chart ───────────────────────────────────────────
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i), 1)
      const key = d.toISOString().slice(0, 7) // "2026-03"
      const label = d.toLocaleDateString('fr-FR', { month: 'short' })

      // MRR : somme montantMensuel des abonnements actifs au moment M
      // Approximation : utiliser les abonnements actifs dont dateDebut <= key
      const mrr = snoozeSubscriptions
        .filter(s => s.statut === 'actif' && s.plan !== 'freemium' && s.dateDebut <= key + '-31')
        .reduce((sum, s) => sum + s.montantMensuel, 0)

      // Commissions capturées ce mois
      const commissions = snoozeSubscriptions
        .flatMap(s => s.penalites ?? [])
        .filter(p => p.statut === 'captured' && p.date.startsWith(key))
        .reduce((sum, p) => sum + p.commission, 0)

      return { label, mrr: Math.round(mrr * 100) / 100, commissions: Math.round(commissions * 100) / 100 }
    })
  }, [snoozeSubscriptions]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleSubmitSub = (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    const renewal = newSub.plan === 'premium_annual'
      ? new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
      : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const montantMensuel = newSub.plan === 'freemium' ? 0 : newSub.plan === 'premium_monthly' ? 9.99 : 7.50;
    const cycle: SnoozeCycle = newSub.plan === 'freemium' ? 'free' : newSub.plan === 'premium_annual' ? 'annual' : 'monthly';
    addSnoozeSubscription({
      utilisateur: newSub.utilisateur, email: newSub.email,
      plan: newSub.plan, cycle, statut: 'actif',
      dateDebut: today, dateRenouvellement: renewal,
      montantMensuel, snoozesUtilises: 0,
      snoozesDisponibles: newSub.plan === 'freemium' ? 2 : -1,
      penalites: [],
      historique: [{ id: uuidv4(), date: today, action: 'activation', details: `Abonnement ${planStyle[newSub.plan].label} activé`, montant: montantMensuel }],
      revenueCatId: newSub.revenueCatId || undefined,
      plateforme: newSub.plateforme,
      notes: newSub.notes,
    });
    setIsModalOpen(false);
    setNewSub({ utilisateur: '', email: '', plan: 'freemium', plateforme: 'web', revenueCatId: '', notes: '' });
  };

  const handleAddPenalite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!penaliteTargetSub) return;
    const montant = parseFloat(newPenalite.montant);
    if (isNaN(montant) || montant <= 0) return;
    const commission = Math.round(montant * 0.05 * 100) / 100;
    const today = new Date().toISOString().split('T')[0];
    const newP: SnoozePenalite = {
      id: uuidv4(), date: today,
      montantPenalite: montant, commission,
      statut: newPenalite.statut,
      description: newPenalite.description || 'Pénalité snooze',
    };
    const updatedSub = {
      ...penaliteTargetSub,
      penalites: [...(penaliteTargetSub.penalites ?? []), newP],
      historique: [
        ...(penaliteTargetSub.historique ?? []),
        { id: uuidv4(), date: today, action: 'penalite' as const, details: `${newP.description} — commission ${formatUSD(commission)}`, montant: commission },
      ],
    };
    updateSnoozeSubscription(penaliteTargetSub.id, { penalites: updatedSub.penalites, historique: updatedSub.historique });
    if (selectedSub?.id === penaliteTargetSub.id) setSelectedSub(updatedSub);
    setIsPenaliteModalOpen(false);
    setPenaliteTargetSub(null);
    setNewPenalite({ montant: '', description: '', statut: 'pending' });
  };

  const handleRCSync = async () => {
    if (!settings.revenueCatApiKey) return;
    setRcSyncing(true);
    setRcSyncResult(null);
    const subsWithRC = snoozeSubscriptions.filter(s => !!s.revenueCatId);
    let synced = 0, errors = 0;

    for (const sub of subsWithRC) {
      try {
        const res = await fetch(
          `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(sub.revenueCatId!)}`,
          { headers: { Authorization: `Bearer ${settings.revenueCatApiKey}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const entitlements: Record<string, any> = data.subscriber?.entitlements ?? {};
          const subscriptions: Record<string, any> = data.subscriber?.subscriptions ?? {};
          const now = new Date();

          // Est-ce qu'il a une entitlement active ?
          const hasActive = Object.values(entitlements).some(
            (e: any) => e.expires_date === null || new Date(e.expires_date) > now
          );

          // Déduire le plan depuis les product IDs
          const subKeys = Object.keys(subscriptions);
          let newPlan: SnoozePlan = hasActive ? 'premium_monthly' : 'freemium';
          for (const key of subKeys) {
            const kl = key.toLowerCase();
            if (kl.includes('annual') || kl.includes('yearly') || kl.includes('year')) {
              newPlan = 'premium_annual';
              break;
            }
          }
          if (!hasActive) newPlan = 'freemium';

          const newCycle: SnoozeCycle = newPlan === 'premium_annual' ? 'annual' : newPlan === 'premium_monthly' ? 'monthly' : 'free';
          const newStatut: SnoozeStatus = hasActive ? 'actif' : (sub.statut === 'actif' ? 'expiré' : sub.statut);

          updateSnoozeSubscription(sub.id, { plan: newPlan, cycle: newCycle, statut: newStatut });
          synced++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    setRcSyncResult({ synced, errors, timestamp: new Date().toLocaleTimeString('fr-FR') });
    setRcSyncing(false);
  };

  const toggleStatut = useCallback((sub: SnoozeSubscription) => {
    const next: SnoozeStatus = sub.statut === 'actif' ? 'annulé' : 'actif';
    updateSnoozeSubscription(sub.id, { statut: next });
    if (selectedSub?.id === sub.id) setSelectedSub(prev => prev ? { ...prev, statut: next } : null);
  }, [selectedSub, updateSnoozeSubscription]);

  const openPenaliteModal = (sub: SnoozeSubscription) => {
    setPenaliteTargetSub(sub);
    setIsPenaliteModalOpen(true);
  };

  const handleCapturePenalite = (sub: SnoozeSubscription, penalite: SnoozePenalite) => {
    const updatedPenalites = (sub.penalites ?? []).map(p =>
      p.id === penalite.id ? { ...p, statut: 'captured' as const } : p
    )
    const histEntry: SnoozeEvent = {
      id: uuidv4(),
      date: new Date().toISOString().split('T')[0],
      action: 'penalite' as const,
      details: `Commission capturée : ${formatUSD(penalite.commission)}`,
      montant: penalite.commission,
    }
    const updatedHistorique = [...(sub.historique ?? []), histEntry]
    updateSnoozeSubscription(sub.id, { penalites: updatedPenalites, historique: updatedHistorique })
    setSelectedSub(prev => prev ? { ...prev, penalites: updatedPenalites, historique: updatedHistorique } : null)
  }

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    const BOM = '\uFEFF';
    const headers = ['Utilisateur', 'Email', 'Plan', 'Statut', 'Snoozes utilisés', 'Commission ($)', 'Depuis', 'Renouvellement', 'RevenueCat ID', 'Plateforme'];
    const rows = snoozeSubscriptions.map(s => {
      const commission = (s.penalites ?? []).filter(p => p.statut === 'captured').reduce((a, p) => a + p.commission, 0);
      return [s.utilisateur, s.email, planStyle[safePlan(s.plan)].label, s.statut, s.snoozesUtilises, commission.toFixed(2), s.dateDebut, s.dateRenouvellement, s.revenueCatId ?? '', s.plateforme ?? ''];
    });
    const csv = BOM + [headers, ...rows].map(r => r.join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `pay-to-snooze-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-6">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Moon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-2xl">Pay to Snooze</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Abonnements · Commissions · Analytics
              {stats.commissionsPending > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-400 text-xs font-semibold">
                  <Bell className="w-3 h-3" />
                  {formatUSD(stats.commissionsPending)} en attente
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 bg-card border border-card-border text-slate-300 text-sm font-medium px-3 py-2.5 rounded-xl hover:bg-obsidian-600 hover:text-white transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary-500/25"
          >
            <Plus className="w-4 h-4" />
            Nouvel abonnement
          </button>
        </div>
      </div>

      {/* ══ KPI ROW ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Abonnés actifs */}
        <div className="bg-card border border-card-border rounded-2xl p-4 hover:border-emerald-500/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400/60" />
          </div>
          <p className="text-xl font-display font-bold text-white">{stats.actifs}</p>
          <p className="text-slate-400 text-xs mt-0.5">Actifs</p>
          <p className="text-slate-600 text-xs">{stats.total} total · {stats.churn} churn</p>
        </div>

        {/* MRR */}
        <div className="bg-card border border-card-border rounded-2xl p-4 hover:border-primary-500/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-primary-300" />
            </div>
            <TrendingUp className="w-3.5 h-3.5 text-primary-300/60" />
          </div>
          <p className="text-xl font-display font-bold text-white">{formatUSD(stats.mrr)}</p>
          <p className="text-slate-400 text-xs mt-0.5">MRR</p>
          <p className="text-slate-600 text-xs">ARR {formatUSD(stats.arr)}</p>
        </div>

        {/* Commissions capturées */}
        <div className="bg-card border border-card-border rounded-2xl p-4 hover:border-cyan-500/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <Check className="w-3.5 h-3.5 text-cyan-400/60" />
          </div>
          <p className="text-xl font-display font-bold text-white">{formatUSD(stats.commissionsCaptured)}</p>
          <p className="text-slate-400 text-xs mt-0.5">Commissions (5%)</p>
          <p className="text-slate-600 text-xs">{allPenalites.length} pénalités</p>
        </div>

        {/* Taux premium */}
        <div className="bg-card border border-card-border rounded-2xl p-4 hover:border-primary-500/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center">
              <Percent className="w-3.5 h-3.5 text-primary-300" />
            </div>
          </div>
          <p className="text-xl font-display font-bold text-white">{stats.tauxPremium.toFixed(0)}%</p>
          <p className="text-slate-400 text-xs mt-0.5">Taux Premium</p>
          <p className="text-slate-600 text-xs">{stats.monthlyCount + stats.annualCount} premium</p>
        </div>

        {/* En attente */}
        <div className={clsx('bg-card border rounded-2xl p-4 transition-colors', stats.commissionsPending > 0 ? 'border-amber-500/30' : 'border-card-border')}>
          <div className="flex items-center justify-between mb-2">
            <div className={clsx('w-8 h-8 rounded-xl border flex items-center justify-center', stats.commissionsPending > 0 ? 'bg-amber-500/15 border-amber-500/25' : 'bg-card border-card-border')}>
              <Clock className={clsx('w-3.5 h-3.5', stats.commissionsPending > 0 ? 'text-amber-400' : 'text-slate-500')} />
            </div>
            {stats.commissionsPending > 0 && <Bell className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
          </div>
          <p className={clsx('text-xl font-display font-bold', stats.commissionsPending > 0 ? 'text-amber-400' : 'text-white')}>
            {formatUSD(stats.commissionsPending)}
          </p>
          <p className="text-slate-400 text-xs mt-0.5">En attente</p>
          <p className="text-slate-600 text-xs">{allPenalites.filter(p => p.statut === 'pending').length} pénalité(s)</p>
        </div>

        {/* Revenue total pénalités */}
        <div className="bg-card border border-card-border rounded-2xl p-4 hover:border-pink-500/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-500/25 flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-pink-400" />
            </div>
          </div>
          <p className="text-xl font-display font-bold text-white">{formatUSD(stats.totalPenalties)}</p>
          <p className="text-slate-400 text-xs mt-0.5">Total pénalités</p>
          <p className="text-slate-600 text-xs">Brut utilisateurs</p>
        </div>
      </div>

      {/* ══ PLAN DISTRIBUTION + CHART ════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Plan cards (3) */}
        <div className="lg:col-span-3 grid grid-cols-3 gap-4">
          {/* Freemium */}
          <div className="bg-card border border-card-border rounded-2xl p-5 hover:border-slate-500/40 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white font-display font-bold text-2xl">{stats.freemiumCount}</p>
                <p className="text-slate-400 text-sm font-medium">Freemium</p>
              </div>
              <span className="px-2 py-1 rounded-lg bg-slate-500/15 border border-slate-500/25 text-slate-400 text-xs font-semibold">
                {stats.total > 0 ? Math.round((stats.freemiumCount / stats.total) * 100) : 0}%
              </span>
            </div>
            <ul className="space-y-1 mb-3 text-xs text-slate-500">
              <li className="flex items-center gap-1.5"><Moon className="w-3 h-3" />2 snoozes gratuits</li>
              <li className="flex items-center gap-1.5"><X className="w-3 h-3" />Features limitées</li>
            </ul>
            <div className="flex items-center justify-between">
              <p className="text-slate-300 text-sm font-bold">$0<span className="text-slate-600 font-normal">/mois</span></p>
            </div>
            <div className="mt-3 h-1.5 bg-obsidian-700 rounded-full overflow-hidden">
              <div className="h-full bg-slate-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.freemiumCount / stats.total) * 100 : 0}%` }} />
            </div>
          </div>

          {/* Premium Mensuel */}
          <div className="bg-card border border-primary-500/20 rounded-2xl p-5 relative overflow-hidden hover:border-primary-500/40 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent pointer-events-none" />
            <div className="relative flex items-start justify-between mb-3">
              <div>
                <p className="text-white font-display font-bold text-2xl">{stats.monthlyCount}</p>
                <p className="text-primary-300 text-sm font-medium">Premium Mensuel</p>
              </div>
              <span className="px-2 py-1 rounded-lg bg-primary-500/15 border border-primary-500/25 text-primary-300 text-xs font-semibold">
                {stats.total > 0 ? Math.round((stats.monthlyCount / stats.total) * 100) : 0}%
              </span>
            </div>
            <ul className="relative space-y-1 mb-3 text-xs text-slate-400">
              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary-400" />Snoozes illimités</li>
              <li className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-primary-400" />Features complètes</li>
            </ul>
            <p className="relative text-primary-300 text-sm font-bold">$9.99<span className="text-primary-500 font-normal">/mois</span></p>
            <div className="mt-3 h-1.5 bg-obsidian-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.monthlyCount / stats.total) * 100 : 0}%` }} />
            </div>
          </div>

          {/* Premium Annuel */}
          <div className="bg-card border border-cyan-500/20 rounded-2xl p-5 relative overflow-hidden hover:border-cyan-500/40 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
            <div className="relative flex items-start justify-between mb-3">
              <div>
                <p className="text-white font-display font-bold text-2xl">{stats.annualCount}</p>
                <p className="text-cyan-400 text-sm font-medium">Premium Annuel</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="px-2 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 text-xs font-semibold">
                  {stats.total > 0 ? Math.round((stats.annualCount / stats.total) * 100) : 0}%
                </span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold tracking-wide">SAVE 25%</span>
              </div>
            </div>
            <ul className="relative space-y-1 mb-3 text-xs text-slate-400">
              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-cyan-400" />Snoozes illimités</li>
              <li className="flex items-center gap-1.5"><Star className="w-3 h-3 text-cyan-400" />Prix réduit</li>
            </ul>
            <p className="relative text-cyan-400 text-sm font-bold">$89.99<span className="text-cyan-600 font-normal">/an</span></p>
            <div className="mt-3 h-1.5 bg-obsidian-700 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.annualCount / stats.total) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        {/* Revenue chart */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white text-sm font-semibold">Revenus 6 mois</p>
            <BarChart3 className="w-4 h-4 text-slate-500" />
          </div>
          <MiniChart data={chartData} />
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-primary-500/70" />
              <span className="text-slate-500 text-xs">MRR</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-cyan-500/70" />
              <span className="text-slate-500 text-xs">Commissions</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-card-border flex items-center justify-between">
            <p className="text-slate-500 text-xs">Ce mois</p>
            <p className="text-white text-xs font-semibold">{formatUSD(stats.mrr + stats.commissionsCaptured)}</p>
          </div>
        </div>
      </div>

      {/* ══ MAIN TABS ════════════════════════════════════════════════════════ */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-card-border overflow-x-auto">
          {([
            { key: 'abonnements', label: 'Abonnements', count: stats.total },
            { key: 'commissions', label: 'Commissions', count: allPenalites.length },
            { key: 'analytiques', label: 'Analytiques', count: null },
            { key: 'revenuecat', label: 'RevenueCat', count: rcStats.total },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap',
                activeTab === tab.key ? 'text-white border-primary-500' : 'text-slate-400 border-transparent hover:text-slate-200'
              )}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-bold', activeTab === tab.key ? 'bg-primary-500/20 text-primary-300' : 'bg-obsidian-600 text-slate-500')}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: ABONNEMENTS ──────────────────────────────────────────────── */}
        {activeTab === 'abonnements' && (
          <div>
            {/* Search + filters */}
            <div className="flex flex-wrap items-center gap-2 p-4 border-b border-card-border">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl pl-8 pr-3 py-2 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/60 focus:border-primary-500/60 transition-all"
                />
              </div>
              <select
                value={filterPlan}
                onChange={e => setFilterPlan(e.target.value as any)}
                className="bg-obsidian-700 border border-card-border text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500/60"
              >
                <option value="tous">Tous les plans</option>
                <option value="freemium">Freemium</option>
                <option value="premium_monthly">Premium Mensuel</option>
                <option value="premium_annual">Premium Annuel</option>
              </select>
              <select
                value={filterStatut}
                onChange={e => setFilterStatut(e.target.value as any)}
                className="bg-obsidian-700 border border-card-border text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500/60"
              >
                <option value="tous">Tous les statuts</option>
                <option value="actif">Actif</option>
                <option value="en attente">En attente</option>
                <option value="expiré">Expiré</option>
                <option value="annulé">Annulé</option>
              </select>
              {(search || filterPlan !== 'tous' || filterStatut !== 'tous') && (
                <button onClick={() => { setSearch(''); setFilterPlan('tous'); setFilterStatut('tous'); }} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" /> Réinitialiser
                </button>
              )}
              <span className="ml-auto text-slate-500 text-xs">{filteredSubs.length} résultat{filteredSubs.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-card-border">
                    {['Utilisateur', 'Plan', 'Statut', 'Snoozes', 'Pénalités', 'Commission', 'Renouvellement', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider first:pl-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/50">
                  {filteredSubs.map(sub => {
                    const captured = (sub.penalites ?? []).filter(p => p.statut === 'captured').reduce((a, p) => a + p.commission, 0);
                    const pending  = (sub.penalites ?? []).filter(p => p.statut === 'pending').length;
                    return (
                      <tr key={sub.id} className="hover:bg-obsidian-700/40 transition-colors group cursor-pointer" onClick={() => setSelectedSub(sub)}>
                        <td className="pl-5 pr-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500/30 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-bold">{getInitials(sub.utilisateur)}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-white text-sm font-medium">{sub.utilisateur}</span>
                                <span className="text-base">{platformIcon(sub.plateforme)}</span>
                              </div>
                              <p className="text-slate-500 text-xs">{sub.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5"><PlanBadge plan={sub.plan} /></td>
                        <td className="px-4 py-3.5"><StatutBadge statut={sub.statut} /></td>
                        <td className="px-4 py-3.5">
                          <span className="text-white text-sm font-medium">
                            {sub.snoozesUtilises}<span className="text-slate-600">/</span>
                            {sub.snoozesDisponibles === -1 ? <span className="text-cyan-400">∞</span> : <span className="text-slate-400">{sub.snoozesDisponibles}</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className={clsx('text-sm font-medium', (sub.penalites ?? []).length > 0 ? 'text-amber-400' : 'text-slate-500')}>
                              {(sub.penalites ?? []).length}
                            </span>
                            {pending > 0 && (
                              <span className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                                <span className="text-amber-400 text-[9px] font-bold">{pending}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={clsx('text-sm font-semibold', captured > 0 ? 'text-emerald-400' : 'text-slate-500')}>
                            {captured > 0 ? formatUSD(captured) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-slate-400 text-xs">{formatDateShort(sub.dateRenouvellement)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => openPenaliteModal(sub)}
                              className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 hover:bg-amber-500/20 transition-colors"
                              title="Ajouter une pénalité"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => toggleStatut(sub)}
                              className={clsx('w-7 h-7 rounded-lg border flex items-center justify-center transition-colors',
                                sub.statut === 'actif'
                                  ? 'bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20'
                                  : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20')}
                              title={sub.statut === 'actif' ? 'Annuler' : 'Réactiver'}
                            >
                              {sub.statut === 'actif' ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredSubs.length === 0 && (
                <div className="py-16 text-center">
                  <Moon className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Aucun abonnement trouvé</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: COMMISSIONS ──────────────────────────────────────────────── */}
        {activeTab === 'commissions' && (
          <div className="p-5 space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-1">Commissions capturées</p>
                <p className="text-emerald-400 text-2xl font-display font-bold">{formatUSD(stats.commissionsCaptured)}</p>
                <p className="text-slate-600 text-xs mt-1">Sur {allPenalites.filter(p => p.statut === 'captured').length} pénalités</p>
              </div>
              <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-1">En attente de capture</p>
                <p className="text-amber-400 text-2xl font-display font-bold">{formatUSD(stats.commissionsPending)}</p>
                <p className="text-slate-600 text-xs mt-1">{allPenalites.filter(p => p.statut === 'pending').length} en cours</p>
              </div>
              <div className="bg-card border border-card-border rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-1">Volume total pénalités</p>
                <p className="text-white text-2xl font-display font-bold">{formatUSD(stats.totalPenalties)}</p>
                <p className="text-slate-600 text-xs mt-1">Taux commission : 5%</p>
              </div>
            </div>

            {/* Penalties table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                  Toutes les pénalités
                  <span className="text-slate-500 font-normal text-xs">({allPenalites.length})</span>
                </h3>
                <button
                  onClick={() => { if (snoozeSubscriptions[0]) openPenaliteModal(snoozeSubscriptions[0]); }}
                  className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors border border-amber-500/25 bg-amber-500/10 rounded-lg px-3 py-1.5"
                >
                  <Plus className="w-3 h-3" /> Ajouter une pénalité
                </button>
              </div>

              {allPenalites.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-card-border rounded-xl">
                  <AlertCircle className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Aucune pénalité enregistrée</p>
                </div>
              ) : (
                <div className="rounded-xl border border-card-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-obsidian-700/40 border-b border-card-border">
                        {['Date', 'Utilisateur', 'Description', 'Pénalité', 'Commission (5%)', 'Statut'].map(h => (
                          <th key={h} className={clsx('px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider', h === 'Pénalité' || h === 'Commission (5%)' ? 'text-right' : 'text-left')}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border/40">
                      {allPenalites.map(p => (
                        <tr key={`${p.subId}-${p.id}`} className="hover:bg-obsidian-700/30 transition-colors">
                          <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(p.date)}</td>
                          <td className="px-4 py-3 text-white text-sm">{p.utilisateur}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">{p.description}</td>
                          <td className="px-4 py-3 text-right text-white text-sm font-medium">{formatUSD(p.montantPenalite)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={clsx('text-sm font-semibold', p.statut === 'captured' ? 'text-emerald-400' : p.statut === 'pending' ? 'text-amber-400' : 'text-red-400')}>
                              {formatUSD(p.commission)}
                            </span>
                          </td>
                          <td className="px-4 py-3"><PenaliteBadge statut={p.statut} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: ANALYTIQUES ──────────────────────────────────────────────── */}
        {activeTab === 'analytiques' && (
          <div className="p-5 space-y-5">
            {/* Business metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'MRR', value: formatUSD(stats.mrr), sub: 'Revenus mensuels récurrents', icon: DollarSign, color: 'text-primary-300', bg: 'bg-primary-500/15', border: 'border-primary-500/25' },
                { label: 'ARR', value: formatUSD(stats.arr), sub: 'Revenus annuels récurrents', icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/15', border: 'border-cyan-500/25' },
                { label: 'ARPU', value: formatUSD(stats.actifs > 0 ? stats.mrr / stats.actifs : 0), sub: 'Revenu moyen par utilisateur actif', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25' },
                { label: 'Commission rate', value: stats.totalPenalties > 0 ? `${((stats.commissionsCaptured / stats.totalPenalties) * 100).toFixed(1)}%` : '5.0%', sub: 'Taux de commission effectif', icon: Percent, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/25' },
              ].map(m => (
                <div key={m.label} className="bg-obsidian-700/50 border border-card-border rounded-xl p-4">
                  <div className={clsx('w-8 h-8 rounded-xl border flex items-center justify-center mb-3', m.bg, m.border)}>
                    <m.icon className={clsx('w-3.5 h-3.5', m.color)} />
                  </div>
                  <p className={clsx('text-xl font-display font-bold', m.color)}>{m.value}</p>
                  <p className="text-white text-xs font-semibold mt-0.5">{m.label}</p>
                  <p className="text-slate-600 text-xs">{m.sub}</p>
                </div>
              ))}
            </div>

            {/* Subscription breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Plan breakdown */}
              <div className="bg-obsidian-700/50 border border-card-border rounded-xl p-5">
                <h4 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary-400" /> Répartition des plans
                </h4>
                <div className="space-y-3">
                  {[
                    { plan: 'Freemium', count: stats.freemiumCount, color: 'bg-slate-500', textColor: 'text-slate-300' },
                    { plan: 'Premium Mensuel', count: stats.monthlyCount, color: 'bg-primary-500', textColor: 'text-primary-300' },
                    { plan: 'Premium Annuel', count: stats.annualCount, color: 'bg-cyan-500', textColor: 'text-cyan-400' },
                  ].map(item => (
                    <div key={item.plan}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={clsx('text-xs font-medium', item.textColor)}>{item.plan}</span>
                        <span className="text-slate-400 text-xs">{item.count} · {stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0}%</span>
                      </div>
                      <div className="h-2 bg-obsidian-600 rounded-full overflow-hidden">
                        <div className={clsx('h-full rounded-full transition-all', item.color)} style={{ width: `${stats.total > 0 ? (item.count / stats.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status breakdown */}
              <div className="bg-obsidian-700/50 border border-card-border rounded-xl p-5">
                <h4 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> État des abonnements
                </h4>
                <div className="space-y-3">
                  {(['actif', 'en attente', 'expiré', 'annulé'] as SnoozeStatus[]).map(s => {
                    const count = snoozeSubscriptions.filter(sub => sub.statut === s).length;
                    const ss = statutStyle[s];
                    return (
                      <div key={s} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={clsx('w-2 h-2 rounded-full', ss.dot)} />
                          <span className={clsx('text-xs font-medium', ss.color)}>{ss.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-obsidian-600 rounded-full overflow-hidden">
                            <div className={clsx('h-full rounded-full', ss.dot)} style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }} />
                          </div>
                          <span className="text-slate-400 text-xs w-6 text-right">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Churn rate */}
                <div className="mt-4 pt-4 border-t border-card-border">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">Taux de churn</span>
                    <span className={clsx('text-sm font-bold', stats.churn > 0 ? 'text-red-400' : 'text-emerald-400')}>
                      {stats.total > 0 ? ((stats.churn / stats.total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top users by commission */}
            <div className="bg-obsidian-700/50 border border-card-border rounded-xl p-5">
              <h4 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" /> Top utilisateurs par commission générée
              </h4>
              <div className="space-y-2">
                {[...snoozeSubscriptions]
                  .map(s => ({
                    ...s,
                    totalCommission: (s.penalites ?? []).filter(p => p.statut === 'captured').reduce((a, p) => a + p.commission, 0),
                  }))
                  .filter(s => s.totalCommission > 0)
                  .sort((a, b) => b.totalCommission - a.totalCommission)
                  .slice(0, 5)
                  .map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 hover:bg-obsidian-600/30 rounded-lg p-2 transition-colors cursor-pointer" onClick={() => setSelectedSub(s)}>
                      <span className={clsx('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                        i === 0 ? 'bg-amber-500/30 text-amber-300' : i === 1 ? 'bg-slate-500/30 text-slate-300' : 'bg-obsidian-600 text-slate-500'
                      )}>
                        {i + 1}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500/30 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{getInitials(s.utilisateur)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{s.utilisateur}</p>
                        <p className="text-slate-500 text-xs">{(s.penalites ?? []).length} pénalité(s) · {platformIcon(s.plateforme)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 text-sm font-bold">{formatUSD(s.totalCommission)}</p>
                        <p className="text-slate-600 text-xs">commission</p>
                      </div>
                    </div>
                  ))}
                {snoozeSubscriptions.every(s => (s.penalites ?? []).filter(p => p.statut === 'captured').length === 0) && (
                  <p className="text-slate-600 text-sm text-center py-4">Aucune commission capturée pour l'instant</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: REVENUECAT ──────────────────────────────────────────────── */}
        {activeTab === 'revenuecat' && (
          <div className="p-5 space-y-5">

            {/* Status + Sync bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Statut clé API */}
              {!settings.revenueCatApiKey ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-red-500/10 border-red-500/25 text-red-400 text-sm font-semibold">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Clé API manquante
                </div>
              ) : rcStats.total > 0 ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/25 text-emerald-400 text-sm font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Connecté
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-amber-500/10 border-amber-500/25 text-amber-400 text-sm font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Clé configurée · Aucun RC ID
                </div>
              )}

              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Intégration RevenueCat</p>
                <p className="text-slate-500 text-xs">
                  {settings.revenueCatApiKey
                    ? `${rcStats.total} subscriber${rcStats.total !== 1 ? 's' : ''} avec RC ID · Sync met à jour plan + statut`
                    : 'Configure la clé API dans Paramètres → Intégrations'}
                </p>
              </div>

              {/* Sync button */}
              <div className="flex items-center gap-2 ml-auto">
                {rcSyncResult && (
                  <div className={clsx(
                    'text-xs px-3 py-1.5 rounded-lg border',
                    rcSyncResult.errors === 0
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                  )}>
                    ✓ {rcSyncResult.synced} sync · {rcSyncResult.errors} erreur{rcSyncResult.errors !== 1 ? 's' : ''} · {rcSyncResult.timestamp}
                  </div>
                )}
                {!settings.revenueCatApiKey ? (
                  <button
                    onClick={() => {/* navigate to settings — no direct nav here */}}
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border bg-cyan-500/10 border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configurer la clé
                  </button>
                ) : (
                  <button
                    onClick={handleRCSync}
                    disabled={rcSyncing || rcStats.total === 0}
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-colors disabled:opacity-40"
                  >
                    {rcSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {rcSyncing ? `Sync en cours…` : `Sync ${rcStats.total} subscriber${rcStats.total !== 1 ? 's' : ''}`}
                  </button>
                )}
              </div>
            </div>

            {/* No API key callout */}
            {!settings.revenueCatApiKey && (
              <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/20 rounded-xl p-4">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-300 text-xs font-semibold mb-0.5">Clé API RevenueCat non configurée</p>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Va dans <strong className="text-slate-300">Paramètres → Intégrations → RevenueCat</strong> et renseigne ta clé secrète pour activer la synchronisation des abonnements in-app.
                  </p>
                </div>
              </div>
            )}

            {/* Platform breakdown */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: '🍎', label: 'iOS', count: rcStats.ios, color: 'text-slate-300' },
                { icon: '🤖', label: 'Android', count: rcStats.android, color: 'text-emerald-300' },
                { icon: '🌐', label: 'Web', count: rcStats.web, color: 'text-blue-300' },
              ].map(p => (
                <div key={p.label} className="bg-obsidian-700/50 border border-card-border rounded-xl p-4 text-center hover:border-primary-500/20 transition-colors">
                  <p className="text-2xl mb-2">{p.icon}</p>
                  <p className={clsx('font-display font-bold text-xl', p.color)}>{p.count}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{p.label}</p>
                </div>
              ))}
            </div>

            {/* RC ID table */}
            <div className="rounded-xl border border-card-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-obsidian-700/40 border-b border-card-border">
                    {['Utilisateur', 'RevenueCat ID', 'Plateforme', 'Plan', 'Statut'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/40">
                  {snoozeSubscriptions.map(sub => (
                    <tr key={sub.id} className="hover:bg-obsidian-700/30 transition-colors cursor-pointer" onClick={() => setSelectedSub(sub)}>
                      <td className="px-4 py-3">
                        <p className="text-white text-sm">{sub.utilisateur}</p>
                        <p className="text-slate-500 text-xs">{sub.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {sub.revenueCatId
                          ? <code className="text-cyan-400 text-xs bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 font-mono">{sub.revenueCatId}</code>
                          : <span className="text-slate-700 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-3 text-lg">{platformIcon(sub.plateforme)}</td>
                      <td className="px-4 py-3"><PlanBadge plan={sub.plan} /></td>
                      <td className="px-4 py-3"><StatutBadge statut={sub.statut} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Info box */}
            <div className="flex items-start gap-3 bg-primary-500/8 border border-primary-500/20 rounded-xl p-4">
              <AlertCircle className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-slate-300 text-xs font-semibold">Fonctionnement</p>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Les abonnements Premium sont gérés via <strong className="text-slate-300">RevenueCat</strong> (in-app purchases iOS/Android). Les pénalités snooze sont traitées <strong className="text-slate-300">indépendamment</strong> via votre passerelle de paiement — elles ne sont pas liées au statut d'abonnement.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ DETAIL SIDE PANEL ════════════════════════════════════════════════ */}
      {selectedSub && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setSelectedSub(null)} />
          <div className="fixed right-0 top-0 h-full w-[420px] bg-obsidian-800 border-l border-card-border z-50 flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-card-border flex-shrink-0">
              <h3 className="text-white font-display font-bold text-base">Fiche abonnement</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openPenaliteModal(selectedSub)}
                  className="flex items-center gap-1.5 text-xs text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-lg px-2.5 py-1.5 hover:bg-amber-500/20 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Pénalité
                </button>
                <button onClick={() => setSelectedSub(null)} className="w-8 h-8 rounded-lg bg-card border border-card-border flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* User card */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/40 to-cyan-500/25 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xl font-bold">{getInitials(selectedSub.utilisateur)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-bold text-lg">{selectedSub.utilisateur}</p>
                    <span className="text-lg">{platformIcon(selectedSub.plateforme)}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{selectedSub.email}</p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <PlanBadge plan={selectedSub.plan} />
                <StatutBadge statut={selectedSub.statut} />
                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-500/15 border border-slate-500/25 text-slate-400 capitalize">
                  {selectedSub.cycle}
                </span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Début', value: formatDate(selectedSub.dateDebut) },
                  { label: 'Renouvellement', value: formatDate(selectedSub.dateRenouvellement) },
                  { label: 'Snoozes utilisés', value: String(selectedSub.snoozesUtilises) },
                  { label: 'Disponibles', value: selectedSub.snoozesDisponibles === -1 ? '∞ Illimité' : String(selectedSub.snoozesDisponibles) },
                  { label: 'Pénalités', value: `${(selectedSub.penalites ?? []).length} total` },
                  { label: 'Commission capturée', value: formatUSD((selectedSub.penalites ?? []).filter(p => p.statut === 'captured').reduce((a, p) => a + p.commission, 0)) },
                ].map(item => (
                  <div key={item.label} className="bg-obsidian-700/50 rounded-xl p-3 border border-card-border">
                    <p className="text-slate-500 text-xs mb-0.5">{item.label}</p>
                    <p className="text-white text-sm font-medium">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* RevenueCat ID */}
              {selectedSub.revenueCatId && (
                <div className="bg-cyan-500/8 rounded-xl p-3 border border-cyan-500/20">
                  <p className="text-slate-500 text-xs mb-1">RevenueCat ID</p>
                  <code className="text-cyan-400 text-xs font-mono">{selectedSub.revenueCatId}</code>
                </div>
              )}

              {/* Notes */}
              {selectedSub.notes && (
                <div className="bg-obsidian-700/50 rounded-xl p-3 border border-card-border">
                  <p className="text-slate-500 text-xs mb-1">Notes</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{selectedSub.notes}</p>
                </div>
              )}

              {/* Penalties */}
              <div>
                <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  Pénalités
                  <span className="text-slate-500 font-normal text-xs">({(selectedSub.penalites ?? []).length})</span>
                  {(selectedSub.penalites ?? []).filter(p => p.statut === 'pending').length > 0 && (
                    <span className="text-amber-400 text-xs bg-amber-500/15 border border-amber-500/25 rounded-full px-2 py-0.5">
                      {(selectedSub.penalites ?? []).filter(p => p.statut === 'pending').length} en attente
                    </span>
                  )}
                </h4>
                {(selectedSub.penalites ?? []).length === 0 ? (
                  <p className="text-slate-600 text-xs py-2">Aucune pénalité enregistrée</p>
                ) : (
                  <div className="space-y-2">
                    {[...(selectedSub.penalites ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => (
                      <div key={p.id} className="bg-obsidian-700/40 border border-card-border rounded-xl p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-300 text-xs leading-relaxed">{p.description}</p>
                            <p className="text-slate-600 text-xs mt-0.5">{formatDate(p.date)}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <PenaliteBadge statut={p.statut} />
                            {p.statut === 'pending' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCapturePenalite(selectedSub, p)
                                }}
                                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                              >
                                <Check className="w-3 h-3" /> Capturer
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-card-border/60">
                          <div>
                            <p className="text-slate-500 text-[10px]">Pénalité totale</p>
                            <p className="text-white text-xs font-semibold">{formatUSD(p.montantPenalite)}</p>
                          </div>
                          <ChevronRight className="w-3 h-3 text-slate-600" />
                          <div className="text-right">
                            <p className="text-slate-500 text-[10px]">Commission (5%)</p>
                            <p className="text-emerald-400 text-xs font-semibold">{formatUSD(p.commission)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* History */}
              <div>
                <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  Historique
                  <span className="text-slate-500 font-normal text-xs">({(selectedSub.historique ?? []).length})</span>
                </h4>
                {(selectedSub.historique ?? []).length === 0 ? (
                  <p className="text-slate-600 text-xs py-2">Aucun historique</p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-card-border" />
                    <div className="space-y-3">
                      {[...(selectedSub.historique ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(ev => (
                        <div key={ev.id} className="flex items-start gap-3 pl-5 relative">
                          <div className={clsx('absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-obsidian-800', eventDot[ev.action] ?? 'bg-slate-500')} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-white">{actionLabel[ev.action] ?? ev.action}</span>
                              {ev.montant !== undefined && ev.montant > 0 && (
                                <span className="text-emerald-400 text-xs font-semibold flex-shrink-0">+{formatUSD(ev.montant)}</span>
                              )}
                            </div>
                            <p className="text-slate-400 text-xs mt-0.5">{ev.details}</p>
                            <p className="text-slate-600 text-xs">{formatDate(ev.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="border-t border-card-border p-4 flex-shrink-0 space-y-2">
              <button
                onClick={() => openPenaliteModal(selectedSub)}
                className="w-full py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-semibold hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Ajouter une pénalité
              </button>
              <button
                onClick={() => toggleStatut(selectedSub)}
                className={clsx('w-full py-2.5 rounded-xl text-sm font-semibold border transition-all',
                  selectedSub.statut === 'actif'
                    ? 'bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20'
                    : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
                )}
              >
                {selectedSub.statut === 'actif' ? "Annuler l'abonnement" : "Réactiver l'abonnement"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ MODAL: NOUVEL ABONNEMENT ══════════════════════════════════════════ */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nouvel abonnement" subtitle="Ajouter un abonné Pay to Snooze" size="md">
        <form onSubmit={handleSubmitSub} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom <span className="text-red-400">*</span></label>
              <input value={newSub.utilisateur} onChange={e => setNewSub(p => ({ ...p, utilisateur: e.target.value }))} required placeholder="Nom complet"
                className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email <span className="text-red-400">*</span></label>
              <input type="email" value={newSub.email} onChange={e => setNewSub(p => ({ ...p, email: e.target.value }))} required placeholder="email@exemple.com"
                className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500/50 transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Plan</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'freemium', label: 'Freemium', sub: 'Gratuit', color: 'text-slate-300', activeBg: 'bg-slate-500/20 border-slate-500/40' },
                { key: 'premium_monthly', label: 'Mensuel', sub: '$9.99/mois', color: 'text-primary-300', activeBg: 'bg-primary-500/20 border-primary-500/40' },
                { key: 'premium_annual', label: 'Annuel', sub: '$89.99/an', color: 'text-cyan-400', activeBg: 'bg-cyan-500/20 border-cyan-500/40' },
              ] as const).map(p => (
                <button key={p.key} type="button" onClick={() => setNewSub(f => ({ ...f, plan: p.key }))}
                  className={clsx('flex flex-col items-center p-3 rounded-xl border text-center transition-all',
                    newSub.plan === p.key ? `${p.activeBg} ${p.color}` : 'bg-obsidian-700 border-card-border text-slate-400 hover:border-primary-500/20')}>
                  <Moon className="w-4 h-4 mb-1" />
                  <p className="text-xs font-semibold">{p.label}</p>
                  <p className="text-xs opacity-60 mt-0.5">{p.sub}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Plateforme</label>
            <div className="grid grid-cols-3 gap-2">
              {([{ key: 'ios', icon: '🍎', label: 'iOS' }, { key: 'android', icon: '🤖', label: 'Android' }, { key: 'web', icon: '🌐', label: 'Web' }] as const).map(pl => (
                <button key={pl.key} type="button" onClick={() => setNewSub(f => ({ ...f, plateforme: pl.key }))}
                  className={clsx('flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all text-sm',
                    newSub.plateforme === pl.key ? 'bg-primary-500/15 border-primary-500/40 text-primary-300' : 'bg-obsidian-700 border-card-border text-slate-400 hover:border-primary-500/20')}>
                  <span>{pl.icon}</span>
                  <span className="text-xs font-medium">{pl.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">RevenueCat ID <span className="text-slate-600 font-normal">(optionnel)</span></label>
            <input value={newSub.revenueCatId} onChange={e => setNewSub(p => ({ ...p, revenueCatId: e.target.value }))} placeholder="rc_user_..."
              className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500/50 transition-colors font-mono" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notes</label>
            <textarea value={newSub.notes} onChange={e => setNewSub(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Notes internes…"
              className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500/50 transition-colors" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:text-white hover:border-slate-500/50 transition-all">Annuler</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary-500/20">Créer l'abonnement</button>
          </div>
        </form>
      </Modal>

      {/* ══ MODAL: AJOUTER UNE PÉNALITÉ ══════════════════════════════════════ */}
      <Modal
        isOpen={isPenaliteModalOpen}
        onClose={() => { setIsPenaliteModalOpen(false); setPenaliteTargetSub(null); }}
        title="Ajouter une pénalité"
        subtitle={penaliteTargetSub ? `Pour ${penaliteTargetSub.utilisateur}` : ''}
        size="sm"
      >
        <form onSubmit={handleAddPenalite} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Montant pénalité ($) <span className="text-red-400">*</span></label>
            <input type="number" min="0.01" step="0.01" value={newPenalite.montant} onChange={e => setNewPenalite(p => ({ ...p, montant: e.target.value }))} required placeholder="Ex: 200.00"
              className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500/50 transition-colors" />
            {newPenalite.montant && !isNaN(parseFloat(newPenalite.montant)) && (
              <p className="text-xs text-emerald-400 mt-1">
                Commission 5% = <strong>{formatUSD(Math.round(parseFloat(newPenalite.montant) * 0.05 * 100) / 100)}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description <span className="text-red-400">*</span></label>
            <input value={newPenalite.description} onChange={e => setNewPenalite(p => ({ ...p, description: e.target.value }))} required placeholder="Ex: Pénalité snooze lundi matin 08h00"
              className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500/50 transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Statut de capture</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'pending', label: 'En attente', color: 'text-amber-400', activeBg: 'bg-amber-500/20 border-amber-500/40' },
                { key: 'captured', label: 'Capturée', color: 'text-emerald-400', activeBg: 'bg-emerald-500/20 border-emerald-500/40' },
                { key: 'refunded', label: 'Remb.', color: 'text-red-400', activeBg: 'bg-red-500/20 border-red-500/40' },
              ] as const).map(s => (
                <button key={s.key} type="button" onClick={() => setNewPenalite(p => ({ ...p, statut: s.key }))}
                  className={clsx('py-2 rounded-xl border text-xs font-semibold text-center transition-all',
                    newPenalite.statut === s.key ? `${s.activeBg} ${s.color}` : 'bg-obsidian-700 border-card-border text-slate-400')}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setIsPenaliteModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:text-white transition-all">Annuler</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/20">Enregistrer</button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

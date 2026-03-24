import React, { useState, useMemo } from 'react';
import {
  Users, Plus, Pencil, Trash2, Mail, Search, X,
  Star, TrendingUp, Briefcase, Euro, Download,
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store/useStore';
import { Freelancer, FreelancerSpecialite, FreelancerStatut } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { exportFreelancersCSV } from '../utils/csvExport';
import { useDebounce } from '../hooks/useDebounce';
import { TagPicker } from '../components/ui/TagPicker';
import { validateIBAN, validateBIC, formatIBAN } from '../utils/ibanValidation';

// ─── Colour helpers ──────────────────────────────────────────────────────────

const specialiteColors: Record<FreelancerSpecialite, string> = {
  'développement web':    'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  'développement mobile': 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  'devops / cloud':       'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  'design UI/UX':         'bg-pink-500/20 text-pink-300 border border-pink-500/30',
  'marketing digital':    'bg-green-500/20 text-green-300 border border-green-500/30',
  'SEO / SEA':            'bg-green-500/20 text-green-300 border border-green-500/30',
  'vidéo / motion':       'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  'data / analytics':     'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
  'rédaction':            'bg-violet-500/20 text-violet-300 border border-violet-500/30',
  'consulting':           'bg-violet-500/20 text-violet-300 border border-violet-500/30',
  'autre':                'bg-violet-500/20 text-violet-300 border border-violet-500/30',
};

const statutColors: Record<FreelancerStatut, string> = {
  actif:       'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  inactif:     'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  'en mission':'bg-amber-500/20 text-amber-300 border border-amber-500/30',
};

const statutDot: Record<FreelancerStatut, string> = {
  actif:       'bg-emerald-400',
  inactif:     'bg-slate-500',
  'en mission':'bg-amber-400',
};

// ─── Empty form ──────────────────────────────────────────────────────────────

type FreelancerFormData = Omit<Freelancer, 'id' | 'dateCreation'>;

const emptyForm: FreelancerFormData = {
  nom: '',
  prenom: '',
  entreprise: '',
  email: '',
  telephone: '',
  adresse: '',
  siret: '',
  numeroTVA: '',
  specialite: 'développement web',
  tjm: 0,
  statut: 'actif',
  tags: [],
  notes: '',
  totalFacture: 0,
  iban: '',
  bic: '',
  tvaApplicable: false,
  tauxTva: 0,
};

const SPECIALITES: FreelancerSpecialite[] = [
  'développement web',
  'design UI/UX',
  'développement mobile',
  'marketing digital',
  'rédaction',
  'vidéo / motion',
  'SEO / SEA',
  'data / analytics',
  'devops / cloud',
  'consulting',
  'autre',
];

// ─── Subcomponents ───────────────────────────────────────────────────────────

const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
    {children}
    {required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const inputCls =
  'bg-obsidian-700 border border-card-border rounded-xl text-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none w-full placeholder-slate-500 transition-colors';

// ─── Main component ──────────────────────────────────────────────────────────

export const Freelancers: React.FC = () => {
  const { freelancers, addFreelancer, updateFreelancer, deleteFreelancer, projects, setActiveSection, unifiedTags } = useStore();
  const getTagColor = (name: string) => unifiedTags.find(t => t.name === name)?.color || '#6366f1';

  // ── UI State ────────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 300);
  const [filterSpec, setFilterSpec] = useState<FreelancerSpecialite | 'toutes'>('toutes');
  const [filterStatut, setFilterStatut] = useState<FreelancerStatut | 'tous'>('tous');

  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [formData, setFormData]           = useState<FreelancerFormData>(emptyForm);

  const [detailFreelancer, setDetailFreelancer] = useState<Freelancer | null>(null);
  const [confirmDeleteId, setConfirmDeleteId]   = useState<string | null>(null);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total      = freelancers.length;
    const actifs     = freelancers.filter(f => f.statut === 'actif').length;
    const enMission  = freelancers.filter(f => f.statut === 'en mission').length;
    const tjmMoyen   = total > 0
      ? Math.round(freelancers.reduce((s, f) => s + f.tjm, 0) / total)
      : 0;
    return { total, actifs, enMission, tjmMoyen };
  }, [freelancers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return freelancers.filter(f => {
      const matchSearch =
        !q ||
        f.nom.toLowerCase().includes(q) ||
        f.prenom.toLowerCase().includes(q) ||
        f.entreprise.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q);
      const matchSpec   = filterSpec === 'toutes' || f.specialite === filterSpec;
      const matchStatut = filterStatut === 'tous' || f.statut === filterStatut;
      return matchSearch && matchSpec && matchStatut;
    });
  }, [freelancers, search, filterSpec, filterStatut]);

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (f: Freelancer) => {
    setEditingId(f.id);
    setFormData({
      nom: f.nom, prenom: f.prenom, entreprise: f.entreprise,
      email: f.email, telephone: f.telephone, adresse: f.adresse,
      siret: f.siret, numeroTVA: f.numeroTVA, specialite: f.specialite,
      tjm: f.tjm, statut: f.statut, tags: [...f.tags], notes: f.notes,
      totalFacture: f.totalFacture, iban: f.iban || '', bic: f.bic || '',
      tvaApplicable: f.tvaApplicable ?? false, tauxTva: f.tauxTva ?? 0,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateFreelancer(editingId, formData);
    } else {
      addFreelancer(formData);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    deleteFreelancer(id);
    setConfirmDeleteId(null);
    if (detailFreelancer?.id === id) setDetailFreelancer(null);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const initials = (f: Freelancer) =>
    `${f.prenom[0] ?? ''}${f.nom[0] ?? ''}`.toUpperCase();

  const formatEur = (n: number) => n.toLocaleString('fr-FR');

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Prestataires</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {freelancers.length} prestataire{freelancers.length !== 1 ? 's' : ''} enregistré{freelancers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportFreelancersCSV(filtered)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 border border-card-border rounded-xl hover:text-white hover:border-slate-500 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold rounded-xl px-4 py-2 transition-colors shadow-glow-purple"
          >
            <Plus className="w-4 h-4" />
            Nouveau Prestataire
          </button>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total prestataires" value={stats.total}     icon={Users}      color="purple" />
        <StatCard title="Actifs"             value={stats.actifs}    icon={Star}       color="green"  />
        <StatCard title="En mission"         value={stats.enMission} icon={Briefcase}  color="orange" />
        <StatCard title="TJM moyen"          value={`${formatEur(stats.tjmMoyen)} €`} icon={Euro} color="cyan" />
      </div>

      {/* ── Search + Filter bar ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par nom, entreprise, email…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className={clsx(inputCls, 'pl-9 pr-9')}
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Specialité filter */}
        <select
          value={filterSpec}
          onChange={e => setFilterSpec(e.target.value as FreelancerSpecialite | 'toutes')}
          className={clsx(inputCls, 'w-auto min-w-[200px]')}
        >
          <option value="toutes">Toutes les spécialités</option>
          {SPECIALITES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Statut filter */}
        <div className="flex items-center gap-1.5">
          {(['tous', 'actif', 'inactif', 'en mission'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatut(s)}
              className={clsx(
                'px-3 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap',
                filterStatut === s
                  ? 'bg-primary-500/20 text-primary-300 border-primary-500/40'
                  : 'bg-card text-slate-400 border-card-border hover:text-white'
              )}
            >
              {s === 'tous' ? 'Tous' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Cards Grid ──────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Users className="w-14 h-14 mb-4 opacity-20" />
          <p className="text-base font-medium">Aucun prestataire trouvé</p>
          <p className="text-sm mt-1 opacity-70">Modifiez vos filtres ou ajoutez un nouveau prestataire.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(f => (
            <div
              key={f.id}
              onClick={() => setDetailFreelancer(f)}
              className="bg-card border border-card-border rounded-2xl p-5 hover:border-primary-500/30 hover:bg-card-hover transition-all duration-200 cursor-pointer group"
            >
              {/* Top row: avatar + name + statut */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-600 to-cyan-500 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold shadow-glow-purple">
                  {initials(f)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm leading-tight truncate">
                    {f.prenom} {f.nom}
                  </p>
                  <p className="text-slate-400 text-xs truncate mt-0.5">{f.entreprise || '—'}</p>
                </div>
                {/* Statut badge */}
                <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1.5 flex-shrink-0', statutColors[f.statut])}>
                  <span className={clsx('w-1.5 h-1.5 rounded-full', statutDot[f.statut])} />
                  {f.statut}
                </span>
              </div>

              {/* Specialite badge */}
              <div className="mb-4">
                <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-lg', specialiteColors[f.specialite])}>
                  {f.specialite}
                </span>
              </div>

              {/* TJM + Total facturé */}
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-2xl font-display font-bold text-white">
                    {formatEur(f.tjm)} €<span className="text-slate-400 text-sm font-normal">/j</span>
                  </p>
                </div>
                {f.totalFacture > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total généré</p>
                    <p className="text-sm font-semibold text-cyan-400">{formatEur(f.totalFacture)} €</p>
                  </div>
                )}
              </div>

              {/* Projets & tâches actives */}
              {(() => {
                const freelancerProjects = projects.filter(p =>
                  (p.freelancerIds || []).includes(f.id)
                );
                const activeTasks = projects.flatMap(p =>
                  (p.taches || []).filter(t =>
                    t.assigneA.toLowerCase().includes(`${f.prenom} ${f.nom}`.toLowerCase()) &&
                    t.statut !== 'fait'
                  )
                ).length;
                return (
                  <>
                    {freelancerProjects.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {freelancerProjects.slice(0, 3).map(p => (
                          <span key={p.id} className="text-xs px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/20">
                            {p.nom}
                          </span>
                        ))}
                        {freelancerProjects.length > 3 && (
                          <span className="text-xs text-slate-500">+{freelancerProjects.length - 3}</span>
                        )}
                      </div>
                    )}
                    {activeTasks > 0 && (
                      <p className="text-xs text-amber-400 mt-1">
                        {activeTasks} tâche{activeTasks > 1 ? 's' : ''} active{activeTasks > 1 ? 's' : ''}
                      </p>
                    )}
                  </>
                );
              })()}

              <div className="mb-2" />

              {/* Action buttons */}
              <div
                className="flex items-center gap-2 pt-3 border-t border-card-border"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => openEdit(f)}
                  title="Modifier"
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-obsidian-700 border border-card-border text-slate-400 hover:text-primary-300 hover:border-primary-500/40 transition-all text-xs font-medium"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Modifier
                </button>
                <a
                  href={`mailto:${f.email}`}
                  title="Envoyer un email"
                  className="flex items-center justify-center w-8 h-8 rounded-xl bg-obsidian-700 border border-card-border text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all"
                >
                  <Mail className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setConfirmDeleteId(f.id)}
                  title="Supprimer"
                  className="flex items-center justify-center w-8 h-8 rounded-xl bg-obsidian-700 border border-card-border text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Detail slide-in panel ────────────────────────────────────────────── */}
      {detailFreelancer && (
        <div
          className="fixed inset-0 z-40 flex justify-end"
          onClick={() => setDetailFreelancer(null)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-obsidian-700 border-l border-card-border h-full overflow-y-auto animate-slide-in shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-card-border sticky top-0 bg-obsidian-700 z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-600 to-cyan-500 flex items-center justify-center text-white font-bold shadow-glow-purple">
                  {initials(detailFreelancer)}
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">
                    {detailFreelancer.prenom} {detailFreelancer.nom}
                  </h2>
                  <p className="text-slate-400 text-sm">{detailFreelancer.entreprise || '—'}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailFreelancer(null)}
                className="w-8 h-8 rounded-lg bg-card border border-card-border flex items-center justify-center text-slate-400 hover:text-white hover:bg-obsidian-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5', statutColors[detailFreelancer.statut])}>
                  <span className={clsx('w-1.5 h-1.5 rounded-full', statutDot[detailFreelancer.statut])} />
                  {detailFreelancer.statut}
                </span>
                <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-lg', specialiteColors[detailFreelancer.specialite])}>
                  {detailFreelancer.specialite}
                </span>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-card-border rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">TJM</p>
                  <p className="text-white text-xl font-bold">{formatEur(detailFreelancer.tjm)} €</p>
                  <p className="text-slate-500 text-xs">par jour</p>
                </div>
                <div className="bg-card border border-card-border rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">Total généré</p>
                  <p className="text-cyan-400 text-xl font-bold">{formatEur(detailFreelancer.totalFacture)} €</p>
                  <p className="text-slate-500 text-xs">facturé</p>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Contact</p>
                {detailFreelancer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <a href={`mailto:${detailFreelancer.email}`} className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors truncate">
                      {detailFreelancer.email}
                    </a>
                  </div>
                )}
                {detailFreelancer.telephone && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="text-white text-sm">{detailFreelancer.telephone}</span>
                  </div>
                )}
                {detailFreelancer.adresse && (
                  <div className="flex items-start gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300 text-sm">{detailFreelancer.adresse}</span>
                  </div>
                )}
              </div>

              {/* Infos légales */}
              {(detailFreelancer.siret || detailFreelancer.numeroTVA) && (
                <div className="bg-card border border-card-border rounded-xl p-4 space-y-2">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Infos légales</p>
                  {detailFreelancer.siret && (
                    <div>
                      <p className="text-slate-500 text-xs">SIRET</p>
                      <p className="text-white text-sm font-mono">{detailFreelancer.siret}</p>
                    </div>
                  )}
                  {detailFreelancer.numeroTVA && (
                    <div>
                      <p className="text-slate-500 text-xs">N° TVA</p>
                      <p className="text-white text-sm font-mono">{detailFreelancer.numeroTVA}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-500 text-xs">TVA</p>
                    <p className={`text-sm font-medium ${detailFreelancer.tvaApplicable ? 'text-white' : 'text-slate-400'}`}>
                      {detailFreelancer.tvaApplicable ? `Assujetti — ${detailFreelancer.tauxTva || 20}%` : 'Non applicable (art. 293B)'}
                    </p>
                  </div>
                </div>
              )}

              {/* Coordonnées bancaires */}
              {(detailFreelancer.iban || detailFreelancer.bic) && (
                <div className="bg-card border border-card-border rounded-xl p-4 space-y-2">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Coordonnées bancaires</p>
                  {detailFreelancer.iban && (
                    <div>
                      <p className="text-slate-500 text-xs">IBAN</p>
                      <p className="text-white text-sm font-mono">{'•••• •••• •••• ' + detailFreelancer.iban.slice(-4)}</p>
                    </div>
                  )}
                  {detailFreelancer.bic && (
                    <div>
                      <p className="text-slate-500 text-xs">BIC / SWIFT</p>
                      <p className="text-white text-sm font-mono">{'••••' + detailFreelancer.bic.slice(-4)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {detailFreelancer.tags.length > 0 && (
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {detailFreelancer.tags.map(tag => {
                      const c = getTagColor(tag);
                      return (
                        <span key={tag} className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ backgroundColor: `${c}25`, color: c, border: `1px solid ${c}40` }}>
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              {detailFreelancer.notes && (
                <div className="bg-card border border-card-border rounded-xl p-4">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{detailFreelancer.notes}</p>
                </div>
              )}

              {/* Projets assignés */}
              {(() => {
                const dp = detailFreelancer;
                const dpProjects = projects.filter(p => (p.freelancerIds || []).includes(dp.id));
                const dpActiveTasks = projects.flatMap(p =>
                  (p.taches || []).filter(t =>
                    t.assigneA.toLowerCase().includes(`${dp.prenom} ${dp.nom}`.toLowerCase()) &&
                    t.statut !== 'fait'
                  )
                ).length;
                if (dpProjects.length === 0 && dpActiveTasks === 0) return null;
                return (
                  <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Projets & Tâches</p>
                    {dpProjects.length > 0 && (
                      <div>
                        <p className="text-slate-500 text-xs mb-2">{dpProjects.length} projet{dpProjects.length > 1 ? 's' : ''} assigné{dpProjects.length > 1 ? 's' : ''}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {dpProjects.map(p => (
                            <button
                              key={p.id}
                              onClick={() => { setDetailFreelancer(null); setActiveSection('projects'); }}
                              className="text-xs px-2.5 py-1 rounded-lg bg-primary-500/15 text-primary-300 border border-primary-500/20 hover:bg-primary-500/25 transition-all"
                            >
                              {p.nom}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {dpActiveTasks > 0 && (
                      <p className="text-xs text-amber-400">
                        {dpActiveTasks} tâche{dpActiveTasks > 1 ? 's' : ''} active{dpActiveTasks > 1 ? 's' : ''} en cours
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Date */}
              <p className="text-slate-600 text-xs text-right">
                Créé le {new Date(detailFreelancer.dateCreation).toLocaleDateString('fr-FR')}
              </p>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setDetailFreelancer(null); openEdit(detailFreelancer); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-glow-purple"
                >
                  <Pencil className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={() => setDetailFreelancer(null)}
                  className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:bg-card-hover hover:text-white transition-all"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Modifier le Prestataire' : 'Nouveau Prestataire'}
        subtitle={editingId ? `${formData.prenom} ${formData.nom}` : 'Ajouter un prestataire à votre réseau'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* 1. Identité */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Identité</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel required>Prénom</FieldLabel>
                <input
                  type="text"
                  required
                  value={formData.prenom}
                  onChange={e => setFormData(p => ({ ...p, prenom: e.target.value }))}
                  className={inputCls}
                  placeholder="Jean"
                />
              </div>
              <div>
                <FieldLabel required>Nom</FieldLabel>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={e => setFormData(p => ({ ...p, nom: e.target.value }))}
                  className={inputCls}
                  placeholder="Dupont"
                />
              </div>
              <div>
                <FieldLabel>Entreprise</FieldLabel>
                <input
                  type="text"
                  value={formData.entreprise}
                  onChange={e => setFormData(p => ({ ...p, entreprise: e.target.value }))}
                  className={inputCls}
                  placeholder="Raison sociale"
                />
              </div>
            </div>
          </div>

          {/* 2. Contact */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contact</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel required>Email</FieldLabel>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  className={inputCls}
                  placeholder="jean@exemple.fr"
                />
              </div>
              <div>
                <FieldLabel>Téléphone</FieldLabel>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={e => setFormData(p => ({ ...p, telephone: e.target.value }))}
                  className={inputCls}
                  placeholder="+33 6 00 00 00 00"
                />
              </div>
              <div>
                <FieldLabel>Adresse</FieldLabel>
                <input
                  type="text"
                  value={formData.adresse}
                  onChange={e => setFormData(p => ({ ...p, adresse: e.target.value }))}
                  className={inputCls}
                  placeholder="Ville, Pays"
                />
              </div>
            </div>
          </div>

          {/* 3. Profil Pro */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Profil Professionnel</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel>Spécialité</FieldLabel>
                <select
                  value={formData.specialite}
                  onChange={e => setFormData(p => ({ ...p, specialite: e.target.value as FreelancerSpecialite }))}
                  className={inputCls}
                >
                  {SPECIALITES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>TJM (€)</FieldLabel>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={formData.tjm || ''}
                    onChange={e => setFormData(p => ({ ...p, tjm: Number(e.target.value) }))}
                    className={clsx(inputCls, 'pr-8')}
                    placeholder="550"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">€</span>
                </div>
              </div>
              <div>
                <FieldLabel>Statut</FieldLabel>
                <select
                  value={formData.statut}
                  onChange={e => setFormData(p => ({ ...p, statut: e.target.value as FreelancerStatut }))}
                  className={inputCls}
                >
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="en mission">En mission</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. Infos légales */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Infos légales</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>SIRET</FieldLabel>
                <input
                  type="text"
                  value={formData.siret}
                  onChange={e => setFormData(p => ({ ...p, siret: e.target.value }))}
                  className={inputCls}
                  placeholder="000 000 000 00000"
                />
              </div>
              <div>
                <FieldLabel>Numéro TVA</FieldLabel>
                <input
                  type="text"
                  value={formData.numeroTVA}
                  onChange={e => setFormData(p => ({ ...p, numeroTVA: e.target.value }))}
                  className={inputCls}
                  placeholder="FR 00 000000000"
                />
              </div>
            </div>
            {/* TVA applicable */}
            <div className="mt-3 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setFormData(p => ({ ...p, tvaApplicable: !p.tvaApplicable, tauxTva: !p.tvaApplicable ? 20 : 0 }))}
                  className={clsx(
                    'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer',
                    formData.tvaApplicable
                      ? 'bg-primary-500 border-primary-500'
                      : 'bg-transparent border-slate-500 hover:border-primary-400'
                  )}
                >
                  {formData.tvaApplicable && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className={clsx('text-xs font-medium', formData.tvaApplicable ? 'text-white' : 'text-slate-400')}>
                  Assujetti à la TVA
                </span>
              </label>
              {formData.tvaApplicable && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">Taux :</span>
                  {[5.5, 10, 20].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, tauxTva: t }))}
                      className={clsx(
                        'px-2 py-0.5 text-[10px] font-bold rounded-md border transition-all',
                        formData.tauxTva === t
                          ? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
                          : 'bg-card border-card-border text-slate-500 hover:text-white'
                      )}
                    >
                      {t}%
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!formData.tvaApplicable && (
              <p className="text-[10px] text-slate-500 mt-1">TVA non applicable — article 293B du CGI (micro-entreprise)</p>
            )}
          </div>

          {/* 5. Coordonnées bancaires */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Coordonnées bancaires</p>
            <div className="space-y-3">
              <div>
                <FieldLabel>IBAN</FieldLabel>
                <input
                  type="text"
                  value={formData.iban}
                  onChange={e => setFormData(p => ({ ...p, iban: e.target.value.toUpperCase() }))}
                  className={clsx(inputCls, 'font-mono')}
                  placeholder="FR76 1234 5678 9012 3456 7890 123"
                />
                {formData.iban && !validateIBAN(formData.iban).valid && (
                  <p className="text-red-400 text-[10px] mt-1">{validateIBAN(formData.iban).error}</p>
                )}
              </div>
              <div>
                <FieldLabel>BIC / SWIFT</FieldLabel>
                <input
                  type="text"
                  value={formData.bic}
                  onChange={e => setFormData(p => ({ ...p, bic: e.target.value.toUpperCase() }))}
                  className={clsx(inputCls, 'font-mono')}
                  placeholder="BNPAFRPP"
                />
                {formData.bic && !validateBIC(formData.bic).valid && (
                  <p className="text-red-400 text-[10px] mt-1">{validateBIC(formData.bic).error}</p>
                )}
              </div>
            </div>
          </div>

          {/* 6. Tags */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tags</p>
            <TagPicker
              selected={formData.tags}
              onChange={(tags) => setFormData(p => ({ ...p, tags }))}
            />
          </div>

          {/* 6. Notes */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Notes</p>
            <textarea
              value={formData.notes}
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              rows={4}
              className={clsx(inputCls, 'resize-none')}
              placeholder="Informations complémentaires, contexte de collaboration…"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:bg-card-hover hover:text-white transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-glow-purple"
            >
              {editingId ? 'Mettre à jour' : 'Créer le prestataire'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Delete ─────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => { if (confirmDeleteId) handleDelete(confirmDeleteId); }}
        title="Supprimer le prestataire ?"
        message="Cette action est irréversible. Toutes les données associées seront perdues."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />
    </div>
  );
};

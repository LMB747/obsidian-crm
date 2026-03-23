import React, { useState } from 'react';
import {
  Building2, Mail, Phone, MapPin, Hash, Globe,
  Key, Zap, Database, CreditCard, Eye, EyeOff,
  CheckCircle2, AlertCircle, AlertTriangle, Loader2, Save, RefreshCw,
  Palette, Bell, Shield, Moon
} from 'lucide-react';
import { useStore } from '../store/useStore';
import clsx from 'clsx';

type Tab = 'agence' | 'integrations' | 'notifications' | 'securite';

const tabs: { id: Tab; label: string; icon: React.FC<any> }[] = [
  { id: 'agence',        label: 'Agence',        icon: Building2 },
  { id: 'integrations',  label: 'Intégrations',  icon: Zap },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'securite',      label: 'Sécurité',      icon: Shield },
];

function MaskedInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all font-mono placeholder-slate-600"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function Field({ label, icon: Icon, value, onChange, placeholder, type = 'text', hint }: any) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />}
        <input
          type={type}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          className={clsx(
            'w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all placeholder-slate-600',
            Icon ? 'pl-9 pr-3' : 'px-3'
          )}
        />
      </div>
      {hint && <p className="text-slate-600 text-xs mt-1">{hint}</p>}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h3 className="font-display font-bold text-white text-base">{title}</h3>
      {subtitle && <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>}
    </div>
  );
}

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('agence');
  const [localSettings, setLocalSettings] = useState({ ...settings });
  const [saved, setSaved] = useState(false);
  const [testingResend, setTestingResend] = useState(false);
  const [resendTestResult, setResendTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testingRC, setTestingRC] = useState(false);
  const [rcTestResult, setRcTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const setField = (key: keyof typeof localSettings) => (val: string) => {
    setLocalSettings(s => ({ ...s, [key]: val }));
    setSaved(false);
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTestResend = async () => {
    if (!localSettings.resendApiKey) return;
    setTestingResend(true);
    setResendTestResult(null);
    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${localSettings.resendApiKey}` },
      });
      if (res.ok) {
        setResendTestResult({ ok: true, msg: 'Clé API valide — connexion réussie !' });
      } else {
        const d = await res.json();
        setResendTestResult({ ok: false, msg: d.message ?? `Erreur ${res.status}` });
      }
    } catch {
      setResendTestResult({ ok: false, msg: 'Erreur réseau' });
    }
    setTestingResend(false);
  };

  const handleTestRevenueCat = async () => {
    if (!localSettings.revenueCatApiKey) return;
    setTestingRC(true);
    setRcTestResult(null);
    try {
      // Appel à un subscriber inexistant — 404 = clé valide, 401 = clé invalide
      const res = await fetch('https://api.revenuecat.com/v1/subscribers/rc_test_connection', {
        headers: { Authorization: `Bearer ${localSettings.revenueCatApiKey}` },
      });
      if (res.status === 404) {
        setRcTestResult({ ok: true, msg: 'Clé API valide — connexion réussie !' });
      } else if (res.status === 401) {
        setRcTestResult({ ok: false, msg: 'Clé API invalide (401 Unauthorized)' });
      } else {
        setRcTestResult({ ok: true, msg: `Connexion établie (HTTP ${res.status})` });
      }
    } catch {
      setRcTestResult({ ok: false, msg: 'Erreur réseau — vérifier CORS ou la clé' });
    }
    setTestingRC(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-white text-2xl">Paramètres</h1>
          <p className="text-slate-400 text-sm mt-0.5">Configuration de votre espace de travail Obsidian CRM</p>
        </div>
        <button
          onClick={handleSave}
          className={clsx(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all',
            saved
              ? 'bg-accent-green/20 border border-accent-green/30 text-accent-green'
              : 'bg-gradient-primary border border-primary-500/40 text-white hover:opacity-90 shadow-glow-purple'
          )}
        >
          {saved ? <><CheckCircle2 className="w-4 h-4" /> Sauvegardé</> : <><Save className="w-4 h-4" /> Sauvegarder</>}
        </button>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-card border border-card-border rounded-xl p-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-card-hover'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Agence Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'agence' && (
        <div className="bg-card border border-card-border rounded-2xl p-6 space-y-6">
          <SectionHeader title="Informations de l'agence" subtitle="Ces données apparaissent sur vos documents (factures, devis, contrats)" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Nom de l'agence" icon={Building2} value={localSettings.nom} onChange={setField('nom')} placeholder="Obsidian Agency" />
            </div>
            <Field label="Email professionnel" icon={Mail} value={localSettings.email} onChange={setField('email')} placeholder="contact@agence.fr" type="email" />
            <Field label="Téléphone" icon={Phone} value={localSettings.telephone} onChange={setField('telephone')} placeholder="+33 6 00 00 00 00" />
            <div className="md:col-span-2">
              <Field label="Adresse" icon={MapPin} value={localSettings.adresse} onChange={setField('adresse')} placeholder="12 Rue des Créatifs, 75010 Paris" />
            </div>
            <Field label="SIRET" icon={Hash} value={localSettings.siret} onChange={setField('siret')} placeholder="000 000 000 00000" />
            <Field label="Logo URL" icon={Globe} value={localSettings.logoUrl} onChange={setField('logoUrl')} placeholder="https://..." hint="URL directe vers votre logo (PNG ou SVG)" />
          </div>

          {/* Preview */}
          {(localSettings.nom || localSettings.email) && (
            <div className="bg-obsidian-700/50 border border-card-border/50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Aperçu entête document</p>
              <div className="flex items-start gap-4">
                {localSettings.logoUrl && (
                  <img src={localSettings.logoUrl} alt="logo" className="w-12 h-12 object-contain rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div>
                  <p className="text-white font-bold text-base">{localSettings.nom || '—'}</p>
                  <p className="text-slate-400 text-xs">{localSettings.adresse || '—'}</p>
                  <p className="text-slate-400 text-xs">{localSettings.email} · {localSettings.telephone}</p>
                  {localSettings.siret && <p className="text-slate-500 text-xs">SIRET : {localSettings.siret}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Intégrations Tab ────────────────────────────────────────────────── */}
      {activeTab === 'integrations' && (
        <div className="space-y-4">

          {/* Resend */}
          <div className="bg-card border border-card-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white">Resend — Envoi d'emails</h3>
                <p className="text-slate-400 text-xs">Envoie tes factures, devis et contrats directement par email</p>
              </div>
              <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                Créer un compte →
              </a>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  <Key className="w-3 h-3 inline mr-1" />
                  Clé API Resend
                </label>
                <MaskedInput
                  value={localSettings.resendApiKey}
                  onChange={setField('resendApiKey')}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
                <p className="text-slate-600 text-xs mt-1">Trouve ta clé dans resend.com → API Keys</p>
              </div>
              <Field
                label="Expéditeur (From)"
                icon={Mail}
                value={localSettings.resendFrom}
                onChange={setField('resendFrom')}
                placeholder="Obsidian Agency <noreply@tondomaine.fr>"
                hint="Format: Nom Affiché <email@domain.com> — Le domaine doit être vérifié dans Resend"
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestResend}
                  disabled={!localSettings.resendApiKey || testingResend}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-card-border text-slate-300 hover:text-white hover:border-primary-500/40 rounded-xl transition-all disabled:opacity-40"
                >
                  {testingResend ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Tester la connexion
                </button>
                {resendTestResult && (
                  <div className={clsx('flex items-center gap-1.5 text-sm', resendTestResult.ok ? 'text-accent-green' : 'text-accent-red')}>
                    {resendTestResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {resendTestResult.msg}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RevenueCat */}
          <div className="bg-card border border-card-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                <Moon className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white">RevenueCat — Abonnements in-app</h3>
                <p className="text-slate-400 text-xs">Synchronisation des abonnements Pay to Snooze iOS / Android</p>
              </div>
              <a
                href="https://app.revenuecat.com"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                Dashboard →
              </a>
            </div>

            <div className="space-y-4">
              {/* API Key */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  <Key className="w-3 h-3 inline mr-1" />
                  Clé API secrète (Secret API Key)
                </label>
                <MaskedInput
                  value={localSettings.revenueCatApiKey}
                  onChange={setField('revenueCatApiKey')}
                  placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
                <p className="text-slate-600 text-xs mt-1">
                  app.revenuecat.com → Projet → API Keys → Secret keys
                </p>
              </div>

              {/* Project ID */}
              <Field
                label="Project ID (optionnel)"
                icon={Hash}
                value={localSettings.revenueCatProjectId}
                onChange={setField('revenueCatProjectId')}
                placeholder="proj_xxxxxxxxxx"
                hint="app.revenuecat.com → Project Settings → Project ID — utilisé pour les imports en masse"
              />

              {/* Test button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestRevenueCat}
                  disabled={!localSettings.revenueCatApiKey || testingRC}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-card-border text-slate-300 hover:text-white hover:border-cyan-500/40 rounded-xl transition-all disabled:opacity-40"
                >
                  {testingRC ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Tester la connexion
                </button>
                {rcTestResult && (
                  <div className={clsx('flex items-center gap-1.5 text-sm', rcTestResult.ok ? 'text-accent-green' : 'text-accent-red')}>
                    {rcTestResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {rcTestResult.msg}
                  </div>
                )}
              </div>

              {/* Warning: not configured */}
              {!localSettings.revenueCatApiKey && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-300 mb-1">Intégration RevenueCat non configurée</p>
                    <p className="text-xs text-amber-400/80">Pour connecter RevenueCat, ajoutez <code className="bg-amber-500/20 px-1 rounded">VITE_REVENUECAT_API_KEY</code> dans vos variables d'environnement Netlify. Le suivi manuel des abonnements reste disponible en attendant.</p>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="flex items-start gap-3 bg-cyan-500/8 border border-cyan-500/20 rounded-xl p-3">
                <AlertCircle className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-500 text-xs leading-relaxed">
                  La clé secrète permet de récupérer les données de chaque abonné (plan, statut, date d'expiration) depuis l'onglet <strong className="text-slate-300">RevenueCat</strong> de Pay to Snooze. Les pénalités restent gérées indépendamment.
                </p>
              </div>
            </div>
          </div>

          {/* Stripe */}
          <div className="bg-card border border-card-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-accent-cyan" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white">Stripe — Paiements</h3>
                <p className="text-slate-400 text-xs">Tracking des abonnements Pay to Snooze en temps réel</p>
              </div>
              <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">Sprint 4</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                <Key className="w-3 h-3 inline mr-1" />
                Clé secrète Stripe
              </label>
              <MaskedInput
                value={localSettings.stripeKey}
                onChange={setField('stripeKey')}
                placeholder="sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <p className="text-slate-600 text-xs mt-1">Clé secrète depuis dashboard.stripe.com → Développeurs → Clés API</p>
            </div>
          </div>

          {/* Supabase */}
          <div className="bg-card border border-card-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-accent-green" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white">Supabase — Base de données</h3>
                <p className="text-slate-400 text-xs">Remplace le localStorage par une vraie DB cloud</p>
              </div>
              <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">Sprint 4</span>
            </div>
            <div className="space-y-3">
              <Field
                label="URL du projet"
                icon={Globe}
                value={localSettings.supabaseUrl}
                onChange={setField('supabaseUrl')}
                placeholder="https://xxxx.supabase.co"
              />
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  <Key className="w-3 h-3 inline mr-1" />
                  Clé anonyme (anon key)
                </label>
                <MaskedInput
                  value={localSettings.supabaseKey}
                  onChange={setField('supabaseKey')}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Notifications Tab ───────────────────────────────────────────────── */}
      {activeTab === 'notifications' && (
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <SectionHeader title="Préférences de notification" subtitle="Choisissez quand recevoir des alertes" />
          <div className="space-y-4">
            {[
              { label: 'Facture en retard de paiement', desc: 'Alerte 7 jours après l\'échéance' },
              { label: 'Nouvel abonnement Pay to Snooze', desc: 'Notification en temps réel' },
              { label: 'Milestone de projet atteint', desc: 'Célébrer chaque victoire' },
              { label: 'Budget projet dépassé', desc: 'Quand les dépenses > budget' },
              { label: 'Email envoyé avec succès', desc: 'Confirmation après chaque envoi' },
              { label: 'Session timer enregistrée', desc: 'Confirmation du suivi de temps' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-obsidian-700/40 rounded-xl border border-card-border/40">
                <div>
                  <p className="text-white text-sm font-medium">{item.label}</p>
                  <p className="text-slate-500 text-xs">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-obsidian-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            ))}
          </div>
          <p className="text-slate-600 text-xs mt-4 text-center">Les notifications push (navigateur) seront disponibles en Sprint 4</p>
        </div>
      )}

      {/* ── Sécurité Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'securite' && (
        <div className="space-y-4">
          <div className="bg-card border border-card-border rounded-2xl p-6">
            <SectionHeader title="Données locales" subtitle="Toutes vos données sont stockées dans le navigateur (localStorage)" />
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-obsidian-700/40 rounded-xl border border-card-border/40">
                <div>
                  <p className="text-white text-sm font-medium">Exporter les données</p>
                  <p className="text-slate-500 text-xs">Sauvegarde JSON complète de tout le CRM</p>
                </div>
                <button
                  onClick={() => {
                    const state = useStore.getState();
                    const data = { clients: state.clients, projects: state.projects, invoices: state.invoices, timerSessions: state.timerSessions };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `obsidian-crm-backup-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-accent-green/30 text-accent-green bg-accent-green/10 rounded-lg hover:bg-accent-green/20 transition-all"
                >
                  Exporter JSON
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-obsidian-700/40 rounded-xl border border-card-border/40">
                <div>
                  <p className="text-white text-sm font-medium">Réinitialiser les données</p>
                  <p className="text-slate-500 text-xs">Revenir aux données de démonstration</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('⚠️ Cette action supprime toutes vos données. Continuer ?')) {
                      localStorage.removeItem('obsidian-crm-storage');
                      window.location.reload();
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-accent-red/30 text-accent-red bg-accent-red/10 rounded-lg hover:bg-accent-red/20 transition-all"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-2xl p-6">
            <SectionHeader title="Sécurité des clés API" />
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-300/80 space-y-1">
                <p className="font-semibold text-amber-300">Application locale uniquement</p>
                <p>Tes clés API sont stockées dans localStorage. Cette app est conçue pour un usage personnel/interne sur ta machine.</p>
                <p>Pour un déploiement public, migre vers Sprint 4 (backend Supabase + variables d'environnement sécurisées).</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Save Button (sticky bottom) ──────────────────────────────────────── */}
      <div className="flex justify-end pb-6">
        <button
          onClick={handleSave}
          className={clsx(
            'flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all',
            saved
              ? 'bg-accent-green/20 border border-accent-green/30 text-accent-green'
              : 'bg-gradient-primary border border-primary-500/40 text-white hover:opacity-90 shadow-glow-purple'
          )}
        >
          {saved ? <><CheckCircle2 className="w-4 h-4" /> Sauvegardé !</> : <><Save className="w-4 h-4" /> Sauvegarder les modifications</>}
        </button>
      </div>
    </div>
  );
};

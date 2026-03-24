import React, { useState } from 'react';
import { Zap, Building2, Mail, Lock, Eye, EyeOff, AlertCircle, Phone, MapPin, Hash, ChevronRight, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { hashPassword } from '../../utils/crypto';

interface SetupData {
  agencyName: string;
  adminEmail: string;
  passwordHash: string;
}

interface FirstRunSetupProps {
  onSetup: (data: SetupData) => void;
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const level = score <= 2 ? 'faible' : score <= 3 ? 'moyen' : 'fort';
  const colorClass = level === 'faible' ? 'text-red-400' : level === 'moyen' ? 'text-amber-400' : 'text-green-400';
  const barColor = level === 'faible' ? 'bg-red-500' : level === 'moyen' ? 'bg-amber-500' : 'bg-green-500';
  const barWidth = level === 'faible' ? 'w-1/3' : level === 'moyen' ? 'w-2/3' : 'w-full';

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Force du mot de passe</span>
        <span className={clsx('text-xs font-semibold capitalize', colorClass)}>{level}</span>
      </div>
      <div className="w-full h-1.5 bg-obsidian-700 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all duration-300', barColor, barWidth)} />
      </div>
    </div>
  );
}

export const FirstRunSetup: React.FC<FirstRunSetupProps> = ({ onSetup }) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [agencyName, setAgencyName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [siret, setSiret] = useState('');
  const [adresse, setAdresse] = useState('');
  const [telephone, setTelephone] = useState('');

  // Step 2 fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!agencyName.trim()) e.agencyName = 'Le nom de l\'agence est requis.';
    if (!adminEmail.trim()) e.adminEmail = 'L\'adresse email est requise.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) e.adminEmail = 'Adresse email invalide.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!password) e.password = 'Le mot de passe est requis.';
    else if (password.length < 6) e.password = 'Minimum 6 caractères.';
    if (!confirmPassword) e.confirmPassword = 'Veuillez confirmer le mot de passe.';
    else if (password !== confirmPassword) e.confirmPassword = 'Les mots de passe ne correspondent pas.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setErrors({});
      setStep(2);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setIsLoading(true);
    try {
      const passwordHash = await hashPassword(password);
      onSetup({
        agencyName: agencyName.trim(),
        adminEmail: adminEmail.trim(),
        passwordHash,
      });
    } catch {
      setErrors({ submit: 'Une erreur inattendue est survenue. Veuillez réessayer.' });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-900 flex items-center justify-center p-4">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-obsidian-800 border border-card-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Top gradient accent */}
          <div className="h-1 w-full bg-gradient-to-r from-primary-500 via-purple-500 to-primary-400" />

          <div className="px-8 py-10">
            {/* Logo */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-purple mb-4">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <p className="font-display font-bold text-white text-xl tracking-wide">OBSIDIAN</p>
              <p className="text-xs text-slate-400 font-medium tracking-widest uppercase mt-0.5">Agency CRM</p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-3 mb-8">
              {[1, 2].map(s => (
                <React.Fragment key={s}>
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                    step === s
                      ? 'bg-primary-600 text-white shadow-glow-purple'
                      : s < step
                        ? 'bg-green-500/30 text-green-400 border border-green-500/40'
                        : 'bg-obsidian-700 text-slate-500 border border-card-border'
                  )}>
                    {s < step ? '✓' : s}
                  </div>
                  {s < 2 && (
                    <div className={clsx('h-px w-12 transition-all', s < step ? 'bg-green-500/40' : 'bg-card-border')} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Title */}
            <div className="text-center mb-7">
              <h1 className="text-xl font-bold text-white mb-1">
                {step === 1 ? 'Première configuration' : 'Mot de passe administrateur'}
              </h1>
              <p className="text-slate-400 text-sm">
                {step === 1
                  ? 'Étape 1/2 — Informations de votre agence'
                  : 'Étape 2/2 — Sécurisez votre accès'}
              </p>
            </div>

            {/* ── STEP 1 ────────────────────────────────────────────────── */}
            {step === 1 && (
              <form onSubmit={handleStep1Next} className="space-y-4">
                {/* Nom agence */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Nom de l'agence <span className="text-primary-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={agencyName}
                      onChange={e => { setAgencyName(e.target.value); setErrors(p => ({ ...p, agencyName: '' })); }}
                      placeholder="Obsidian Agency"
                      className={clsx(
                        'w-full bg-obsidian-900 border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 text-sm outline-none transition-all',
                        errors.agencyName ? 'border-red-500/60 focus:border-red-500' : 'border-card-border focus:border-primary-500/60 focus:shadow-glow-purple'
                      )}
                      autoFocus
                    />
                  </div>
                  {errors.agencyName && <p className="text-red-400 text-xs">{errors.agencyName}</p>}
                </div>

                {/* Email admin */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Adresse email admin <span className="text-primary-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={e => { setAdminEmail(e.target.value); setErrors(p => ({ ...p, adminEmail: '' })); }}
                      placeholder="admin@monagence.fr"
                      className={clsx(
                        'w-full bg-obsidian-900 border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 text-sm outline-none transition-all',
                        errors.adminEmail ? 'border-red-500/60 focus:border-red-500' : 'border-card-border focus:border-primary-500/60 focus:shadow-glow-purple'
                      )}
                    />
                  </div>
                  {errors.adminEmail && <p className="text-red-400 text-xs">{errors.adminEmail}</p>}
                </div>

                {/* SIRET (optionnel) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    SIRET <span className="text-slate-600">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={siret}
                      onChange={e => setSiret(e.target.value)}
                      placeholder="000 000 000 00000"
                      className="w-full bg-obsidian-900 border border-card-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 text-sm outline-none transition-all focus:border-primary-500/60"
                    />
                  </div>
                </div>

                {/* Adresse (optionnel) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Adresse <span className="text-slate-600">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={adresse}
                      onChange={e => setAdresse(e.target.value)}
                      placeholder="12 Rue des Créatifs, 75010 Paris"
                      className="w-full bg-obsidian-900 border border-card-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 text-sm outline-none transition-all focus:border-primary-500/60"
                    />
                  </div>
                </div>

                {/* Téléphone (optionnel) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Téléphone <span className="text-slate-600">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="tel"
                      value={telephone}
                      onChange={e => setTelephone(e.target.value)}
                      placeholder="+33 6 00 00 00 00"
                      className="w-full bg-obsidian-900 border border-card-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 text-sm outline-none transition-all focus:border-primary-500/60"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 hover:shadow-glow-purple transition-all duration-200 flex items-center justify-center gap-2 mt-2"
                >
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* ── STEP 2 ────────────────────────────────────────────────── */}
            {step === 2 && (
              <form onSubmit={handleStep2Submit} className="space-y-5">
                {/* Mot de passe */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Mot de passe <span className="text-primary-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                      placeholder="••••••••"
                      className={clsx(
                        'w-full bg-obsidian-900 border rounded-xl pl-10 pr-12 py-3 text-white placeholder-slate-600 text-sm outline-none transition-all',
                        errors.password ? 'border-red-500/60 focus:border-red-500' : 'border-card-border focus:border-primary-500/60 focus:shadow-glow-purple'
                      )}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs">{errors.password}</p>}
                  <PasswordStrength password={password} />
                </div>

                {/* Confirmer */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Confirmer le mot de passe <span className="text-primary-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '' })); }}
                      placeholder="••••••••"
                      className={clsx(
                        'w-full bg-obsidian-900 border rounded-xl pl-10 pr-12 py-3 text-white placeholder-slate-600 text-sm outline-none transition-all',
                        errors.confirmPassword ? 'border-red-500/60 focus:border-red-500' : 'border-card-border focus:border-primary-500/60 focus:shadow-glow-purple'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-400 text-xs">{errors.confirmPassword}</p>}
                </div>

                {/* Info */}
                <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-300/80 text-xs leading-relaxed">
                    Ce mot de passe ne peut pas être récupéré. Notez-le dans un endroit sécurisé.
                  </p>
                </div>

                {errors.submit && (
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{errors.submit}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setErrors({}); }}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm text-slate-400 border border-card-border hover:text-white hover:border-slate-500 transition-all"
                  >
                    Retour
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={clsx(
                      'flex-[2] py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200',
                      'bg-gradient-to-r from-primary-600 to-purple-600',
                      'hover:from-primary-500 hover:to-purple-500 hover:shadow-glow-purple',
                      'disabled:opacity-60 disabled:cursor-not-allowed',
                      'flex items-center justify-center gap-2'
                    )}
                  >
                    {isLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Configuration en cours…
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Finaliser la configuration
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-obsidian-900/50 border-t border-card-border text-center">
            <p className="text-slate-600 text-xs">v2.0 — Obsidian Agency CRM — Premier lancement</p>
          </div>
        </div>
      </div>
    </div>
  );
};

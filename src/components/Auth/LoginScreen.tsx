import React, { useState } from 'react';
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setIsLoading(true);
    setError(null);

    // Small delay for UX feel
    await new Promise(resolve => setTimeout(resolve, 400));

    const result = await onLogin(email.trim(), password);
    if (!result.success) {
      setError(result.error ?? 'Erreur de connexion.');
    }
    setIsLoading(false);
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
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-purple mb-4">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <p className="font-display font-bold text-white text-xl tracking-wide">OBSIDIAN</p>
              <p className="text-xs text-slate-400 font-medium tracking-widest uppercase mt-0.5">Agency CRM</p>
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Connexion</h1>
              <p className="text-slate-400 text-sm">
                Entrez vos identifiants pour accéder à votre espace
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 w-4 h-4" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(null); }}
                    placeholder="admin@obsidian.agency"
                    className={clsx(
                      'w-full bg-obsidian-900 border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 text-sm transition-all outline-none',
                      error
                        ? 'border-red-500/60 focus:border-red-500'
                        : 'border-card-border focus:border-primary-500/60 focus:shadow-glow-purple'
                    )}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    placeholder="••••••••"
                    className={clsx(
                      'w-full bg-obsidian-900 border rounded-xl pl-10 pr-12 py-3 text-white placeholder-slate-600 text-sm transition-all outline-none',
                      error
                        ? 'border-red-500/60 focus:border-red-500'
                        : 'border-card-border focus:border-primary-500/60 focus:shadow-glow-purple'
                    )}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className={clsx(
                  'w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200',
                  'bg-gradient-to-r from-primary-600 to-purple-600',
                  'hover:from-primary-500 hover:to-purple-500 hover:shadow-glow-purple',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/50'
                )}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Connexion en cours…
                  </span>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-obsidian-900/50 border-t border-card-border text-center">
            <p className="text-slate-600 text-xs">v2.0 — Obsidian Agency CRM</p>
          </div>
        </div>
      </div>
    </div>
  );
};

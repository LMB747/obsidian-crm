import React, { useState } from 'react';
import { X, Send, Mail, User, AlertCircle, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { sendEmailViaResend, buildEmailHtml } from '../../lib/emailService';
import clsx from 'clsx';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  docType: string;
  docNumero: string;
  clientNom: string;
  clientEmail: string;
  montantTTC?: number;
  iframeDoc?: Document | null;
}

type SendState = 'idle' | 'sending' | 'success' | 'error';

export const EmailModal: React.FC<EmailModalProps> = ({
  isOpen, onClose,
  docType, docNumero, clientNom, clientEmail, montantTTC,
}) => {
  const { settings } = useStore();

  const [to, setTo]           = useState(clientEmail);
  const [cc, setCc]           = useState('');
  const [subject, setSubject] = useState(`${docType} ${docNumero} — ${settings.nom}`);
  const [message, setMessage] = useState(
    `Veuillez trouver ci-joint votre ${docType.toLowerCase()} ${docNumero}.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\n${settings.nom}`
  );
  const [sendState, setSendState] = useState<SendState>('idle');
  const [errorMsg, setErrorMsg]   = useState('');

  const hasApiKey = !!settings.resendApiKey;

  const handleSend = async () => {
    if (!hasApiKey) return;
    setSendState('sending');
    setErrorMsg('');

    const htmlBody = buildEmailHtml({
      agencyName: settings.nom,
      docType,
      docNumero,
      clientNom,
      montantTTC,
      message,
    });

    const result = await sendEmailViaResend({
      resendApiKey: settings.resendApiKey,
      from: settings.resendFrom || `${settings.nom} <noreply@resend.dev>`,
      to,
      cc: cc || undefined,
      subject,
      htmlBody,
    });

    if (result.success) {
      setSendState('success');
      setTimeout(() => { onClose(); setSendState('idle'); }, 2000);
    } else {
      setSendState('error');
      setErrorMsg(result.error ?? 'Erreur inconnue');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-obsidian-800 border border-card-border rounded-2xl shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="font-display font-bold text-white">Envoyer par email</h2>
              <p className="text-slate-400 text-xs">{docType} {docNumero}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-card transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* No API key warning */}
          {!hasApiKey && (
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 text-sm font-semibold">Clé API Resend manquante</p>
                <p className="text-amber-400/70 text-xs mt-1">
                  Configure ta clé Resend dans{' '}
                  <button
                    className="underline hover:text-amber-300"
                    onClick={() => { onClose(); useStore.getState().setActiveSection('settings'); }}
                  >
                    Paramètres → Intégrations
                  </button>
                  {' '}pour pouvoir envoyer des emails.
                </p>
              </div>
            </div>
          )}

          {/* To */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              <User className="w-3 h-3 inline mr-1" />
              Destinataire
            </label>
            <input
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="email@client.com"
              className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all placeholder-slate-600"
            />
          </div>

          {/* CC */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">CC (optionnel)</label>
            <input
              type="email"
              value={cc}
              onChange={e => setCc(e.target.value)}
              placeholder="copie@exemple.com"
              className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all placeholder-slate-600"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Objet</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none placeholder-slate-600"
            />
          </div>

          {/* Error */}
          {sendState === 'error' && (
            <div className="flex items-start gap-2 p-3 bg-accent-red/10 border border-accent-red/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
              <p className="text-accent-red text-sm">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-card-border">
          <p className="text-slate-500 text-xs">
            Expéditeur : <span className="text-slate-400">{settings.resendFrom || '—'}</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSend}
              disabled={!hasApiKey || sendState === 'sending' || sendState === 'success' || !to}
              className={clsx(
                'flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all',
                sendState === 'success'
                  ? 'bg-accent-green/20 border border-accent-green/30 text-accent-green'
                  : !hasApiKey || !to
                  ? 'bg-slate-700 border border-card-border text-slate-500 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-500 border border-primary-500 text-white'
              )}
            >
              {sendState === 'sending' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</>
              ) : sendState === 'success' ? (
                <><CheckCircle2 className="w-4 h-4" /> Envoyé !</>
              ) : (
                <><Send className="w-4 h-4" /> Envoyer</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

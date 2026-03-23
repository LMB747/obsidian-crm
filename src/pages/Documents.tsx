import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  FileText, FilePlus2, FileSignature,
  Printer, Plus, Trash2, RefreshCw,
  User, Building2, Mail, Phone, MapPin, Hash,
  Calendar, CheckCircle2, AlertCircle, Loader2, Send,
  Save, BookOpen, ChevronDown, ChevronUp, Copy,
  Zap, GripVertical, Euro, Percent, StickyNote,
  ArrowUpRight, RotateCcw, Search, X, Briefcase
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { injectFacture, injectDevis, injectContrat } from '../lib/documentInjector';
import { EmailModal } from '../components/EmailModal/EmailModal';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────
type DocType = 'facture' | 'devis' | 'contrat';

interface ServiceItem {
  id: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  tarif: string;
  offert: boolean;
}

interface FormState {
  numero: string;
  date: string;
  echeance: string;
  validite: string;
  clientNom: string;
  clientEntreprise: string;
  clientSiret: string;
  clientAdresse: string;
  clientEmail: string;
  clientTel: string;
  clientRepresentant: string;
  projetNom: string;
  projetObjet: string;
  dateDebut: string;
  dateFin: string;
  tvaPercent: number;
  acomptePercent: number;
  acompteDejaVerse: boolean;
  dateAcompte: string;
  notes: string;
}

const DOC_CONFIG: Record<DocType, {
  label: string; icon: React.FC<any>; color: string;
  bg: string; border: string; template: string;
  accentClass: string;
}> = {
  facture: {
    label: 'Facture', icon: FileText, color: 'text-accent-green',
    bg: 'bg-accent-green/10', border: 'border-accent-green/40',
    template: '/templates/facture.html', accentClass: 'accent-green',
  },
  devis: {
    label: 'Devis', icon: FilePlus2, color: 'text-accent-cyan',
    bg: 'bg-accent-cyan/10', border: 'border-accent-cyan/40',
    template: '/templates/devis.html', accentClass: 'accent-cyan',
  },
  contrat: {
    label: 'Contrat', icon: FileSignature, color: 'text-amber-400',
    bg: 'bg-amber-500/10', border: 'border-amber-500/40',
    template: '/templates/contrat.html', accentClass: 'amber',
  },
};

const TVA_PRESETS = [0, 5.5, 10, 20];

function newItem(): ServiceItem {
  return { id: uuidv4(), description: '', quantite: 1, prixUnitaire: 0, total: 0, tarif: '', offert: false };
}

function buildNumero(type: DocType, count: number): string {
  const year = new Date().getFullYear();
  const prefix = { facture: 'FA', devis: 'DE', contrat: 'CO' }[type];
  return `${prefix}-${year}-${String(count).padStart(3, '0')}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  icon: React.FC<any>; title: string; open: boolean; onToggle: () => void; count?: number;
}> = ({ icon: Icon, title, open, onToggle, count }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center gap-2 px-4 py-3 border-b border-card-border hover:bg-obsidian-700/30 transition-colors group"
  >
    <div className="w-6 h-6 rounded-lg bg-primary-500/15 flex items-center justify-center flex-shrink-0">
      <Icon className="w-3.5 h-3.5 text-primary-400" />
    </div>
    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex-1 text-left">{title}</span>
    {count !== undefined && (
      <span className="text-xs text-slate-500 bg-obsidian-600 px-1.5 py-0.5 rounded-full">{count}</span>
    )}
    {open
      ? <ChevronUp className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
      : <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
    }
  </button>
);

const FieldInput: React.FC<{
  label: string; icon?: React.FC<any>; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; className?: string; disabled?: boolean; hint?: string;
}> = ({ label, icon: Icon, value, onChange, type = 'text', placeholder, className = '', disabled, hint }) => (
  <div className={className}>
    <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={clsx(
          'w-full bg-obsidian-700 border border-card-border text-white text-xs rounded-lg py-2 pr-2 placeholder-slate-600',
          'focus:outline-none focus:ring-1 focus:ring-primary-500/60 focus:border-primary-500/60 transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          Icon ? 'pl-7' : 'pl-2.5'
        )}
      />
    </div>
    {hint && <p className="text-slate-600 text-[10px] mt-0.5">{hint}</p>}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export const Documents: React.FC = () => {
  const { clients, freelancers, invoices, addInvoice, settings } = useStore();

  const today    = useMemo(() => new Date().toISOString().split('T')[0], []);
  const in30days = useMemo(() => new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], []);

  // ── Core state ──────────────────────────────────────────────────────────────
  const [docType, setDocType]             = useState<DocType>('facture');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearch, setClientSearch]   = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [selectedFreelancerId, setSelectedFreelancerId] = useState('');
  const [selectedFreelancerIds, setSelectedFreelancerIds] = useState<string[]>([]);
  const [freelancerSearch, setFreelancerSearch] = useState('');
  const [showFreelancerSearch, setShowFreelancerSearch] = useState(false);
  const [iframeLoaded, setIframeLoaded]   = useState(false);
  const [injected, setInjected]           = useState(false);
  const [autoSync, setAutoSync]           = useState(true);
  const [syncing, setSyncing]             = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [savedToInvoices, setSavedToInvoices] = useState(false);
  const [savedAcompte, setSavedAcompte]     = useState(false);
  const [savedSolde, setSavedSolde]         = useState(false);
  const [saveError, setSaveError]           = useState('');
  const [convertBanner, setConvertBanner]   = useState(false);

  // Collapsible sections
  const [secDoc, setSecDoc]               = useState(true);
  const [secClient, setSecClient]         = useState(true);
  const [secPrestataire, setSecPrestataire] = useState(false);
  const [secPrestations, setSecPrestations] = useState(true);
  const [secFinance, setSecFinance]       = useState(true);
  const [secNotes, setSecNotes]           = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Auto-number ──────────────────────────────────────────────────────────────
  const nextNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const count = invoices.filter(i => i.numero.includes(String(year))).length + 1;
    return buildNumero(docType, count);
  }, [docType, invoices]);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    numero: nextNumber,
    date: today,
    echeance: in30days,
    validite: in30days,
    clientNom: '', clientEntreprise: '', clientSiret: '',
    clientAdresse: '', clientEmail: '', clientTel: '',
    clientRepresentant: '', projetNom: '', projetObjet: '',
    dateDebut: today, dateFin: in30days,
    tvaPercent: 20, acomptePercent: 0, acompteDejaVerse: false, dateAcompte: '', notes: '',
  });

  const [items, setItems] = useState<ServiceItem[]>([newItem()]);

  const setF = (key: keyof FormState) => (val: string | number) => {
    setForm(f => ({ ...f, [key]: val }));
  };

  // ── Reset on doc type change ─────────────────────────────────────────────────
  useEffect(() => {
    setIframeLoaded(false);
    setInjected(false);
    setSavedToInvoices(false);
    setForm(f => ({ ...f, numero: nextNumber }));
  }, [docType]);

  // ── Auto-fill from client ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedClientId) return;
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;
    setForm(f => ({
      ...f,
      clientNom:          client.nom,
      clientEntreprise:   client.entreprise,
      clientSiret:        '',
      clientAdresse:      client.adresse || '',
      clientEmail:        client.email,
      clientTel:          client.telephone || '',
      clientRepresentant: client.nom,
    }));
    setClientSearch('');
    setShowClientSearch(false);
    setInjected(false);
  }, [selectedClientId, clients]);

  // ── Auto-fill from freelancer ────────────────────────────────────────────────
  const selectedFreelancer = useMemo(
    () => freelancers.find(f => f.id === selectedFreelancerId) ?? null,
    [selectedFreelancerId, freelancers]
  );

  // Multi-freelancers (pour les contrats)
  const selectedContractFreelancers = useMemo(
    () => freelancers.filter(f => selectedFreelancerIds.includes(f.id)),
    [selectedFreelancerIds, freelancers]
  );

  const addContractFreelancer = (id: string) => {
    if (!selectedFreelancerIds.includes(id)) {
      setSelectedFreelancerIds(prev => [...prev, id]);
      // Aussi mettre le premier comme freelancer principal pour injection
      if (!selectedFreelancerId) setSelectedFreelancerId(id);
    }
    setFreelancerSearch('');
    setShowFreelancerSearch(false);
    setInjected(false);
  };

  const removeContractFreelancer = (id: string) => {
    setSelectedFreelancerIds(prev => prev.filter(fid => fid !== id));
    if (selectedFreelancerId === id) {
      const remaining = selectedFreelancerIds.filter(fid => fid !== id);
      setSelectedFreelancerId(remaining[0] || '');
    }
    setInjected(false);
  };

  // ── Filtered freelancers for search ──────────────────────────────────────────
  const filteredFreelancers = useMemo(() => {
    if (!freelancerSearch) return freelancers.slice(0, 8);
    const q = freelancerSearch.toLowerCase();
    return freelancers.filter(f =>
      f.nom.toLowerCase().includes(q) ||
      f.prenom.toLowerCase().includes(q) ||
      f.entreprise.toLowerCase().includes(q) ||
      f.email.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [freelancers, freelancerSearch]);

  // ── Computed totals ──────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const ht      = Math.round(items.filter(i => !i.offert).reduce((s, i) => s + i.total, 0) * 100) / 100;
    const tva     = Math.round(ht * (form.tvaPercent / 100) * 100) / 100;
    const ttc     = Math.round((ht + tva) * 100) / 100;
    const acompte = form.acomptePercent > 0 ? Math.round(ttc * form.acomptePercent) / 100 : 0;
    const reste   = Math.round((ttc - acompte) * 100) / 100;
    return { ht, tva, ttc, acompte, reste };
  }, [items, form.tvaPercent, form.acomptePercent]);

  // ── Items management ─────────────────────────────────────────────────────────
  const updateItem = useCallback((id: string, field: keyof ServiceItem, val: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: val };
      if (field === 'quantite' || field === 'prixUnitaire') {
        updated.total = Math.round(Number(updated.quantite) * Number(updated.prixUnitaire) * 100) / 100;
        updated.tarif = updated.total > 0 ? `${updated.total.toLocaleString('fr-FR')} €` : '';
      }
      if (field === 'offert' && val) {
        updated.tarif = 'Offert';
      }
      return updated;
    }));
  }, []);

  const addItem    = () => setItems(p => [...p, newItem()]);
  const removeItem = (id: string) => setItems(p => p.length > 1 ? p.filter(i => i.id !== id) : p);
  const dupItem    = (id: string) => {
    const orig = items.find(i => i.id === id);
    if (!orig) return;
    const idx = items.findIndex(i => i.id === id);
    const copy = { ...orig, id: uuidv4() };
    setItems(p => [...p.slice(0, idx + 1), copy, ...p.slice(idx + 1)]);
  };

  // ── Injection ────────────────────────────────────────────────────────────────
  const handleInject = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframeLoaded) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    const clientLabel = form.clientEntreprise
      ? `${form.clientNom} — ${form.clientEntreprise}`
      : form.clientNom;

    const providerPayload = selectedFreelancer ? {
      nom:        selectedFreelancer.nom,
      prenom:     selectedFreelancer.prenom,
      entreprise: selectedFreelancer.entreprise,
      siret:      selectedFreelancer.siret,
      numeroTVA:  selectedFreelancer.numeroTVA,
      adresse:    selectedFreelancer.adresse,
      email:      selectedFreelancer.email,
      telephone:  selectedFreelancer.telephone,
    } : undefined;

    if (docType === 'facture') {
      injectFacture(doc, {
        numero:        form.numero,
        date:          form.date,
        echeance:      form.echeance,
        clientNom:     clientLabel,
        clientSiret:   form.clientSiret,
        clientAdresse: form.clientAdresse,
        clientEmail:   form.clientEmail,
        items: items.map(i => ({
          description:   i.description || '—',
          quantite:      i.quantite,
          prixUnitaire:  i.prixUnitaire,
          total:         i.total,
        })),
        montantHT:  totals.ht,
        tva:        totals.tva,
        montantTTC: totals.ttc,
        acompte:    totals.acompte,   // toujours passer (0 = effacer la ligne)
        notes:      form.notes || undefined,
        provider:   providerPayload,
      });
    } else if (docType === 'devis') {
      injectDevis(doc, {
        numero:        form.numero,
        date:          form.date,
        validite:      form.validite,
        clientNom:     clientLabel,
        clientSiret:   form.clientSiret,
        clientAdresse: form.clientAdresse,
        clientEmail:   form.clientEmail,
        clientTel:     form.clientTel,
        items: items.map(i => ({
          description: i.description || '—',
          tarif:       i.offert ? 'Offert' : (i.total > 0 ? `${i.total.toLocaleString('fr-FR')} €` : (i.tarif || '—')),
          offert:      i.offert,
        })),
        montantHT:  totals.ht,
        tva:        totals.tva,
        montantTTC: totals.ttc,
        acompte:    totals.acompte,   // toujours passer (0 = effacer la ligne)
        notes:      form.notes || undefined,
        provider:   providerPayload,
      });
    } else {
      injectContrat(doc, {
        numero:             form.numero,
        date:               form.date,
        clientNom:          clientLabel,
        clientAdresse:      form.clientAdresse,
        clientRepresentant: form.clientRepresentant || form.clientNom,
        projetNom:          form.projetNom || 'À définir',
        projetObjet:        form.projetObjet,
        dateDebut:          form.dateDebut,
        dateFin:            form.dateFin,
        provider:           providerPayload,
      });
    }
    setInjected(true);
    setSyncing(false);
  }, [docType, form, items, totals, iframeLoaded, selectedFreelancer]);

  // ── Auto-sync ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoSync || !iframeLoaded) return;
    setSyncing(true);
    const t = setTimeout(() => { handleInject(); }, 700);
    return () => clearTimeout(t);
  }, [form, items, autoSync, iframeLoaded, selectedFreelancer]);

  // Mark as not injected when anything changes (non-autoSync)
  useEffect(() => {
    if (!autoSync) setInjected(false);
  }, [form, items]);

  // ── Print ────────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    if (!injected) handleInject();

    // Fix page blanche : injecter CSS print qui supprime les hauteurs fixes
    const iframeDoc = iframe.contentDocument;
    if (iframeDoc) {
      const existing = iframeDoc.getElementById('__obsidian-print-fix');
      if (!existing) {
        const style = iframeDoc.createElement('style');
        style.id = '__obsidian-print-fix';
        style.textContent = `
          @media print {
            html, body {
              height: auto !important;
              min-height: unset !important;
              max-height: none !important;
              overflow: visible !important;
            }
            * { max-height: none !important; }
            .page-break, [class*="page-break"], .break-after, .pagebreak { display: none !important; }
            @page { margin: 1cm; }
          }
        `;
        iframeDoc.head.appendChild(style);
      }
    }
    setTimeout(() => iframe.contentWindow!.print(), 200);
  };

  // ── Save to Facturation ──────────────────────────────────────────────────────
  const handleSaveToInvoices = () => {
    if (docType !== 'facture') return;
    if (!form.clientNom && !form.clientEntreprise) {
      setSaveError('Veuillez renseigner un client avant de sauvegarder.');
      setTimeout(() => setSaveError(''), 3000);
      return;
    }
    const clientId = selectedClientId || '';
    addInvoice({
      numero:      form.numero,
      clientId,
      clientNom:   form.clientEntreprise || form.clientNom,
      statut:      'brouillon',
      dateEmission: form.date,
      dateEcheance: form.echeance,
      items: items.map(i => ({
        id: uuidv4(),
        description:  i.description,
        quantite:     i.quantite,
        prixUnitaire: i.prixUnitaire,
        total:        i.total,
      })),
      sousTotal: totals.ht,
      tva:       totals.tva,
      total:     totals.ttc,
      notes:     form.notes,
    });
    setSavedToInvoices(true);
    setTimeout(() => setSavedToInvoices(false), 3000);
  };

  // ── Save Acompte Invoice ──────────────────────────────────────────────────────
  const handleSaveAcompteInvoice = () => {
    if (!form.clientNom && !form.clientEntreprise) {
      setSaveError('Veuillez renseigner un client avant de sauvegarder.');
      setTimeout(() => setSaveError(''), 3000);
      return;
    }
    const year = new Date().getFullYear();
    const count = useStore.getState().invoices.length + 1;
    addInvoice({
      numero:       `FA-${year}-${String(count).padStart(3, '0')}-AC`,
      clientId:     selectedClientId || '',
      clientNom:    form.clientEntreprise || form.clientNom,
      statut:       'brouillon',
      dateEmission: form.date,
      dateEcheance: form.echeance,
      items: [{
        id:           uuidv4(),
        description:  `Acompte ${form.acomptePercent}% — ${form.notes ? form.notes.slice(0, 60) : (form.clientEntreprise || form.clientNom)}`,
        quantite:     1,
        prixUnitaire: totals.acompte,
        total:        totals.acompte,
      }],
      sousTotal: totals.acompte,
      tva:       0,
      total:     totals.acompte,
      notes:     `Acompte de ${form.acomptePercent}% sur un total TTC de ${totals.ttc.toLocaleString('fr-FR')} €`,
    });
    setSavedAcompte(true);
    setTimeout(() => setSavedAcompte(false), 3000);
  };

  // ── Save Solde Invoice ────────────────────────────────────────────────────────
  const handleSaveSoldeInvoice = () => {
    if (!form.clientNom && !form.clientEntreprise) {
      setSaveError('Veuillez renseigner un client avant de sauvegarder.');
      setTimeout(() => setSaveError(''), 3000);
      return;
    }
    const year = new Date().getFullYear();
    const count = useStore.getState().invoices.length + 1;
    const dateVersement = form.dateAcompte
      ? ` le ${new Date(form.dateAcompte).toLocaleDateString('fr-FR')}`
      : '';
    const noteSolde = form.acompteDejaVerse
      ? `Solde restant (${100 - form.acomptePercent}% du TTC). Acompte de ${totals.acompte.toLocaleString('fr-FR')} € déjà perçu${dateVersement}.`
      : `Solde restant à payer (${100 - form.acomptePercent}%) — acompte de ${totals.acompte.toLocaleString('fr-FR')} € prévu.`;
    addInvoice({
      numero:       `FA-${year}-${String(count).padStart(3, '0')}-SL`,
      clientId:     selectedClientId || '',
      clientNom:    form.clientEntreprise || form.clientNom,
      // Si l'acompte est déjà versé, le solde reste à payer → 'envoyée'
      // Sinon brouillon
      statut:       form.acompteDejaVerse ? 'envoyée' : 'brouillon',
      dateEmission: form.date,
      dateEcheance: form.echeance,
      items: items.map(i => ({
        id:           uuidv4(),
        description:  i.description,
        quantite:     i.quantite,
        prixUnitaire: i.prixUnitaire,
        total:        i.total,
      })),
      sousTotal: totals.ht,
      tva:       totals.tva,
      total:     totals.reste,
      notes:     noteSolde,
    });
    setSavedSolde(true);
    setTimeout(() => setSavedSolde(false), 3000);
  };

  // ── Reset form ───────────────────────────────────────────────────────────────
  const handleReset = () => {
    setSelectedClientId('');
    setClientSearch('');
    setSelectedFreelancerId('');
    setSelectedFreelancerIds([]);
    setFreelancerSearch('');
    setItems([newItem()]);
    setForm({
      numero: nextNumber, date: today, echeance: in30days, validite: in30days,
      clientNom: '', clientEntreprise: '', clientSiret: '',
      clientAdresse: '', clientEmail: '', clientTel: '',
      clientRepresentant: '', projetNom: '', projetObjet: '',
      dateDebut: today, dateFin: in30days,
      tvaPercent: 20, acomptePercent: 0, acompteDejaVerse: false, dateAcompte: '', notes: '',
    });
    setInjected(false);
    setSavedToInvoices(false);
  };

  // ── Convert Devis → Facture ───────────────────────────────────────────────────
  const handleConvertToFacture = () => {
    const newNumero = form.numero.startsWith('DE-')
      ? form.numero.replace(/^DE-/, 'FA-')
      : (() => {
          const year = new Date().getFullYear();
          const count = useStore.getState().invoices.length + 1;
          return `FA-${year}-${String(count).padStart(3, '0')}`;
        })();
    setDocType('facture');
    setForm(f => ({ ...f, numero: newNumero }));
    setConvertBanner(true);
    setTimeout(() => setConvertBanner(false), 3000);
  };

  // ── Filtered clients for search ──────────────────────────────────────────────
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.slice(0, 8);
    const q = clientSearch.toLowerCase();
    return clients.filter(c =>
      c.nom.toLowerCase().includes(q) ||
      c.entreprise.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [clients, clientSearch]);

  const cfg = DOC_CONFIG[docType];
  const DocIcon = cfg.icon;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden" style={{ height: 'calc(100vh - 72px)' }}>

      {/* ══ LEFT PANEL ══════════════════════════════════════════════════════ */}
      <div className="w-[400px] flex-shrink-0 flex flex-col bg-obsidian-800 border-r border-card-border overflow-hidden">

        {/* ── Doc type selector ─────────────────────────────────────────── */}
        <div className="p-3 border-b border-card-border bg-obsidian-900/60 flex-shrink-0">
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.entries(DOC_CONFIG) as [DocType, typeof DOC_CONFIG.facture][]).map(([type, c]) => {
              const Icon = c.icon;
              return (
                <button
                  key={type}
                  onClick={() => setDocType(type)}
                  className={clsx(
                    'flex flex-col items-center gap-1 py-2.5 rounded-xl border text-center transition-all',
                    docType === type
                      ? `${c.bg} ${c.border} ${c.color} shadow-sm`
                      : 'bg-card border-card-border text-slate-500 hover:text-slate-300 hover:border-slate-600'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wide">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Scrollable form body ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Section: Infos document ─────────────────────────────────── */}
          <SectionHeader icon={Hash} title={`Infos ${cfg.label}`} open={secDoc} onToggle={() => setSecDoc(p => !p)} />
          {secDoc && (
            <div className="p-4 space-y-3 border-b border-card-border/50">
              <div className="grid grid-cols-2 gap-2">
                <FieldInput
                  label="Numéro"
                  value={form.numero}
                  onChange={setF('numero')}
                  placeholder={nextNumber}
                  className="col-span-2"
                />
                <FieldInput label="Date" type="date" value={form.date} onChange={setF('date')} />
                {docType === 'facture' && (
                  <FieldInput label="Échéance" type="date" value={form.echeance} onChange={setF('echeance')} />
                )}
                {docType === 'devis' && (
                  <FieldInput label="Validité jusqu'au" type="date" value={form.validite} onChange={setF('validite')} />
                )}
                {docType === 'contrat' && (
                  <>
                    <FieldInput label="Date début" type="date" value={form.dateDebut} onChange={setF('dateDebut')} />
                    <FieldInput label="Date fin" type="date" value={form.dateFin} onChange={setF('dateFin')} />
                    <FieldInput label="Échéance paiement" type="date" value={form.echeance} onChange={setF('echeance')} />
                    <FieldInput label="Validité" type="date" value={form.validite} onChange={setF('validite')} />
                  </>
                )}
              </div>
              {docType === 'contrat' && (
                <div className="space-y-2 pt-1">
                  <FieldInput label="Nom du projet" value={form.projetNom} onChange={setF('projetNom')} placeholder="Ex: Refonte site web" />
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">Objet du contrat</label>
                    <textarea
                      value={form.projetObjet}
                      onChange={e => setF('projetObjet')(e.target.value)}
                      rows={2}
                      placeholder="Description courte de la mission..."
                      className="w-full bg-obsidian-700 border border-card-border text-white text-xs rounded-lg px-2.5 py-2 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/60 focus:border-primary-500/60 transition-all resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Section: Client ──────────────────────────────────────────── */}
          <SectionHeader icon={User} title="Client" open={secClient} onToggle={() => setSecClient(p => !p)} />
          {secClient && (
            <div className="p-4 space-y-2.5 border-b border-card-border/50">
              {/* Client search */}
              <div className="relative">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">
                  Rechercher dans le CRM
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setShowClientSearch(true); }}
                    onFocus={() => setShowClientSearch(true)}
                    placeholder="Nom, entreprise, email…"
                    className="w-full bg-obsidian-700 border border-card-border text-white text-xs rounded-lg py-2 pl-7 pr-8 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/60 focus:border-primary-500/60 transition-all"
                  />
                  {clientSearch && (
                    <button onClick={() => { setClientSearch(''); setShowClientSearch(false); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="w-3 h-3 text-slate-500 hover:text-white" />
                    </button>
                  )}
                </div>
                {showClientSearch && filteredClients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-obsidian-700 border border-card-border rounded-xl overflow-hidden shadow-card z-20">
                    {filteredClients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedClientId(c.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-primary-500/10 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-bold">{c.nom.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-semibold truncate">{c.nom}</p>
                          <p className="text-slate-500 text-[10px] truncate">{c.entreprise} · {c.email}</p>
                        </div>
                        {selectedClientId === c.id && <CheckCircle2 className="w-3.5 h-3.5 text-accent-green flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <FieldInput
                  label="Nom / Prénom"
                  icon={User}
                  value={form.clientNom}
                  onChange={setF('clientNom')}
                  placeholder="Jean Dupont"
                />
                <FieldInput
                  label="Entreprise"
                  icon={Building2}
                  value={form.clientEntreprise}
                  onChange={setF('clientEntreprise')}
                  placeholder="ACME SAS"
                />
                <FieldInput
                  label="Email"
                  icon={Mail}
                  type="email"
                  value={form.clientEmail}
                  onChange={setF('clientEmail')}
                  placeholder="contact@client.fr"
                  className="col-span-2"
                />
                <FieldInput
                  label="Téléphone"
                  icon={Phone}
                  value={form.clientTel}
                  onChange={setF('clientTel')}
                  placeholder="+33 6 00 00 00 00"
                />
                {(docType === 'facture' || docType === 'devis') && (
                  <FieldInput
                    label="SIRET"
                    icon={Hash}
                    value={form.clientSiret}
                    onChange={setF('clientSiret')}
                    placeholder="000 000 000 00000"
                  />
                )}
                {docType === 'contrat' && (
                  <FieldInput
                    label="Représentant"
                    icon={User}
                    value={form.clientRepresentant}
                    onChange={setF('clientRepresentant')}
                    placeholder="M. Jean Dupont, Gérant"
                  />
                )}
                <FieldInput
                  label="Adresse"
                  icon={MapPin}
                  value={form.clientAdresse}
                  onChange={setF('clientAdresse')}
                  placeholder="12 rue de la Paix, 75001 Paris"
                  className="col-span-2"
                />
              </div>
            </div>
          )}

          {/* ── Section: Prestataire ─────────────────────────────────────── */}
          <SectionHeader
            icon={Briefcase}
            title={docType === 'contrat' ? 'Prestataire(s)' : 'Prestataire'}
            open={secPrestataire}
            onToggle={() => setSecPrestataire(p => !p)}
            count={docType === 'contrat' ? selectedContractFreelancers.length : undefined}
          />
          {secPrestataire && (
            <div className="p-4 space-y-2.5 border-b border-card-border/50">
              {/* Freelancer search */}
              <div className="relative">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">
                  {docType === 'contrat' ? 'Ajouter un prestataire au contrat' : 'Sélectionner un prestataire'}
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={freelancerSearch}
                    onChange={e => { setFreelancerSearch(e.target.value); setShowFreelancerSearch(true); }}
                    onFocus={() => setShowFreelancerSearch(true)}
                    placeholder="Nom, entreprise, email…"
                    className="w-full bg-obsidian-700 border border-card-border text-white text-xs rounded-lg py-2 pl-7 pr-8 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/60 focus:border-primary-500/60 transition-all"
                  />
                  {(freelancerSearch || selectedFreelancerId) && (
                    <button
                      onClick={() => { setFreelancerSearch(''); setSelectedFreelancerId(''); setShowFreelancerSearch(false); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-3 h-3 text-slate-500 hover:text-white" />
                    </button>
                  )}
                </div>
                {showFreelancerSearch && filteredFreelancers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-obsidian-700 border border-card-border rounded-xl overflow-hidden shadow-card z-20">
                    {filteredFreelancers.map(f => (
                      <button
                        key={f.id}
                        onClick={() => {
                          if (docType === 'contrat') {
                            addContractFreelancer(f.id);
                          } else {
                            setSelectedFreelancerId(f.id);
                            setFreelancerSearch(`${f.prenom} ${f.nom} — ${f.entreprise}`);
                            setShowFreelancerSearch(false);
                            setInjected(false);
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-primary-500/10 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-bold">{f.prenom.charAt(0)}{f.nom.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-semibold truncate">{f.prenom} {f.nom}</p>
                          <p className="text-slate-500 text-[10px] truncate">{f.entreprise} · {f.specialite} · {f.tjm} €/j</p>
                        </div>
                        {selectedFreelancerId === f.id && <CheckCircle2 className="w-3.5 h-3.5 text-accent-green flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected freelancer preview cards */}
              {docType === 'contrat' ? (
                // Multi-freelancer mode for contracts
                selectedContractFreelancers.length > 0 ? (
                  <div className="space-y-2">
                    {selectedContractFreelancers.map(f => (
                      <div key={f.id} className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">{f.prenom.charAt(0)}{f.nom.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-bold">{f.prenom} {f.nom}</p>
                            <p className="text-primary-300 text-[10px]">{f.entreprise} · {f.specialite}</p>
                          </div>
                          <button
                            onClick={() => removeContractFreelancer(f.id)}
                            className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                            title="Retirer du contrat"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] mt-2">
                          <div className="flex items-center gap-1 text-slate-400"><Hash className="w-3 h-3" /><span className="truncate">{f.siret || '—'}</span></div>
                          <div className="flex items-center gap-1 text-slate-400"><Mail className="w-3 h-3" /><span className="truncate">{f.email}</span></div>
                          <div className="flex items-center gap-1 text-slate-400"><MapPin className="w-3 h-3" /><span className="truncate">{f.adresse || '—'}</span></div>
                          <div className="flex items-center gap-1 text-slate-400"><Euro className="w-3 h-3" /><span>{f.tjm} €/j</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 text-center py-1">
                    Aucun prestataire ajouté au contrat.
                  </p>
                )
              ) : (
                // Single freelancer mode for factures/devis
                <>
                  {selectedFreelancer && (
                    <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{selectedFreelancer.prenom.charAt(0)}{selectedFreelancer.nom.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-white text-xs font-bold">{selectedFreelancer.prenom} {selectedFreelancer.nom}</p>
                          <p className="text-primary-300 text-[10px]">{selectedFreelancer.entreprise}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                        <div className="flex items-center gap-1 text-slate-400"><Hash className="w-3 h-3" /><span className="truncate">{selectedFreelancer.siret || '—'}</span></div>
                        <div className="flex items-center gap-1 text-slate-400"><Mail className="w-3 h-3" /><span className="truncate">{selectedFreelancer.email}</span></div>
                        <div className="flex items-center gap-1 text-slate-400"><MapPin className="w-3 h-3" /><span className="truncate">{selectedFreelancer.adresse || '—'}</span></div>
                        <div className="flex items-center gap-1 text-slate-400"><Euro className="w-3 h-3" /><span>{selectedFreelancer.tjm} €/j</span></div>
                      </div>
                      <p className="text-[10px] text-slate-500">TVA : {selectedFreelancer.numeroTVA || '—'}</p>
                    </div>
                  )}
                  {!selectedFreelancer && (
                    <p className="text-[11px] text-slate-500 text-center py-1">
                      Aucun prestataire sélectionné — le côté prestataire du document restera vide.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Section: Prestations / Clauses ───────────────────────────── */}
              <SectionHeader
                icon={ArrowUpRight}
                title={docType === 'contrat' ? 'Prestations / Clauses' : 'Prestations'}
                open={secPrestations}
                onToggle={() => setSecPrestations(p => !p)}
                count={items.length}
              />
              {secPrestations && (
                <div className="p-4 border-b border-card-border/50 space-y-2">
                  {items.map((item, idx) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      idx={idx}
                      docType={docType}
                      onUpdate={updateItem}
                      onRemove={removeItem}
                      onDup={dupItem}
                      canRemove={items.length > 1}
                    />
                  ))}
                  <button
                    onClick={addItem}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-primary-400 border border-primary-500/30 border-dashed rounded-xl hover:bg-primary-500/10 hover:border-primary-500/50 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter une ligne
                  </button>
                </div>
              )}

          {/* ── Section: Finance ─────────────────────────────────────────── */}
              <SectionHeader icon={Euro} title="Financier" open={secFinance} onToggle={() => setSecFinance(p => !p)} />
              {secFinance && (
                <div className="p-4 border-b border-card-border/50 space-y-3">
                  {/* TVA presets */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">Taux TVA</label>
                    <div className="flex gap-1.5">
                      {TVA_PRESETS.map(p => (
                        <button
                          key={p}
                          onClick={() => setF('tvaPercent')(p)}
                          className={clsx(
                            'flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all',
                            form.tvaPercent === p
                              ? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
                              : 'bg-card border-card-border text-slate-500 hover:text-white hover:border-slate-500'
                          )}
                        >
                          {p}%
                        </button>
                      ))}
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={form.tvaPercent}
                          onChange={e => setF('tvaPercent')(Number(e.target.value))}
                          min={0} max={100}
                          className="w-full bg-card border border-card-border text-white text-xs rounded-lg py-1.5 px-2 text-center focus:outline-none focus:ring-1 focus:ring-primary-500/60"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Acompte */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">
                      Acompte <span className="text-slate-600 normal-case font-normal">(optionnel)</span>
                    </label>
                    <div className="flex gap-1.5">
                      {[0, 30, 50].map(p => (
                        <button
                          key={p}
                          onClick={() => setF('acomptePercent')(p)}
                          className={clsx(
                            'px-3 py-1.5 text-xs font-bold rounded-lg border transition-all',
                            form.acomptePercent === p
                              ? 'bg-accent-cyan/20 border-accent-cyan/40 text-accent-cyan'
                              : 'bg-card border-card-border text-slate-500 hover:text-white'
                          )}
                        >
                          {p === 0 ? 'Aucun' : `${p}%`}
                        </button>
                      ))}
                      <div className="flex items-center gap-1 flex-1 bg-card border border-card-border rounded-lg px-2">
                        <input
                          type="number"
                          value={form.acomptePercent}
                          onChange={e => setF('acomptePercent')(Math.min(100, Number(e.target.value)))}
                          min={0} max={100}
                          className="w-full bg-transparent text-white text-xs text-center focus:outline-none"
                        />
                        <Percent className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Totals recap */}
                  <div className="bg-obsidian-700/50 rounded-xl border border-card-border/60 overflow-hidden">
                    <div className="px-3 py-2 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Montant HT</span>
                        <span className="text-white font-semibold">{totals.ht.toLocaleString('fr-FR')} €</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">TVA ({form.tvaPercent}%)</span>
                        <span className="text-slate-300">{totals.tva.toLocaleString('fr-FR')} €</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-t border-card-border">
                        <span className="text-sm font-bold text-white">Total TTC</span>
                        <span className={clsx(
                          'text-base font-bold',
                          cfg.color
                        )}>
                          {totals.ttc.toLocaleString('fr-FR')} €
                        </span>
                      </div>
                      {totals.acompte > 0 && (
                        <>
                          <div className="flex justify-between items-center text-xs text-accent-cyan border-t border-card-border/50 pt-1.5">
                            <span>Acompte ({form.acomptePercent}%)</span>
                            <span className="font-semibold">− {totals.acompte.toLocaleString('fr-FR')} €</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Reste à payer</span>
                            <span className={clsx('font-bold', form.acompteDejaVerse ? 'text-accent-green' : 'text-white')}>
                              {totals.reste.toLocaleString('fr-FR')} €
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Acompte déjà versé */}
                  {totals.acompte > 0 && (
                    <div className={clsx(
                      'rounded-xl border p-3 space-y-2 transition-all',
                      form.acompteDejaVerse
                        ? 'bg-accent-green/10 border-accent-green/30'
                        : 'bg-obsidian-700/40 border-card-border/60'
                    )}>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <div
                          onClick={() => setForm(f => ({ ...f, acompteDejaVerse: !f.acompteDejaVerse }))}
                          className={clsx(
                            'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer',
                            form.acompteDejaVerse
                              ? 'bg-accent-green border-accent-green'
                              : 'bg-transparent border-slate-500 hover:border-accent-green'
                          )}
                        >
                          {form.acompteDejaVerse && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span className={clsx('text-xs font-semibold', form.acompteDejaVerse ? 'text-accent-green' : 'text-slate-400')}>
                          Acompte déjà versé ({totals.acompte.toLocaleString('fr-FR')} €)
                        </span>
                      </label>
                      {form.acompteDejaVerse && (
                        <div className="pl-6">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Date de versement</label>
                          <input
                            type="date"
                            value={form.dateAcompte}
                            onChange={e => setForm(f => ({ ...f, dateAcompte: e.target.value }))}
                            className="w-full bg-obsidian-700 border border-card-border text-white text-xs rounded-lg py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-accent-green/60"
                          />
                          <p className="text-[10px] text-accent-green/70 mt-1">
                            La facture de solde sera générée avec la mention "Acompte déjà perçu"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

          {/* ── Section: Notes ───────────────────────────────────────────── */}
          <SectionHeader icon={StickyNote} title="Notes / Mentions" open={secNotes} onToggle={() => setSecNotes(p => !p)} />
          {secNotes && (
            <div className="p-4 border-b border-card-border/50">
              <textarea
                value={form.notes}
                onChange={e => setF('notes')(e.target.value)}
                rows={4}
                placeholder={docType === 'facture'
                  ? "Modalités de paiement, mentions légales, conditions particulières…"
                  : docType === 'devis'
                  ? "Conditions de réalisation, délais, mentions particulières…"
                  : "Clauses particulières, conditions spéciales, mentions légales…"
                }
                className="w-full bg-obsidian-700 border border-card-border text-white text-xs rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/60 transition-all resize-none"
              />
              <p className="text-slate-600 text-[10px] mt-1">Ces informations apparaîtront dans la section remarques du document.</p>
            </div>
          )}

          {/* Spacer */}
          <div className="h-4" />
        </div>

        {/* ── Footer actions ────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-card-border bg-obsidian-900/80 p-3 space-y-2">
          {/* Error */}
          {saveError && (
            <div className="flex items-center gap-2 p-2 bg-accent-red/10 border border-accent-red/30 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-accent-red flex-shrink-0" />
              <p className="text-accent-red text-xs">{saveError}</p>
            </div>
          )}

          {/* Save to invoices (Facture only) */}
          {docType === 'facture' && (
            <>
              <button
                onClick={handleSaveToInvoices}
                className={clsx(
                  'w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border',
                  savedToInvoices
                    ? 'bg-accent-green/20 border-accent-green/40 text-accent-green'
                    : 'bg-card border-card-border text-slate-300 hover:border-accent-green/40 hover:text-accent-green hover:bg-accent-green/10'
                )}
              >
                {savedToInvoices
                  ? <><CheckCircle2 className="w-4 h-4" /> Enregistrée dans Facturation</>
                  : <><Save className="w-4 h-4" /> Enregistrer dans Facturation</>
                }
              </button>

              {/* Acompte + Solde split buttons (visible seulement si acompte > 0) */}
              {totals.acompte > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={handleSaveAcompteInvoice}
                    className={clsx(
                      'py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border',
                      savedAcompte
                        ? 'bg-accent-cyan/20 border-accent-cyan/40 text-accent-cyan'
                        : 'bg-card border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/10 hover:border-accent-cyan/50'
                    )}
                  >
                    {savedAcompte
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> Acompte sauvé</>
                      : <><Save className="w-3.5 h-3.5" /> Facture acompte</>
                    }
                  </button>
                  <button
                    onClick={handleSaveSoldeInvoice}
                    className={clsx(
                      'py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border',
                      savedSolde
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                        : 'bg-card border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50'
                    )}
                  >
                    {savedSolde
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> Solde sauvé</>
                      : <><Save className="w-3.5 h-3.5" /> Facture solde</>
                    }
                  </button>
                  <p className="col-span-2 text-[10px] text-slate-600 text-center -mt-0.5">
                    Acompte : {totals.acompte.toLocaleString('fr-FR')} € · Solde : {totals.reste.toLocaleString('fr-FR')} €
                  </p>
                </div>
              )}
            </>
          )}

          {/* Apply + Reset row */}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-400 border border-card-border rounded-xl hover:text-white hover:border-slate-500 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
            <button
              onClick={handleInject}
              disabled={!iframeLoaded}
              className={clsx(
                'flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all',
                iframeLoaded
                  ? 'bg-gradient-primary text-white hover:opacity-90 shadow-glow-purple'
                  : 'bg-obsidian-600 text-slate-500 cursor-not-allowed'
              )}
            >
              {!iframeLoaded
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</>
                : syncing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Synchronisation…</>
                : injected
                ? <><CheckCircle2 className="w-4 h-4" /> Appliqué ✓</>
                : <><Zap className="w-4 h-4" /> Appliquer au document</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL — Aperçu ════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col bg-[#030308] overflow-hidden">

        {/* Toolbar */}
        <div className="h-14 flex-shrink-0 bg-obsidian-800 border-b border-card-border flex items-center justify-between px-5 gap-3">
          {/* Left: title + status */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
              <DocIcon className={clsx('w-4 h-4', cfg.color)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-sm">{cfg.label} — Aperçu live</span>
                <span className="text-slate-500 text-xs font-mono">{form.numero}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {!iframeLoaded && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Chargement template…
                  </span>
                )}
                {iframeLoaded && syncing && (
                  <span className="flex items-center gap-1 text-[10px] text-primary-400">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Sync auto…
                  </span>
                )}
                {iframeLoaded && !syncing && injected && (
                  <span className="flex items-center gap-1 text-[10px] text-accent-green">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Synchronisé
                  </span>
                )}
                {iframeLoaded && !syncing && !injected && !autoSync && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400">
                    <AlertCircle className="w-2.5 h-2.5" /> Non synchronisé
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Auto-sync toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer group">
              <span className="text-[11px] text-slate-500 group-hover:text-slate-300 transition-colors">Auto</span>
              <div
                onClick={() => setAutoSync(a => !a)}
                className={clsx(
                  'relative w-8 h-5 rounded-full transition-all cursor-pointer',
                  autoSync ? 'bg-accent-green/30 border border-accent-green/50' : 'bg-obsidian-600 border border-card-border'
                )}
              >
                <div className={clsx(
                  'absolute top-[3px] w-3.5 h-3.5 rounded-full transition-all',
                  autoSync ? 'left-[14px] bg-accent-green' : 'left-[3px] bg-slate-500'
                )} />
              </div>
            </label>

            <div className="w-px h-5 bg-card-border" />

            <button
              onClick={handleInject}
              disabled={!iframeLoaded}
              title="Synchroniser maintenant"
              className="flex items-center gap-1.5 text-xs font-semibold text-primary-300 border border-primary-500/30 bg-primary-500/10 px-3 py-1.5 rounded-lg hover:bg-primary-500/20 disabled:opacity-40 transition-all"
            >
              <RefreshCw className={clsx('w-3 h-3', syncing && 'animate-spin')} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            <button
              onClick={() => setShowEmailModal(true)}
              disabled={!iframeLoaded || !form.clientEmail}
              title="Envoyer par email"
              className="flex items-center gap-1.5 text-xs font-semibold text-accent-cyan border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-1.5 rounded-lg hover:bg-accent-cyan/20 disabled:opacity-40 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Email</span>
            </button>

            {docType === 'devis' && selectedClientId && items.some(i => i.total > 0 || i.description) && (
              <button
                onClick={handleConvertToFacture}
                title="Convertir en Facture"
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Convertir</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              disabled={!iframeLoaded}
              title="Imprimer / Exporter PDF"
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-primary border border-primary-500/40 px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-40 transition-all shadow-glow-purple"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden md:inline">PDF</span>
            </button>
          </div>
        </div>

        {/* Convert banner */}
        {convertBanner && (
          <div className="flex items-center justify-center gap-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-400 text-sm font-semibold px-4 py-2">
            <CheckCircle2 className="w-4 h-4" /> Devis converti en Facture
          </div>
        )}

        {/* iframe container */}
        <div className="flex-1 relative overflow-auto">
          {/* Loading overlay */}
          {!iframeLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-[#030308]">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-purple">
                  <DocIcon className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-obsidian-700 rounded-full border border-card-border flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 text-primary-400 animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">Chargement du template {cfg.label}</p>
                <p className="text-slate-500 text-sm mt-1">Prêt dans quelques instants…</p>
              </div>
            </div>
          )}

          {/* Document page wrapper */}
          <div
            className="flex items-start justify-center py-8 px-6 min-h-full"
            style={{ background: 'radial-gradient(ellipse at top, #080815 0%, #030308 100%)' }}
          >
            <iframe
              ref={iframeRef}
              key={docType}
              src={cfg.template}
              onLoad={() => { setIframeLoaded(true); }}
              className="rounded shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]"
              style={{
                width: '210mm',
                minHeight: '297mm',
                border: 'none',
                display: 'block',
                opacity: iframeLoaded ? 1 : 0,
                transition: 'opacity 0.4s ease',
                background: '#fff',
              }}
              title={`Aperçu ${cfg.label}`}
              sandbox="allow-scripts allow-same-origin allow-modals allow-popups"
            />
          </div>
        </div>
      </div>

      {/* Email Modal */}
      <EmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        docType={cfg.label}
        docNumero={form.numero}
        clientNom={form.clientEntreprise ? `${form.clientNom} — ${form.clientEntreprise}` : form.clientNom}
        clientEmail={form.clientEmail}
        montantTTC={docType !== 'contrat' ? totals.ttc : undefined}
      />
    </div>
  );
};

// ─── Item Card ────────────────────────────────────────────────────────────────
const ItemCard: React.FC<{
  item: ServiceItem;
  idx: number;
  docType: DocType;
  onUpdate: (id: string, field: keyof ServiceItem, val: any) => void;
  onRemove: (id: string) => void;
  onDup: (id: string) => void;
  canRemove: boolean;
}> = ({ item, idx, docType, onUpdate, onRemove, onDup, canRemove }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={clsx(
      'rounded-xl border transition-all',
      item.offert
        ? 'border-amber-500/30 bg-amber-500/5'
        : 'border-card-border bg-obsidian-700/50'
    )}>
      {/* Item header */}
      <div className="flex items-center gap-2 px-2.5 pt-2.5 pb-2">
        <div className="w-5 h-5 rounded-md bg-primary-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-primary-400 text-[10px] font-bold">{idx + 1}</span>
        </div>

        <input
          value={item.description}
          onChange={e => onUpdate(item.id, 'description', e.target.value)}
          placeholder="Description de la prestation…"
          className="flex-1 bg-transparent text-white text-xs placeholder-slate-600 focus:outline-none"
        />

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => onDup(item.id)}
            title="Dupliquer"
            className="w-6 h-6 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-obsidian-600 flex items-center justify-center transition-all"
          >
            <Copy className="w-3 h-3" />
          </button>
          {canRemove && (
            <button
              onClick={() => onRemove(item.id)}
              title="Supprimer"
              className="w-6 h-6 rounded-lg text-slate-600 hover:text-accent-red hover:bg-accent-red/10 flex items-center justify-center transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Item fields */}
      {docType === 'facture' ? (
        <div className="px-2.5 pb-2.5 grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Quantité</label>
            <input
              type="number"
              value={item.quantite}
              onChange={e => onUpdate(item.id, 'quantite', Number(e.target.value))}
              min="0" step="0.5"
              className="w-full bg-obsidian-600 border border-card-border text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/60 text-center"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Prix unit. (€)</label>
            <input
              type="number"
              value={item.prixUnitaire}
              onChange={e => onUpdate(item.id, 'prixUnitaire', Number(e.target.value))}
              min="0"
              className="w-full bg-obsidian-600 border border-card-border text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/60 text-center"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Total (€)</label>
            <div className="flex items-center h-[30px] bg-obsidian-600/50 border border-card-border rounded-lg px-2 justify-center">
              <span className="text-accent-green text-xs font-bold">{item.total.toLocaleString('fr-FR')}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-2.5 pb-2.5 flex items-center gap-2">
          <input
            value={item.tarif}
            onChange={e => onUpdate(item.id, 'tarif', e.target.value)}
            disabled={item.offert}
            placeholder="Tarif (ex: 1 200 €, Sur devis…)"
            className="flex-1 bg-obsidian-600 border border-card-border text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/60 disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0 group">
            <div
              onClick={() => onUpdate(item.id, 'offert', !item.offert)}
              className={clsx(
                'relative w-8 h-5 rounded-full border transition-all cursor-pointer',
                item.offert ? 'bg-amber-500/30 border-amber-500/50' : 'bg-obsidian-600 border-card-border'
              )}
            >
              <div className={clsx(
                'absolute top-[3px] w-3.5 h-3.5 rounded-full transition-all',
                item.offert ? 'left-[14px] bg-amber-400' : 'left-[3px] bg-slate-500'
              )} />
            </div>
            <span className={clsx('text-[10px] font-semibold', item.offert ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300')}>
              Offert
            </span>
          </label>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  FileText, FilePlus2, FileSignature,
  Printer, Plus, Trash2, RefreshCw,
  User, Building2, Mail, Phone, MapPin, Hash,
  Calendar, CheckCircle2, AlertCircle, Loader2, Send,
  Save, BookOpen, ChevronDown, ChevronUp, Copy,
  Zap, GripVertical, Euro, Percent, StickyNote,
  ArrowUpRight, RotateCcw, Search, X, Briefcase, Video
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useDocumentStore, type SavedDocument, type DocStatus } from '../store/useDocumentStore';
import { injectFacture, injectDevis, injectContrat } from '../lib/documentInjector';
import { EmailModal } from '../components/EmailModal/EmailModal';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import type { DocumentAcompte, AcompteStatut } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────
type DocType = 'facture' | 'devis' | 'contrat' | 'contrat_influenceur';

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
  echeanceJours: number;       // Nombre de jours d'échéance (défaut 30)
  // Contract fields
  signLieu: string;
  referentNom: string;
  // Influencer contract fields
  influPlatformes: string;
  influTypeContenu: string;
  influNbPublications: string;
  influDatesPublication: string;
  influDroitsUtilisation: string;
  influExclusivite: string;
  influRemuneration: string;
  influKpis: string;
  influValidation: string;
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
  contrat_influenceur: {
    label: 'Influenceur', icon: Video, color: 'text-pink-400',
    bg: 'bg-pink-500/10', border: 'border-pink-500/40',
    template: '/templates/contrat.html', accentClass: 'pink',
  },
};

const TVA_PRESETS = [0, 5.5, 10, 20];

function newItem(): ServiceItem {
  return { id: uuidv4(), description: '', quantite: 1, prixUnitaire: 0, total: 0, tarif: '', offert: false };
}

function buildNumero(type: DocType, count: number): string {
  const year = new Date().getFullYear();
  const prefix = { facture: 'FAC', devis: 'DEV', contrat: 'CTR', contrat_influenceur: 'INF' }[type];
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
  const { clients, freelancers, projects, invoices, addInvoice, settings } = useStore();
  const { documents, saveDocument, updateDocument, deleteDocument, duplicateDocument, getNextNumber } = useDocumentStore();

  const today    = useMemo(() => new Date().toISOString().split('T')[0], []);
  const in30days = useMemo(() => new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], []);

  // ── View mode: list or editor ──────────────────────────────────────────────
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<DocType | 'all'>('all');
  const [listStatusFilter, setListStatusFilter] = useState<DocStatus | 'all'>('all');

  // ── Core state ──────────────────────────────────────────────────────────────
  const [docType, setDocType]             = useState<DocType>('facture');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearch, setClientSearch]   = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [showProjectSearch, setShowProjectSearch] = useState(false);
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
  const [secSignature, setSecSignature]   = useState(false);
  const [secSOW, setSecSOW]               = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Auto-number (from document store counters) ──────────────────────────────
  const nextNumber = useMemo(() => {
    return getNextNumber(docType);
  }, [docType, getNextNumber]);

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
    tvaPercent: 20, acomptePercent: 0, acompteDejaVerse: false, dateAcompte: '', notes: '', echeanceJours: 30,
    signLieu: '', referentNom: '',
    influPlatformes: '', influTypeContenu: '', influNbPublications: '', influDatesPublication: '',
    influDroitsUtilisation: '', influExclusivite: '', influRemuneration: '', influKpis: '', influValidation: '',
  });

  const [items, setItems] = useState<ServiceItem[]>([newItem()]);

  // Per-freelancer contract details (role, montant, échéance, TVA, prestations)
  interface PrestLine { id: string; description: string; montant: number }
  interface PrestDetail { role: string; montantHT: number; tvaLabel: string; echeance: string; prestations: PrestLine[] }
  const defaultPrestDetail = (): PrestDetail => ({ role: '', montantHT: 0, tvaLabel: 'TVA non applicable - art.293B', echeance: '50% à la signature, 50% à J+30', prestations: [] });
  const [prestDetails, setPrestDetails] = useState<Record<string, PrestDetail>>({});
  const updatePrestDetail = (fid: string, key: keyof PrestDetail, val: any) => {
    setPrestDetails(prev => ({
      ...prev,
      [fid]: { ...(prev[fid] || defaultPrestDetail()), [key]: val },
    }));
  };
  const addPrestLine = (fid: string) => {
    setPrestDetails(prev => {
      const det = prev[fid] || defaultPrestDetail();
      const line: PrestLine = { id: uuidv4(), description: '', montant: 0 };
      const updated = { ...det, prestations: [...det.prestations, line] };
      // Recalculate montantHT from sum of lines
      updated.montantHT = updated.prestations.reduce((s, l) => s + l.montant, 0);
      return { ...prev, [fid]: updated };
    });
  };
  const updatePrestLine = (fid: string, lineId: string, field: keyof PrestLine, val: string | number) => {
    setPrestDetails(prev => {
      const det = prev[fid] || defaultPrestDetail();
      const updated = {
        ...det,
        prestations: det.prestations.map(l => l.id === lineId ? { ...l, [field]: val } : l),
      };
      // Recalculate montantHT
      updated.montantHT = updated.prestations.reduce((s, l) => s + (typeof l.montant === 'number' ? l.montant : parseFloat(String(l.montant)) || 0), 0);
      return { ...prev, [fid]: updated };
    });
  };
  const removePrestLine = (fid: string, lineId: string) => {
    setPrestDetails(prev => {
      const det = prev[fid] || defaultPrestDetail();
      const updated = { ...det, prestations: det.prestations.filter(l => l.id !== lineId) };
      updated.montantHT = updated.prestations.reduce((s, l) => s + l.montant, 0);
      return { ...prev, [fid]: updated };
    });
  };

  // Multi-acompte management
  const [acomptes, setAcomptes] = useState<DocumentAcompte[]>([]);
  const addAcompte = () => {
    const newAcompte: DocumentAcompte = {
      id: uuidv4(),
      montant: Math.round(totals.ttc * 0.3 * 100) / 100,
      pourcentage: 30,
      statut: 'a_payer',
      datePrevue: form.date || new Date().toISOString().split('T')[0],
    };
    setAcomptes(prev => [...prev, newAcompte]);
  };
  const updateAcompte = (id: string, updates: Partial<DocumentAcompte>) => {
    setAcomptes(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };
  const removeAcompte = (id: string) => {
    setAcomptes(prev => prev.filter(a => a.id !== id));
  };
  const totalAcomptesPaye = useMemo(() =>
    acomptes.filter(a => a.statut === 'paye').reduce((s, a) => s + a.montant, 0),
    [acomptes]
  );
  const totalAcomptesPrevu = useMemo(() =>
    acomptes.reduce((s, a) => s + a.montant, 0),
    [acomptes]
  );

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

  // ── Auto-fill from project (contracts) ───────────────────────────────────────
  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projects.slice(0, 8);
    const q = projectSearch.toLowerCase();
    return projects.filter(p =>
      p.nom.toLowerCase().includes(q) || p.clientNom?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [projects, projectSearch]);

  useEffect(() => {
    if (!selectedProjectId) return;
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    // Auto-fill project fields
    setForm(f => ({
      ...f,
      projetNom:   project.nom,
      projetObjet: project.description || '',
      dateDebut:   project.dateDebut || f.dateDebut,
      dateFin:     project.dateFin || f.dateFin,
    }));

    // Auto-fill client from project
    if (project.clientId) {
      setSelectedClientId(project.clientId);
    }

    // Auto-populate freelancers from project
    if (project.freelancerIds && project.freelancerIds.length > 0) {
      setSelectedFreelancerIds(project.freelancerIds);
      setSelectedFreelancerId(project.freelancerIds[0]);
    }

    setProjectSearch(project.nom);
    setShowProjectSearch(false);
    setInjected(false);
  }, [selectedProjectId, projects]);

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
      // Devis/Contrat: parse tarif text to compute total
      if (field === 'tarif') {
        const parsed = parseFloat(String(val).replace(/[^\d.,]/g, '').replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) {
          updated.total = Math.round(parsed * 100) / 100;
          updated.prixUnitaire = updated.total;
          updated.quantite = 1;
        } else {
          updated.total = 0;
        }
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
      iban:       selectedFreelancer.iban || undefined,
      bic:        selectedFreelancer.bic || undefined,
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
        acomptePaye: form.acompteDejaVerse || acomptes.some(a => a.statut === 'paye'),
        resteAPayer: acomptes.length > 0 ? totals.ttc - totalAcomptesPaye : totals.reste,
        echeanceJours: form.echeanceJours || 30,
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
      // Build signataries list from client + freelancers
      const signataires: { titre: string; nom: string; role: string }[] = [];
      if (form.clientNom) {
        signataires.push({
          titre: 'Pour le Client',
          nom: form.clientRepresentant || form.clientNom,
          role: form.clientEntreprise ? `Représentant — ${form.clientEntreprise}` : 'Fonction',
        });
      }
      // Build per-freelancer prestataire details for injection
      const contratPrestataires = selectedContractFreelancers.map(f => {
        const det = prestDetails[f.id] || defaultPrestDetail();
        const fullName = `${f.prenom} ${f.nom}`;
        // Add to signataires
        signataires.push({
          titre: det.role ? `Le ${det.role}` : 'Le Prestataire',
          nom: fullName,
          role: f.siret || 'SIRET',
        });
        return {
          nom: fullName,
          role: det.role || f.specialite,
          siret: f.siret,
          adresse: f.adresse,
          montantHT: det.montantHT,
          tvaLabel: det.tvaLabel,
          echeance: det.echeance,
          iban: f.iban || '',
        };
      });
      // Fallback: if no contract freelancers but a single selected freelancer
      if (contratPrestataires.length === 0 && selectedFreelancer) {
        const det = prestDetails[selectedFreelancer.id] || defaultPrestDetail();
        signataires.push({
          titre: 'Le Prestataire',
          nom: `${selectedFreelancer.prenom} ${selectedFreelancer.nom}`,
          role: selectedFreelancer.siret || selectedFreelancer.entreprise || selectedFreelancer.specialite,
        });
        contratPrestataires.push({
          nom: `${selectedFreelancer.prenom} ${selectedFreelancer.nom}`,
          role: det.role || selectedFreelancer.specialite,
          siret: selectedFreelancer.siret,
          adresse: selectedFreelancer.adresse,
          montantHT: det.montantHT,
          tvaLabel: det.tvaLabel,
          echeance: det.echeance,
          iban: selectedFreelancer.iban || '',
        });
      }

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
        signLieu:           form.signLieu || undefined,
        signDate:           form.date || undefined,
        referentNom:        form.referentNom || undefined,
        // Article 8 — Paiement
        montantTTC:         contratPrestataires.reduce((s, p) => s + p.montantHT, 0) || undefined,
        montantAcompte:     Math.round(contratPrestataires.reduce((s, p) => s + p.montantHT, 0) * 0.5) || undefined,
        montantSolde:       Math.round(contratPrestataires.reduce((s, p) => s + p.montantHT, 0) * 0.5) || undefined,
        dateAcompte:        form.date || undefined,
        // SOW
        sowReferentClient:  form.clientRepresentant || form.clientNom || undefined,
        sowReferentPrestataires: form.referentNom || undefined,
        signataires:        signataires.length > 0 ? signataires : undefined,
        prestataires:       contratPrestataires.length > 0 ? contratPrestataires : undefined,
        provider:           providerPayload,
      });
    }
    setInjected(true);
    setSyncing(false);
  }, [docType, form, items, totals, iframeLoaded, selectedFreelancer, selectedContractFreelancers, prestDetails]);

  // ── Auto-sync ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoSync || !iframeLoaded) return;
    setSyncing(true);
    const t = setTimeout(() => { handleInject(); }, 700);
    return () => clearTimeout(t);
  }, [form, items, autoSync, iframeLoaded, selectedFreelancer, selectedContractFreelancers, prestDetails]);

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
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            * { max-height: none !important; }
            .page-break, [class*="page-break"], .break-after, .pagebreak { display: none !important; }
            @page { margin: 10mm; }
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
      numero:       `FAC-${year}-${String(count).padStart(3, '0')}-AC`,
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
      numero:       `FAC-${year}-${String(count).padStart(3, '0')}-SL`,
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
    setSelectedProjectId('');
    setProjectSearch('');
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
      tvaPercent: 20, acomptePercent: 0, acompteDejaVerse: false, dateAcompte: '', notes: '', echeanceJours: 30,
      signLieu: '', referentNom: '',
      influPlatformes: '', influTypeContenu: '', influNbPublications: '', influDatesPublication: '',
      influDroitsUtilisation: '', influExclusivite: '', influRemuneration: '', influKpis: '', influValidation: '',
    });
    setPrestDetails({});
    setAcomptes([]);
    setInjected(false);
    setSavedToInvoices(false);
  };

  // ── Convert Devis → Facture ───────────────────────────────────────────────────
  const handleConvertToFacture = () => {
    const newNumero = form.numero.startsWith('DEV-')
      ? form.numero.replace(/^DEV-/, 'FAC-')
      : getNextNumber('facture');
    setDocType('facture');
    setForm(f => ({ ...f, numero: newNumero }));
    setConvertBanner(true);
    setTimeout(() => setConvertBanner(false), 3000);
  };

  // ── Save document to store ──────────────────────────────────────────────────
  const handleSaveDocument = () => {
    if (editingDocId) {
      updateDocument(editingDocId, {
        type: docType,
        numero: form.numero,
        clientNom: form.clientEntreprise || form.clientNom,
        clientId: selectedClientId,
        formData: { ...form },
        serviceItems: items.map(i => ({ ...i })),
        freelancerIds: selectedFreelancerIds.length > 0 ? selectedFreelancerIds : (selectedFreelancerId ? [selectedFreelancerId] : []),
      });
    } else {
      const id = saveDocument({
        type: docType,
        numero: form.numero,
        status: 'brouillon',
        clientId: selectedClientId,
        clientNom: form.clientEntreprise || form.clientNom,
        formData: { ...form },
        serviceItems: items.map(i => ({ ...i })),
        freelancerIds: selectedFreelancerIds.length > 0 ? selectedFreelancerIds : (selectedFreelancerId ? [selectedFreelancerId] : []),
      });
      setEditingDocId(id);
    }
    setSavedToInvoices(true);
    setTimeout(() => setSavedToInvoices(false), 2000);
  };

  // ── Load saved document into editor ─────────────────────────────────────────
  const handleLoadDocument = (doc: SavedDocument) => {
    setDocType(doc.type);
    setForm({
      ...doc.formData,
      signLieu: doc.formData.signLieu ?? '',
      referentNom: (doc.formData as any).referentNom ?? '',
      echeanceJours: doc.formData.echeanceJours ?? 30,
      influPlatformes: doc.formData.influPlatformes ?? '',
      influTypeContenu: doc.formData.influTypeContenu ?? '',
      influNbPublications: doc.formData.influNbPublications ?? '',
      influDatesPublication: doc.formData.influDatesPublication ?? '',
      influDroitsUtilisation: doc.formData.influDroitsUtilisation ?? '',
      influExclusivite: doc.formData.influExclusivite ?? '',
      influRemuneration: doc.formData.influRemuneration ?? '',
      influKpis: doc.formData.influKpis ?? '',
      influValidation: doc.formData.influValidation ?? '',
    });
    setItems(doc.serviceItems.length > 0 ? doc.serviceItems : [newItem()]);
    setSelectedClientId(doc.clientId);
    setSelectedFreelancerIds(doc.freelancerIds);
    setSelectedFreelancerId(doc.freelancerIds[0] || '');
    setEditingDocId(doc.id);
    setInjected(false);
    setIframeLoaded(false);
    setView('editor');
  };

  // ── New document (from list) ────────────────────────────────────────────────
  const handleNewDocument = (type: DocType) => {
    handleReset();
    setDocType(type);
    setForm(f => ({ ...f, numero: getNextNumber(type) }));
    setEditingDocId(null);
    setView('editor');
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

  // ─── Filtered documents for list ─────────────────────────────────────────
  const filteredDocs = useMemo(() => {
    let docs = [...documents];
    if (listFilter !== 'all') docs = docs.filter(d => d.type === listFilter);
    if (listStatusFilter !== 'all') docs = docs.filter(d => d.status === listStatusFilter);
    return docs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [documents, listFilter, listStatusFilter]);

  const statusColors: Record<DocStatus, string> = {
    brouillon: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    'envoyé': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'signé': 'bg-green-500/20 text-green-400 border-green-500/30',
    'refusé': 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  // ══ LIST VIEW ══════════════════════════════════════════════════════════════
  if (view === 'list') {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-400" />
              </div>
              Documents
            </h1>
            <p className="text-slate-400 text-sm mt-1">{documents.length} document{documents.length > 1 ? 's' : ''} sauvegardé{documents.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            {(Object.entries(DOC_CONFIG) as [DocType, typeof DOC_CONFIG.facture][]).map(([type, c]) => {
              const Icon = c.icon;
              return (
                <button
                  key={type}
                  onClick={() => handleNewDocument(type)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${c.bg} ${c.border} border ${c.color} hover:opacity-80`}
                >
                  <Icon className="w-4 h-4" />
                  {type === 'facture' ? 'Nouvelle' : 'Nouveau'} {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'facture', 'devis', 'contrat'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setListFilter(f)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                listFilter === f
                  ? 'bg-primary-500/20 border-primary-500/40 text-primary-400'
                  : 'bg-card border-card-border text-slate-400 hover:text-white'
              )}
            >
              {f === 'all' ? 'Tous' : f === 'devis' ? 'Devis' : DOC_CONFIG[f].label + 's'}
            </button>
          ))}
          <div className="w-px bg-card-border mx-1" />
          {(['all', 'brouillon', 'envoyé', 'signé', 'refusé'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setListStatusFilter(s)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                listStatusFilter === s
                  ? 'bg-primary-500/20 border-primary-500/40 text-primary-400'
                  : 'bg-card border-card-border text-slate-400 hover:text-white'
              )}
            >
              {s === 'all' ? 'Tous statuts' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Documents table */}
        {filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Aucun document</h3>
            <p className="text-slate-400 text-sm mb-4">Créez votre premier document pour commencer</p>
            <button
              onClick={() => handleNewDocument('devis')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Nouveau Devis
            </button>
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border bg-obsidian-900/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Numéro</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => {
                  const c = DOC_CONFIG[doc.type];
                  const Icon = c.icon;
                  return (
                    <tr
                      key={doc.id}
                      className="border-b border-card-border/50 hover:bg-obsidian-700/30 transition-colors cursor-pointer"
                      onClick={() => handleLoadDocument(doc)}
                    >
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${c.bg} ${c.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {c.label}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white font-mono text-xs">{doc.numero}</td>
                      <td className="px-4 py-3 text-slate-300">{doc.clientNom || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColors[doc.status]}`}>
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(doc.updatedAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleLoadDocument(doc)}
                            className="p-1.5 rounded-lg hover:bg-primary-500/20 text-slate-400 hover:text-primary-400 transition-colors"
                            title="Modifier"
                          >
                            <FilePlus2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => duplicateDocument(doc.id)}
                            className="p-1.5 rounded-lg hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 transition-colors"
                            title="Dupliquer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteDocument(doc.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ══ EDITOR VIEW ════════════════════════════════════════════════════════════
  return (
    <div className="flex h-full overflow-hidden" style={{ height: 'calc(100vh - 72px)' }}>

      {/* ══ LEFT PANEL ══════════════════════════════════════════════════════ */}
      <div className="w-[400px] flex-shrink-0 flex flex-col bg-obsidian-800 border-r border-card-border overflow-hidden">

        {/* ── Back to list + Save ──────────────────────────────────────── */}
        <div className="flex items-center gap-2 p-2 border-b border-card-border bg-obsidian-900/80 flex-shrink-0">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-obsidian-700 transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Liste
          </button>
          <div className="flex-1" />
          <button
            onClick={handleSaveDocument}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            {editingDocId ? 'Mettre à jour' : 'Sauvegarder'}
          </button>
        </div>

        {/* ── Doc type selector ─────────────────────────────────────────── */}
        <div className="p-3 border-b border-card-border bg-obsidian-900/60 flex-shrink-0">
          <div className="grid grid-cols-4 gap-1.5">
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
                {(docType === 'contrat' || docType === 'contrat_influenceur') && (
                  <>
                    <FieldInput label="Date début" type="date" value={form.dateDebut} onChange={setF('dateDebut')} />
                    <FieldInput label="Date fin" type="date" value={form.dateFin} onChange={setF('dateFin')} />
                    <FieldInput label="Échéance paiement" type="date" value={form.echeance} onChange={setF('echeance')} />
                    <FieldInput label="Validité" type="date" value={form.validite} onChange={setF('validite')} />
                  </>
                )}
              </div>
              {(docType === 'contrat' || docType === 'contrat_influenceur') && (
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

              {/* Référent coordination (contrats) */}
              {(docType === 'contrat' || docType === 'contrat_influenceur') && (
                <div className="pt-1">
                  <FieldInput label="Référent coordination" value={form.referentNom} onChange={setF('referentNom')} placeholder="Nom du chef de projet / référent technique" />
                </div>
              )}

              {/* Influencer-specific fields */}
              {docType === 'contrat_influenceur' && (
                <div className="space-y-2 pt-2 border-t border-pink-500/20">
                  <p className="text-[11px] font-bold text-pink-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> Détails Influenceur
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <FieldInput label="Plateforme(s)" value={form.influPlatformes} onChange={setF('influPlatformes')} placeholder="Instagram, TikTok, YouTube" className="col-span-2" />
                    <FieldInput label="Type de contenu" value={form.influTypeContenu} onChange={setF('influTypeContenu')} placeholder="Post, Story, Reel, Vidéo, Live" />
                    <FieldInput label="Nombre de publications" value={form.influNbPublications} onChange={setF('influNbPublications')} placeholder="Ex: 3 posts + 5 stories" />
                    <FieldInput label="Dates de publication" value={form.influDatesPublication} onChange={setF('influDatesPublication')} placeholder="Ex: 15/04, 22/04, 30/04" />
                    <FieldInput label="Rémunération" value={form.influRemuneration} onChange={setF('influRemuneration')} placeholder="Fixe, variable, produits..." />
                    <FieldInput label="Droits d'utilisation" value={form.influDroitsUtilisation} onChange={setF('influDroitsUtilisation')} placeholder="Durée, territoires" className="col-span-2" />
                    <FieldInput label="Exclusivité" value={form.influExclusivite} onChange={setF('influExclusivite')} placeholder="Oui/Non, durée" />
                    <FieldInput label="KPIs attendus" value={form.influKpis} onChange={setF('influKpis')} placeholder="Vues, engagement, clics" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">Clauses de validation</label>
                    <textarea
                      value={form.influValidation}
                      onChange={e => setF('influValidation')(e.target.value)}
                      rows={2}
                      placeholder="Validation pré-publication, modération..."
                      className="w-full bg-obsidian-700 border border-card-border text-white text-xs rounded-lg px-2.5 py-2 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/60 focus:border-primary-500/60 transition-all resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Section: Projet (contracts only) ─────────────────────────── */}
          {(docType === 'contrat' || docType === 'contrat_influenceur') && (
            <div className="border-b border-card-border/50">
              <div className="p-4 space-y-2.5">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Lier à un projet
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={e => { setProjectSearch(e.target.value); setShowProjectSearch(true); }}
                    onFocus={() => setShowProjectSearch(true)}
                    placeholder="Rechercher un projet…"
                    className="w-full bg-obsidian-700 border border-card-border text-white text-xs rounded-lg py-2 pl-7 pr-8 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/60 focus:border-amber-500/60 transition-all"
                  />
                  {projectSearch && (
                    <button onClick={() => { setProjectSearch(''); setSelectedProjectId(''); setShowProjectSearch(false); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="w-3 h-3 text-slate-500 hover:text-white" />
                    </button>
                  )}
                </div>
                {showProjectSearch && filteredProjects.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-obsidian-700 border border-card-border rounded-xl overflow-hidden shadow-card z-20 mx-4">
                    {filteredProjects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProjectId(p.id); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-amber-500/10 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-semibold truncate">{p.nom}</p>
                          <p className="text-slate-500 text-[10px] truncate">{p.clientNom} · {p.freelancerIds?.length || 0} prestataire(s) · {p.statut}</p>
                        </div>
                        {selectedProjectId === p.id && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
                {selectedProjectId && (() => {
                  const proj = projects.find(p => p.id === selectedProjectId);
                  if (!proj) return null;
                  return (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 space-y-1">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-bold truncate">{proj.nom}</p>
                          <p className="text-amber-300 text-[10px]">{proj.clientNom} · {proj.freelancerIds?.length || 0} prestataire(s)</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500">Client, prestataires, dates et nom du projet auto-remplis depuis le projet.</p>
                    </div>
                  );
                })()}
                {!selectedProjectId && (
                  <p className="text-[10px] text-slate-500 text-center">Optionnel — lie le contrat à un projet existant pour auto-remplir les champs.</p>
                )}
              </div>
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
                {(docType === 'contrat' || docType === 'contrat_influenceur') && (
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
            title={(docType === 'contrat' || docType === 'contrat_influenceur') ? 'Prestataire(s)' : 'Prestataire'}
            open={secPrestataire}
            onToggle={() => setSecPrestataire(p => !p)}
            count={(docType === 'contrat' || docType === 'contrat_influenceur') ? selectedContractFreelancers.length : undefined}
          />
          {secPrestataire && (
            <div className="p-4 space-y-2.5 border-b border-card-border/50">
              {/* Freelancer search */}
              <div className="relative">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">
                  {(docType === 'contrat' || docType === 'contrat_influenceur') ? 'Ajouter un prestataire au contrat' : 'Sélectionner un prestataire'}
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
                          if (docType === 'contrat' || docType === 'contrat_influenceur') {
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
              {(docType === 'contrat' || docType === 'contrat_influenceur') ? (
                // Multi-freelancer mode for contracts
                selectedContractFreelancers.length > 0 ? (
                  <div className="space-y-2">
                    {/* Annexe 2 summary */}
                    {selectedContractFreelancers.length > 0 && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5 mb-1">
                        <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">Annexe 2 — Répartition paiements</p>
                        <div className="space-y-1">
                          {selectedContractFreelancers.map(f => {
                            const det = prestDetails[f.id] || defaultPrestDetail();
                            return (
                              <div key={f.id} className="flex items-center justify-between text-[10px]">
                                <span className="text-slate-300 truncate flex-1">{det.role || f.specialite} — {f.prenom} {f.nom}</span>
                                <span className="text-white font-semibold ml-2">{(det.montantHT || 0).toLocaleString('fr-FR')} €</span>
                              </div>
                            );
                          })}
                          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-amber-500/20">
                            <span className="text-amber-400 font-bold">Total contrat</span>
                            <span className="text-amber-400 font-bold">
                              {selectedContractFreelancers.reduce((s, f) => s + (prestDetails[f.id]?.montantHT || 0), 0).toLocaleString('fr-FR')} €
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedContractFreelancers.map((f, idx) => {
                      const det = prestDetails[f.id] || defaultPrestDetail();
                      return (
                      <div key={f.id} className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">{f.prenom.charAt(0)}{f.nom.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-bold">{idx + 1}. {f.prenom} {f.nom}</p>
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
                        {/* Contract-specific: Role + TVA + Échéance */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-primary-500/20">
                          <div>
                            <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Rôle</label>
                            <input type="text" value={det.role} onChange={e => updatePrestDetail(f.id, 'role', e.target.value)} placeholder="Media Buyer, Monteur…" className="w-full bg-obsidian-700 border border-card-border text-white text-[10px] rounded-lg py-1.5 px-2 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/60" />
                          </div>
                          <div>
                            <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">TVA</label>
                            <select value={det.tvaLabel} onChange={e => updatePrestDetail(f.id, 'tvaLabel', e.target.value)} className="w-full bg-obsidian-700 border border-card-border text-white text-[10px] rounded-lg py-1.5 px-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/60">
                              <option value="TVA non applicable - art.293B">Art. 293B</option>
                              <option value="TVA 5.5%">TVA 5.5%</option>
                              <option value="TVA 10%">TVA 10%</option>
                              <option value="TVA 20%">TVA 20%</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Échéance / Conditions</label>
                            <input type="text" value={det.echeance} onChange={e => updatePrestDetail(f.id, 'echeance', e.target.value)} placeholder="50% signature, 50% J+30" className="w-full bg-obsidian-700 border border-card-border text-white text-[10px] rounded-lg py-1.5 px-2 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/60" />
                          </div>
                        </div>
                        {/* Per-prestataire service lines */}
                        <div className="pt-1 border-t border-primary-500/20 space-y-1">
                          <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Prestations</label>
                          {det.prestations.map(line => (
                            <div key={line.id} className="flex items-center gap-1.5">
                              <input type="text" value={line.description} onChange={e => updatePrestLine(f.id, line.id, 'description', e.target.value)} placeholder="Description prestation…" className="flex-1 bg-obsidian-700 border border-card-border text-white text-[10px] rounded-lg py-1 px-2 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/60" />
                              <div className="flex items-center gap-0.5 w-20">
                                <input type="number" value={line.montant || ''} onChange={e => updatePrestLine(f.id, line.id, 'montant', Number(e.target.value))} placeholder="0" min={0} className="w-full bg-obsidian-700 border border-card-border text-white text-[10px] rounded-lg py-1 px-1.5 text-right placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/60" />
                                <span className="text-[9px] text-slate-500">€</span>
                              </div>
                              <button onClick={() => removePrestLine(f.id, line.id)} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                          <button onClick={() => addPrestLine(f.id)} className="w-full text-[9px] font-semibold text-primary-400 border border-primary-500/30 border-dashed rounded-lg py-1 hover:bg-primary-500/10 transition-all">
                            + Ajouter une prestation
                          </button>
                          {det.prestations.length > 0 && (
                            <div className="flex justify-between text-[10px] pt-0.5">
                              <span className="text-slate-500">Total HT</span>
                              <span className="text-white font-bold">{det.montantHT.toLocaleString('fr-FR')} €</span>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                          <div className="flex items-center gap-1 text-slate-400"><Hash className="w-3 h-3" /><span className="truncate">{f.siret || '—'}</span></div>
                          <div className="flex items-center gap-1 text-slate-400"><Mail className="w-3 h-3" /><span className="truncate">{f.email}</span></div>
                          {f.iban && <div className="flex items-center gap-1 text-slate-400 col-span-2 font-mono"><span className="truncate">IBAN: {f.iban.replace(/(.{4})/g, '$1 ').trim()}</span></div>}
                        </div>
                      </div>
                    );})}
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
                      {(selectedFreelancer.iban || selectedFreelancer.bic) && (
                        <div className="border-t border-primary-500/20 pt-1.5 mt-1.5 space-y-0.5">
                          {selectedFreelancer.iban && <p className="text-[10px] text-slate-500 font-mono">IBAN : {selectedFreelancer.iban.replace(/(.{4})/g, '$1 ').trim()}</p>}
                          {selectedFreelancer.bic && <p className="text-[10px] text-slate-500 font-mono">BIC : {selectedFreelancer.bic}</p>}
                        </div>
                      )}
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
                title={(docType === 'contrat' || docType === 'contrat_influenceur') ? 'Prestations / Clauses' : 'Prestations'}
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

                  {/* Échéance paiement */}
                  {(docType === 'facture' || docType === 'devis') && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">Échéance paiement</label>
                      <div className="flex gap-1.5">
                        {[15, 30, 45, 60].map(j => (
                          <button
                            key={j}
                            onClick={() => setF('echeanceJours')(j)}
                            className={clsx(
                              'flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all',
                              form.echeanceJours === j
                                ? 'bg-accent-cyan/20 border-accent-cyan/40 text-accent-cyan'
                                : 'bg-card border-card-border text-slate-500 hover:text-white'
                            )}
                          >
                            {j}j
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Acompte rapide (rétrocompatibilité) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">
                      Acompte <span className="text-slate-600 normal-case font-normal">(optionnel)</span>
                    </label>
                    <div className="flex gap-1.5">
                      {[0, 25, 30, 50].map(p => (
                        <button
                          key={p}
                          onClick={() => setF('acomptePercent')(p)}
                          className={clsx(
                            'px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all',
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

                  {/* Multi-acomptes management */}
                  {totals.acompte > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Suivi des acomptes</label>
                        <button
                          onClick={addAcompte}
                          className="text-[10px] font-semibold text-accent-cyan hover:text-white transition-colors"
                        >
                          + Ajouter
                        </button>
                      </div>

                      {acomptes.length === 0 && (
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
                              <input type="date" value={form.dateAcompte} onChange={e => setForm(f => ({ ...f, dateAcompte: e.target.value }))} className="w-full bg-obsidian-700 border border-card-border text-white text-xs rounded-lg py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-accent-green/60" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Multi-acompte cards */}
                      {acomptes.map((ac, idx) => (
                        <div
                          key={ac.id}
                          className={clsx(
                            'rounded-xl border p-2.5 space-y-2 transition-all',
                            ac.statut === 'paye' ? 'bg-accent-green/10 border-accent-green/30'
                              : ac.statut === 'annule' ? 'bg-slate-500/10 border-slate-500/30'
                              : 'bg-amber-500/10 border-amber-500/30'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">
                              Acompte {idx + 1}
                            </span>
                            <button onClick={() => removeAcompte(ac.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-0.5">Montant</label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={ac.montant || ''}
                                  onChange={e => updateAcompte(ac.id, { montant: Number(e.target.value), pourcentage: totals.ttc > 0 ? Math.round(Number(e.target.value) / totals.ttc * 100) : 0 })}
                                  min={0}
                                  className="w-full bg-obsidian-700 border border-card-border text-white text-[10px] rounded-lg py-1 px-2 focus:outline-none focus:ring-1 focus:ring-primary-500/60"
                                />
                                <span className="text-[10px] text-slate-500">€</span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-0.5">Statut</label>
                              <select
                                value={ac.statut}
                                onChange={e => updateAcompte(ac.id, {
                                  statut: e.target.value as AcompteStatut,
                                  ...(e.target.value === 'paye' && !ac.dateReglement ? { dateReglement: new Date().toISOString().split('T')[0] } : {}),
                                })}
                                className="w-full bg-obsidian-700 border border-card-border text-white text-[10px] rounded-lg py-1 px-2 focus:outline-none focus:ring-1 focus:ring-primary-500/60"
                              >
                                <option value="a_payer">A payer</option>
                                <option value="paye">Payé</option>
                                <option value="partiellement_paye">Partiel</option>
                                <option value="annule">Annulé</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-0.5">Date prévue</label>
                              <input type="date" value={ac.datePrevue} onChange={e => updateAcompte(ac.id, { datePrevue: e.target.value })} className="w-full bg-obsidian-700 border border-card-border text-white text-[10px] rounded-lg py-1 px-2 focus:outline-none focus:ring-1 focus:ring-primary-500/60" />
                            </div>
                            {(ac.statut === 'paye' || ac.statut === 'partiellement_paye') && (
                              <div>
                                <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-0.5">Date règlement</label>
                                <input type="date" value={ac.dateReglement || ''} onChange={e => updateAcompte(ac.id, { dateReglement: e.target.value })} className="w-full bg-obsidian-700 border border-card-border text-white text-[10px] rounded-lg py-1 px-2 focus:outline-none focus:ring-1 focus:ring-accent-green/60" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Acomptes summary */}
                      {acomptes.length > 0 && (
                        <div className="bg-obsidian-700/40 rounded-lg p-2 space-y-1 text-[10px]">
                          <div className="flex justify-between text-slate-400">
                            <span>Total acomptes prévus</span>
                            <span className="text-amber-400 font-semibold">{totalAcomptesPrevu.toLocaleString('fr-FR')} €</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Déjà encaissé</span>
                            <span className="text-accent-green font-semibold">{totalAcomptesPaye.toLocaleString('fr-FR')} €</span>
                          </div>
                          <div className="flex justify-between text-white font-bold border-t border-card-border/50 pt-1">
                            <span>Reste à encaisser</span>
                            <span>{(totals.ttc - totalAcomptesPaye).toLocaleString('fr-FR')} €</span>
                          </div>
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

          {/* ── Section: SOW / Annexe 1 (contracts only) ─────────────── */}
          {(docType === 'contrat' || docType === 'contrat_influenceur') && (
            <>
              <SectionHeader icon={BookOpen} title="Annexe 1 — SOW" open={secSOW} onToggle={() => setSecSOW(p => !p)} />
              {secSOW && (
                <div className="p-4 border-b border-card-border/50 space-y-2.5">
                  <p className="text-[10px] text-slate-500">Statement of Work — champs injectés dans l'Annexe 1 du contrat.</p>
                  <FieldInput label="Projet / Campagne" value={form.projetNom} onChange={setF('projetNom')} placeholder="Nom du projet ou de la campagne" />
                  <div className="grid grid-cols-2 gap-2">
                    <FieldInput label="Client" value={form.clientNom ? `${form.clientNom}${form.clientEntreprise ? ` — ${form.clientEntreprise}` : ''}` : ''} onChange={() => {}} placeholder="Auto-rempli" className="opacity-60 pointer-events-none" />
                    <FieldInput label="Référent Client" value={form.clientRepresentant} onChange={setF('clientRepresentant')} placeholder="Nom du contact client" />
                  </div>
                  <FieldInput label="Référent Prestataires / Coordination" value={form.referentNom} onChange={setF('referentNom')} placeholder="Chef de projet côté prestataires" />
                  <div className="bg-obsidian-700/30 border border-card-border/40 rounded-lg p-2.5">
                    <p className="text-[10px] text-amber-400 font-semibold mb-1">Périmètre par rôle</p>
                    <p className="text-[10px] text-slate-500">Les missions, livrables et KPIs par prestataire sont éditables directement dans le template. Ajoutez les prestataires dans la section "Prestataire(s)" ci-dessus.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Section: Signature (contracts only) ────────────────────── */}
          {(docType === 'contrat' || docType === 'contrat_influenceur') && (
            <>
              <SectionHeader icon={FileSignature} title="Signature" open={secSignature} onToggle={() => setSecSignature(p => !p)} />
              {secSignature && (
                <div className="p-4 border-b border-card-border/50 space-y-3">
                  <FieldInput label="Fait à (lieu)" value={form.signLieu} onChange={setF('signLieu')} placeholder="Paris, Lyon, Marseille…" />
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">Signataires</label>
                    <div className="space-y-2">
                      {/* Auto-generated from client */}
                      {form.clientNom && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 space-y-1">
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Le Client</p>
                          <p className="text-xs text-white">{form.clientRepresentant || form.clientNom}</p>
                          <p className="text-[10px] text-slate-500">{form.clientEntreprise || '—'}</p>
                        </div>
                      )}
                      {/* Auto-generated from freelancer(s) */}
                      {(docType === 'contrat' || docType === 'contrat_influenceur') && selectedContractFreelancers.length > 0 ? (
                        selectedContractFreelancers.map(f => (
                          <div key={f.id} className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-2.5 space-y-1">
                            <p className="text-[10px] font-bold text-primary-400 uppercase tracking-wide">Prestataire</p>
                            <p className="text-xs text-white">{f.prenom} {f.nom}</p>
                            <p className="text-[10px] text-slate-500">{f.entreprise || f.specialite}</p>
                          </div>
                        ))
                      ) : selectedFreelancer && (
                        <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-2.5 space-y-1">
                          <p className="text-[10px] font-bold text-primary-400 uppercase tracking-wide">Le Prestataire</p>
                          <p className="text-xs text-white">{selectedFreelancer.prenom} {selectedFreelancer.nom}</p>
                          <p className="text-[10px] text-slate-500">{selectedFreelancer.entreprise || selectedFreelancer.specialite}</p>
                        </div>
                      )}
                      {!form.clientNom && !selectedFreelancer && (
                        <p className="text-[10px] text-slate-500 text-center py-1">
                          Les signataires sont générés automatiquement à partir du client et du/des prestataire(s) sélectionnés.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
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

import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText, Plus, Send, CheckCircle2, AlertCircle,
  Clock, XCircle, Download, Eye, Edit2, Trash2,
  Euro, TrendingUp, Calendar, ExternalLink
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/useStore';
import { Invoice, InvoiceStatus, Devise } from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { StatCard } from '../components/ui/StatCard';
import { exportInvoicesCsv } from '../utils/csvExport';
import { downloadFEC } from '../utils/fecExport';
import { formatMontant as formatDevise } from '../utils/currency';
import { toast } from '../components/ui/Toast';
import clsx from 'clsx';

const statusConfig: Record<InvoiceStatus, { label: string; variant: any; icon: React.FC<any>; color: string }> = {
  brouillon: { label: 'Brouillon',  variant: 'default', icon: FileText,     color: 'text-slate-400' },
  envoyée:   { label: 'Envoyée',    variant: 'info',    icon: Send,          color: 'text-cyan-400' },
  payée:     { label: 'Payée',      variant: 'success', icon: CheckCircle2,  color: 'text-emerald-400' },
  'en retard': { label: 'En retard', variant: 'error',  icon: AlertCircle,   color: 'text-red-400' },
  annulée:   { label: 'Annulée',    variant: 'default', icon: XCircle,       color: 'text-slate-500' },
};

interface NewInvoiceItem {
  description: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

const today = new Date().toISOString().split('T')[0];
const defaultEcheance = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
})();

const emptyItem = (): NewInvoiceItem => ({ description: '', quantite: 1, prixUnitaire: 0, total: 0 });

export const Invoices: React.FC = () => {
  const { invoices, clients, projects, settings, addInvoice, updateInvoice, deleteInvoice, setActiveSection } = useStore();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'tous'>('tous');
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // ── New Invoice Form State ─────────────────────────────────────────────────
  const [clientId, setClientId] = useState('');
  const [clientNom, setClientNom] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projectNom, setProjectNom] = useState('');
  const [dateEmission, setDateEmission] = useState(today);
  const [dateEcheance, setDateEcheance] = useState(defaultEcheance);
  const [notes, setNotes] = useState('');
  const [tvaRate, setTvaRate] = useState(20);
  const [devise, setDevise] = useState<Devise>('EUR');
  const [items, setItems] = useState<NewInvoiceItem[]>([emptyItem()]);

  // ── Auto-calcul statut "en retard" ────────────────────────────────────────
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    invoices.forEach(inv => {
      if (inv.statut === 'envoyée' && inv.dateEcheance < todayStr) {
        updateInvoice(inv.id, { statut: 'en retard' });
      }
    });
  }, [invoices.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (statusFilter === 'tous') return [...invoices].sort((a, b) => new Date(b.dateEmission).getTime() - new Date(a.dateEmission).getTime());
    return invoices.filter(i => i.statut === statusFilter).sort((a, b) => new Date(b.dateEmission).getTime() - new Date(a.dateEmission).getTime());
  }, [invoices, statusFilter]);

  const stats = useMemo(() => {
    const payees = invoices.filter(i => i.statut === 'payée').reduce((s, i) => s + i.total, 0);
    const enAttente = invoices.filter(i => i.statut === 'envoyée').reduce((s, i) => s + i.total, 0);
    const enRetard = invoices.filter(i => i.statut === 'en retard').reduce((s, i) => s + i.total, 0);
    const total = invoices.reduce((s, i) => s + i.total, 0);
    return { payees, enAttente, enRetard, total };
  }, [invoices]);

  // ── Computed totals for new invoice form ──────────────────────────────────
  const sousTotal = items.reduce((s, i) => s + i.total, 0);
  const tvaAmount = Math.round(sousTotal * (tvaRate / 100) * 100) / 100;
  const totalTTC = sousTotal + tvaAmount;

  // ── Item helpers ──────────────────────────────────────────────────────────
  const updateItem = (index: number, field: keyof NewInvoiceItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantite' || field === 'prixUnitaire') {
        updated.total = Math.round(Number(updated.quantite) * Number(updated.prixUnitaire) * 100) / 100;
      }
      return updated;
    }));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // ── Reset form ────────────────────────────────────────────────────────────
  const resetForm = () => {
    setClientId('');
    setClientNom('');
    setProjectId('');
    setProjectNom('');
    setDateEmission(today);
    setDateEcheance(defaultEcheance);
    setNotes('');
    setTvaRate(20);
    setDevise('EUR');
    setItems([emptyItem()]);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  // ── Submit new invoice ────────────────────────────────────────────────────
  const handleSubmitInvoice = () => {
    if (!clientId) return;
    const year = new Date().getFullYear();
    const nextNum = String(invoices.length + 1).padStart(3, '0');
    const numero = `OA-${year}-${nextNum}`;

    addInvoice({
      numero,
      clientId,
      clientNom,
      projectId: projectId || undefined,
      projectNom: projectNom || undefined,
      statut: 'brouillon',
      dateEmission,
      dateEcheance,
      items: items.map(i => ({ ...i, id: uuidv4() })),
      sousTotal,
      tva: tvaAmount,
      total: totalTTC,
      devise,
      notes,
    });

    setIsAddModalOpen(false);
    resetForm();
  };

  const handleMarkPaid = (id: string) => {
    updateInvoice(id, { statut: 'payée', datePaiement: new Date().toISOString().split('T')[0] });
  };

  const handleMarkSent = (id: string) => {
    updateInvoice(id, { statut: 'envoyée' });
  };

  return (
    <div className="space-y-6">

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Facturé" value={`${(stats.total / 1000).toFixed(1)}k€`} icon={Euro} color="purple" />
        <StatCard title="Encaissé" value={`${(stats.payees / 1000).toFixed(1)}k€`} icon={CheckCircle2} color="green" />
        <StatCard title="En Attente" value={`${(stats.enAttente / 1000).toFixed(1)}k€`} icon={Clock} color="cyan" />
        <StatCard title="En Retard" value={`${(stats.enRetard / 1000).toFixed(1)}k€`} icon={AlertCircle} color={stats.enRetard > 0 ? 'red' : 'green'} />
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(['tous', 'brouillon', 'envoyée', 'payée', 'en retard', 'annulée'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                statusFilter === status
                  ? 'bg-primary-500/20 text-primary-300 border-primary-500/40'
                  : 'bg-card text-slate-400 border-card-border hover:text-white'
              )}
            >
              {status === 'tous' ? 'Toutes' : status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-1.5 text-slate-500">
                {status === 'tous' ? invoices.length : invoices.filter(i => i.statut === status).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportInvoicesCsv(invoices)}
            className="flex items-center gap-2 border border-card-border text-slate-300 text-sm font-medium px-3 py-2 rounded-xl hover:border-primary-500/40 hover:text-white transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => {
              const year = new Date().getFullYear();
              downloadFEC(
                invoices,
                { debut: `${year}-01-01`, fin: `${year}-12-31` },
                settings.siret || '00000000000000'
              );
              toast.success('FEC export\u00e9');
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-card border border-card-border text-slate-300 rounded-xl text-sm font-medium hover:text-white hover:border-primary-500/30 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export FEC
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-gradient-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-glow-purple"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Facture
          </button>
        </div>
      </div>

      {/* ── Invoices Table ───────────────────────────────────────────────── */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">N° Facture</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Client</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Projet</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Dates</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Montant</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Aucune facture trouvée</p>
                  </td>
                </tr>
              )}
              {filtered.map((invoice) => {
                const sc = statusConfig[invoice.statut];
                const StatusIcon = sc.icon;
                const isLate = invoice.statut === 'en retard';
                return (
                  <tr key={invoice.id} className={clsx('hover:bg-card-hover transition-colors group', isLate && 'bg-accent-red/5')}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={clsx('w-4 h-4', sc.color)} />
                        <span className="text-white text-sm font-bold font-mono">{invoice.numero}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-white text-sm font-medium">{invoice.clientNom}</p>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <p className="text-slate-400 text-xs">{invoice.projectNom || '—'}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {new Date(invoice.dateEmission).toLocaleDateString('fr-FR')}
                        </div>
                        <div className={clsx('flex items-center gap-1.5 text-xs', isLate ? 'text-accent-red' : 'text-slate-500')}>
                          <Clock className="w-3 h-3" />
                          Échéance: {new Date(invoice.dateEcheance).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className={clsx('text-sm font-bold', invoice.statut === 'payée' ? 'text-accent-green' : isLate ? 'text-accent-red' : 'text-white')}>
                        {formatDevise(invoice.total, invoice.devise || 'EUR')}
                      </p>
                      <p className="text-slate-500 text-xs">TTC</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
                        <button
                          onClick={() => setViewingInvoice(invoice)}
                          className="w-7 h-7 rounded-lg bg-obsidian-700 border border-card-border flex items-center justify-center text-slate-400 hover:text-accent-cyan hover:border-accent-cyan/30 transition-all"
                          title="Voir détail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setActiveSection('documents')}
                          className="w-7 h-7 rounded-lg bg-obsidian-700 border border-card-border flex items-center justify-center text-slate-400 hover:text-primary-400 hover:border-primary-500/30 transition-all"
                          title="Ouvrir dans Documents"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        {invoice.statut === 'brouillon' && (
                          <button
                            onClick={() => handleMarkSent(invoice.id)}
                            className="w-7 h-7 rounded-lg bg-obsidian-700 border border-card-border flex items-center justify-center text-slate-400 hover:text-accent-cyan hover:border-accent-cyan/30 transition-all"
                            title="Marquer envoyée"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(invoice.statut === 'envoyée' || invoice.statut === 'en retard') && (
                          <button
                            onClick={() => handleMarkPaid(invoice.id)}
                            className="w-7 h-7 rounded-lg bg-obsidian-700 border border-card-border flex items-center justify-center text-slate-400 hover:text-accent-green hover:border-accent-green/30 transition-all"
                            title="Marquer payée"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(invoice.id)}
                          className="w-7 h-7 rounded-lg bg-obsidian-700 border border-card-border flex items-center justify-center text-slate-400 hover:text-accent-red hover:border-accent-red/30 transition-all"
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
        <div className="px-5 py-3 border-t border-card-border flex items-center justify-between">
          <p className="text-slate-500 text-xs">{filtered.length} facture{filtered.length > 1 ? 's' : ''}</p>
          <p className="text-slate-500 text-xs">
            Total affiché: <span className="text-white font-semibold">
              {filtered.reduce((s, i) => s + i.total, 0).toLocaleString('fr-FR')} €
            </span>
          </p>
        </div>
      </div>

      {/* ── Add Invoice Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Nouvelle Facture" size="xl">
        <div className="space-y-5">

          {/* Client + Projet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Client <span className="text-red-400">*</span></label>
              <select
                value={clientId}
                onChange={e => {
                  const c = clients.find(c => c.id === e.target.value);
                  setClientId(e.target.value);
                  setClientNom(c ? (c.entreprise || c.nom) : '');
                }}
                className="w-full bg-obsidian-700 border border-card-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 transition-colors"
              >
                <option value="">Sélectionner un client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.entreprise || c.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Projet (optionnel)</label>
              <select
                value={projectId}
                onChange={e => {
                  const p = projects.find(p => p.id === e.target.value);
                  setProjectId(e.target.value);
                  setProjectNom(p ? p.nom : '');
                }}
                className="w-full bg-obsidian-700 border border-card-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 transition-colors"
              >
                <option value=""></option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates + TVA + Devise */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date d'émission</label>
              <input
                type="date"
                value={dateEmission}
                onChange={e => setDateEmission(e.target.value)}
                className="w-full bg-obsidian-700 border border-card-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date d'échéance</label>
              <input
                type="date"
                value={dateEcheance}
                onChange={e => setDateEcheance(e.target.value)}
                className="w-full bg-obsidian-700 border border-card-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">TVA</label>
              <select
                value={tvaRate}
                onChange={e => setTvaRate(Number(e.target.value))}
                className="w-full bg-obsidian-700 border border-card-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 transition-colors"
              >
                {[0, 5.5, 10, 20].map(r => (
                  <option key={r} value={r}>{r} %</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Devise</label>
              <select
                value={devise}
                onChange={e => setDevise(e.target.value as Devise)}
                className="w-full bg-obsidian-700 border border-card-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 transition-colors"
              >
                <option value="EUR">{'\u20ac'} Euro</option>
                <option value="USD">$ Dollar US</option>
                <option value="GBP">{'\u00a3'} Livre Sterling</option>
                <option value="CHF">CHF Franc Suisse</option>
                <option value="CAD">CA$ Dollar Canadien</option>
                <option value="MAD">DH Dirham</option>
                <option value="XOF">CFA Franc CFA</option>
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-400">Lignes</label>
              <button
                onClick={addItem}
                className="flex items-center gap-1 text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter une ligne
              </button>
            </div>
            <div className="bg-obsidian-700 rounded-xl border border-card-border overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 px-4 py-2 border-b border-card-border bg-obsidian-800">
                <span className="col-span-5 text-xs font-semibold text-slate-400">Description</span>
                <span className="col-span-2 text-xs font-semibold text-slate-400 text-center">Qté</span>
                <span className="col-span-2 text-xs font-semibold text-slate-400 text-right">Prix unit. (€)</span>
                <span className="col-span-2 text-xs font-semibold text-slate-400 text-right">Total</span>
                <span className="col-span-1" />
              </div>
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 px-4 py-2.5 border-b border-card-border/50 last:border-0 gap-2 items-center">
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => updateItem(index, 'description', e.target.value)}
                      placeholder="Description..."
                      className="w-full bg-obsidian-800 border border-card-border rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/60 transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={0}
                      value={item.quantite}
                      onChange={e => updateItem(index, 'quantite', Number(e.target.value))}
                      className="w-full bg-obsidian-800 border border-card-border rounded-lg px-2.5 py-1.5 text-sm text-white text-center focus:outline-none focus:border-primary-500/60 transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.prixUnitaire}
                      onChange={e => updateItem(index, 'prixUnitaire', Number(e.target.value))}
                      className="w-full bg-obsidian-800 border border-card-border rounded-lg px-2.5 py-1.5 text-sm text-white text-right focus:outline-none focus:border-primary-500/60 transition-colors"
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-semibold text-white">{item.total.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 1}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-accent-red disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Supprimer la ligne"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals summary */}
          <div className="bg-obsidian-700 rounded-xl border border-card-border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Sous-total HT</span>
              <span className="text-white">{formatDevise(sousTotal, devise)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">TVA ({tvaRate}%)</span>
              <span className="text-white">{formatDevise(tvaAmount, devise)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-card-border">
              <span className="text-white">Total TTC</span>
              <span className="text-accent-green text-xl">{formatDevise(totalTTC, devise)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Notes internes ou conditions particulières..."
              className="w-full bg-obsidian-700 border border-card-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/60 transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:bg-card-hover hover:text-white transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmitInvoice}
              disabled={!clientId}
              className="flex-1 py-2.5 rounded-xl bg-gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-glow-purple disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Créer la facture
            </button>
          </div>
        </div>
      </Modal>

      {/* ── View Invoice Modal ───────────────────────────────────────────── */}
      {viewingInvoice && (
        <Modal isOpen={true} onClose={() => setViewingInvoice(null)} title={viewingInvoice.numero} subtitle={`${viewingInvoice.clientNom} · ${statusConfig[viewingInvoice.statut].label}`} size="lg">
          <div className="space-y-5">
            {/* Info Header */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-obsidian-700 rounded-xl p-3 border border-card-border">
                <p className="text-slate-500 text-xs">Émission</p>
                <p className="text-white text-sm font-medium">{new Date(viewingInvoice.dateEmission).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="bg-obsidian-700 rounded-xl p-3 border border-card-border">
                <p className="text-slate-500 text-xs">Échéance</p>
                <p className={clsx('text-sm font-medium', viewingInvoice.statut === 'en retard' ? 'text-accent-red' : 'text-white')}>
                  {new Date(viewingInvoice.dateEcheance).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="bg-obsidian-700 rounded-xl p-3 border border-card-border">
                <p className="text-slate-500 text-xs">Statut</p>
                <Badge variant={statusConfig[viewingInvoice.statut].variant}>{statusConfig[viewingInvoice.statut].label}</Badge>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-obsidian-700 rounded-xl border border-card-border overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-2 border-b border-card-border bg-obsidian-800">
                <span className="col-span-6 text-xs font-semibold text-slate-400">Description</span>
                <span className="col-span-2 text-xs font-semibold text-slate-400 text-center">Qté</span>
                <span className="col-span-2 text-xs font-semibold text-slate-400 text-right">P.U.</span>
                <span className="col-span-2 text-xs font-semibold text-slate-400 text-right">Total</span>
              </div>
              {viewingInvoice.items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 px-4 py-3 border-b border-card-border/50 last:border-0">
                  <span className="col-span-6 text-white text-sm">{item.description}</span>
                  <span className="col-span-2 text-slate-400 text-sm text-center">{item.quantite}</span>
                  <span className="col-span-2 text-slate-400 text-sm text-right">{formatDevise(item.prixUnitaire, viewingInvoice.devise || 'EUR')}</span>
                  <span className="col-span-2 text-white text-sm font-semibold text-right">{formatDevise(item.total, viewingInvoice.devise || 'EUR')}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="bg-obsidian-700 rounded-xl border border-card-border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Sous-total HT</span>
                <span className="text-white">{formatDevise(viewingInvoice.sousTotal, viewingInvoice.devise || 'EUR')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">TVA (20%)</span>
                <span className="text-white">{formatDevise(viewingInvoice.tva, viewingInvoice.devise || 'EUR')}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-card-border">
                <span className="text-white">Total TTC</span>
                <span className="text-accent-green text-xl">{formatDevise(viewingInvoice.total, viewingInvoice.devise || 'EUR')}</span>
              </div>
            </div>

            {viewingInvoice.notes && (
              <div className="bg-obsidian-700 rounded-xl p-4 border border-card-border">
                <p className="text-slate-500 text-xs mb-1">Notes</p>
                <p className="text-slate-300 text-sm">{viewingInvoice.notes}</p>
              </div>
            )}

            <div className="flex gap-3">
              {viewingInvoice.statut === 'brouillon' && (
                <button onClick={() => { handleMarkSent(viewingInvoice.id); setViewingInvoice(null); }} className="flex-1 py-2.5 rounded-xl bg-gradient-cyan text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Envoyer
                </button>
              )}
              {(viewingInvoice.statut === 'envoyée' || viewingInvoice.statut === 'en retard') && (
                <button onClick={() => { handleMarkPaid(viewingInvoice.id); setViewingInvoice(null); }} className="flex-1 py-2.5 rounded-xl bg-gradient-green text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Marquer Payée
                </button>
              )}
              <button onClick={() => setViewingInvoice(null)} className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:bg-card-hover hover:text-white transition-all">
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Confirm Delete ───────────────────────────────────────────────── */}
      {confirmDelete && (
        <Modal isOpen={true} onClose={() => setConfirmDelete(null)} title="Supprimer cette facture ?" size="sm">
          <p className="text-slate-400 text-sm mb-5">Cette action est irréversible.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:bg-card-hover hover:text-white transition-all">Annuler</button>
            <button onClick={() => { deleteInvoice(confirmDelete); setConfirmDelete(null); }} className="flex-1 py-2.5 rounded-xl bg-accent-red/20 border border-accent-red/30 text-red-400 text-sm font-semibold hover:bg-accent-red/30 transition-all">Supprimer</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

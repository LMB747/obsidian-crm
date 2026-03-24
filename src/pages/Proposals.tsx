import React, { useState } from 'react';
import { FileText, Plus, Send, Trash2, Receipt, Briefcase } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store/useStore';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '../components/ui/Toast';
import { DevisStatut, DevisItem } from '../types';

const INPUT_CLASS = 'w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all';

const STATUS_CONFIG: Record<DevisStatut, { label: string; class: string }> = {
  brouillon: { label: 'Brouillon', class: 'bg-slate-500/20 text-slate-300' },
  'envoyé': { label: 'Envoyé', class: 'bg-blue-500/20 text-blue-300' },
  'accepté': { label: 'Accepté', class: 'bg-emerald-500/20 text-emerald-300' },
  'refusé': { label: 'Refusé', class: 'bg-red-500/20 text-red-300' },
  'expiré': { label: 'Expiré', class: 'bg-amber-500/20 text-amber-300' },
};

const Proposals: React.FC = () => {
  const { devis, clients, addDevis, updateDevis, deleteDevis, convertDevisToInvoice, convertDevisToProject } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<DevisItem[]>([]);
  const [formData, setFormData] = useState({
    clientId: '', dateExpiration: '', notes: '', conditions: 'Paiement à 30 jours',
  });

  const sousTotal = items.reduce((s, i) => s + i.total, 0);
  const tva = sousTotal * 0.2;
  const total = sousTotal + tva;

  const addItem = () => setItems(prev => [...prev, { id: uuidv4(), description: '', quantite: 1, prixUnitaire: 0, total: 0 }]);
  const updateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, [field]: value };
      updated.total = updated.quantite * updated.prixUnitaire;
      return updated;
    }));
  };
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const handleSubmit = () => {
    const client = clients.find(c => c.id === formData.clientId);
    if (!client || items.length === 0) { toast.error('Client et au moins un item requis'); return; }
    addDevis({
      clientId: client.id,
      clientNom: client.entreprise || client.nom,
      statut: 'brouillon',
      items,
      sousTotal,
      tva,
      total,
      dateExpiration: formData.dateExpiration || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      notes: formData.notes,
      conditions: formData.conditions,
    });
    setShowForm(false);
    setItems([]);
    setFormData({ clientId: '', dateExpiration: '', notes: '', conditions: 'Paiement à 30 jours' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-400" />
            Devis & Propositions
          </h2>
          <p className="text-sm text-slate-400 mt-1">{devis.length} devis</p>
        </div>
        <button onClick={() => { setShowForm(true); addItem(); }} className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-accent-cyan to-primary-500 text-white rounded-xl text-sm font-semibold hover:opacity-90">
          <Plus className="w-4 h-4" /> Nouveau devis
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(['brouillon', 'envoyé', 'accepté', 'refusé'] as DevisStatut[]).map(s => (
          <div key={s} className="bg-card border border-card-border rounded-xl p-4">
            <p className="text-xs text-slate-500">{STATUS_CONFIG[s].label}</p>
            <p className="text-xl font-bold text-white">{devis.filter(d => d.statut === s).length}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Nouveau devis</h3>
          <div className="grid grid-cols-2 gap-3">
            <select value={formData.clientId} onChange={e => setFormData(p => ({ ...p, clientId: e.target.value }))} className={INPUT_CLASS}>
              <option value="">Client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nom} — {c.entreprise}</option>)}
            </select>
            <input type="date" value={formData.dateExpiration} onChange={e => setFormData(p => ({ ...p, dateExpiration: e.target.value }))} className={INPUT_CLASS} />
          </div>

          {/* Items */}
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-semibold">Lignes du devis</p>
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Description" className={clsx(INPUT_CLASS, 'col-span-5')} />
                <input type="number" value={item.quantite || ''} onChange={e => updateItem(item.id, 'quantite', Number(e.target.value))} placeholder="Qté" className={clsx(INPUT_CLASS, 'col-span-2')} />
                <input type="number" value={item.prixUnitaire || ''} onChange={e => updateItem(item.id, 'prixUnitaire', Number(e.target.value))} placeholder="P.U." className={clsx(INPUT_CLASS, 'col-span-2')} />
                <p className="col-span-2 text-sm text-white text-right font-mono">{item.total.toLocaleString('fr-FR')} &euro;</p>
                <button onClick={() => removeItem(item.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button onClick={addItem} className="text-xs text-primary-400 hover:text-primary-300">+ Ajouter une ligne</button>
          </div>

          {/* Totals */}
          <div className="text-right space-y-1 border-t border-card-border pt-3">
            <p className="text-xs text-slate-400">Sous-total: <span className="text-white font-mono">{sousTotal.toLocaleString('fr-FR')} &euro;</span></p>
            <p className="text-xs text-slate-400">TVA (20%): <span className="text-white font-mono">{tva.toLocaleString('fr-FR')} &euro;</span></p>
            <p className="text-sm font-bold text-white">Total: {total.toLocaleString('fr-FR')} &euro;</p>
          </div>

          <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Notes..." className={INPUT_CLASS} rows={2} />
          <div className="flex gap-3">
            <button onClick={() => { setShowForm(false); setItems([]); }} className="flex-1 py-2 rounded-xl border border-card-border text-slate-400 text-sm">Annuler</button>
            <button onClick={handleSubmit} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-accent-cyan to-primary-500 text-white text-sm font-semibold">Créer le devis</button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {devis.map(d => (
          <div key={d.id} className="flex items-center gap-3 p-4 bg-card border border-card-border rounded-xl hover:border-primary-500/30 transition-all">
            <FileText className="w-5 h-5 text-primary-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{d.numero}</p>
              <p className="text-[10px] text-slate-500">{d.clientNom} &bull; {format(new Date(d.dateCreation), 'dd MMM yyyy', { locale: fr })}</p>
            </div>
            <p className="text-sm font-bold text-white">{d.total.toLocaleString('fr-FR')} &euro;</p>
            <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-semibold', STATUS_CONFIG[d.statut].class)}>
              {STATUS_CONFIG[d.statut].label}
            </span>
            {d.statut === 'brouillon' && (
              <button onClick={() => updateDevis(d.id, { statut: 'envoyé' })} className="text-blue-400 hover:text-blue-300 p-1" title="Envoyer"><Send className="w-3.5 h-3.5" /></button>
            )}
            {d.statut === 'envoyé' && (
              <>
                <button onClick={() => convertDevisToInvoice(d.id)} className="text-emerald-400 hover:text-emerald-300 p-1" title="Convertir en facture"><Receipt className="w-3.5 h-3.5" /></button>
                <button onClick={() => convertDevisToProject(d.id)} className="text-primary-400 hover:text-primary-300 p-1" title="Créer un projet"><Briefcase className="w-3.5 h-3.5" /></button>
              </>
            )}
            <button onClick={() => deleteDevis(d.id)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        {devis.length === 0 && <p className="text-sm text-slate-500 text-center py-8">Aucun devis — créez votre première proposition</p>}
      </div>
    </div>
  );
};

export default Proposals;

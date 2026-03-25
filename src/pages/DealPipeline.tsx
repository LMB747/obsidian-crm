import React, { useState, useMemo } from 'react';
import {
  Target, Plus, ChevronRight, Trash2, AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store/useStore';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '../components/ui/Toast';

const INPUT_CLASS = 'w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all';

interface Deal {
  id: string;
  titre: string;
  clientId: string;
  clientNom: string;
  montant: number;
  probabilite: number; // 0-100
  dateClose: string;
  colonne: PipelineColumn;
  notes: string;
  dateCreation: string;
  dureeJours?: number;
  etapeDate?: string;
  criteresSatisfaits?: string[];
  raisonPerte?: string;
  concurrent?: string;
  prochaineAction?: string;
  dateProchaineAction?: string;
}

type PipelineColumn = 'prospect' | 'qualification' | 'proposition' | 'negociation' | 'gagne' | 'perdu';

const COLUMNS: { id: PipelineColumn; label: string; color: string; probabilite: number; dureeMax: number; criteres: string[] }[] = [
  { id: 'prospect', label: 'Prospect', color: 'border-slate-500', probabilite: 10, dureeMax: 7, criteres: ['Budget identifié', 'Besoin confirmé'] },
  { id: 'qualification', label: 'Qualification', color: 'border-blue-500', probabilite: 25, dureeMax: 14, criteres: ['Décideur identifié', 'Timeline confirmé', 'Budget validé'] },
  { id: 'proposition', label: 'Proposition', color: 'border-violet-500', probabilite: 50, dureeMax: 14, criteres: ['Proposition envoyée', 'Retour reçu'] },
  { id: 'negociation', label: 'Négociation', color: 'border-amber-500', probabilite: 75, dureeMax: 21, criteres: ['Conditions acceptées', 'Validation juridique'] },
  { id: 'gagne', label: 'Gagné', color: 'border-emerald-500', probabilite: 100, dureeMax: 0, criteres: [] },
  { id: 'perdu', label: 'Perdu', color: 'border-red-500', probabilite: 0, dureeMax: 0, criteres: [] },
];

const DealPipeline: React.FC = () => {
  const { clients, addProject } = useStore();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [formData, setFormData] = useState({
    titre: '', clientId: '', montant: 0, probabilite: 10, dateClose: '', notes: '',
  });

  const stats = useMemo(() => ({
    totalPipeline: deals.filter(d => !['gagne', 'perdu'].includes(d.colonne)).reduce((s, d) => s + d.montant, 0),
    totalPipelineWeighted: deals
      .filter(d => !['gagne', 'perdu'].includes(d.colonne))
      .reduce((s, d) => s + d.montant * (d.probabilite / 100), 0),
    totalGagne: deals.filter(d => d.colonne === 'gagne').reduce((s, d) => s + d.montant, 0),
    totalDeals: deals.filter(d => !['gagne', 'perdu'].includes(d.colonne)).length,
    tauxConversion: deals.length ? Math.round(deals.filter(d => d.colonne === 'gagne').length / Math.max(1, deals.filter(d => ['gagne', 'perdu'].includes(d.colonne)).length) * 100) : 0,
  }), [deals]);

  const handleSubmit = () => {
    if (!formData.titre || !formData.clientId) return;
    const client = clients.find(c => c.id === formData.clientId);
    if (editDeal) {
      setDeals(prev => prev.map(d => d.id === editDeal.id ? { ...d, ...formData, clientNom: client?.nom || '' } : d));
    } else {
      const now = new Date().toISOString();
      setDeals(prev => [...prev, {
        id: uuidv4(),
        ...formData,
        probabilite: COLUMNS[0].probabilite,
        clientNom: client?.nom || client?.entreprise || '',
        colonne: 'prospect',
        dateCreation: now,
        etapeDate: now,
        dureeJours: 0,
        criteresSatisfaits: [],
      }]);
    }
    setFormData({ titre: '', clientId: '', montant: 0, probabilite: 10, dateClose: '', notes: '' });
    setShowForm(false);
    setEditDeal(null);
  };

  const moveDeal = (dealId: string, direction: 'next' | 'prev') => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const idx = COLUMNS.findIndex(c => c.id === d.colonne);
      const newIdx = direction === 'next' ? Math.min(idx + 1, COLUMNS.length - 1) : Math.max(idx - 1, 0);
      const newCol = COLUMNS[newIdx];

      if (newCol.id === 'gagne') {
        // Auto-create project
        addProject({
          nom: d.titre,
          description: `Projet issu du deal "${d.titre}"`,
          clientId: d.clientId,
          clientNom: d.clientNom,
          statut: 'en cours',
          priorite: 'haute',
          dateDebut: new Date().toISOString().slice(0, 10),
          dateFin: d.dateClose || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
          budget: d.montant,
          depenses: 0,
          progression: 0,
          taches: [],
          milestones: [],
          equipe: [],
          freelancerIds: [],
          tags: [],
          categorie: '',
          activityLog: [],
        });
        toast.success(`Deal gagné ! Projet "${d.titre}" créé automatiquement`);
      }

      return {
        ...d,
        colonne: newCol.id,
        probabilite: newCol.probabilite,
        etapeDate: new Date().toISOString(),
        dureeJours: Math.ceil((Date.now() - new Date(d.dateCreation).getTime()) / 86400000),
      };
    }));
  };

  const deleteDeal = (id: string) => setDeals(prev => prev.filter(d => d.id !== id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-primary-400" />
            Pipeline Commercial
          </h2>
          <p className="text-sm text-slate-400 mt-1">Suivi des opportunités de vente</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditDeal(null); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-accent-cyan to-primary-500 text-white rounded-xl text-sm font-semibold hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Nouveau deal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-xs text-slate-500">Pipeline total</p>
          <p className="text-xl font-bold text-white">{stats.totalPipeline.toLocaleString('fr-FR')} €</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-xs text-slate-500">Pipeline pondéré</p>
          <p className="text-xl font-bold text-primary-300">{stats.totalPipelineWeighted.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-xs text-slate-500">Gagné</p>
          <p className="text-xl font-bold text-emerald-400">{stats.totalGagne.toLocaleString('fr-FR')} €</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-xs text-slate-500">Deals actifs</p>
          <p className="text-xl font-bold text-white">{stats.totalDeals}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-xs text-slate-500">Taux de conversion</p>
          <p className="text-xl font-bold text-primary-400">{stats.tauxConversion}%</p>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">{editDeal ? 'Modifier' : 'Nouveau'} deal</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={formData.titre} onChange={e => setFormData(p => ({ ...p, titre: e.target.value }))} placeholder="Titre du deal" className={INPUT_CLASS} />
            <select value={formData.clientId} onChange={e => setFormData(p => ({ ...p, clientId: e.target.value }))} className={INPUT_CLASS}>
              <option value="">Sélectionner un client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nom} — {c.entreprise}</option>)}
            </select>
            <input type="number" value={formData.montant || ''} onChange={e => setFormData(p => ({ ...p, montant: Number(e.target.value) }))} placeholder="Montant estimé (€)" className={INPUT_CLASS} />
            <input type="date" value={formData.dateClose} onChange={e => setFormData(p => ({ ...p, dateClose: e.target.value }))} className={INPUT_CLASS} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setShowForm(false); setEditDeal(null); }} className="flex-1 py-2 rounded-xl border border-card-border text-slate-400 text-sm hover:bg-card-hover">Annuler</button>
            <button onClick={handleSubmit} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-accent-cyan to-primary-500 text-white text-sm font-semibold">Sauver</button>
          </div>
        </div>
      )}

      {/* Kanban */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {COLUMNS.map(col => {
          const colDeals = deals.filter(d => d.colonne === col.id);
          return (
            <div key={col.id} className="space-y-2">
              <div className={clsx('flex items-center justify-between px-2 py-1.5 border-t-2 rounded-t-lg', col.color)}>
                <span className="text-xs font-semibold text-white">{col.label}</span>
                <span className="text-[10px] text-slate-500 bg-obsidian-800 px-1.5 py-0.5 rounded-full">{colDeals.length}</span>
              </div>
              {colDeals.map(deal => {
                const dealCol = COLUMNS.find(c => c.id === deal.colonne);
                const daysInStage = deal.etapeDate
                  ? Math.ceil((Date.now() - new Date(deal.etapeDate).getTime()) / 86400000)
                  : 0;
                const overdue = dealCol && dealCol.dureeMax > 0 && daysInStage > dealCol.dureeMax;

                return (
                  <div key={deal.id} className="bg-card border border-card-border rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-white">{deal.titre}</p>
                    <p className="text-[10px] text-slate-500">{deal.clientNom}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary-300">{deal.montant.toLocaleString('fr-FR')} €</span>
                    </div>
                    {/* Probability bar */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 rounded-full bg-obsidian-900 overflow-hidden">
                        <div className="h-full rounded-full bg-primary-500" style={{ width: `${deal.probabilite}%` }} />
                      </div>
                      <span className="text-[9px] text-slate-500">{deal.probabilite}%</span>
                    </div>
                    {/* Duration & overdue */}
                    <div className="flex items-center gap-2">
                      {deal.dureeJours !== undefined && (
                        <span className="text-[9px] text-slate-500">J+{deal.dureeJours}</span>
                      )}
                      {overdue && (
                        <span className="text-[9px] text-red-400 flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> Retard J+{daysInStage}/{dealCol!.dureeMax}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {col.id !== 'prospect' && col.id !== 'gagne' && col.id !== 'perdu' && (
                        <button onClick={() => moveDeal(deal.id, 'prev')} className="p-1 text-slate-500 hover:text-white"><ChevronRight className="w-3 h-3 rotate-180" /></button>
                      )}
                      {col.id !== 'gagne' && col.id !== 'perdu' && (
                        <button onClick={() => moveDeal(deal.id, 'next')} className="p-1 text-slate-500 hover:text-white"><ChevronRight className="w-3 h-3" /></button>
                      )}
                      <button onClick={() => deleteDeal(deal.id)} className="p-1 text-slate-500 hover:text-red-400 ml-auto"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                );
              })}
              {colDeals.length === 0 && (
                <div className="py-6 text-center text-slate-600 text-[10px]">Aucun deal</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DealPipeline;

import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Filter, Mail, Phone, Building2,
  MoreVertical, Edit2, Trash2, Eye, Star,
  TrendingUp, Users, UserCheck, UserX, Crown, Download
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Client, ClientStatus } from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { StatCard } from '../components/ui/StatCard';
import { exportClientsCsv } from '../lib/csvExport';
import { useDebounce } from '../hooks/useDebounce';
import clsx from 'clsx';

const statusConfig: Record<ClientStatus, { label: string; variant: any; dot: string }> = {
  vip:      { label: 'VIP',      variant: 'warning', dot: 'bg-amber-400' },
  actif:    { label: 'Actif',    variant: 'success', dot: 'bg-emerald-400' },
  prospect: { label: 'Prospect', variant: 'info',    dot: 'bg-cyan-400' },
  inactif:  { label: 'Inactif',  variant: 'default', dot: 'bg-slate-500' },
};

const emptyClient: Omit<Client, 'id' | 'dateCreation' | 'derniereActivite'> = {
  nom: '', entreprise: '', email: '', telephone: '', adresse: '',
  statut: 'prospect', source: 'autre', tags: [], notes: '', chiffreAffaires: 0,
};

export const Clients: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient, searchQuery } = useStore();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState(emptyClient);
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'tous'>('tous');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...clients];
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      list = list.filter(c =>
        c.nom.toLowerCase().includes(q) ||
        c.entreprise.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'tous') list = list.filter(c => c.statut === statusFilter);
    return list.sort((a, b) => b.chiffreAffaires - a.chiffreAffaires);
  }, [clients, debouncedSearchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: clients.length,
    actifs: clients.filter(c => c.statut === 'actif').length,
    vip: clients.filter(c => c.statut === 'vip').length,
    prospects: clients.filter(c => c.statut === 'prospect').length,
  }), [clients]);

  const openAdd = () => {
    setEditingClient(null);
    setFormData(emptyClient);
    setIsModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({ nom: client.nom, entreprise: client.entreprise, email: client.email, telephone: client.telephone, adresse: client.adresse, statut: client.statut, source: client.source, tags: client.tags, notes: client.notes, chiffreAffaires: client.chiffreAffaires });
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const openView = (client: Client) => {
    setViewingClient(client);
    setIsViewOpen(true);
    setActiveMenu(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      updateClient(editingClient.id, formData);
    } else {
      addClient(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteClient(id);
    setConfirmDelete(null);
    setActiveMenu(null);
  };

  const InputField = ({ label, name, value, onChange, type = 'text', required = false }: any) => (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}{required && <span className="text-accent-red ml-0.5">*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
      />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Clients" value={stats.total} icon={Users} color="cyan" />
        <StatCard title="Clients Actifs" value={stats.actifs} icon={UserCheck} color="green" />
        <StatCard title="Clients VIP" value={stats.vip} icon={Crown} color="orange" />
        <StatCard title="Prospects" value={stats.prospects} icon={TrendingUp} color="purple" />
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(['tous', 'actif', 'vip', 'prospect', 'inactif'] as const).map((status) => (
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
              {status === 'tous' ? 'Tous' : status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-1.5 text-slate-500">
                {status === 'tous' ? clients.length : clients.filter(c => c.statut === status).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportClientsCsv(clients)}
            className="flex items-center gap-2 border border-card-border text-slate-300 text-sm font-medium px-3 py-2 rounded-xl hover:border-primary-500/40 hover:text-white transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-gradient-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-glow-purple"
          >
            <Plus className="w-4 h-4" />
            Nouveau Client
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Client</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Contact</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Source</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">CA Total</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <UserX className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Aucun client trouvé</p>
                  </td>
                </tr>
              ) : (
                filtered.map((client) => {
                  const sc = statusConfig[client.statut];
                  const initials = client.nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <tr key={client.id} className="hover:bg-card-hover transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                            {initials}
                          </div>
                          <div>
                            <p className="text-white text-sm font-semibold flex items-center gap-1.5">
                              {client.nom}
                              {client.statut === 'vip' && <Crown className="w-3 h-3 text-amber-400" />}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3 h-3 text-slate-500" />
                              <p className="text-slate-400 text-xs">{client.entreprise}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span className="text-slate-300 text-xs">{client.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span className="text-slate-400 text-xs">{client.telephone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <span className="text-slate-400 text-xs capitalize">{client.source}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <div className={clsx('w-1.5 h-1.5 rounded-full', sc.dot)} />
                          <Badge variant={sc.variant}>{sc.label}</Badge>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right hidden md:table-cell">
                        <span className={clsx('text-sm font-bold', client.chiffreAffaires > 0 ? 'text-accent-green' : 'text-slate-500')}>
                          {client.chiffreAffaires > 0 ? `${client.chiffreAffaires.toLocaleString('fr-FR')} €` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openView(client)} className="w-7 h-7 rounded-lg bg-obsidian-700 border border-card-border flex items-center justify-center text-slate-400 hover:text-accent-cyan hover:border-accent-cyan/30 transition-all">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEdit(client)} className="w-7 h-7 rounded-lg bg-obsidian-700 border border-card-border flex items-center justify-center text-slate-400 hover:text-primary-400 hover:border-primary-500/30 transition-all">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setConfirmDelete(client.id)} className="w-7 h-7 rounded-lg bg-obsidian-700 border border-card-border flex items-center justify-center text-slate-400 hover:text-accent-red hover:border-accent-red/30 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-card-border flex items-center justify-between">
          <p className="text-slate-500 text-xs">{filtered.length} client{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}</p>
          <p className="text-slate-500 text-xs">
            CA total: <span className="text-accent-green font-semibold">{clients.reduce((s, c) => s + c.chiffreAffaires, 0).toLocaleString('fr-FR')} €</span>
          </p>
        </div>
      </div>

      {/* ── Add/Edit Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? 'Modifier le Client' : 'Nouveau Client'}
        subtitle={editingClient ? editingClient.nom : 'Ajouter un nouveau client au CRM'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Nom complet" value={formData.nom} onChange={(e: any) => setFormData(p => ({ ...p, nom: e.target.value }))} required />
            <InputField label="Entreprise" value={formData.entreprise} onChange={(e: any) => setFormData(p => ({ ...p, entreprise: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Email" type="email" value={formData.email} onChange={(e: any) => setFormData(p => ({ ...p, email: e.target.value }))} required />
            <InputField label="Téléphone" value={formData.telephone} onChange={(e: any) => setFormData(p => ({ ...p, telephone: e.target.value }))} />
          </div>
          <InputField label="Adresse" value={formData.adresse} onChange={(e: any) => setFormData(p => ({ ...p, adresse: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Statut</label>
              <select value={formData.statut} onChange={(e) => setFormData(p => ({ ...p, statut: e.target.value as any }))} className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500">
                <option value="prospect">Prospect</option>
                <option value="actif">Actif</option>
                <option value="vip">VIP</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Source</label>
              <select value={formData.source} onChange={(e) => setFormData(p => ({ ...p, source: e.target.value as any }))} className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500">
                <option value="référence">Référence</option>
                <option value="réseaux sociaux">Réseaux sociaux</option>
                <option value="cold outreach">Cold outreach</option>
                <option value="partenariat">Partenariat</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">CA estimé (€)</label>
            <input type="number" value={formData.chiffreAffaires} onChange={(e) => setFormData(p => ({ ...p, chiffreAffaires: Number(e.target.value) }))} className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none" placeholder="Notes sur ce client..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:bg-card-hover hover:text-white transition-all">
              Annuler
            </button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-glow-purple">
              {editingClient ? 'Mettre à jour' : 'Créer le client'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Client Modal ────────────────────────────────────────────── */}
      {viewingClient && (
        <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={viewingClient.nom} subtitle={viewingClient.entreprise} size="lg">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-obsidian-700 rounded-xl p-4 border border-card-border">
                <p className="text-slate-400 text-xs mb-1">Email</p>
                <p className="text-white text-sm font-medium">{viewingClient.email}</p>
              </div>
              <div className="bg-obsidian-700 rounded-xl p-4 border border-card-border">
                <p className="text-slate-400 text-xs mb-1">Téléphone</p>
                <p className="text-white text-sm font-medium">{viewingClient.telephone || '—'}</p>
              </div>
              <div className="bg-obsidian-700 rounded-xl p-4 border border-card-border">
                <p className="text-slate-400 text-xs mb-1">Statut</p>
                <Badge variant={statusConfig[viewingClient.statut].variant}>{statusConfig[viewingClient.statut].label}</Badge>
              </div>
              <div className="bg-obsidian-700 rounded-xl p-4 border border-card-border">
                <p className="text-slate-400 text-xs mb-1">CA Total</p>
                <p className="text-accent-green text-lg font-bold">{viewingClient.chiffreAffaires.toLocaleString('fr-FR')} €</p>
              </div>
            </div>
            {viewingClient.adresse && (
              <div className="bg-obsidian-700 rounded-xl p-4 border border-card-border">
                <p className="text-slate-400 text-xs mb-1">Adresse</p>
                <p className="text-white text-sm">{viewingClient.adresse}</p>
              </div>
            )}
            {viewingClient.notes && (
              <div className="bg-obsidian-700 rounded-xl p-4 border border-card-border">
                <p className="text-slate-400 text-xs mb-2">Notes</p>
                <p className="text-slate-300 text-sm leading-relaxed">{viewingClient.notes}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setIsViewOpen(false); openEdit(viewingClient); }} className="flex-1 py-2.5 rounded-xl bg-gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                Modifier
              </button>
              <button onClick={() => setIsViewOpen(false)} className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:bg-card-hover hover:text-white transition-all">
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Confirm Delete ───────────────────────────────────────────────── */}
      {confirmDelete && (
        <Modal isOpen={true} onClose={() => setConfirmDelete(null)} title="Supprimer ce client ?" size="sm">
          <p className="text-slate-400 text-sm mb-5">Cette action est irréversible. Toutes les données associées seront supprimées.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm font-medium hover:bg-card-hover hover:text-white transition-all">
              Annuler
            </button>
            <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2.5 rounded-xl bg-accent-red/20 border border-accent-red/30 text-red-400 text-sm font-semibold hover:bg-accent-red/30 transition-all">
              Supprimer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

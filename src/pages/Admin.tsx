import React, { useState, useMemo } from 'react';
import {
  Shield, Users, Plus, Edit2, Trash2, Eye, EyeOff,
  LayoutDashboard, Briefcase, FolderKanban, Clock,
  FileText, FilePlus2, Moon, BarChart3, Settings,
  CheckCircle, XCircle, Search, Calendar, AlertTriangle,
  LogIn, LogOut, ChevronRight, X, Save, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store/useStore';
import { UserAccount, UserRole, SectionPermission } from '../types';

// ─── Permission section config ────────────────────────────────────────────────
const SECTION_CONFIG: { id: SectionPermission; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'dashboard',    label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'clients',      label: 'Clients CRM',    icon: Users },
  { id: 'freelancers',  label: 'Prestataires',   icon: Briefcase },
  { id: 'projects',     label: 'Projets',         icon: FolderKanban },
  { id: 'worktracking', label: 'Suivi Travaux',   icon: Clock },
  { id: 'invoices',     label: 'Facturation',     icon: FileText },
  { id: 'documents',    label: 'Documents',       icon: FilePlus2 },
  { id: 'snooze',       label: 'Pay to Snooze',   icon: Moon },
  { id: 'analytics',    label: 'Analytiques',     icon: BarChart3 },
  { id: 'settings',     label: 'Paramètres',      icon: Settings },
  { id: 'admin',        label: 'Administration',  icon: Shield },
];

const ROLE_CONFIG: Record<UserRole, { label: string; className: string }> = {
  admin:      { label: 'Administrateur', className: 'bg-primary-500/20 text-primary-300 border border-primary-500/30' },
  freelancer: { label: 'Freelancer',     className: 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30' },
  viewer:     { label: 'Observateur',    className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
};

const ACTION_COLORS: Record<string, string> = {
  login:        'bg-green-500/20 text-green-400',
  logout:       'bg-slate-500/20 text-slate-400',
  view_section: 'bg-blue-500/20 text-blue-400',
  update_task:  'bg-accent-cyan/20 text-accent-cyan',
  create:       'bg-emerald-500/20 text-emerald-400',
  delete:       'bg-red-500/20 text-red-400',
  update:       'bg-amber-500/20 text-amber-400',
};

const DEFAULT_FREELANCER_PERMISSIONS: SectionPermission[] = ['projects', 'worktracking'];

// ─── Modal ────────────────────────────────────────────────────────────────────
interface UserModalProps {
  user: Partial<UserAccount> | null;
  onClose: () => void;
  onSave: (data: Omit<UserAccount, 'id' | 'dateCreation'>) => void;
  freelancerOptions: { id: string; label: string }[];
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose, onSave, freelancerOptions }) => {
  const isEdit = Boolean(user?.id);
  const [prenom, setPrenom] = useState(user?.prenom ?? '');
  const [nom, setNom] = useState(user?.nom ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState(user?.password ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>(user?.role ?? 'viewer');
  const [freelancerId, setFreelancerId] = useState(user?.freelancerId ?? '');
  const [permissions, setPermissions] = useState<SectionPermission[]>(
    user?.permissions ?? DEFAULT_FREELANCER_PERMISSIONS
  );
  const [isActive] = useState(user?.isActive ?? true);
  const [notes, setNotes] = useState(user?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'admin') {
      setPermissions(SECTION_CONFIG.map(s => s.id));
    } else if (newRole === 'freelancer') {
      setPermissions(DEFAULT_FREELANCER_PERMISSIONS);
    } else {
      setPermissions(['dashboard']);
    }
  };

  const togglePermission = (section: SectionPermission) => {
    if (role === 'admin') return;
    setPermissions(prev =>
      prev.includes(section) ? prev.filter(p => p !== section) : [...prev, section]
    );
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!prenom.trim()) e.prenom = 'Requis';
    if (!nom.trim()) e.nom = 'Requis';
    if (!email.trim()) e.email = 'Requis';
    if (!isEdit && !password.trim()) e.password = 'Requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      prenom: prenom.trim(),
      nom: nom.trim(),
      email: email.trim(),
      password: password.trim() || (user?.password ?? ''),
      role,
      permissions,
      freelancerId: role === 'freelancer' ? freelancerId || undefined : undefined,
      isActive,
      notes: notes.trim(),
      derniereConnexion: user?.derniereConnexion,
      avatar: user?.avatar,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-obsidian-800 border border-card-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-card-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-primary-400 w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-lg">
              {isEdit ? 'Modifier le compte' : 'Nouveau compte'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Prénom / Nom */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Prénom *</label>
              <input
                value={prenom}
                onChange={e => setPrenom(e.target.value)}
                className={clsx(
                  'w-full bg-obsidian-900 border rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all',
                  errors.prenom ? 'border-red-500/60' : 'border-card-border focus:border-primary-500/60'
                )}
                placeholder="Jean"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nom *</label>
              <input
                value={nom}
                onChange={e => setNom(e.target.value)}
                className={clsx(
                  'w-full bg-obsidian-900 border rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all',
                  errors.nom ? 'border-red-500/60' : 'border-card-border focus:border-primary-500/60'
                )}
                placeholder="Dupont"
              />
            </div>
          </div>

          {/* Email / Password */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={clsx(
                  'w-full bg-obsidian-900 border rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all',
                  errors.email ? 'border-red-500/60' : 'border-card-border focus:border-primary-500/60'
                )}
                placeholder="jean@obsidian.agency"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Mot de passe {isEdit ? '(laisser vide pour conserver)' : '*'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={clsx(
                    'w-full bg-obsidian-900 border rounded-xl pl-4 pr-10 py-2.5 text-white text-sm outline-none transition-all',
                    errors.password ? 'border-red-500/60' : 'border-card-border focus:border-primary-500/60'
                  )}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Role */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Rôle</label>
            <div className="grid grid-cols-3 gap-3">
              {(['admin', 'freelancer', 'viewer'] as UserRole[]).map(r => (
                <button
                  key={r}
                  onClick={() => handleRoleChange(r)}
                  className={clsx(
                    'px-4 py-3 rounded-xl border text-sm font-semibold transition-all',
                    role === r ? ROLE_CONFIG[r].className : 'border-card-border text-slate-400 hover:border-slate-500'
                  )}
                >
                  {ROLE_CONFIG[r].label}
                </button>
              ))}
            </div>
          </div>

          {/* Lier à un freelancer */}
          {role === 'freelancer' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Lier à un prestataire</label>
              <select
                value={freelancerId}
                onChange={e => setFreelancerId(e.target.value)}
                className="w-full bg-obsidian-900 border border-card-border rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary-500/60"
              >
                <option value="">— Aucun —</option>
                {freelancerOptions.map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Permissions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Permissions par section</label>
              {role === 'admin' && (
                <span className="text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">Toutes (admin)</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SECTION_CONFIG.map(section => {
                const Icon = section.icon;
                const checked = permissions.includes(section.id);
                return (
                  <label
                    key={section.id}
                    className={clsx(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all',
                      role === 'admin' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                      checked
                        ? 'bg-primary-500/15 border-primary-500/40 text-primary-300'
                        : 'bg-obsidian-900 border-card-border text-slate-400 hover:border-slate-500'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePermission(section.id)}
                      disabled={role === 'admin'}
                      className="hidden"
                    />
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs font-medium">{section.label}</span>
                    {checked && <CheckCircle className="w-3 h-3 ml-auto flex-shrink-0" />}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-obsidian-900 border border-card-border rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary-500/60 resize-none"
              placeholder="Notes internes..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-card-border bg-obsidian-900/30">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-card-border text-slate-400 hover:text-white hover:border-slate-500 text-sm font-medium transition-all"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white text-sm font-semibold transition-all shadow-glow-purple"
          >
            <Save className="w-4 h-4" />
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export const Admin: React.FC = () => {
  const { users, auditLogs, freelancers, addUser, updateUser, deleteUser, addAuditLog } = useStore();
  const [activeTab, setActiveTab] = useState<'accounts' | 'logs'>('accounts');
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserAccount | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [clearLogsConfirm, setClearLogsConfirm] = useState(false);

  // Logs filters
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('');
  const [logPage, setLogPage] = useState(1);
  const LOG_PAGE_SIZE = 50;

  const freelancerOptions = freelancers.map(f => ({
    id: f.id,
    label: `${f.prenom} ${f.nom} — ${f.entreprise}`,
  }));

  // Stats
  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    freelancers: users.filter(u => u.role === 'freelancer').length,
    viewers: users.filter(u => u.role === 'viewer').length,
    inactifs: users.filter(u => !u.isActive).length,
  }), [users]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchSearch = !logSearch ||
        log.userNom.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
        (log.details ?? '').toLowerCase().includes(logSearch.toLowerCase());
      const matchAction = !logActionFilter || log.action === logActionFilter;
      return matchSearch && matchAction;
    });
  }, [auditLogs, logSearch, logActionFilter]);

  const paginatedLogs = filteredLogs.slice(0, logPage * LOG_PAGE_SIZE);

  const handleOpenCreate = () => {
    setEditUser(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (user: UserAccount) => {
    setEditUser(user);
    setModalOpen(true);
  };

  const handleSaveUser = (data: Omit<UserAccount, 'id' | 'dateCreation'>) => {
    if (editUser?.id) {
      updateUser(editUser.id, data);
    } else {
      addUser(data);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteUser(id);
    setDeleteConfirm(null);
  };

  const handleClearLogs = () => {
    // Reset via store hack: we add a special marker
    addAuditLog({ userId: 'system', userNom: 'Système', action: 'clear_logs', details: 'Journaux effacés', date: new Date().toISOString() });
    setClearLogsConfirm(false);
  };

  const uniqueActions = useMemo(() => [...new Set(auditLogs.map(l => l.action))], [auditLogs]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Administration</h1>
          <p className="text-slate-400 text-sm">Gestion des comptes et journaux d'activité</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-obsidian-800 border border-card-border rounded-xl p-1 w-fit">
        {([
          { id: 'accounts', label: 'Comptes', icon: Users },
          { id: 'logs',     label: "Journaux d'audit", icon: Shield },
        ] as { id: 'accounts' | 'logs'; label: string; icon: React.FC<{ className?: string }> }[]).map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── ACCOUNTS TAB ──────────────────────────────────────────────── */}
      {activeTab === 'accounts' && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Total comptes', value: stats.total, color: 'text-white' },
              { label: 'Admins',        value: stats.admins, color: 'text-primary-300' },
              { label: 'Freelancers',   value: stats.freelancers, color: 'text-accent-cyan' },
              { label: 'Observateurs',  value: stats.viewers, color: 'text-amber-400' },
              { label: 'Inactifs',      value: stats.inactifs, color: 'text-red-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-card border border-card-border rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                <p className={clsx('text-2xl font-bold', stat.color)}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Actions header */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Liste des comptes</h2>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white text-sm font-semibold transition-all shadow-glow-purple"
            >
              <Plus className="w-4 h-4" />
              Nouveau compte
            </button>
          </div>

          {/* Table */}
          <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-card-border bg-obsidian-800/60">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Utilisateur</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Rôle</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Permissions</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Dernière connexion</th>
                    <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Statut</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {users.map(user => {
                    const initials = `${user.prenom[0]}${user.nom[0]}`.toUpperCase();
                    return (
                      <tr key={user.id} className="hover:bg-obsidian-800/40 transition-colors">
                        {/* Avatar + Nom */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-bold">{initials}</span>
                            </div>
                            <div>
                              <p className="text-white text-sm font-semibold">{user.prenom} {user.nom}</p>
                              <p className="text-slate-500 text-xs">#{user.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        {/* Email */}
                        <td className="px-4 py-4 text-slate-300 text-sm">{user.email}</td>
                        {/* Role badge */}
                        <td className="px-4 py-4">
                          <span className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold', ROLE_CONFIG[user.role].className)}>
                            {ROLE_CONFIG[user.role].label}
                          </span>
                        </td>
                        {/* Permissions icons */}
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {user.permissions.slice(0, 6).map(perm => {
                              const cfg = SECTION_CONFIG.find(s => s.id === perm);
                              if (!cfg) return null;
                              const Icon = cfg.icon;
                              return (
                                <span key={perm} title={cfg.label} className="w-6 h-6 rounded-md bg-obsidian-900 border border-card-border flex items-center justify-center">
                                  <Icon className="w-3 h-3 text-slate-400" />
                                </span>
                              );
                            })}
                            {user.permissions.length > 6 && (
                              <span className="w-6 h-6 rounded-md bg-obsidian-900 border border-card-border flex items-center justify-center text-slate-500 text-xs font-bold">
                                +{user.permissions.length - 6}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Dernière connexion */}
                        <td className="px-4 py-4 text-slate-400 text-sm">
                          {user.derniereConnexion
                            ? formatDate(user.derniereConnexion)
                            : <span className="text-slate-600">Jamais</span>
                          }
                        </td>
                        {/* Statut toggle */}
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                            className={clsx(
                              'flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                              user.isActive
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            )}
                          >
                            {user.isActive
                              ? <><CheckCircle className="w-3 h-3" /> Actif</>
                              : <><XCircle className="w-3 h-3" /> Inactif</>
                            }
                          </button>
                        </td>
                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(user)}
                              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-obsidian-700 transition-all"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => setDeleteConfirm(user.id)}
                                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun compte</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LOGS TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                placeholder="Rechercher utilisateur, action, détails…"
                className="w-full bg-card border border-card-border rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-600 outline-none focus:border-primary-500/60 transition-all"
              />
            </div>
            <select
              value={logActionFilter}
              onChange={e => setLogActionFilter(e.target.value)}
              className="bg-card border border-card-border rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary-500/60"
            >
              <option value="">Toutes les actions</option>
              {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button
              onClick={() => setClearLogsConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Effacer les logs
            </button>
          </div>

          <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-card-border bg-obsidian-800/60">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Date / Heure</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Utilisateur</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Action</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Section</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {paginatedLogs.map(log => {
                    const actionColor = ACTION_COLORS[log.action] ?? 'bg-slate-500/20 text-slate-400';
                    return (
                      <tr key={log.id} className="hover:bg-obsidian-800/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                            {formatDate(log.date)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-bold">{log.userNom.slice(0, 2).toUpperCase()}</span>
                            </div>
                            <span className="text-white text-sm font-medium">{log.userNom}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold', actionColor)}>
                            {log.action === 'login' && <LogIn className="w-3 h-3 inline mr-1" />}
                            {log.action === 'logout' && <LogOut className="w-3 h-3 inline mr-1" />}
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 text-sm">
                          {log.section ?? <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 text-sm max-w-xs truncate">
                          {log.details ?? <span className="text-slate-600">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredLogs.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun journal</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredLogs.length > paginatedLogs.length && (
              <div className="px-5 py-4 border-t border-card-border text-center">
                <button
                  onClick={() => setLogPage(p => p + 1)}
                  className="flex items-center gap-2 mx-auto px-5 py-2 rounded-xl border border-card-border text-slate-400 hover:text-white hover:border-slate-500 text-sm transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                  Voir plus ({filteredLogs.length - paginatedLogs.length} restants)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL Utilisateur ─────────────────────────────────────────── */}
      {modalOpen && (
        <UserModal
          user={editUser}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveUser}
          freelancerOptions={freelancerOptions}
        />
      )}

      {/* ── CONFIRM Delete ────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-obsidian-800 border border-card-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <h3 className="font-bold text-white">Supprimer le compte ?</h3>
            </div>
            <p className="text-slate-400 text-sm mb-6">Cette action est irréversible. Le compte sera définitivement supprimé.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 hover:text-white text-sm font-medium transition-all">
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-sm font-semibold transition-all">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM Clear logs ────────────────────────────────────────── */}
      {clearLogsConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-obsidian-800 border border-card-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <h3 className="font-bold text-white">Effacer les journaux ?</h3>
            </div>
            <p className="text-slate-400 text-sm mb-6">Tous les journaux d'audit seront définitivement effacés.</p>
            <div className="flex gap-3">
              <button onClick={() => setClearLogsConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 hover:text-white text-sm font-medium transition-all">
                Annuler
              </button>
              <button onClick={handleClearLogs} className="flex-1 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-sm font-semibold transition-all">
                Effacer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

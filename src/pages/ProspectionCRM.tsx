import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, Filter, Download, RefreshCw, Globe, Users, Zap, Target,
  ChevronDown, Check, X, Eye, Send, Ban, Brain, Crosshair, Play,
  Clock, CheckCircle2, AlertCircle, TrendingUp, Building2, Mail,
  Phone, ExternalLink, Plus, Trash2, Settings, Key, BarChart2, Star,
  Loader2, XCircle, Columns, GripVertical,
} from 'lucide-react';
import { ProspectContact, ScrapeJob, ProspectionFilter, ProspectSource, ProspectStatus, PipelineColumn } from '../types/prospection';
import { useProspectionStore } from '../store/useProspectionStore';

// ─── Platform config ──────────────────────────────────────────────────────────
const PLATFORM_CONFIG: Record<ProspectSource, { label: string; color: string }> = {
  linkedin:              { label: 'LinkedIn',             color: 'bg-blue-600' },
  twitter:               { label: 'Twitter / X',          color: 'bg-slate-900' },
  instagram:             { label: 'Instagram',            color: 'bg-pink-600' },
  facebook:              { label: 'Facebook',             color: 'bg-blue-700' },
  tiktok:                { label: 'TikTok',               color: 'bg-slate-900' },
  google_maps:           { label: 'Google Maps',          color: 'bg-green-600' },
  google_search:         { label: 'Google Search',        color: 'bg-blue-500' },
  youtube:               { label: 'YouTube',              color: 'bg-red-600' },
  github:                { label: 'GitHub',               color: 'bg-slate-700' },
  producthunt:           { label: 'ProductHunt',          color: 'bg-orange-500' },
  crunchbase:            { label: 'Crunchbase',           color: 'bg-blue-400' },
  malt:                  { label: 'Malt',                 color: 'bg-purple-600' },
  upwork:                { label: 'Upwork',               color: 'bg-green-500' },
  annuaire_entreprises:  { label: 'Annuaire Ent.',        color: 'bg-blue-500' },
  societe_com:           { label: 'Société.com',          color: 'bg-orange-400' },
  pappers:               { label: 'Pappers',              color: 'bg-blue-600' },
  le_bon_coin:           { label: 'Le Bon Coin',          color: 'bg-orange-500' },
  indeed:                { label: 'Indeed',               color: 'bg-indigo-600' },
  welcome_to_the_jungle: { label: 'WTTJ',                 color: 'bg-green-400' },
  instagram_pro:         { label: 'Instagram Pro',        color: 'bg-purple-500' },
  behance:               { label: 'Behance',              color: 'bg-blue-500' },
  dribbble:              { label: 'Dribbble',             color: 'bg-pink-500' },
  other:                 { label: 'Autre',                color: 'bg-slate-600' },
};

const ALL_PLATFORMS = Object.keys(PLATFORM_CONFIG) as ProspectSource[];

const STATUS_CONFIG: Record<ProspectStatus, { label: string; color: string; bg: string }> = {
  new:       { label: 'Nouveau',  color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/30' },
  enriched:  { label: 'Enrichi',  color: 'text-cyan-400',   bg: 'bg-cyan-400/10 border-cyan-400/30' },
  qualified: { label: 'Qualifié', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30' },
  contacted: { label: 'Contacté', color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/30' },
  imported:  { label: 'Importé',  color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30' },
  excluded:  { label: 'Exclu',    color: 'text-slate-500',  bg: 'bg-slate-500/10 border-slate-500/30' },
};

const INTENTION_CONFIG = {
  forte:   { label: 'Forte',   color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
  moyenne: { label: 'Moyenne', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' },
  faible:  { label: 'Faible',  color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/30' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(prenom: string, nom: string) {
  return `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase();
}

function getScoreColor(score: number) {
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

function getScoreBg(score: number) {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function PlatformBadge({ source }: { source: ProspectSource }) {
  const cfg = PLATFORM_CONFIG[source] ?? PLATFORM_CONFIG.other;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: ProspectStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${cfg.color} ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

// ─── SCRAPING MODAL ───────────────────────────────────────────────────────────
interface ScrapingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (config: {
    platforms: ProspectSource[];
    keywords: string[];
    location?: string;
    sector?: string;
    companySize?: string;
    jobTitle?: string;
  }) => void;
}

const ScrapingModal: React.FC<ScrapingModalProps> = ({ isOpen, onClose, onLaunch }) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<ProspectSource[]>(['linkedin']);
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [sector, setSector] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const togglePlatform = (p: ProspectSource) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleLaunch = () => {
    if (selectedPlatforms.length === 0 || !keywords.trim()) return;
    onLaunch({
      platforms: selectedPlatforms,
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      location: location.trim() || undefined,
      sector: sector.trim() || undefined,
      companySize: companySize.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
    });
    onClose();
    setSelectedPlatforms(['linkedin']);
    setKeywords('');
    setLocation('');
    setSector('');
    setCompanySize('');
    setJobTitle('');
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-obsidian-800 border border-card-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-card-border">
          <div>
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-primary-400" />
              Nouvelle Campagne de Scraping
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">Configurez votre campagne et lancez l'IA</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-card border border-card-border flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 max-h-[72vh] overflow-y-auto space-y-6">
          {/* Platform Selector */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              Plateformes <span className="text-primary-400">({selectedPlatforms.length} sélectionnées)</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {ALL_PLATFORMS.map((platform) => {
                const cfg = PLATFORM_CONFIG[platform];
                const selected = selectedPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    className={`relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center ${
                      selected
                        ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/10'
                        : 'border-card-border bg-card hover:border-slate-500'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${cfg.color} flex items-center justify-center mb-1.5`}>
                      <Globe className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[10px] text-slate-300 leading-tight font-medium">{cfg.label}</span>
                    {selected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Mots-clés <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="agence web, développeur React, designer UX, ..."
              className="w-full bg-card border border-card-border rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary-500 transition-colors"
            />
            <p className="text-slate-500 text-xs mt-1">Séparez les mots-clés par des virgules</p>
          </div>

          {/* Filters grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Localisation</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Paris, Lyon, France..."
                className="w-full bg-card border border-card-border rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Secteur</label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Agence, E-commerce, SaaS..."
                className="w-full bg-card border border-card-border rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Taille d'entreprise</label>
              <select
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                className="w-full bg-card border border-card-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
              >
                <option value="">Toutes tailles</option>
                <option value="1-10">1-10 employés</option>
                <option value="11-50">11-50 employés</option>
                <option value="51-200">51-200 employés</option>
                <option value="201-500">201-500 employés</option>
                <option value="500+">500+ employés</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Poste cible</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="CEO, Fondateur, CTO..."
                className="w-full bg-card border border-card-border rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-card-border bg-obsidian-900/50">
          <p className="text-slate-400 text-sm">
            {selectedPlatforms.length} plateforme{selectedPlatforms.length !== 1 ? 's' : ''} · Résultats estimés:{' '}
            <span className="text-white font-semibold">10–25 contacts</span>
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-card-border text-slate-400 hover:text-white text-sm transition-colors">
              Annuler
            </button>
            <button
              onClick={handleLaunch}
              disabled={selectedPlatforms.length === 0 || !keywords.trim()}
              className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              Lancer le Scraping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── CONTACT DETAIL MODAL ─────────────────────────────────────────────────────
interface ContactDetailModalProps {
  prospect: ProspectContact;
  onClose: () => void;
  onEnrich: (id: string) => void;
  onImport: (id: string) => void;
  onExclude: (id: string) => void;
}

const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  prospect, onClose, onEnrich, onImport, onExclude,
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const scoreColor = getScoreColor(prospect.score);
  const scoreBg = getScoreBg(prospect.score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-obsidian-800 border border-card-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-card-border">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${PLATFORM_CONFIG[prospect.source]?.color ?? 'bg-primary-600'} flex items-center justify-center text-white font-bold text-xl`}>
              {getInitials(prospect.prenom, prospect.nom)}
            </div>
            <div>
              <h2 className="font-bold text-white text-xl">{prospect.prenom} {prospect.nom}</h2>
              <p className="text-slate-400 text-sm">{prospect.poste} · {prospect.entreprise}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <StatusBadge status={prospect.status} />
                <PlatformBadge source={prospect.source} />
                {prospect.intentionAchat && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${INTENTION_CONFIG[prospect.intentionAchat].color} ${INTENTION_CONFIG[prospect.intentionAchat].bg}`}>
                    Intent {INTENTION_CONFIG[prospect.intentionAchat].label}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className={`text-3xl font-bold ${scoreColor}`}>{prospect.score}</div>
              <div className="text-slate-500 text-xs">score IA</div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-card border border-card-border flex items-center justify-center text-slate-400 hover:text-white transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            {/* Left */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coordonnées</h3>
              {prospect.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <a href={`mailto:${prospect.email}`} className="text-sm text-primary-400 hover:text-primary-300 truncate">{prospect.email}</a>
                </div>
              )}
              {prospect.telephone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="text-sm text-white">{prospect.telephone}</span>
                </div>
              )}
              {prospect.website && (
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-400 hover:text-primary-300 truncate">{prospect.website.replace('https://', '')}</a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-sm text-white">{prospect.ville}{prospect.pays ? `, ${prospect.pays}` : ''}</span>
              </div>
              {/* Social links */}
              <div className="flex flex-wrap gap-2 pt-1">
                {prospect.linkedinUrl && (
                  <a href={prospect.linkedinUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-blue-600/10 border border-blue-600/30 text-blue-400 text-xs hover:bg-blue-600/20 transition-colors flex items-center gap-1.5">
                    <ExternalLink className="w-3 h-3" /> LinkedIn
                  </a>
                )}
                {prospect.twitterUrl && (
                  <a href={prospect.twitterUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-slate-600/10 border border-slate-600/30 text-slate-400 text-xs hover:bg-slate-600/20 transition-colors flex items-center gap-1.5">
                    <ExternalLink className="w-3 h-3" /> Twitter
                  </a>
                )}
                {prospect.instagramUrl && (
                  <a href={prospect.instagramUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-pink-600/10 border border-pink-600/30 text-pink-400 text-xs hover:bg-pink-600/20 transition-colors flex items-center gap-1.5">
                    <ExternalLink className="w-3 h-3" /> Instagram
                  </a>
                )}
              </div>
              {/* Score bar */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-500">Score de qualification</span>
                  <span className={`text-sm font-bold ${scoreColor}`}>{prospect.score}/100</span>
                </div>
                <div className="h-2 rounded-full bg-obsidian-700">
                  <div className={`h-2 rounded-full ${scoreBg} transition-all`} style={{ width: `${prospect.score}%` }} />
                </div>
              </div>
              {/* Metrics */}
              {(prospect.followers !== undefined || prospect.engagement !== undefined) && (
                <div className="grid grid-cols-2 gap-3">
                  {prospect.followers !== undefined && (
                    <div className="bg-card border border-card-border rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-white">{prospect.followers >= 1000 ? `${(prospect.followers / 1000).toFixed(1)}k` : prospect.followers}</div>
                      <div className="text-xs text-slate-500">Followers</div>
                    </div>
                  )}
                  {prospect.engagement !== undefined && (
                    <div className="bg-card border border-card-border rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-green-400">{prospect.engagement}%</div>
                      <div className="text-xs text-slate-500">Engagement</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Données Enrichies IA</h3>
              {prospect.secteur && (
                <div>
                  <span className="text-xs text-slate-500">Secteur</span>
                  <p className="text-sm text-white mt-0.5">{prospect.secteur}</p>
                </div>
              )}
              {prospect.tailleEntreprise && (
                <div>
                  <span className="text-xs text-slate-500">Taille entreprise</span>
                  <p className="text-sm text-white mt-0.5">{prospect.tailleEntreprise} employés</p>
                </div>
              )}
              {prospect.chiffreAffaires && (
                <div>
                  <span className="text-xs text-slate-500">Chiffre d'affaires</span>
                  <p className="text-sm text-white mt-0.5">{prospect.chiffreAffaires}</p>
                </div>
              )}
              {prospect.technologies && prospect.technologies.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500">Technologies</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {prospect.technologies.map((tech) => (
                      <span key={tech} className="px-2 py-0.5 rounded bg-obsidian-700 border border-card-border text-xs text-slate-300">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
              {prospect.besoinsDetectes && prospect.besoinsDetectes.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500">Besoins détectés IA</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {prospect.besoinsDetectes.map((need) => (
                      <span key={need} className="px-2 py-0.5 rounded bg-primary-500/10 border border-primary-500/30 text-xs text-primary-400">{need}</span>
                    ))}
                  </div>
                </div>
              )}
              {prospect.description && (
                <div>
                  <span className="text-xs text-slate-500">Description</span>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{prospect.description}</p>
                </div>
              )}
              {prospect.notes && (
                <div>
                  <span className="text-xs text-slate-500">Notes</span>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{prospect.notes}</p>
                </div>
              )}
              {prospect.tags.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500">Tags</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {prospect.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded bg-obsidian-700 text-xs text-slate-400">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-card-border bg-obsidian-900/40">
          <button
            onClick={() => { onEnrich(prospect.id); onClose(); }}
            disabled={prospect.status === 'enriched' || prospect.status === 'imported'}
            className="flex-1 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          >
            <Brain className="w-4 h-4" /> Enrichir IA
          </button>
          <button
            onClick={() => { onImport(prospect.id); onClose(); }}
            disabled={prospect.status === 'imported'}
            className="flex-1 py-2 rounded-xl bg-primary-600/10 border border-primary-500/30 text-primary-400 hover:bg-primary-600/20 text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          >
            <Send className="w-4 h-4" /> Importer CRM
          </button>
          <button
            onClick={() => { onExclude(prospect.id); onClose(); }}
            disabled={prospect.status === 'excluded'}
            className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          >
            <Ban className="w-4 h-4" /> Exclure
          </button>
          {prospect.email && (
            <a
              href={`mailto:${prospect.email}`}
              className="flex-1 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 text-sm font-medium flex items-center justify-center gap-2 transition-all"
            >
              <Mail className="w-4 h-4" /> Contacter
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ANIMATED PROGRESS BAR ────────────────────────────────────────────────────
function AnimatedProgressBar({ progress, status }: { progress: number; status: ScrapeJob['status'] }) {
  return (
    <div className="h-1.5 rounded-full bg-obsidian-700 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          status === 'error'     ? 'bg-red-500' :
          status === 'completed' ? 'bg-green-500' :
          'bg-gradient-to-r from-primary-600 to-cyan-500'
        }`}
        style={{ width: `${Math.max(4, progress)}%` }}
      />
    </div>
  );
}

// ─── TAB 1 — SCRAPER IA ───────────────────────────────────────────────────────
const TabScraper: React.FC = () => {
  const { scrapeJobs, startScrapeJob, deleteScrapeJob, apiKeys } = useProspectionStore();
  const [modalOpen, setModalOpen] = useState(false);

  const apifyMissing = !apiKeys.apify.trim();
  const activeJobs    = scrapeJobs.filter((j) => j.status === 'running' || j.status === 'pending');
  const completedJobs = scrapeJobs.filter((j) => j.status === 'completed' || j.status === 'error');

  return (
    <div className="space-y-6">
      <ScrapingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onLaunch={(config) => startScrapeJob(config)}
      />

      {/* Warning banner when no Apify key */}
      {apifyMissing && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Mode démo actif — données fictives.</span>{' '}
            Configurez votre clé API Apify dans l'onglet{' '}
            <span className="font-semibold text-amber-200">Configuration</span>{' '}
            pour obtenir de vrais résultats.
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-primary-400" />
            Scraper IA
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Scrapez vos prospects sur 22 plateformes simultanément grâce à l'intelligence artificielle
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-all shadow-lg shadow-primary-500/20"
        >
          <Plus className="w-4 h-4" />
          {apifyMissing ? 'Lancer (mode démo — données fictives)' : 'Nouvelle Campagne de Scraping'}
        </button>
      </div>

      {/* Platform overview */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary-400" />
          22 plateformes disponibles
        </h3>
        <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-11 gap-2">
          {ALL_PLATFORMS.filter((p) => p !== 'other').map((platform) => {
            const cfg = PLATFORM_CONFIG[platform];
            return (
              <div key={platform} title={cfg.label} className="flex flex-col items-center gap-1">
                <div className={`w-9 h-9 rounded-xl ${cfg.color} flex items-center justify-center`}>
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <span className="text-[9px] text-slate-500 text-center leading-tight">{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
            Campagnes en cours ({activeJobs.length})
          </h3>
          <div className="space-y-3">
            {activeJobs.map((job) => (
              <div key={job.id} className="bg-card border border-card-border rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {job.platforms.slice(0, 4).map((p) => (
                        <PlatformBadge key={p} source={p} />
                      ))}
                      {job.platforms.length > 4 && (
                        <span className="text-xs text-slate-500">+{job.platforms.length - 4}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {job.keywords.map((kw) => (
                        <span key={kw} className="px-2 py-0.5 rounded bg-obsidian-700 text-xs text-slate-400">"{kw}"</span>
                      ))}
                    </div>
                    {job.location && <span className="text-xs text-slate-500 mt-1 block">📍 {job.location}</span>}
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-primary-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-sm font-semibold">{job.progress}%</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {job.status === 'pending' ? 'En attente' : 'En cours'}
                    </span>
                  </div>
                </div>
                <AnimatedProgressBar progress={job.progress} status={job.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed jobs */}
      {completedJobs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Campagnes terminées ({completedJobs.length})
          </h3>
          <div className="space-y-2">
            {completedJobs.map((job) => (
              <div key={job.id} className="bg-card border border-card-border rounded-xl px-4 py-3 flex items-center justify-between group">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${job.status === 'error' ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                    {job.status === 'error'
                      ? <AlertCircle className="w-4 h-4 text-red-400" />
                      : <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {job.platforms.slice(0, 3).map((p) => <PlatformBadge key={p} source={p} />)}
                      {job.platforms.length > 3 && <span className="text-xs text-slate-500">+{job.platforms.length - 3}</span>}
                    </div>
                    <div className="text-xs text-slate-500">
                      {job.keywords.join(', ')}{job.location ? ` · ${job.location}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                  {job.status === 'completed' && (
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-400">{job.resultsCount}</div>
                      <div className="text-xs text-slate-500">contacts</div>
                    </div>
                  )}
                  {job.dateCompleted && (
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-slate-400">{new Date(job.dateCompleted).toLocaleDateString('fr-FR')}</div>
                      <div className="text-xs text-slate-500">{new Date(job.dateCompleted).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  )}
                  <button
                    onClick={() => deleteScrapeJob(job.id)}
                    className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {scrapeJobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
            <Crosshair className="w-8 h-8 text-primary-400" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">Aucune campagne lancée</h3>
          <p className="text-slate-400 text-sm max-w-sm mb-6">
            Créez votre première campagne de scraping pour découvrir des centaines de prospects qualifiés en quelques secondes.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Nouvelle Campagne
          </button>
        </div>
      )}
    </div>
  );
};

// ─── TAB 2 — PROSPECTS ───────────────────────────────────────────────────────
const TabProspects: React.FC = () => {
  const {
    prospects, filters, selectedProspects,
    setFilters, toggleSelectProspect, selectAllProspects, clearSelection,
    updateProspect, importToMainCRM,
  } = useProspectionStore();

  const [detailProspect, setDetailProspect] = useState<ProspectContact | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = prospects.filter((p) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match =
        p.nom.toLowerCase().includes(q) ||
        p.prenom.toLowerCase().includes(q) ||
        p.entreprise.toLowerCase().includes(q) ||
        p.poste.toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filters.sources.length > 0 && !filters.sources.includes(p.source)) return false;
    if (filters.status.length > 0 && !filters.status.includes(p.status)) return false;
    if (p.score < filters.scoreMin || p.score > filters.scoreMax) return false;
    if (filters.pays.length > 0 && !filters.pays.includes(p.pays)) return false;
    if (filters.intentionAchat.length > 0 && (!p.intentionAchat || !filters.intentionAchat.includes(p.intentionAchat))) return false;
    return true;
  });

  const allSelectedOnPage = filtered.length > 0 && filtered.every((p) => selectedProspects.includes(p.id));
  const activeFilterCount = filters.sources.length + filters.status.length + filters.intentionAchat.length;

  const handleEnrich = (id: string) => {
    updateProspect(id, {
      status: 'enriched',
      dateEnrichi: new Date().toISOString().split('T')[0],
      intentionAchat: (['faible', 'moyenne', 'forte'] as const)[Math.floor(Math.random() * 3)],
    });
  };

  const stats = {
    total:    prospects.length,
    nouveau:  prospects.filter((p) => p.status === 'new').length,
    enrichi:  prospects.filter((p) => p.status === 'enriched').length,
    qualifie: prospects.filter((p) => p.status === 'qualified').length,
    importe:  prospects.filter((p) => p.status === 'imported').length,
  };

  return (
    <div className="space-y-5">
      {detailProspect && (
        <ContactDetailModal
          prospect={detailProspect}
          onClose={() => setDetailProspect(null)}
          onEnrich={handleEnrich}
          onImport={(id) => importToMainCRM([id])}
          onExclude={(id) => updateProspect(id, { status: 'excluded' })}
        />
      )}

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total',    value: stats.total,    Icon: Users,       color: 'text-white',    bg: 'bg-primary-500/10', border: 'border-primary-500/20' },
          { label: 'Nouveaux', value: stats.nouveau,  Icon: Plus,        color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
          { label: 'Enrichis', value: stats.enrichi,  Icon: Brain,       color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20' },
          { label: 'Qualifiés',value: stats.qualifie, Icon: Star,        color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
          { label: 'Importés', value: stats.importe,  Icon: CheckCircle2,color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
        ].map(({ label, value, Icon, color, bg, border }) => (
          <div key={label} className={`${bg} border ${border} rounded-xl p-3 flex items-center gap-3`}>
            <div className={`w-8 h-8 rounded-lg ${bg} border ${border} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            placeholder="Rechercher un prospect..."
            className="w-full bg-card border border-card-border rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${showFilters ? 'bg-primary-500/10 border-primary-500/30 text-primary-400' : 'bg-card border-card-border text-slate-400 hover:text-white'}`}
        >
          <Filter className="w-4 h-4" />
          Filtres
          {activeFilterCount > 0 && (
            <span className="ml-1 min-w-[18px] h-[18px] rounded-full bg-primary-500 text-white text-[10px] flex items-center justify-center font-bold px-1">
              {activeFilterCount}
            </span>
          )}
        </button>
        {selectedProspects.length > 0 && (
          <>
            <button
              onClick={() => importToMainCRM(selectedProspects)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold transition-all"
            >
              <Send className="w-4 h-4" /> Importer ({selectedProspects.length})
            </button>
            <button
              onClick={() => {
                selectedProspects.forEach((id) => updateProspect(id, { status: 'enriched', dateEnrichi: new Date().toISOString().split('T')[0] }));
                clearSelection();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-sm font-medium transition-all"
            >
              <Brain className="w-4 h-4" /> Enrichir ({selectedProspects.length})
            </button>
            <button onClick={clearSelection} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-card-border text-slate-400 hover:text-white text-sm transition-all">
              <X className="w-4 h-4" />
            </button>
          </>
        )}
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-card-border bg-card text-slate-400 hover:text-white text-sm transition-all ml-auto">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-card border border-card-border rounded-2xl p-4 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Source</label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {(['linkedin', 'malt', 'github', 'instagram_pro', 'producthunt', 'crunchbase', 'google_maps', 'twitter'] as ProspectSource[]).map((src) => (
                <label key={src} className="flex items-center gap-2 cursor-pointer group">
                  <div
                    onClick={() => {
                      const c = filters.sources;
                      setFilters({ sources: c.includes(src) ? c.filter((s) => s !== src) : [...c, src] });
                    }}
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${filters.sources.includes(src) ? 'bg-primary-500 border-primary-500' : 'border-card-border group-hover:border-slate-400'}`}
                  >
                    {filters.sources.includes(src) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-sm text-slate-400 group-hover:text-white transition-colors">{PLATFORM_CONFIG[src].label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Statut</label>
            <div className="space-y-1.5">
              {(Object.keys(STATUS_CONFIG) as ProspectStatus[]).map((st) => (
                <label key={st} className="flex items-center gap-2 cursor-pointer group">
                  <div
                    onClick={() => {
                      const c = filters.status;
                      setFilters({ status: c.includes(st) ? c.filter((s) => s !== st) : [...c, st] });
                    }}
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${filters.status.includes(st) ? 'bg-primary-500 border-primary-500' : 'border-card-border group-hover:border-slate-400'}`}
                  >
                    {filters.status.includes(st) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-sm text-slate-400 group-hover:text-white transition-colors">{STATUS_CONFIG[st].label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Intention d'achat</label>
              <div className="space-y-1.5">
                {(['forte', 'moyenne', 'faible'] as const).map((intent) => (
                  <label key={intent} className="flex items-center gap-2 cursor-pointer group">
                    <div
                      onClick={() => {
                        const c = filters.intentionAchat;
                        setFilters({ intentionAchat: c.includes(intent) ? c.filter((i) => i !== intent) : [...c, intent] });
                      }}
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${filters.intentionAchat.includes(intent) ? 'bg-primary-500 border-primary-500' : 'border-card-border group-hover:border-slate-400'}`}
                    >
                      {filters.intentionAchat.includes(intent) && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="text-sm text-slate-400 group-hover:text-white transition-colors">{INTENTION_CONFIG[intent].label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Score min</label>
                <span className="text-xs text-primary-400 font-bold">{filters.scoreMin}</span>
              </div>
              <input
                type="range" min={0} max={100} value={filters.scoreMin}
                onChange={(e) => setFilters({ scoreMin: parseInt(e.target.value) })}
                className="w-full accent-primary-500"
              />
            </div>
            <button
              onClick={() => setFilters({ sources: [], status: [], scoreMin: 0, scoreMax: 100, pays: [], secteur: [], intentionAchat: [] })}
              className="text-xs text-slate-500 hover:text-white transition-colors"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      )}

      {/* Bulk actions banner */}
      {selectedProspects.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary-500/10 border border-primary-500/30">
          <span className="text-primary-400 text-sm font-medium">
            {selectedProspects.length} prospect{selectedProspects.length > 1 ? 's' : ''} sélectionné{selectedProspects.length > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => importToMainCRM(selectedProspects)}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-500 transition-all flex items-center gap-1.5"
            >
              <Send className="w-3 h-3" /> Importer vers CRM
            </button>
            <button
              onClick={() => { selectedProspects.forEach((id) => updateProspect(id, { status: 'excluded' })); clearSelection(); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1.5"
            >
              <Ban className="w-3 h-3" /> Exclure
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[36px_2fr_1fr_90px_90px_1fr_90px_96px] gap-3 px-4 py-3 border-b border-card-border text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="flex items-center">
            <div
              onClick={() => allSelectedOnPage ? clearSelection() : selectAllProspects(filtered.map((p) => p.id))}
              className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${allSelectedOnPage ? 'bg-primary-500 border-primary-500' : 'border-card-border hover:border-slate-400'}`}
            >
              {allSelectedOnPage && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
          </div>
          <div>Contact</div>
          <div>Source</div>
          <div>Score</div>
          <div>Statut</div>
          <div>Localisation</div>
          <div>Intention</div>
          <div>Actions</div>
        </div>

        {/* Body */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Aucun prospect trouvé</p>
            <p className="text-slate-500 text-sm mt-1">Modifiez vos filtres ou lancez une nouvelle campagne</p>
          </div>
        ) : (
          <div className="divide-y divide-card-border">
            {filtered.map((p) => {
              const isSelected = selectedProspects.includes(p.id);
              const scoreColor = getScoreColor(p.score);
              const scoreBg = getScoreBg(p.score);
              return (
                <div
                  key={p.id}
                  className={`grid grid-cols-[36px_2fr_1fr_90px_90px_1fr_90px_96px] gap-3 px-4 py-3 items-center hover:bg-obsidian-700/30 transition-colors group cursor-pointer ${isSelected ? 'bg-primary-500/5' : ''} ${p.status === 'excluded' ? 'opacity-40' : ''}`}
                  onClick={() => setDetailProspect(p)}
                >
                  {/* Checkbox */}
                  <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                    <div
                      onClick={() => toggleSelectProspect(p.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-primary-500 border-primary-500' : 'border-card-border hover:border-slate-400'}`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </div>
                  {/* Contact */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl ${PLATFORM_CONFIG[p.source]?.color ?? 'bg-primary-600'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {getInitials(p.prenom, p.nom)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.prenom} {p.nom}</p>
                      <p className="text-xs text-slate-400 truncate">{p.poste}</p>
                      <p className="text-xs text-slate-500 truncate">{p.entreprise}</p>
                    </div>
                  </div>
                  {/* Source */}
                  <div><PlatformBadge source={p.source} /></div>
                  {/* Score */}
                  <div>
                    <span className={`text-sm font-bold ${scoreColor}`}>{p.score}</span>
                    <div className="h-1 rounded-full bg-obsidian-700 mt-1 w-14">
                      <div className={`h-1 rounded-full ${scoreBg}`} style={{ width: `${p.score}%` }} />
                    </div>
                  </div>
                  {/* Status */}
                  <div><StatusBadge status={p.status} /></div>
                  {/* Location */}
                  <div>
                    <p className="text-xs text-slate-300">{p.ville}</p>
                    <p className="text-xs text-slate-500">{p.pays}</p>
                  </div>
                  {/* Intention */}
                  <div>
                    {p.intentionAchat ? (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-medium ${INTENTION_CONFIG[p.intentionAchat].color} ${INTENTION_CONFIG[p.intentionAchat].bg}`}>
                        {INTENTION_CONFIG[p.intentionAchat].label}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setDetailProspect(p)}
                      title="Voir détails"
                      className="w-7 h-7 rounded-lg bg-obsidian-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-obsidian-600 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => importToMainCRM([p.id])}
                      disabled={p.status === 'imported'}
                      title="Importer"
                      className="w-7 h-7 rounded-lg bg-obsidian-700 flex items-center justify-center text-slate-400 hover:text-primary-400 hover:bg-primary-500/10 transition-all disabled:opacity-30"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateProspect(p.id, { status: 'excluded' })}
                      disabled={p.status === 'excluded'}
                      title="Exclure"
                      className="w-7 h-7 rounded-lg bg-obsidian-700 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-30"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-slate-500 text-xs text-right">{filtered.length} / {prospects.length} prospects affichés</p>
    </div>
  );
};

// ─── TAB 3 — ENRICHISSEMENT IA ───────────────────────────────────────────────
const TabEnrichissement: React.FC = () => {
  const { prospects, updateProspect } = useProspectionStore();
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [enrichedIds,  setEnrichedIds]  = useState<Set<string>>(new Set());
  const [bulkEnriching, setBulkEnriching] = useState(false);
  const [bulkProgress,  setBulkProgress]  = useState(0);

  const toEnrich       = prospects.filter((p) => p.status === 'new');
  const alreadyEnriched = prospects.filter((p) => p.status === 'enriched' || p.status === 'qualified');

  const enrichSingle = (id: string) => {
    setEnrichingIds((prev) => new Set([...prev, id]));
    setTimeout(() => {
      updateProspect(id, {
        status: 'enriched',
        dateEnrichi: new Date().toISOString().split('T')[0],
        intentionAchat: (['faible', 'moyenne', 'forte'] as const)[Math.floor(Math.random() * 3)],
        tailleEntreprise: (['1-10', '11-50', '51-200'] as const)[Math.floor(Math.random() * 3)],
        chiffreAffaires: `${Math.floor(Math.random() * 900 + 100)}K€`,
      });
      setEnrichingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      setEnrichedIds((prev) => new Set([...prev, id]));
    }, 1500 + Math.random() * 1000);
  };

  const enrichAll = () => {
    if (toEnrich.length === 0) return;
    setBulkEnriching(true);
    setBulkProgress(0);
    let done = 0;
    toEnrich.forEach((p, i) => {
      setTimeout(() => {
        updateProspect(p.id, {
          status: 'enriched',
          dateEnrichi: new Date().toISOString().split('T')[0],
          intentionAchat: (['faible', 'moyenne', 'forte'] as const)[Math.floor(Math.random() * 3)],
          tailleEntreprise: (['1-10', '11-50', '51-200'] as const)[Math.floor(Math.random() * 3)],
          chiffreAffaires: `${Math.floor(Math.random() * 900 + 100)}K€`,
        });
        done++;
        setBulkProgress(Math.round((done / toEnrich.length) * 100));
        if (done === toEnrich.length) setTimeout(() => { setBulkEnriching(false); setBulkProgress(0); }, 600);
      }, i * 400);
    });
  };

  const enrichmentFields = [
    { label: "Secteur d'activité",  icon: Building2,    color: 'text-blue-400' },
    { label: 'Taille entreprise',   icon: Users,        color: 'text-purple-400' },
    { label: "Chiffre d'affaires",  icon: TrendingUp,   color: 'text-green-400' },
    { label: 'Technologies',        icon: Zap,          color: 'text-cyan-400' },
    { label: 'Besoins détectés IA', icon: Brain,        color: 'text-amber-400' },
    { label: "Intention d'achat",   icon: Target,       color: 'text-red-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Explanation card */}
      <div className="bg-gradient-to-r from-primary-900/40 to-cyan-900/20 border border-primary-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-primary-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-2">Enrichissement IA automatique</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Notre IA analyse chaque profil pour enrichir automatiquement les données manquantes : secteur, taille d'entreprise, chiffre d'affaires estimé, stack technologique, besoins détectés et niveau d'intention d'achat.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {enrichmentFields.map(({ label, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-2 bg-card/50 rounded-xl p-2.5 border border-card-border">
                  <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                  <span className="text-xs text-slate-300">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk enrichment */}
      {toEnrich.length > 0 && (
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">
                {toEnrich.length} prospect{toEnrich.length > 1 ? 's' : ''} en attente d'enrichissement
              </h3>
              <p className="text-slate-400 text-sm mt-0.5">Enrichissez tous les prospects nouveaux en un seul clic</p>
            </div>
            <button
              onClick={enrichAll}
              disabled={bulkEnriching}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-all disabled:opacity-60 shadow-lg shadow-primary-500/20"
            >
              {bulkEnriching
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enrichissement... {bulkProgress}%</>
                : <><Brain className="w-4 h-4" /> Enrichir Tout ({toEnrich.length})</>}
            </button>
          </div>

          {bulkEnriching && (
            <div className="h-2 rounded-full bg-obsidian-700 overflow-hidden mb-4">
              <div className="h-full rounded-full bg-gradient-to-r from-primary-600 to-cyan-500 transition-all duration-300" style={{ width: `${bulkProgress}%` }} />
            </div>
          )}

          <div className="space-y-2">
            {toEnrich.map((p) => {
              const isEnriching = enrichingIds.has(p.id);
              const justEnriched = enrichedIds.has(p.id);
              return (
                <div key={p.id} className="flex items-center justify-between py-3 px-4 bg-obsidian-700/40 rounded-xl border border-card-border">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl ${PLATFORM_CONFIG[p.source]?.color ?? 'bg-primary-600'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {getInitials(p.prenom, p.nom)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{p.prenom} {p.nom}</p>
                      <p className="text-xs text-slate-400">{p.poste} · {p.entreprise}</p>
                    </div>
                    <PlatformBadge source={p.source} />
                  </div>
                  <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                    <span className="text-xs text-amber-400 hidden sm:block">secteur, taille, CA, techno</span>
                    {justEnriched ? (
                      <span className="flex items-center gap-1.5 text-green-400 text-sm">
                        <CheckCircle2 className="w-4 h-4" /> Enrichi
                      </span>
                    ) : (
                      <button
                        onClick={() => enrichSingle(p.id)}
                        disabled={isEnriching}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-sm font-medium transition-all disabled:opacity-60"
                      >
                        {isEnriching
                          ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> En cours...</>
                          : <><Brain className="w-3.5 h-3.5" /> Enrichir</>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Already enriched */}
      {alreadyEnriched.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Déjà enrichis ({alreadyEnriched.length})
          </h3>
          <div className="space-y-2">
            {alreadyEnriched.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 px-4 bg-card border border-card-border rounded-xl opacity-70">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl ${PLATFORM_CONFIG[p.source]?.color ?? 'bg-primary-600'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                    {getInitials(p.prenom, p.nom)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{p.prenom} {p.nom}</p>
                    <p className="text-xs text-slate-400 truncate">{p.entreprise}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  {p.secteur && <span className="text-xs text-slate-400 hidden sm:block">{p.secteur}</span>}
                  {p.intentionAchat && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${INTENTION_CONFIG[p.intentionAchat].color} ${INTENTION_CONFIG[p.intentionAchat].bg}`}>
                      {INTENTION_CONFIG[p.intentionAchat].label}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-green-400 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {p.dateEnrichi ?? 'Enrichi'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toEnrich.length === 0 && alreadyEnriched.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Brain className="w-12 h-12 text-slate-600 mb-4" />
          <p className="text-slate-400 font-medium">Aucun prospect à enrichir</p>
          <p className="text-slate-500 text-sm mt-1">Lancez une campagne de scraping pour commencer</p>
        </div>
      )}
    </div>
  );
};

// ─── TAB 4 — CONFIGURATION ───────────────────────────────────────────────────
const TabConfiguration: React.FC = () => {
  const { apiKeys: storedApiKeys, updateApiKeys } = useProspectionStore();
  const [localApiKeys, setLocalApiKeys] = useState<Record<string, string>>({ ...storedApiKeys });
  const [scrapingSettings, setScrapingSettings] = useState({ delay: 2, maxResults: 50, respectRobots: true });
  const [aiSettings, setAiSettings] = useState({ model: 'gpt-4o', confidenceThreshold: 75 });
  const [exportSettings, setExportSettings] = useState({ format: 'csv' as 'csv' | 'json' | 'excel', autoExport: false });
  const [notifSettings, setNotifSettings] = useState({ onJobComplete: true, onNewProspect: false, dailyReport: true });
  const [saved, setSaved] = useState(false);

  const apifyMissing = !storedApiKeys.apify.trim();

  const handleSave = () => {
    updateApiKeys(localApiKeys as Parameters<typeof updateApiKeys>[0]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const apiKeyPlatforms = [
    { key: 'linkedin',     label: 'LinkedIn API Key',                placeholder: 'AQXs...' },
    { key: 'twitter',      label: 'Twitter / X Bearer Token',        placeholder: 'AAAA...' },
    { key: 'google',       label: 'Google Maps API Key',             placeholder: 'AIzaSy...' },
    { key: 'github',       label: 'GitHub Personal Access Token',    placeholder: 'ghp_...' },
    { key: 'phantombuster',label: 'PhantomBuster API Key',           placeholder: 'xxxxxxxxxx' },
    { key: 'apify',        label: 'Apify API Token',                 placeholder: 'apify_api_...' },
  ];

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-primary-500' : 'bg-obsidian-600'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Warning: no Apify key */}
      {apifyMissing && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Sans clé API Apify, le scraper génère des données fictives.</span>{' '}
            Obtenez votre clé gratuite sur{' '}
            <a href="https://apify.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-200 transition-colors">apify.com</a>
          </div>
        </div>
      )}

      {/* API Keys */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
            <Key className="w-4 h-4 text-primary-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Clés API</h3>
            <p className="text-slate-500 text-xs">Connectez vos comptes pour activer le scraping réel</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {apiKeyPlatforms.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
              <input
                type="password"
                value={localApiKeys[key] ?? ''}
                onChange={(e) => setLocalApiKeys((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-obsidian-700 border border-card-border rounded-xl px-3 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-primary-500 transition-colors font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Scraping settings */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Settings className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Paramètres de scraping</h3>
            <p className="text-slate-500 text-xs">Contrôlez la vitesse et le volume de collecte</p>
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white">Délai entre requêtes</label>
              <span className="text-sm font-semibold text-primary-400">{scrapingSettings.delay}s</span>
            </div>
            <input type="range" min={1} max={10} value={scrapingSettings.delay}
              onChange={(e) => setScrapingSettings((p) => ({ ...p, delay: parseInt(e.target.value) }))}
              className="w-full accent-primary-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>1s (rapide)</span><span>10s (sûr)</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white">Résultats max par plateforme</label>
              <span className="text-sm font-semibold text-primary-400">{scrapingSettings.maxResults}</span>
            </div>
            <input type="range" min={10} max={500} step={10} value={scrapingSettings.maxResults}
              onChange={(e) => setScrapingSettings((p) => ({ ...p, maxResults: parseInt(e.target.value) }))}
              className="w-full accent-primary-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>10</span><span>500</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-card-border">
            <div>
              <p className="text-sm text-white">Respecter robots.txt</p>
              <p className="text-xs text-slate-500">Recommandé pour éviter les bans</p>
            </div>
            <Toggle value={scrapingSettings.respectRobots} onChange={() => setScrapingSettings((p) => ({ ...p, respectRobots: !p.respectRobots }))} />
          </div>
        </div>
      </div>

      {/* AI Model */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Modèle IA</h3>
            <p className="text-slate-500 text-xs">Configuration du modèle d'enrichissement</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white mb-2">Modèle d'enrichissement</label>
            <select
              value={aiSettings.model}
              onChange={(e) => setAiSettings((p) => ({ ...p, model: e.target.value }))}
              className="w-full bg-obsidian-700 border border-card-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
            >
              <option value="gpt-4o">GPT-4o (Recommandé)</option>
              <option value="gpt-4o-mini">GPT-4o Mini (Rapide)</option>
              <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              <option value="gemini-pro">Gemini 1.5 Pro</option>
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white">Seuil de confiance minimum</label>
              <span className="text-sm font-semibold text-amber-400">{aiSettings.confidenceThreshold}%</span>
            </div>
            <input type="range" min={50} max={100} value={aiSettings.confidenceThreshold}
              onChange={(e) => setAiSettings((p) => ({ ...p, confidenceThreshold: parseInt(e.target.value) }))}
              className="w-full accent-amber-500"
            />
            <p className="text-xs text-slate-500 mt-1">Les données en dessous de ce seuil seront marquées comme incertaines</p>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Download className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Export</h3>
            <p className="text-slate-500 text-xs">Format et automatisation des exports</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white mb-2">Format d'export</label>
            <div className="flex gap-3">
              {(['csv', 'json', 'excel'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setExportSettings((p) => ({ ...p, format: fmt }))}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold uppercase transition-all ${exportSettings.format === fmt ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'border-card-border text-slate-400 hover:text-white'}`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-card-border">
            <div>
              <p className="text-sm text-white">Export automatique</p>
              <p className="text-xs text-slate-500">Exporter automatiquement à la fin de chaque campagne</p>
            </div>
            <Toggle value={exportSettings.autoExport} onChange={() => setExportSettings((p) => ({ ...p, autoExport: !p.autoExport }))} />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Notifications</h3>
            <p className="text-slate-500 text-xs">Restez informé des activités de scraping</p>
          </div>
        </div>
        <div className="space-y-1">
          {[
            { key: 'onJobComplete', label: 'Fin de campagne',          desc: 'Notification quand un job se termine' },
            { key: 'onNewProspect', label: 'Nouveau prospect qualifié', desc: 'Alerte pour les prospects score > 80' },
            { key: 'dailyReport',   label: 'Rapport quotidien',         desc: "Résumé email des activités du jour" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-card-border last:border-0">
              <div>
                <p className="text-sm text-white">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <Toggle
                value={notifSettings[key as keyof typeof notifSettings]}
                onChange={() => setNotifSettings((p) => ({ ...p, [key]: !p[key as keyof typeof notifSettings] }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pb-4">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${saved ? 'bg-green-500 text-white' : 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/20'}`}
        >
          {saved
            ? <><CheckCircle2 className="w-4 h-4" /> Sauvegardé !</>
            : <><Check className="w-4 h-4" /> Sauvegarder la configuration</>}
        </button>
      </div>
    </div>
  );
};

// ─── TAB 5 — JOBS DE SCRAPING ─────────────────────────────────────────────────
function JobsTab() {
  const { scrapeJobs, deleteScrapeJob, clearEmptyJobs, clearAllJobs } = useProspectionStore();
  const [confirmClear, setConfirmClear] = useState<'empty' | 'all' | null>(null);

  const emptyJobs = scrapeJobs.filter(j => j.status !== 'running' && j.resultsCount === 0);
  const sortedJobs = [...scrapeJobs].sort((a, b) =>
    new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
  );

  const statusConfig = {
    running:   { label: 'En cours',  icon: Loader2,       color: 'text-accent-cyan',  bg: 'bg-accent-cyan/10 border-accent-cyan/30', spin: true },
    completed: { label: 'Terminé',   icon: CheckCircle2,  color: 'text-green-400',    bg: 'bg-green-500/10 border-green-500/30',    spin: false },
    error:     { label: 'Erreur',    icon: AlertCircle,   color: 'text-red-400',      bg: 'bg-red-500/10 border-red-500/30',        spin: false },
    cancelled: { label: 'Annulé',   icon: XCircle,       color: 'text-slate-400',    bg: 'bg-slate-500/10 border-slate-500/30',    spin: false },
  } as const;

  return (
    <div className="space-y-5">
      {/* Header + actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Historique des jobs de scraping</h3>
          <p className="text-slate-400 text-sm mt-0.5">{scrapeJobs.length} job{scrapeJobs.length > 1 ? 's' : ''} total · {emptyJobs.length} résultat{emptyJobs.length > 1 ? 's' : ''} vide{emptyJobs.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          {emptyJobs.length > 0 && (
            <button
              onClick={() => setConfirmClear('empty')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Nettoyer les vides ({emptyJobs.length})
            </button>
          )}
          {scrapeJobs.length > 0 && (
            <button
              onClick={() => setConfirmClear('all')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Tout effacer
            </button>
          )}
        </div>
      </div>

      {/* Modal confirmation */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-obsidian-800 border border-card-border rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white font-bold mb-2">Confirmer la suppression</h3>
            <p className="text-slate-400 text-sm mb-5">
              {confirmClear === 'empty'
                ? `Supprimer les ${emptyJobs.length} job(s) sans résultat ?`
                : `Supprimer tous les ${scrapeJobs.length} job(s) de l'historique ?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (confirmClear === 'empty') clearEmptyJobs();
                  else clearAllJobs();
                  setConfirmClear(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-all"
              >
                Supprimer
              </button>
              <button
                onClick={() => setConfirmClear(null)}
                className="flex-1 py-2.5 rounded-xl bg-card border border-card-border text-slate-300 text-sm font-medium transition-all hover:text-white"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des jobs */}
      {sortedJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <RefreshCw className="w-10 h-10 mb-3 opacity-30" />
          <p className="font-semibold">Aucun job de scraping</p>
          <p className="text-sm text-slate-600 mt-1">Lancez un scraping depuis l'onglet Scraper</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedJobs.map(job => {
            const cfg = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.error;
            const Icon = cfg.icon;
            const isEmpty = job.status !== 'running' && job.resultsCount === 0;
            return (
              <div key={job.id} className={`bg-card border rounded-xl p-4 transition-all ${isEmpty ? 'border-red-500/20 bg-red-500/3' : 'border-card-border hover:border-primary-500/20'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Status badge */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
                        <Icon className={`w-3 h-3 ${cfg.spin ? 'animate-spin' : ''}`} />
                        {cfg.label}
                      </span>
                      {isEmpty && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs">
                          Résultat vide
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {new Date(job.dateCreated).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {/* Keywords */}
                    <p className="text-sm text-white font-medium mb-1">
                      {job.keywords?.join(', ') || 'Sans mot-clé'}
                      {job.location && <span className="text-slate-400 font-normal"> · {job.location}</span>}
                    </p>
                    {/* Platforms */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(job.platforms || []).slice(0, 6).map(p => (
                        <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-obsidian-700 text-slate-400">{p}</span>
                      ))}
                      {(job.platforms || []).length > 6 && (
                        <span className="text-xs text-slate-500">+{job.platforms.length - 6}</span>
                      )}
                    </div>
                    {/* Results count or error */}
                    {job.status === 'completed' && (
                      <p className="text-xs text-slate-400">
                        {job.resultsCount > 0
                          ? <span className="text-green-400 font-medium">{job.resultsCount} contact{job.resultsCount > 1 ? 's' : ''} extraits</span>
                          : <span className="text-red-400">Aucun résultat extrait</span>}
                      </p>
                    )}
                    {job.status === 'error' && job.errorMessage && (
                      <p className="text-xs text-red-400 mt-1 bg-red-500/10 px-2 py-1 rounded-lg">
                        ⚠ {job.errorMessage}
                      </p>
                    )}
                    {job.status === 'running' && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Progression</span>
                          <span>{job.progress || 0}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-obsidian-900 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-primary-500 transition-all" style={{ width: `${job.progress || 0}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Delete button */}
                  {job.status !== 'running' && (
                    <button
                      onClick={() => deleteScrapeJob(job.id)}
                      className="flex-shrink-0 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Supprimer ce job"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PIPELINE KANBAN TAB ──────────────────────────────────────────────────────

const PIPELINE_COLUMNS: { id: PipelineColumn; label: string; icon: string; color: string; border: string; bg: string }[] = [
  { id: 'identifie',           label: 'Identifié',           icon: '🔍', color: 'text-blue-400',    border: 'border-blue-500/30',    bg: 'bg-blue-500/5' },
  { id: 'contacte',            label: 'Contacté',            icon: '📧', color: 'text-cyan-400',    border: 'border-cyan-500/30',    bg: 'bg-cyan-500/5' },
  { id: 'en_discussion',       label: 'En discussion',       icon: '💬', color: 'text-amber-400',   border: 'border-amber-500/30',   bg: 'bg-amber-500/5' },
  { id: 'proposition_envoyee', label: 'Proposition envoyée', icon: '📋', color: 'text-purple-400',  border: 'border-purple-500/30',  bg: 'bg-purple-500/5' },
  { id: 'signe',               label: 'Signé',               icon: '✅', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5' },
  { id: 'refuse',              label: 'Refusé',              icon: '❌', color: 'text-red-400',     border: 'border-red-500/30',     bg: 'bg-red-500/5' },
];

function TabPipeline() {
  const { prospects, updateProspect } = useProspectionStore();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<PipelineColumn | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<ProspectContact | null>(null);

  // Group prospects by pipeline column
  const columns = useMemo(() => {
    const map: Record<PipelineColumn, ProspectContact[]> = {
      identifie: [], contacte: [], en_discussion: [],
      proposition_envoyee: [], signe: [], refuse: [],
    };
    prospects.forEach((p) => {
      const col = p.pipelineColumn || 'identifie';
      if (map[col]) map[col].push(p);
    });
    return map;
  }, [prospects]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, colId: PipelineColumn) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  };

  const handleDragLeave = () => setDragOverCol(null);

  const handleDrop = (e: React.DragEvent, colId: PipelineColumn) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    if (id) {
      updateProspect(id, { pipelineColumn: colId });
    }
    setDraggedId(null);
    setDragOverCol(null);
  };

  // Add prospect to pipeline
  const addToPipeline = (prospectId: string) => {
    updateProspect(prospectId, { pipelineColumn: 'identifie' });
  };

  // Prospects not yet in pipeline
  const unassigned = prospects.filter(p => !p.pipelineColumn);
  const totalInPipeline = prospects.filter(p => p.pipelineColumn).length;

  return (
    <div className="space-y-5">
      {/* Pipeline stats */}
      <div className="grid grid-cols-6 gap-3">
        {PIPELINE_COLUMNS.map(col => (
          <div key={col.id} className={`bg-card border ${col.border} rounded-xl p-3 text-center`}>
            <span className="text-lg">{col.icon}</span>
            <p className={`text-xl font-bold ${col.color} mt-1`}>{columns[col.id].length}</p>
            <p className="text-xs text-slate-500 mt-0.5">{col.label}</p>
          </div>
        ))}
      </div>

      {/* Quick add from unassigned */}
      {unassigned.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">
              {unassigned.length} prospect{unassigned.length > 1 ? 's' : ''} non assigné{unassigned.length > 1 ? 's' : ''} au pipeline
            </p>
            <button
              onClick={() => unassigned.forEach(p => addToPipeline(p.id))}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium transition-colors"
            >
              Tout ajouter
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {unassigned.slice(0, 10).map(p => (
              <button
                key={p.id}
                onClick={() => addToPipeline(p.id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian-700 border border-card-border text-xs text-slate-300 hover:border-primary-500/40 hover:text-white transition-all"
              >
                <Plus className="w-3 h-3" />
                {p.prenom} {p.nom}
              </button>
            ))}
            {unassigned.length > 10 && (
              <span className="text-xs text-slate-500 self-center">+{unassigned.length - 10} autres</span>
            )}
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div className="grid grid-cols-6 gap-3 min-h-[500px]">
        {PIPELINE_COLUMNS.map(col => (
          <div
            key={col.id}
            className={`flex flex-col rounded-xl border transition-all ${
              dragOverCol === col.id
                ? `${col.border} ${col.bg} ring-1 ring-${col.color.replace('text-', '')}`
                : 'border-card-border bg-obsidian-800/50'
            }`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column header */}
            <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${col.border}`}>
              <span className="text-sm">{col.icon}</span>
              <span className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>{col.label}</span>
              <span className="ml-auto text-xs text-slate-500 bg-obsidian-700 px-1.5 py-0.5 rounded-full">
                {columns[col.id].length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[600px]">
              {columns[col.id].map(prospect => (
                <div
                  key={prospect.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, prospect.id)}
                  onClick={() => setSelectedProspect(prospect)}
                  className={`group bg-card border border-card-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary-500/30 transition-all ${
                    draggedId === prospect.id ? 'opacity-40' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-600 to-cyan-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {(prospect.prenom[0] || '').toUpperCase()}{(prospect.nom[0] || '').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {prospect.prenom} {prospect.nom}
                      </p>
                      {prospect.entreprise && (
                        <p className="text-[10px] text-slate-500 truncate">{prospect.entreprise}</p>
                      )}
                    </div>
                    <GripVertical className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  {/* Score */}
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      PLATFORM_CONFIG[prospect.source]?.color || 'bg-slate-600'
                    } text-white`}>
                      {PLATFORM_CONFIG[prospect.source]?.label || prospect.source}
                    </span>
                    <span className={`text-[10px] font-bold ${getScoreColor(prospect.score)}`}>
                      {prospect.score}%
                    </span>
                  </div>
                  {prospect.dernierContact && (
                    <p className="text-[9px] text-slate-600 mt-1.5">
                      Dernier contact: {new Date(prospect.dernierContact).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              ))}

              {columns[col.id].length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-slate-600">
                  <span className="text-2xl opacity-30">{col.icon}</span>
                  <p className="text-[10px] mt-1">Vide</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Slide panel for prospect detail */}
      {selectedProspect && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedProspect(null)} />
          <div className="relative w-full max-w-md bg-obsidian-800 border-l border-card-border shadow-2xl overflow-y-auto animate-slide-in">
            <div className="sticky top-0 bg-obsidian-800 border-b border-card-border px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">Détail prospect</h3>
              <button onClick={() => setSelectedProspect(null)} className="p-2 rounded-lg hover:bg-card text-slate-400 hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Identity */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-600 to-cyan-600 flex items-center justify-center text-white text-lg font-bold">
                  {(selectedProspect.prenom[0] || '').toUpperCase()}{(selectedProspect.nom[0] || '').toUpperCase()}
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">{selectedProspect.prenom} {selectedProspect.nom}</h4>
                  {selectedProspect.entreprise && <p className="text-slate-400 text-sm">{selectedProspect.entreprise}</p>}
                  {selectedProspect.poste && <p className="text-slate-500 text-xs">{selectedProspect.poste}</p>}
                </div>
              </div>

              {/* Pipeline column selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Étape pipeline</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PIPELINE_COLUMNS.map(col => {
                    const active = (selectedProspect.pipelineColumn || 'identifie') === col.id;
                    return (
                      <button
                        key={col.id}
                        onClick={() => {
                          updateProspect(selectedProspect.id, { pipelineColumn: col.id });
                          setSelectedProspect({ ...selectedProspect, pipelineColumn: col.id });
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                          active
                            ? `${col.bg} ${col.border} ${col.color}`
                            : 'border-card-border text-slate-500 hover:text-white hover:border-slate-600'
                        }`}
                      >
                        <span className="text-sm">{col.icon}</span>
                        {col.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Coordonnées</label>
                {selectedProspect.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Mail className="w-4 h-4 text-slate-500" /> {selectedProspect.email}
                  </div>
                )}
                {selectedProspect.telephone && (
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Phone className="w-4 h-4 text-slate-500" /> {selectedProspect.telephone}
                  </div>
                )}
                {selectedProspect.website && (
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Globe className="w-4 h-4 text-slate-500" />
                    <a href={selectedProspect.website} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline truncate">{selectedProspect.website}</a>
                  </div>
                )}
                {selectedProspect.linkedinUrl && (
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <ExternalLink className="w-4 h-4 text-slate-500" />
                    <a href={selectedProspect.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate">LinkedIn</a>
                  </div>
                )}
              </div>

              {/* Score & metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-card-border rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Score IA</p>
                  <p className={`text-2xl font-bold ${getScoreColor(selectedProspect.score)}`}>{selectedProspect.score}</p>
                </div>
                {selectedProspect.followers != null && (
                  <div className="bg-card border border-card-border rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-1">Followers</p>
                    <p className="text-2xl font-bold text-white">{selectedProspect.followers.toLocaleString('fr-FR')}</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedProspect.notes && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</label>
                  <p className="text-sm text-slate-300 bg-obsidian-700 rounded-lg p-3 border border-card-border">{selectedProspect.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
type TabId = 'scraper' | 'prospects' | 'enrichissement' | 'pipeline' | 'jobs' | 'configuration';

interface TabDef {
  id: TabId;
  label: string;
  Icon: React.FC<{ className?: string }>;
}

const TABS: TabDef[] = [
  { id: 'scraper',        label: 'Scraper IA',       Icon: Crosshair },
  { id: 'prospects',      label: 'Prospects',         Icon: Users },
  { id: 'enrichissement', label: 'Enrichissement IA', Icon: Brain },
  { id: 'pipeline',       label: 'Pipeline',          Icon: Columns },
  { id: 'jobs',           label: 'Jobs',              Icon: Clock },
  { id: 'configuration',  label: 'Configuration',     Icon: Settings },
];

const ProspectionCRM: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('scraper');
  const { prospects, scrapeJobs } = useProspectionStore();

  const activeJobsCount  = scrapeJobs.filter((j) => j.status === 'running' || j.status === 'pending').length;
  const newProspectsCount = prospects.filter((p) => p.status === 'new').length;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0 border-b border-card-border">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                <Target className="w-5 h-5 text-white" />
              </div>
              Prospection IA
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Détectez, enrichissez et importez vos meilleurs prospects grâce à l'intelligence artificielle
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeJobsCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-500/10 border border-primary-500/30">
                <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                <span className="text-primary-400 text-sm font-medium">
                  {activeJobsCount} job{activeJobsCount > 1 ? 's' : ''} actif{activeJobsCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-card-border">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-white text-sm font-semibold">{prospects.length}</span>
              <span className="text-slate-400 text-sm">prospects</span>
            </div>
            {newProspectsCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-blue-400 text-sm font-medium">{newProspectsCount} nouveaux</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all border-b-2 ${
                  isActive
                    ? 'text-primary-400 border-primary-500 bg-primary-500/5'
                    : 'text-slate-400 border-transparent hover:text-white hover:bg-obsidian-700/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {id === 'prospects' && newProspectsCount > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold px-1">
                    {newProspectsCount}
                  </span>
                )}
                {id === 'scraper' && activeJobsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {activeTab === 'scraper'        && <TabScraper />}
        {activeTab === 'prospects'      && <TabProspects />}
        {activeTab === 'enrichissement' && <TabEnrichissement />}
        {activeTab === 'pipeline'       && <TabPipeline />}
        {activeTab === 'jobs'           && <JobsTab />}
        {activeTab === 'configuration'  && <TabConfiguration />}
      </div>
    </div>
  );
};

export { ProspectionCRM };
export default ProspectionCRM;

import React, { useState } from 'react';
import {
  Zap, Plus, Trash2, ChevronUp, ChevronDown,
  Mail, Clock, GitBranch, CheckSquare, Play, Pause, X,
  Users, ArrowRight, FileText,
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store/useStore';
import { v4 as uuidv4 } from 'uuid';
import { SequenceType, SequenceStepAction, SequenceStep, EmailSequence } from '../types';

const INPUT_CLASS = 'w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all';

const SEQUENCE_TYPES: { value: SequenceType; label: string }[] = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'relance_lead', label: 'Relance Lead' },
  { value: 'nurturing', label: 'Nurturing' },
  { value: 'reactivation', label: 'Réactivation' },
  { value: 'custom', label: 'Personnalisée' },
];

const ACTION_ICONS: Record<SequenceStepAction, React.FC<{ className?: string }>> = {
  email: Mail,
  attente: Clock,
  condition: GitBranch,
  tache: CheckSquare,
};

const ACTION_LABELS: Record<SequenceStepAction, string> = {
  email: 'Email',
  attente: 'Attente',
  condition: 'Condition',
  tache: 'Tache',
};

const ACTION_COLORS: Record<SequenceStepAction, string> = {
  email: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  attente: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  condition: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
  tache: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

// ─── Variables disponibles ────────────────────────────────────────────────────
// {{prenom}} — Prénom du contact
// {{nom}} — Nom du contact
// {{entreprise}} — Nom de l'entreprise
// {{poste}} — Poste du contact
// {{agence}} — Nom de votre agence (Obsidian Agency)
// {{signature}} — Votre signature

const PRESET_SEQUENCES: Omit<EmailSequence, 'id' | 'dateCreation'>[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ONBOARDING NOUVEAU CLIENT
  // ═══════════════════════════════════════════════════════════════════════════
  {
    nom: 'Onboarding Nouveau Client',
    type: 'onboarding',
    description: "Séquence d'accueil en 5 étapes pour fidéliser dès le premier jour",
    isActive: true,
    steps: [
      {
        id: uuidv4(), ordre: 0, action: 'email', delaiJours: 0,
        sujet: 'Bienvenue chez {{agence}} — On démarre ensemble !',
        contenu: `Bonjour {{prenom}},

Toute l'équipe d'{{agence}} est ravie de vous compter parmi nos clients.

Voici ce qui va se passer dans les prochains jours :
1. Kick-off meeting pour cadrer votre projet
2. Accès à votre espace client dédié
3. Présentation de votre chef de projet

En attendant, n'hésitez pas à répondre à cet email si vous avez la moindre question.

À très vite,
{{signature}}`,
      },
      { id: uuidv4(), ordre: 1, action: 'attente', delaiJours: 2 },
      {
        id: uuidv4(), ordre: 2, action: 'email', delaiJours: 0,
        sujet: 'Votre projet — les prochaines étapes concrètes',
        contenu: `Bonjour {{prenom}},

Suite à notre premier échange, voici un récapitulatif de ce qui est prévu :

Planning prévisionnel :
- Semaine 1 : Audit & brief créatif
- Semaine 2-3 : Maquettes & propositions
- Semaine 4 : Livraison v1 + itérations

Vous pouvez suivre l'avancement en temps réel depuis votre espace client.

Si certains points méritent d'être ajustés, dites-le-nous maintenant — c'est le bon moment.

Cordialement,
{{signature}}`,
      },
      { id: uuidv4(), ordre: 3, action: 'tache', delaiJours: 5, tacheDescription: 'Appeler {{prenom}} {{nom}} pour premier point de suivi (15 min)' },
      {
        id: uuidv4(), ordre: 4, action: 'email', delaiJours: 7,
        sujet: 'Comment se passent les premiers jours ?',
        contenu: `Bonjour {{prenom}},

Cela fait maintenant une semaine que nous travaillons ensemble. Je voulais m'assurer que tout se passe bien de votre côté.

Quelques questions rapides :
- Les livrables correspondent-ils à vos attentes ?
- La communication avec l'équipe est-elle fluide ?
- Y a-t-il des ajustements à faire ?

Votre satisfaction est notre priorité. N'hésitez pas à être transparent — on est là pour ça.

Belle journée,
{{signature}}`,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. RELANCE LEAD FROID
  // ═══════════════════════════════════════════════════════════════════════════
  {
    nom: 'Relance Lead Froid',
    type: 'relance_lead',
    description: "Séquence de réactivation en 6 étapes pour les leads sans réponse",
    isActive: true,
    steps: [
      {
        id: uuidv4(), ordre: 0, action: 'email', delaiJours: 0,
        sujet: '{{prenom}}, suite à notre échange',
        contenu: `Bonjour {{prenom}},

Je me permets de revenir vers vous suite à notre conversation.

Je sais que le timing n'est pas toujours idéal, mais je voulais m'assurer que vous aviez bien reçu notre proposition.

Seriez-vous disponible pour un call de 15 minutes cette semaine ? Je pourrai répondre à toutes vos questions.

Bien cordialement,
{{signature}}`,
      },
      { id: uuidv4(), ordre: 1, action: 'attente', delaiJours: 3 },
      { id: uuidv4(), ordre: 2, action: 'condition', delaiJours: 0, condition: 'pas_de_reponse' },
      {
        id: uuidv4(), ordre: 3, action: 'email', delaiJours: 0,
        sujet: 'Une question rapide, {{prenom}}',
        contenu: `Bonjour {{prenom}},

Je ne veux surtout pas être insistant — je comprends que vous avez un emploi du temps chargé.

Je me demandais simplement si :
- Le projet est toujours d'actualité ?
- Vous avez besoin d'informations complémentaires ?
- Le budget ou le timing posent question ?

Un simple "oui" ou "non" me suffit pour savoir si je dois continuer à vous tenir informé(e).

Merci pour votre temps,
{{signature}}`,
      },
      { id: uuidv4(), ordre: 4, action: 'attente', delaiJours: 7 },
      { id: uuidv4(), ordre: 5, action: 'tache', delaiJours: 0, tacheDescription: 'Appel de dernière chance à {{prenom}} {{nom}} — Si pas de réponse, classer comme perdu' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. NURTURING PROSPECT
  // ═══════════════════════════════════════════════════════════════════════════
  {
    nom: 'Nurturing Prospect',
    type: 'nurturing',
    description: 'Séquence de contenu en 6 étapes pour garder le contact sur 2 mois',
    isActive: true,
    steps: [
      {
        id: uuidv4(), ordre: 0, action: 'email', delaiJours: 0,
        sujet: '{{prenom}}, une ressource qui pourrait vous intéresser',
        contenu: `Bonjour {{prenom}},

En travaillant avec des entreprises comme {{entreprise}}, on a identifié un défi récurrent : comment maximiser son ROI digital sans exploser son budget.

On a compilé nos meilleurs conseils dans un guide pratique. Je vous l'envoie en pièce jointe — c'est gratuit et sans engagement.

Si le sujet vous parle, je serais ravi(e) d'en discuter autour d'un café virtuel.

Bonne lecture,
{{signature}}`,
      },
      { id: uuidv4(), ordre: 1, action: 'attente', delaiJours: 14 },
      {
        id: uuidv4(), ordre: 2, action: 'email', delaiJours: 0,
        sujet: 'Comment une entreprise similaire a doublé ses résultats',
        contenu: `Bonjour {{prenom}},

Je voulais partager avec vous une success story qui pourrait vous inspirer.

Un de nos clients dans un secteur proche du vôtre faisait face aux mêmes défis. En 6 mois, voici ce qu'on a accompli ensemble :
- +127% de trafic qualifié
- -34% de coût d'acquisition
- x2.3 sur le ROI publicitaire

Ce qui a fait la différence ? Une approche data-driven et un accompagnement sur-mesure.

Si vous voulez en savoir plus sur la méthode, je suis disponible.

Cordialement,
{{signature}}`,
      },
      { id: uuidv4(), ordre: 3, action: 'attente', delaiJours: 14 },
      {
        id: uuidv4(), ordre: 4, action: 'email', delaiJours: 0,
        sujet: 'Invitation exclusive : atelier stratégie digitale',
        contenu: `Bonjour {{prenom}},

Nous organisons un atelier en ligne réservé aux décideurs comme vous :

"Comment construire une stratégie digitale rentable en 2026"

Au programme :
- Les 3 erreurs qui coûtent le plus cher aux PME
- Le framework qu'on utilise avec nos clients
- Session Q&A en direct

Places limitées à 15 participants pour garantir la qualité des échanges.

Intéressé(e) ? Répondez simplement "oui" et je vous envoie le lien d'inscription.

À bientôt,
{{signature}}`,
      },
      { id: uuidv4(), ordre: 5, action: 'tache', delaiJours: 30, tacheDescription: 'Évaluer la maturité de {{prenom}} {{nom}} ({{entreprise}}) — Passer en lead chaud si engagement détecté' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. RÉACTIVATION CLIENT INACTIF
  // ═══════════════════════════════════════════════════════════════════════════
  {
    nom: 'Réactivation Client Inactif',
    type: 'reactivation',
    description: 'Séquence en 5 étapes pour réengager les clients silencieux depuis 3+ mois',
    isActive: true,
    steps: [
      {
        id: uuidv4(), ordre: 0, action: 'email', delaiJours: 0,
        sujet: '{{prenom}}, ça fait un moment !',
        contenu: `Bonjour {{prenom}},

Cela fait quelque temps que nous n'avons pas échangé, et je voulais prendre de vos nouvelles.

Comment se porte {{entreprise}} ? Avez-vous de nouveaux projets en tête pour les prochains mois ?

De notre côté, on a pas mal évolué — nouvelles expertises, nouveaux outils, nouvelles références. Je serais ravi(e) de vous montrer ce qu'on peut apporter de plus aujourd'hui.

Un rapide échange de 10 minutes, ça vous dit ?

Au plaisir,
{{signature}}`,
      },
      { id: uuidv4(), ordre: 1, action: 'attente', delaiJours: 5 },
      {
        id: uuidv4(), ordre: 2, action: 'email', delaiJours: 0,
        sujet: 'Une offre spéciale pour nos anciens clients',
        contenu: `Bonjour {{prenom}},

Comme vous faites partie de nos clients historiques, je voulais vous proposer quelque chose d'exclusif.

Offre réservée à nos anciens clients :
-20% sur votre prochain projet si vous confirmez avant la fin du mois.

Pas de pression — c'est simplement notre façon de vous remercier pour la confiance passée et de vous donner une raison de revenir.

Intéressé(e) ? Répondez à cet email et on planifie un call.

Cordialement,
{{signature}}`,
      },
      { id: uuidv4(), ordre: 3, action: 'attente', delaiJours: 7 },
      {
        id: uuidv4(), ordre: 4, action: 'email', delaiJours: 0,
        sujet: 'Dernier message — on reste disponibles',
        contenu: `Bonjour {{prenom}},

C'est mon dernier message de la série — promis, pas de spam.

Si le timing n'est pas bon, je comprends parfaitement. Sachez simplement que notre porte reste ouverte. Le jour où {{entreprise}} aura besoin d'un partenaire digital, on sera là.

Je vous souhaite une excellente continuation.

Bien à vous,
{{signature}}`,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PROSPECTION À FROID
  // ═══════════════════════════════════════════════════════════════════════════
  {
    nom: 'Prospection à Froid',
    type: 'custom',
    description: 'Séquence de cold outreach en 7 étapes pour des prospects jamais contactés',
    isActive: true,
    steps: [
      {
        id: uuidv4(), ordre: 0, action: 'email', delaiJours: 0,
        sujet: '{{prenom}}, une idée pour {{entreprise}}',
        contenu: `Bonjour {{prenom}},

Je m'appelle [Votre prénom] et je dirige {{agence}}, une agence spécialisée dans la croissance digitale.

En analysant {{entreprise}}, j'ai remarqué quelques opportunités que vous n'exploitez peut-être pas encore :
- [Point 1 personnalisé selon le prospect]
- [Point 2 personnalisé]

On a aidé des entreprises similaires à obtenir des résultats concrets. Pas de bla-bla — des chiffres.

Est-ce que 15 minutes dans votre agenda cette semaine seraient envisageables ?

Cordialement,
{{signature}}`,
      },
      { id: uuidv4(), ordre: 1, action: 'attente', delaiJours: 3 },
      {
        id: uuidv4(), ordre: 2, action: 'email', delaiJours: 0,
        sujet: 'Re: une idée pour {{entreprise}}',
        contenu: `{{prenom}},

Suite à mon précédent message — je voulais ajouter un élément concret.

Nous avons récemment accompagné une entreprise de votre secteur. Résultat en 90 jours :
- Trafic qualifié : +85%
- Coût par lead : -40%
- Chiffre d'affaires attribuable : +60K€

Si ces chiffres vous parlent, je peux vous expliquer comment en 15 minutes chrono.

{{signature}}`,
      },
      { id: uuidv4(), ordre: 3, action: 'attente', delaiJours: 4 },
      { id: uuidv4(), ordre: 4, action: 'condition', delaiJours: 0, condition: 'pas_de_reponse' },
      {
        id: uuidv4(), ordre: 5, action: 'email', delaiJours: 0,
        sujet: 'Pas le bon moment ? Pas de souci',
        contenu: `Bonjour {{prenom}},

Je comprends que vous recevez beaucoup de sollicitations. Alors je vais être direct :

Si la croissance digitale de {{entreprise}} n'est pas une priorité en ce moment, dites-le-moi — je ne vous dérangerai plus.

Mais si c'est simplement une question de timing, je peux vous recontacter dans 3 mois. Qu'est-ce qui vous arrange ?

Bonne journée,
{{signature}}`,
      },
      { id: uuidv4(), ordre: 6, action: 'tache', delaiJours: 3, tacheDescription: 'Si pas de réponse, ajouter {{prenom}} {{nom}} en liste de rappel 3 mois. Si réponse négative, marquer comme "pas intéressé".' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. UPSELL / CROSS-SELL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    nom: 'Upsell Client Existant',
    type: 'custom',
    description: 'Proposer des services additionnels aux clients satisfaits',
    isActive: true,
    steps: [
      {
        id: uuidv4(), ordre: 0, action: 'email', delaiJours: 0,
        sujet: '{{prenom}}, une opportunité pour aller plus loin',
        contenu: `Bonjour {{prenom}},

Les résultats de notre collaboration sur [projet actuel] sont très encourageants. Bravo à toute l'équipe de {{entreprise}} !

En analysant vos données, on a identifié un levier de croissance supplémentaire que vous pourriez activer rapidement :

[Service complémentaire personnalisé]

D'après nos estimations, cela pourrait générer +30% de résultats additionnels avec un investissement maîtrisé.

Envie d'en savoir plus ? Je peux vous préparer une mini-proposition en 48h.

Cordialement,
{{signature}}`,
      },
      { id: uuidv4(), ordre: 1, action: 'attente', delaiJours: 5 },
      {
        id: uuidv4(), ordre: 2, action: 'email', delaiJours: 0,
        sujet: 'Les chiffres parlent d\'eux-mêmes',
        contenu: `{{prenom}},

Je voulais partager un cas similaire au vôtre.

Un client qui a ajouté [service complémentaire] à sa collaboration avec nous a vu :
- +45% de conversions en 2 mois
- Un ROI de x3.2 sur l'investissement additionnel
- Une réduction de 25% du coût d'acquisition global

Pas mal pour un ajout qui ne représente que 20% de budget en plus, non ?

On en discute ?

{{signature}}`,
      },
      { id: uuidv4(), ordre: 3, action: 'tache', delaiJours: 3, tacheDescription: 'Préparer une mini-proposition personnalisée pour {{prenom}} {{nom}} — inclure les résultats actuels et la projection avec le service additionnel' },
    ],
  },
];

const EmailSequences: React.FC = () => {
  const {
    emailSequences, sequenceEnrollments, clients,
    addEmailSequence, updateEmailSequence, deleteEmailSequence,
    enrollInSequence, advanceSequenceStep, cancelSequenceEnrollment,
  } = useStore();

  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [enrollModal, setEnrollModal] = useState<string | null>(null);
  const [enrollClientId, setEnrollClientId] = useState('');

  // Form state
  const [formNom, setFormNom] = useState('');
  const [formType, setFormType] = useState<SequenceType>('custom');
  const [formDesc, setFormDesc] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formSteps, setFormSteps] = useState<SequenceStep[]>([]);

  const resetForm = () => {
    setFormNom('');
    setFormType('custom');
    setFormDesc('');
    setFormActive(true);
    setFormSteps([]);
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setView('create');
  };

  const openEdit = (seq: EmailSequence) => {
    setFormNom(seq.nom);
    setFormType(seq.type);
    setFormDesc(seq.description);
    setFormActive(seq.isActive);
    setFormSteps([...seq.steps]);
    setEditId(seq.id);
    setView('edit');
  };

  const loadPreset = (preset: Omit<EmailSequence, 'id' | 'dateCreation'>) => {
    setFormNom(preset.nom);
    setFormType(preset.type);
    setFormDesc(preset.description);
    setFormActive(preset.isActive);
    setFormSteps(preset.steps.map((s, i) => ({ ...s, id: uuidv4(), ordre: i })));
  };

  const addStep = (action: SequenceStepAction) => {
    setFormSteps(prev => [...prev, {
      id: uuidv4(),
      ordre: prev.length,
      action,
      delaiJours: action === 'attente' ? 3 : 0,
      sujet: action === 'email' ? '' : undefined,
      contenu: action === 'email' ? '' : undefined,
      condition: action === 'condition' ? '' : undefined,
      tacheDescription: action === 'tache' ? '' : undefined,
    }]);
  };

  const updateStep = (id: string, updates: Partial<SequenceStep>) => {
    setFormSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeStep = (id: string) => {
    setFormSteps(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, ordre: i })));
  };

  const moveStep = (id: string, direction: 'up' | 'down') => {
    setFormSteps(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy.map((s, i) => ({ ...s, ordre: i }));
    });
  };

  const handleSave = () => {
    if (!formNom.trim()) return;
    const data = {
      nom: formNom.trim(),
      type: formType,
      description: formDesc.trim(),
      isActive: formActive,
      steps: formSteps,
    };
    if (editId) {
      updateEmailSequence(editId, data);
    } else {
      addEmailSequence(data);
    }
    resetForm();
    setView('list');
  };

  const handleEnroll = () => {
    if (!enrollModal || !enrollClientId) return;
    const client = clients.find(c => c.id === enrollClientId);
    if (!client) return;
    enrollInSequence(enrollModal, client.id, client.nom || client.entreprise);
    setEnrollModal(null);
    setEnrollClientId('');
  };

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary-400" />
              Séquences Email
            </h2>
            <p className="text-sm text-slate-400 mt-1">Automatisez vos communications avec des séquences personnalisées</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-accent-cyan to-primary-500 text-white rounded-xl text-sm font-semibold hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Nouvelle séquence
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-card-border rounded-xl p-4">
            <p className="text-xs text-slate-500">Séquences actives</p>
            <p className="text-xl font-bold text-white">{emailSequences.filter(s => s.isActive).length}</p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4">
            <p className="text-xs text-slate-500">Inscriptions actives</p>
            <p className="text-xl font-bold text-primary-300">{sequenceEnrollments.filter(e => e.statut === 'active').length}</p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4">
            <p className="text-xs text-slate-500">Terminées</p>
            <p className="text-xl font-bold text-emerald-400">{sequenceEnrollments.filter(e => e.statut === 'completed').length}</p>
          </div>
        </div>

        {/* Sequence list */}
        {emailSequences.length === 0 ? (
          <div className="bg-card border border-card-border rounded-xl p-8 text-center">
            <Zap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm mb-4">Aucune séquence. Commencez par en créer une ou charger un template.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {emailSequences.map(seq => {
              const enrollments = sequenceEnrollments.filter(e => e.sequenceId === seq.id);
              const activeEnrollments = enrollments.filter(e => e.statut === 'active').length;
              return (
                <div key={seq.id} className="bg-card border border-card-border rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{seq.nom}</h3>
                        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full border', seq.isActive ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-slate-500 bg-slate-500/10 border-slate-500/30')}>
                          {seq.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-[10px] text-slate-500 bg-obsidian-800 px-1.5 py-0.5 rounded-full">{seq.type}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{seq.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] text-slate-500">{seq.steps.length} étapes</span>
                        <span className="text-[10px] text-slate-500">{activeEnrollments} inscrit(s) actif(s)</span>
                      </div>
                      {/* Step preview */}
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {seq.steps.map((step, i) => {
                          const Icon = ACTION_ICONS[step.action];
                          return (
                            <React.Fragment key={step.id}>
                              {i > 0 && <ArrowRight className="w-2.5 h-2.5 text-slate-600" />}
                              <span className={clsx('inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border', ACTION_COLORS[step.action])}>
                                <Icon className="w-2.5 h-2.5" />
                                {step.action === 'attente' ? `${step.delaiJours}j` : ACTION_LABELS[step.action]}
                              </span>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setEnrollModal(seq.id)} className="p-1.5 text-slate-500 hover:text-primary-300 rounded-lg hover:bg-obsidian-700" title="Inscrire un client">
                        <Users className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => updateEmailSequence(seq.id, { isActive: !seq.isActive })} className="p-1.5 text-slate-500 hover:text-amber-400 rounded-lg hover:bg-obsidian-700" title={seq.isActive ? 'Désactiver' : 'Activer'}>
                        {seq.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => openEdit(seq)} className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-obsidian-700" title="Modifier">
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteEmailSequence(seq.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-obsidian-700" title="Supprimer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Enrollments */}
                  {enrollments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-card-border">
                      <p className="text-[10px] text-slate-500 mb-2 font-semibold uppercase tracking-wider">Inscriptions</p>
                      <div className="space-y-1.5">
                        {enrollments.map(e => (
                          <div key={e.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-white">{e.clientNom}</span>
                              <span className={clsx('text-[9px] px-1.5 py-0.5 rounded-full border',
                                e.statut === 'active' ? 'text-emerald-400 border-emerald-500/30' :
                                e.statut === 'completed' ? 'text-blue-400 border-blue-500/30' :
                                e.statut === 'paused' ? 'text-amber-400 border-amber-500/30' :
                                'text-red-400 border-red-500/30'
                              )}>
                                {e.statut}
                              </span>
                              <span className="text-[9px] text-slate-500">Étape {e.etapeActuelle + 1}/{seq.steps.length}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {e.statut === 'active' && (
                                <>
                                  <button onClick={() => advanceSequenceStep(e.id)} className="text-[9px] text-primary-400 hover:text-primary-300 px-1.5 py-0.5 rounded hover:bg-obsidian-700">
                                    Avancer
                                  </button>
                                  <button onClick={() => cancelSequenceEnrollment(e.id)} className="text-[9px] text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-obsidian-700">
                                    Annuler
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Enroll modal */}
        {enrollModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEnrollModal(null)}>
            <div className="bg-obsidian-800 border border-card-border rounded-xl p-5 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-white">Inscrire un client</h3>
              <select value={enrollClientId} onChange={e => setEnrollClientId(e.target.value)} className={INPUT_CLASS}>
                <option value="">Sélectionner un client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom} — {c.entreprise}</option>)}
              </select>
              <div className="flex gap-3">
                <button onClick={() => setEnrollModal(null)} className="flex-1 py-2 rounded-xl border border-card-border text-slate-400 text-sm hover:bg-card-hover">Annuler</button>
                <button onClick={handleEnroll} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-accent-cyan to-primary-500 text-white text-sm font-semibold">Inscrire</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── CREATE / EDIT VIEW ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-400" />
            {view === 'edit' ? 'Modifier la séquence' : 'Nouvelle séquence'}
          </h2>
        </div>
        <button
          onClick={() => { resetForm(); setView('list'); }}
          className="flex items-center gap-1.5 px-3 py-2 border border-card-border text-slate-400 rounded-xl text-sm hover:bg-card-hover"
        >
          <X className="w-4 h-4" /> Retour
        </button>
      </div>

      {/* Presets */}
      {view === 'create' && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 mb-3">Charger un template</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PRESET_SEQUENCES.map((preset, i) => (
              <button
                key={i}
                onClick={() => loadPreset(preset)}
                className="text-left bg-obsidian-700 border border-card-border rounded-xl p-3 hover:border-primary-500/50 transition-colors"
              >
                <p className="text-xs font-bold text-white">{preset.nom}</p>
                <p className="text-[10px] text-slate-500 mt-1">{preset.description}</p>
                <p className="text-[9px] text-slate-600 mt-1">{preset.steps.length} étapes</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={formNom} onChange={e => setFormNom(e.target.value)} placeholder="Nom de la séquence" className={INPUT_CLASS} />
          <select value={formType} onChange={e => setFormType(e.target.value as SequenceType)} className={INPUT_CLASS}>
            {SEQUENCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Description" className={INPUT_CLASS} />
          </div>
        </div>

        {/* Steps builder */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400">Étapes de la séquence</p>
            <div className="flex gap-1.5">
              {(['email', 'attente', 'condition', 'tache'] as SequenceStepAction[]).map(action => {
                const Icon = ACTION_ICONS[action];
                return (
                  <button
                    key={action}
                    onClick={() => addStep(action)}
                    className={clsx('flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-colors', ACTION_COLORS[action], 'hover:opacity-80')}
                  >
                    <Icon className="w-3 h-3" /> + {ACTION_LABELS[action]}
                  </button>
                );
              })}
            </div>
          </div>

          {formSteps.length === 0 ? (
            <div className="py-8 text-center text-slate-600 text-xs border border-dashed border-card-border rounded-xl">
              Ajoutez des étapes avec les boutons ci-dessus ou chargez un template
            </div>
          ) : (
            <div className="space-y-2">
              {formSteps.map((step, i) => {
                const Icon = ACTION_ICONS[step.action];
                return (
                  <div key={step.id} className={clsx('border rounded-xl p-3 space-y-2', ACTION_COLORS[step.action])}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">#{i + 1}</span>
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold">{ACTION_LABELS[step.action]}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveStep(step.id, 'up')} disabled={i === 0} className="p-0.5 text-slate-500 hover:text-white disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                        <button onClick={() => moveStep(step.id, 'down')} disabled={i === formSteps.length - 1} className="p-0.5 text-slate-500 hover:text-white disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                        <button onClick={() => removeStep(step.id)} className="p-0.5 text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>

                    {step.action === 'email' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input value={step.sujet || ''} onChange={e => updateStep(step.id, { sujet: e.target.value })} placeholder="Sujet de l'email" className={INPUT_CLASS} />
                        <input value={step.contenu || ''} onChange={e => updateStep(step.id, { contenu: e.target.value })} placeholder="Contenu de l'email" className={INPUT_CLASS} />
                      </div>
                    )}

                    {step.action === 'attente' && (
                      <div className="flex items-center gap-2">
                        <input type="number" value={step.delaiJours} onChange={e => updateStep(step.id, { delaiJours: Number(e.target.value) })} min={0} className={clsx(INPUT_CLASS, 'w-20')} />
                        <span className="text-xs text-slate-400">jours d'attente</span>
                      </div>
                    )}

                    {step.action === 'condition' && (
                      <select value={step.condition || ''} onChange={e => updateStep(step.id, { condition: e.target.value })} className={INPUT_CLASS}>
                        <option value="">Choisir une condition...</option>
                        <option value="email_ouvert">Email ouvert</option>
                        <option value="email_clique">Email cliqué</option>
                        <option value="pas_de_reponse">Pas de réponse</option>
                        <option value="reponse_recue">Réponse reçue</option>
                      </select>
                    )}

                    {step.action === 'tache' && (
                      <div className="flex items-center gap-2">
                        <input value={step.tacheDescription || ''} onChange={e => updateStep(step.id, { tacheDescription: e.target.value })} placeholder="Description de la tâche" className={clsx(INPUT_CLASS, 'flex-1')} />
                        <input type="number" value={step.delaiJours} onChange={e => updateStep(step.id, { delaiJours: Number(e.target.value) })} min={0} className={clsx(INPUT_CLASS, 'w-20')} />
                        <span className="text-xs text-slate-400 whitespace-nowrap">j. délai</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex gap-3 pt-2">
          <button onClick={() => { resetForm(); setView('list'); }} className="flex-1 py-2.5 rounded-xl border border-card-border text-slate-400 text-sm hover:bg-card-hover">Annuler</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-accent-cyan to-primary-500 text-white text-sm font-semibold hover:opacity-90">
            {editId ? 'Mettre à jour' : 'Créer la séquence'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailSequences;

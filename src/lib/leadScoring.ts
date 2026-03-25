/**
 * Lead Scoring Engine — adapte du blueprint Obsidian CRM
 *
 * Score = Fit (0-50) + Engagement (0-50) = Total (0-100)
 * Temperature: froid (<30) | tiede (30-59) | chaud (60-79) | brulant (>=80)
 */

import type { Client } from '../types';

// ─── Scoring Rules ──────────────────────────────────────────────────────────

const FIT_RULES = {
  roleDecision: {
    'décideur': 20,
    'influenceur': 12,
    'utilisateur': 5,
    'bloqueur': 0,
  },
  typePresence: {
    'web': 10,
    'hybride': 12,
    'local': 8,
  },
  chiffreAffaires: [
    { min: 100000, points: 15 },
    { min: 50000, points: 10 },
    { min: 10000, points: 5 },
    { min: 0, points: 2 },
  ],
  icpMatch: { true: 15, false: 0 },
};

const ENGAGEMENT_RULES = {
  emailOuvert: 2,
  emailRepondu: 10,
  reunionEffectuee: 15,
  appelEffectue: 8,
  projetActif: 20,
};

const DECAY_RULES = {
  pasInteraction7j: -5,
  pasInteraction14j: -10,
  pasInteraction30j: -20,
};

const TEMPERATURE_THRESHOLDS = {
  'brûlant': 80,
  'chaud': 60,
  'tiède': 30,
  'froid': 0,
};

// ─── Scoring Functions ──────────────────────────────────────────────────────

export function calculateFitScore(client: Client): number {
  let score = 0;

  // Role decision
  if (client.roleDecision && FIT_RULES.roleDecision[client.roleDecision] !== undefined) {
    score += FIT_RULES.roleDecision[client.roleDecision];
  }

  // Type de presence
  if (client.typePresence && FIT_RULES.typePresence[client.typePresence] !== undefined) {
    score += FIT_RULES.typePresence[client.typePresence];
  }

  // Chiffre d'affaires
  const ca = client.chiffreAffaires || 0;
  for (const tier of FIT_RULES.chiffreAffaires) {
    if (ca >= tier.min) { score += tier.points; break; }
  }

  // ICP Match
  if (client.icpMatch !== undefined) {
    score += FIT_RULES.icpMatch[client.icpMatch.toString() as 'true' | 'false'] || 0;
  }

  return Math.min(score, 50);
}

export function calculateEngagementScore(client: Client, hasActiveProject: boolean): number {
  let score = 0;

  score += (client.emailsOuverts || 0) * ENGAGEMENT_RULES.emailOuvert;
  score += (client.reunions || 0) * ENGAGEMENT_RULES.reunionEffectuee;
  score += (client.appels || 0) * ENGAGEMENT_RULES.appelEffectue;
  if (hasActiveProject) score += ENGAGEMENT_RULES.projetActif;

  // Decay based on last contact
  if (client.dernierContact) {
    const daysSince = Math.floor((Date.now() - new Date(client.dernierContact).getTime()) / 86400000);
    if (daysSince >= 30) score += DECAY_RULES.pasInteraction30j;
    else if (daysSince >= 14) score += DECAY_RULES.pasInteraction14j;
    else if (daysSince >= 7) score += DECAY_RULES.pasInteraction7j;
  }

  return Math.max(0, Math.min(score, 50));
}

export function getTemperature(score: number): 'froid' | 'tiède' | 'chaud' | 'brûlant' {
  if (score >= TEMPERATURE_THRESHOLDS['brûlant']) return 'brûlant';
  if (score >= TEMPERATURE_THRESHOLDS['chaud']) return 'chaud';
  if (score >= TEMPERATURE_THRESHOLDS['tiède']) return 'tiède';
  return 'froid';
}

export function scoreClient(client: Client, hasActiveProject: boolean): {
  scoreFit: number;
  scoreEngagement: number;
  scoreTotal: number;
  temperature: 'froid' | 'tiède' | 'chaud' | 'brûlant';
} {
  const scoreFit = calculateFitScore(client);
  const scoreEngagement = calculateEngagementScore(client, hasActiveProject);
  const scoreTotal = scoreFit + scoreEngagement;
  const temperature = getTemperature(scoreTotal);
  return { scoreFit, scoreEngagement, scoreTotal, temperature };
}

export const TEMPERATURE_CONFIG = {
  'brûlant': { label: 'Brûlant', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '🔥', dot: 'bg-red-500' },
  'chaud': { label: 'Chaud', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: '🟠', dot: 'bg-orange-500' },
  'tiède': { label: 'Tiède', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: '🟡', dot: 'bg-amber-500' },
  'froid': { label: 'Froid', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '🔵', dot: 'bg-blue-500' },
};

import { z } from 'zod';

export const clientSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  entreprise: z.string().min(1, 'Le nom de l\'entreprise est requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().optional().or(z.literal('')),
  adresse: z.string().optional().or(z.literal('')),
  statut: z.enum(['prospect', 'actif', 'inactif', 'vip']),
  source: z.enum(['référence', 'réseaux sociaux', 'cold outreach', 'partenariat', 'autre']),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().or(z.literal('')),
  chiffreAffaires: z.number().min(0).default(0),
});

export const freelancerSchema = z.object({
  nom: z.string().min(2, 'Nom requis'),
  prenom: z.string().min(2, 'Prénom requis'),
  entreprise: z.string().min(1, 'Entreprise requise'),
  email: z.string().email('Email invalide'),
  telephone: z.string().optional().or(z.literal('')),
  adresse: z.string().optional().or(z.literal('')),
  siret: z.string().optional().or(z.literal('')),
  numeroTVA: z.string().optional().or(z.literal('')),
  specialite: z.string().min(1, 'Spécialité requise'),
  tjm: z.number().min(0, 'TJM invalide'),
  statut: z.enum(['actif', 'inactif', 'en mission']),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().or(z.literal('')),
  totalFacture: z.number().min(0).default(0),
});

export const projectSchema = z.object({
  nom: z.string().min(2, 'Nom requis'),
  description: z.string().optional().or(z.literal('')),
  clientId: z.string().min(1, 'Client requis'),
  clientNom: z.string().min(1),
  statut: z.enum(['planification', 'en cours', 'en révision', 'terminé', 'en pause', 'annulé', 'archivé']),
  priorite: z.enum(['faible', 'normale', 'haute', 'urgente']),
  dateDebut: z.string().min(1, 'Date de début requise'),
  dateFin: z.string().min(1, 'Date de fin requise'),
  budget: z.number().min(0).default(0),
  depenses: z.number().min(0).default(0),
  progression: z.number().min(0).max(100).default(0),
});

export type ClientFormData = z.infer<typeof clientSchema>;
export type FreelancerFormData = z.infer<typeof freelancerSchema>;
export type ProjectFormData = z.infer<typeof projectSchema>;

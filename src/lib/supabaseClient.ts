/**
 * Client Supabase — utilise les clés configurées dans Settings
 * Pour activer : installez @supabase/supabase-js et renseignez
 * l'URL + clé dans Paramètres → Intégrations → Supabase
 *
 * npm install @supabase/supabase-js
 */

// import { createClient } from '@supabase/supabase-js'
// import type { SupabaseClient } from '@supabase/supabase-js'

export type SupabaseConfig = {
  url: string
  anonKey: string
}

/**
 * Crée un client Supabase à la volée avec la config du store.
 * Décommentez les imports ci-dessus et installez @supabase/supabase-js pour activer.
 */
export function createSupabaseClient(_config: SupabaseConfig): null {
  // return createClient(config.url, config.anonKey)
  console.warn('[Supabase] SDK non installé. Exécutez: npm install @supabase/supabase-js')
  return null
}

/**
 * Tables à créer dans Supabase :
 *
 * clients (id, nom, entreprise, email, telephone, adresse, statut, source, tags, notes, dateCreation, derniereActivite, chiffreAffaires)
 * freelancers (id, nom, prenom, entreprise, email, telephone, adresse, siret, numeroTVA, specialite, tjm, statut, tags, notes, dateCreation, totalFacture)
 * projects (id, nom, description, clientId, clientNom, statut, priorite, dateDebut, dateFin, budget, depenses, progression, equipe, tags, categorie)
 * tasks (id, projectId, titre, description, statut, priorite, assigneA, dateEcheance, heuresEstimees, heuresReelles, tags)
 * invoices (id, numero, clientId, clientNom, projectId, projectNom, statut, dateEmission, dateEcheance, datePaiement, sousTotal, tva, total, notes)
 * invoice_items (id, invoiceId, description, quantite, prixUnitaire, total)
 * snooze_subscriptions (id, utilisateur, email, plan, cycle, statut, dateDebut, dateRenouvellement, montantMensuel, snoozesUtilises, snoozesDisponibles, revenueCatId, plateforme, notes)
 * snooze_penalites (id, subscriptionId, date, montantPenalite, commission, statut, description)
 * timer_sessions (id, projectId, projectNom, taskId, taskTitre, dureeMinutes, date)
 * activities (id, type, titre, description, date, entityId, entityNom)
 *
 * Activer RLS (Row Level Security) sur toutes les tables.
 * Politique recommandée : auth.uid() = owner_id (après ajout colonne owner_id)
 */

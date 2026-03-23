/**
 * Utilitaire d'export CSV générique
 */

type CSVRow = Record<string, string | number | boolean | null | undefined>;

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(data: CSVRow[], filename: string, headers?: Record<string, string>): void {
  if (data.length === 0) return;

  const keys = Object.keys(data[0]);
  const headerRow = keys.map(k => escapeCsvCell(headers?.[k] ?? k)).join(',');
  const rows = data.map(row => keys.map(k => escapeCsvCell(row[k])).join(','));

  const csvContent = [headerRow, ...rows].join('\n');
  const BOM = '\uFEFF'; // Pour Excel français
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helpers spécialisés
export function exportClientsCSV(clients: any[]): void {
  const data = clients.map(c => ({
    nom: c.nom,
    entreprise: c.entreprise,
    email: c.email,
    telephone: c.telephone,
    statut: c.statut,
    source: c.source,
    chiffreAffaires: c.chiffreAffaires,
    dateCreation: c.dateCreation,
    derniereActivite: c.derniereActivite,
    tags: c.tags?.join('; ') ?? '',
    notes: c.notes,
  }));

  const headers: Record<string, string> = {
    nom: 'Nom',
    entreprise: 'Entreprise',
    email: 'Email',
    telephone: 'Téléphone',
    statut: 'Statut',
    source: 'Source',
    chiffreAffaires: 'CA (€)',
    dateCreation: 'Date création',
    derniereActivite: 'Dernière activité',
    tags: 'Tags',
    notes: 'Notes',
  };

  exportToCSV(data, 'clients_obsidian', headers);
}

export function exportFreelancersCSV(freelancers: any[]): void {
  const data = freelancers.map(f => ({
    prenom: f.prenom,
    nom: f.nom,
    entreprise: f.entreprise,
    email: f.email,
    telephone: f.telephone,
    specialite: f.specialite,
    tjm: f.tjm,
    statut: f.statut,
    totalFacture: f.totalFacture,
    siret: f.siret,
    tags: f.tags?.join('; ') ?? '',
  }));

  const headers: Record<string, string> = {
    prenom: 'Prénom',
    nom: 'Nom',
    entreprise: 'Entreprise',
    email: 'Email',
    telephone: 'Téléphone',
    specialite: 'Spécialité',
    tjm: 'TJM (€/j)',
    statut: 'Statut',
    totalFacture: 'Total Facturé (€)',
    siret: 'SIRET',
    tags: 'Tags',
  };

  exportToCSV(data, 'prestataires_obsidian', headers);
}

export function exportProjectsCSV(projects: any[]): void {
  const data = projects.map(p => ({
    nom: p.nom,
    clientNom: p.clientNom,
    statut: p.statut,
    priorite: p.priorite,
    progression: p.progression + '%',
    budget: p.budget,
    depenses: p.depenses,
    dateDebut: p.dateDebut,
    dateFin: p.dateFin,
    categorie: p.categorie,
    taches: p.taches?.length ?? 0,
  }));

  exportToCSV(data, 'projets_obsidian', {
    nom: 'Nom projet',
    clientNom: 'Client',
    statut: 'Statut',
    priorite: 'Priorité',
    progression: 'Avancement',
    budget: 'Budget (€)',
    depenses: 'Dépenses (€)',
    dateDebut: 'Date début',
    dateFin: 'Date fin',
    categorie: 'Catégorie',
    taches: 'Nb tâches',
  });
}

export function exportInvoicesCSV(invoices: any[]): void {
  const data = invoices.map(i => ({
    numero: i.numero,
    clientNom: i.clientNom,
    statut: i.statut,
    dateEmission: i.dateEmission,
    dateEcheance: i.dateEcheance,
    datePaiement: i.datePaiement ?? '',
    sousTotal: i.sousTotal,
    tva: i.tva,
    total: i.total,
    notes: i.notes,
  }));

  exportToCSV(data, 'factures_obsidian', {
    numero: 'Numéro',
    clientNom: 'Client',
    statut: 'Statut',
    dateEmission: 'Date émission',
    dateEcheance: 'Échéance',
    datePaiement: 'Date paiement',
    sousTotal: 'HT (€)',
    tva: 'TVA (€)',
    total: 'TTC (€)',
    notes: 'Notes',
  });
}

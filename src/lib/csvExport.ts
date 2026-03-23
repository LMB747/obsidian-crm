/**
 * CSV Export Utilities
 */

function escapeCsv(val: any): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const lines = [headers.map(escapeCsv).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(','));
  }
  return lines.join('\n');
}

export function downloadCsv(content: string, filename: string) {
  const bom = '\uFEFF'; // UTF-8 BOM for Excel
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportClientsCsv(clients: import('../types').Client[]) {
  const headers = ['Nom', 'Entreprise', 'Email', 'Téléphone', 'Statut', 'Source', 'CA (€)', 'Adresse', 'Tags', 'Date création', 'Dernière activité'];
  const rows = clients.map(c => [
    c.nom, c.entreprise, c.email, c.telephone, c.statut, c.source,
    c.chiffreAffaires, c.adresse, c.tags.join('; '), c.dateCreation, c.derniereActivite,
  ]);
  const csv = toCsv(headers, rows);
  downloadCsv(csv, `clients-obsidian-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportInvoicesCsv(invoices: import('../types').Invoice[]) {
  const headers = ['Numéro', 'Client', 'Statut', 'Date émission', 'Date échéance', 'Sous-total HT', 'TVA', 'Total TTC', 'Date paiement', 'Notes'];
  const rows = invoices.map(i => [
    i.numero, i.clientNom, i.statut, i.dateEmission, i.dateEcheance,
    i.sousTotal, i.tva, i.total, i.datePaiement ?? '', i.notes,
  ]);
  const csv = toCsv(headers, rows);
  downloadCsv(csv, `factures-obsidian-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportTimerSessionsCsv(sessions: import('../types').TimerSession[]) {
  const headers = ['Date', 'Projet', 'Tâche', 'Durée (min)', 'Durée (h)'];
  const rows = sessions.map(s => [
    s.date, s.projectNom, s.taskTitre, s.dureeMinutes,
    (s.dureeMinutes / 60).toFixed(2),
  ]);
  const csv = toCsv(headers, rows);
  downloadCsv(csv, `sessions-travail-${new Date().toISOString().split('T')[0]}.csv`);
}

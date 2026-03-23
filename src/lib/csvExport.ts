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

// ─── CSV Import ──────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        current += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // Remove BOM if present
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((h, i) => { record[h] = values[i] || ''; });
    return record;
  });

  return { headers, rows };
}

// Map CSV columns to Client fields (flexible matching)
const COLUMN_MAP: Record<string, string> = {
  'nom': 'nom', 'name': 'nom', 'nom complet': 'nom', 'client': 'nom',
  'entreprise': 'entreprise', 'company': 'entreprise', 'societe': 'entreprise', 'société': 'entreprise',
  'email': 'email', 'e-mail': 'email', 'mail': 'email',
  'telephone': 'telephone', 'téléphone': 'telephone', 'tel': 'telephone', 'phone': 'telephone',
  'adresse': 'adresse', 'address': 'adresse',
  'statut': 'statut', 'status': 'statut',
  'source': 'source',
  'ca': 'chiffreAffaires', 'ca (€)': 'chiffreAffaires', 'chiffre affaires': 'chiffreAffaires', 'revenue': 'chiffreAffaires',
  'notes': 'notes', 'note': 'notes',
  'tags': 'tags',
};

export function mapCsvToClients(rows: Record<string, string>[]): Omit<import('../types').Client, 'id' | 'dateCreation' | 'derniereActivite'>[] {
  if (rows.length === 0) return [];

  // Build column mapping from headers
  const headers = Object.keys(rows[0]);
  const mapping: Record<string, string> = {};
  for (const h of headers) {
    const key = h.toLowerCase().trim();
    if (COLUMN_MAP[key]) {
      mapping[h] = COLUMN_MAP[key];
    }
  }

  return rows
    .filter(row => {
      const nom = mapping['nom'] ? row[Object.keys(row).find(k => mapping[k] === 'nom') || ''] : '';
      return nom || Object.values(row).some(v => v.trim());
    })
    .map(row => {
      const get = (field: string): string => {
        const header = Object.keys(mapping).find(k => mapping[k] === field);
        return header ? (row[header] || '') : '';
      };

      const statut = get('statut').toLowerCase();
      const validStatuts = ['vip', 'actif', 'prospect', 'inactif'];
      const source = get('source').toLowerCase();
      const validSources = ['référence', 'réseaux sociaux', 'cold outreach', 'partenariat', 'autre'];

      return {
        nom: get('nom') || 'Sans nom',
        entreprise: get('entreprise'),
        email: get('email'),
        telephone: get('telephone'),
        adresse: get('adresse'),
        statut: (validStatuts.includes(statut) ? statut : 'prospect') as import('../types').ClientStatus,
        source: (validSources.includes(source) ? source : 'autre') as any,
        tags: get('tags') ? get('tags').split(/[;,]/).map(t => t.trim()).filter(Boolean) : [],
        notes: get('notes'),
        chiffreAffaires: parseFloat(get('chiffreAffaires').replace(/[^\d.-]/g, '')) || 0,
      };
    });
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

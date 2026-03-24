/**
 * Export FEC — Fichier d'Ecritures Comptables
 * Format reglementaire francais (Article A.47 A-1 du LPF)
 *
 * Colonnes obligatoires:
 * JournalCode | JournalLib | EcritureNum | EcritureDate | CompteNum | CompteLib |
 * CompAuxNum | CompAuxLib | PieceRef | PieceDate | EcritureLib | Debit | Credit |
 * EcritureLet | DateLet | ValidDate | Montantdevise | Idevise
 */

interface FECInvoice {
  id: string;
  numero: string;
  clientId: string;
  clientNom: string;
  statut: string;
  dateEmission: string;
  total: number;
  sousTotal: number;
  tva: number;
}

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${String(d.getFullYear())}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const formatMontant = (n: number): string => {
  return n.toFixed(2).replace('.', ',');
};

export function generateFEC(invoices: FECInvoice[], exercice: { debut: string; fin: string }): string {
  const HEADER = 'JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise';

  const lines: string[] = [HEADER];
  let ecritureNum = 1;

  // Filter invoices within the exercise period
  const filtered = invoices.filter(inv => {
    const d = new Date(inv.dateEmission);
    return d >= new Date(exercice.debut) && d <= new Date(exercice.fin);
  });

  filtered.forEach(inv => {
    const dateStr = formatDate(inv.dateEmission);
    const num = String(ecritureNum).padStart(6, '0');

    // Ligne 1: Debit client (411 - Clients)
    lines.push([
      'VE',                           // JournalCode (Ventes)
      'Journal des ventes',           // JournalLib
      num,                            // EcritureNum
      dateStr,                        // EcritureDate
      '411000',                       // CompteNum (Clients)
      'Clients',                      // CompteLib
      inv.clientId.slice(0, 17),      // CompAuxNum
      inv.clientNom,                  // CompAuxLib
      inv.numero,                     // PieceRef
      dateStr,                        // PieceDate
      `Facture ${inv.numero} - ${inv.clientNom}`, // EcritureLib
      formatMontant(inv.total),       // Debit
      formatMontant(0),               // Credit
      '',                             // EcritureLet
      '',                             // DateLet
      dateStr,                        // ValidDate
      formatMontant(inv.total),       // Montantdevise
      'EUR',                          // Idevise
    ].join('|'));

    // Ligne 2: Credit produit (706 - Prestations de services)
    lines.push([
      'VE', 'Journal des ventes', num, dateStr,
      '706000', 'Prestations de services',
      '', '',
      inv.numero, dateStr,
      `Facture ${inv.numero} - ${inv.clientNom}`,
      formatMontant(0), formatMontant(inv.sousTotal),
      '', '', dateStr,
      formatMontant(inv.sousTotal), 'EUR',
    ].join('|'));

    // Ligne 3: Credit TVA (44571 - TVA collectee)
    if (inv.tva > 0) {
      lines.push([
        'VE', 'Journal des ventes', num, dateStr,
        '445710', 'TVA collectee 20%',
        '', '',
        inv.numero, dateStr,
        `TVA Facture ${inv.numero}`,
        formatMontant(0), formatMontant(inv.tva),
        '', '', dateStr,
        formatMontant(inv.tva), 'EUR',
      ].join('|'));
    }

    // Ligne 4: Si facture payee, ecriture d'encaissement
    if (inv.statut === 'payée') {
      ecritureNum++;
      const num2 = String(ecritureNum).padStart(6, '0');
      // Debit banque
      lines.push([
        'BQ', 'Journal de banque', num2, dateStr,
        '512000', 'Banque',
        '', '',
        inv.numero, dateStr,
        `Encaissement ${inv.numero}`,
        formatMontant(inv.total), formatMontant(0),
        '', '', dateStr,
        formatMontant(inv.total), 'EUR',
      ].join('|'));
      // Credit client
      lines.push([
        'BQ', 'Journal de banque', num2, dateStr,
        '411000', 'Clients',
        inv.clientId.slice(0, 17), inv.clientNom,
        inv.numero, dateStr,
        `Encaissement ${inv.numero}`,
        formatMontant(0), formatMontant(inv.total),
        '', '', dateStr,
        formatMontant(inv.total), 'EUR',
      ].join('|'));
    }

    ecritureNum++;
  });

  return lines.join('\n');
}

export function downloadFEC(invoices: FECInvoice[], exercice: { debut: string; fin: string }, siret: string) {
  const content = generateFEC(invoices, exercice);
  const filename = `FEC_${siret}_${formatDate(exercice.fin)}.txt`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

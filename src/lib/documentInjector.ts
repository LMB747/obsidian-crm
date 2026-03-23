/**
 * Document Injector — injecte les données CRM dans les templates HTML Obsidian
 * SANS modifier les fichiers originaux.
 * Stratégie : manipulation du contentDocument de l'iframe après chargement.
 */

export interface ProviderData {
  nom: string;
  prenom: string;
  entreprise: string;
  siret: string;
  numeroTVA: string;
  adresse: string;
  email: string;
  telephone: string;
}

export interface FactureData {
  numero: string;
  date: string;
  echeance: string;
  clientNom: string;
  clientSiret: string;
  clientAdresse: string;
  clientEmail: string;
  items: Array<{ description: string; quantite: number; prixUnitaire: number; total: number }>;
  montantHT: number;
  tva: number;
  montantTTC: number;
  acompte?: number;
  notes?: string;
  provider?: ProviderData;
}

export interface DevisData {
  numero: string;
  date: string;
  clientNom: string;
  clientSiret: string;
  clientAdresse: string;
  clientEmail: string;
  clientTel: string;
  items: Array<{ description: string; tarif: string; offert?: boolean }>;
  montantHT: number;
  tva: number;
  montantTTC: number;
  acompte?: number;
  validite?: string;
  notes?: string;
  provider?: ProviderData;
}

export interface ContratData {
  numero: string;
  date: string;
  clientNom: string;
  clientAdresse: string;
  clientRepresentant: string;
  projetNom: string;
  projetObjet: string;
  dateDebut: string;
  dateFin: string;
  provider?: ProviderData;
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

/**
 * Injecte les données du prestataire dans le premier bloc freelance du document.
 *
 * Structure réelle des templates :
 *  • Facture / Devis : #freelancesGrid > .party-block > .party-field > span[contenteditable]
 *      ordre : [0] Nom  [1] SIRET  [2] Adresse  [3] Email
 *      + .party-title  → renommé avec le nom de la structure
 *  • Contrat : #liste-prestataires > .prest-item:first-child
 *      > strong[contenteditable]  → titre (ex "1. Media Buyer")
 *      > .field                  → [0] Nom  [1] SIRET  [2] Adresse
 */
function injectProvider(doc: Document, provider: ProviderData | undefined) {
  if (!provider) return;

  const fullName    = `${provider.prenom} ${provider.nom}`.trim();
  const displayName = provider.entreprise || fullName;

  // ── Facture & Devis : #freelancesGrid ─────────────────────────────────────
  const grid = doc.getElementById('freelancesGrid');
  if (grid) {
    // On remplit TOUS les blocs existants avec les données du prestataire sélectionné.
    // Si plusieurs blocs, seul le premier reçoit les vraies données ;
    // les autres sont vidés/réinitialisés pour ne pas prêter à confusion.
    const blocks = Array.from(grid.querySelectorAll('.party-block'));
    blocks.forEach((block, idx) => {
      const titleEl = block.querySelector('.party-title');
      const spans   = Array.from(block.querySelectorAll('.party-field span[contenteditable]'));

      if (idx === 0) {
        // Premier bloc ← données du prestataire
        if (titleEl) setContent(titleEl, displayName);
        if (spans[0]) setContent(spans[0], fullName || displayName);
        if (spans[1]) setContent(spans[1], provider.siret || '—');
        if (spans[2]) setContent(spans[2], provider.adresse || '—');
        if (spans[3]) setContent(spans[3], provider.email || '—');
      }
      // Les blocs suivants restent tels quels (éditables manuellement)
    });
    return;
  }

  // ── Contrat : #liste-prestataires ─────────────────────────────────────────
  const listePrest = doc.getElementById('liste-prestataires');
  if (listePrest) {
    const firstItem = listePrest.querySelector('.prest-item');
    if (firstItem) {
      // Titre de l'item (ex "1. Media Buyer" → "1. Obsidian Agency")
      const titleEl = firstItem.querySelector('strong[contenteditable]') as HTMLElement | null;
      if (titleEl) titleEl.textContent = `1. ${displayName}`;

      // Champs .field : [0] Nom  [1] SIRET  [2] Adresse
      const fields = Array.from(firstItem.querySelectorAll('.field'));
      if (fields[0]) setContent(fields[0], fullName || displayName);
      if (fields[1]) setContent(fields[1], provider.siret || '—');
      if (fields[2]) setContent(fields[2], provider.adresse || '—');
    }
  }
}

/** Échappe le HTML pour éviter l'injection */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setContent(el: Element | null, value: string) {
  if (!el) return;
  el.textContent = value;
}

function setField(el: Element | null, value: string) {
  if (!el) return;
  el.textContent = value;
}

function formatDate(iso: string): string {
  if (!iso) return 'JJ/MM/AAAA';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('fr-FR');
  } catch { return iso; }
}

function formatEuro(n: number): string {
  if (isNaN(n)) return '0 €';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €';
}

/** Injecte dans tous les éléments ciblés par le sélecteur */
function injectAll(doc: Document, selector: string, value: string) {
  doc.querySelectorAll(selector).forEach(el => { el.textContent = value; });
}

// ─── FACTURE ─────────────────────────────────────────────────────────────────

export function injectFacture(doc: Document, data: FactureData) {

  // ── Méta-badges (N°, Date, Échéance) ──────────────────────────────────────
  doc.querySelectorAll('.meta-badge').forEach((badge) => {
    const text = badge.textContent || '';
    // Cibler le span contenteditable à l'intérieur, ou le badge lui-même
    const span = badge.querySelector('span[contenteditable]') ?? badge.querySelector('span') ?? badge;
    if (!span) return;
    if (text.includes('N°') || text.toLowerCase().includes('numéro') || text.toLowerCase().includes('numero')) {
      setContent(span, data.numero);
    } else if (text.toLowerCase().includes('héance') || text.toLowerCase().includes('echeance')) {
      setContent(span, formatDate(data.echeance));
    } else if (text.toLowerCase().includes('date')) {
      setContent(span, formatDate(data.date));
    }
  });

  // Fallback sélecteurs directs
  const numEl = doc.querySelector('[data-field="numero"], .invoice-number, #invoice-number');
  if (numEl) setContent(numEl, data.numero);

  // ── Bloc client (Facture) ─────────────────────────────────────────────────
  // Structure réelle : <div class="party-block client"> hors du #freelancesGrid
  const clientBlockF =
    doc.querySelector('.party-block.client') ??
    doc.querySelector('[data-party="client"]');

  if (clientBlockF) {
    const spans = Array.from(clientBlockF.querySelectorAll('span[contenteditable], .field'));
    // Ordre template: Nom[0], SIRET[1], Adresse[2], Email[3]
    if (spans[0]) setContent(spans[0], data.clientNom || '—');
    if (spans[1]) setContent(spans[1], data.clientSiret || '—');
    if (spans[2]) setContent(spans[2], data.clientAdresse || '—');
    if (spans[3]) setContent(spans[3], data.clientEmail || '—');
  }

  // ── Tableau des prestations ───────────────────────────────────────────────
  const table1 = doc.querySelector('#table1 tbody, .invoice-table tbody, table.prestations tbody') as HTMLTableSectionElement | null;
  if (table1 && data.items.length > 0) {
    table1.innerHTML = '';
    data.items.forEach((item) => {
      const tr = doc.createElement('tr');
      tr.innerHTML = [
        `<td contenteditable="true">${escapeHtml(item.description)}</td>`,
        `<td contenteditable="true">${item.quantite}</td>`,
        `<td contenteditable="true">${formatEuro(item.prixUnitaire)}</td>`,
        `<td contenteditable="true">${formatEuro(item.total)}</td>`,
        `<td><button class="del-row-btn" onclick="delRow(this)">✕</button></td>`,
      ].join('');
      table1.appendChild(tr);
    });
    try { (doc.defaultView as any)?.refreshLayout?.(); } catch { /* ignoré */ }
  }

  // ── Totaux ────────────────────────────────────────────────────────────────
  doc.querySelectorAll('.totals-block .total-row, .totals .row, .invoice-totals .row').forEach((row) => {
    const label = (row.querySelector('span:first-child, .label, td:first-child')?.textContent ?? '').toLowerCase();
    const valEl = row.querySelector('span[contenteditable], span:last-child, .value, td:last-child');
    const rowEl = row as HTMLElement;
    if (!valEl) return;
    if (label.includes('ht') && !label.includes('ttc')) {
      setContent(valEl, formatEuro(data.montantHT));
    } else if (label.includes('tva')) {
      setContent(valEl, formatEuro(data.tva));
    } else if (label.includes('ttc')) {
      setContent(valEl, formatEuro(data.montantTTC));
    } else if (label.includes('compte')) {
      // Effacer la ligne si acompte = 0, sinon afficher la valeur
      if (!data.acompte) {
        rowEl.style.display = 'none';
      } else {
        rowEl.style.display = '';
        setContent(valEl, formatEuro(data.acompte));
      }
    } else if (label.includes('reste') || label.includes('solde')) {
      if (!data.acompte) {
        rowEl.style.display = 'none';
      } else {
        rowEl.style.display = '';
        setContent(valEl, formatEuro(Math.round((data.montantTTC - data.acompte) * 100) / 100));
      }
    }
  });

  // ── Notes / Mentions ──────────────────────────────────────────────────────
  if (data.notes) {
    const notesEl = doc.querySelector('.notes, .mentions, [data-field="notes"], .remarques');
    if (notesEl) {
      const span = notesEl.querySelector('span[contenteditable], p') ?? notesEl;
      setContent(span, data.notes);
    }
  }

  // ── Prestataire (Provider) ─────────────────────────────────────────────────
  injectProvider(doc, data.provider);
}

// ─── DEVIS ────────────────────────────────────────────────────────────────────

export function injectDevis(doc: Document, data: DevisData) {

  // ── Méta-badges ───────────────────────────────────────────────────────────
  doc.querySelectorAll('.meta-badge').forEach((badge) => {
    const text = badge.textContent || '';
    const span = badge.querySelector('span[contenteditable]') ?? badge.querySelector('span') ?? badge;
    if (!span) return;
    if (text.includes('N°') || text.toLowerCase().includes('numéro')) {
      setContent(span, data.numero);
    } else if (text.toLowerCase().includes('validit')) {
      setContent(span, data.validite ? formatDate(data.validite) : '30 jours');
    } else if (text.toLowerCase().includes('date')) {
      setContent(span, formatDate(data.date));
    }
  });

  // ── Bloc client (Devis) ───────────────────────────────────────────────────
  // Structure réelle : <div class="client-block"> (devis.html)
  const clientBlockD =
    doc.querySelector('.client-block') ??
    doc.querySelector('.party-block.client') ??
    doc.querySelector('[data-party="client"]');

  if (clientBlockD) {
    const spans = Array.from(clientBlockD.querySelectorAll('span[contenteditable], .field'));
    // Ordre: Nom[0], SIRET[1], Adresse[2], Email[3], Tél[4]
    if (spans[0]) setContent(spans[0], data.clientNom || '—');
    if (spans[1]) setContent(spans[1], data.clientSiret || '—');
    if (spans[2]) setContent(spans[2], data.clientAdresse || '—');
    if (spans[3]) setContent(spans[3], data.clientEmail || '—');
    if (spans[4]) setContent(spans[4], data.clientTel || '—');
  }

  // ── Tableau prestations ───────────────────────────────────────────────────
  const table1 = doc.querySelector('#table1 tbody, .devis-table tbody, table.prestations tbody') as HTMLTableSectionElement | null;
  if (table1 && data.items.length > 0) {
    table1.innerHTML = '';
    data.items.forEach((item) => {
      const tr = doc.createElement('tr');
      const freeClass = item.offert ? ' class="service-free"' : '';
      const tarifDisplay = item.offert ? '<span style="color:#f59e0b;font-weight:600">Offert</span>' : escapeHtml(item.tarif);
      tr.innerHTML = [
        `<td contenteditable="true">${escapeHtml(item.description)}</td>`,
        `<td contenteditable="true"${freeClass}>${tarifDisplay}</td>`,
        `<td><button class="del-row-btn" onclick="delRow(this)">✕</button></td>`,
      ].join('');
      table1.appendChild(tr);
    });
    try { (doc.defaultView as any)?.refreshLayout?.(); } catch { /* ignoré */ }
  }

  // ── Totaux ────────────────────────────────────────────────────────────────
  doc.querySelectorAll('.totals-block .total-row, .totals .row, .devis-totals .row').forEach((row) => {
    const label = (row.querySelector('span:first-child, .label, td:first-child')?.textContent ?? '').toLowerCase();
    const valEl = row.querySelector('span[contenteditable], span:last-child, .value, td:last-child');
    const rowEl = row as HTMLElement;
    if (!valEl) return;
    if (label.includes('ht') && !label.includes('ttc')) {
      setContent(valEl, formatEuro(data.montantHT));
    } else if (label.includes('tva')) {
      setContent(valEl, formatEuro(data.tva));
    } else if (label.includes('ttc')) {
      setContent(valEl, formatEuro(data.montantTTC));
    } else if (label.includes('compte')) {
      if (!data.acompte) {
        rowEl.style.display = 'none';
      } else {
        rowEl.style.display = '';
        setContent(valEl, formatEuro(data.acompte));
      }
    } else if (label.includes('reste') || label.includes('solde')) {
      if (!data.acompte) {
        rowEl.style.display = 'none';
      } else {
        rowEl.style.display = '';
        setContent(valEl, formatEuro(Math.round((data.montantTTC - data.acompte) * 100) / 100));
      }
    }
  });

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (data.notes) {
    const notesEl = doc.querySelector('.notes, .mentions, [data-field="notes"], .remarques');
    if (notesEl) {
      const span = notesEl.querySelector('span[contenteditable], p') ?? notesEl;
      setContent(span, data.notes);
    }
  }

  // ── Prestataire (Provider) ─────────────────────────────────────────────────
  injectProvider(doc, data.provider);
}

// ─── CONTRAT ──────────────────────────────────────────────────────────────────

export function injectContrat(doc: Document, data: ContratData) {

  // ── Méta-badges ───────────────────────────────────────────────────────────
  doc.querySelectorAll('.meta-badge').forEach((badge) => {
    const text = badge.textContent || '';
    const span = badge.querySelector('span[contenteditable]') ?? badge.querySelector('span') ?? badge;
    if (!span) return;
    if (text.includes('N°') || text.toLowerCase().includes('numéro')) {
      setContent(span, data.numero);
    } else if (text.toLowerCase().includes('date')) {
      setContent(span, formatDate(data.date));
    }
  });

  // ── Partie Client — dans .party-list ─────────────────────────────────────
  const partySections = doc.querySelectorAll('.party-section');
  if (partySections.length > 0) {
    const clientSection = partySections[0]; // première section = Le Client
    const fields = clientSection.querySelectorAll('.field');
    if (fields[0]) setField(fields[0], data.clientNom);
    if (fields[1]) setField(fields[1], data.clientAdresse);
    if (fields[2]) setField(fields[2], data.clientRepresentant || data.clientNom);
  }

  // ── Préambule — nom du projet ─────────────────────────────────────────────
  const preambuleFields = doc.querySelectorAll('.preambule .field, .priority-list .field');
  if (preambuleFields[0]) setField(preambuleFields[0], data.projetNom);
  if (preambuleFields[1] && data.projetObjet) setField(preambuleFields[1], data.projetObjet);

  // ── Dates dans les articles ───────────────────────────────────────────────
  const allFields = doc.querySelectorAll('.art-body .field');
  allFields.forEach((field) => {
    const parentText = (field.closest('.art-body')?.textContent ?? '').toLowerCase();
    if (parentText.includes('prend effet') || parentText.includes('commence') || parentText.includes('début')) {
      if (!field.textContent?.includes('/')) {
        setField(field, formatDate(data.dateDebut));
      }
    }
    if (parentText.includes('termine') || parentText.includes('fin') || parentText.includes('expire')) {
      if (!field.textContent?.includes('/')) {
        setField(field, formatDate(data.dateFin));
      }
    }
  });

  // ── Objet du projet ───────────────────────────────────────────────────────
  if (data.projetObjet) {
    const objetEl = doc.querySelector('.projet-objet, [data-field="objet"], .contract-object');
    if (objetEl) setContent(objetEl, data.projetObjet);
  }

  // ── Prestataire (Provider) ─────────────────────────────────────────────────
  injectProvider(doc, data.provider);
}

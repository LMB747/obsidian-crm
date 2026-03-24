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
  iban?: string;
  bic?: string;
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
  acomptePaye?: boolean;       // true = "✓ Acompte versé", false = "⬦ Acompte à régler"
  resteAPayer?: number;
  echeanceJours?: number;      // 15, 30, 45, 60 jours
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

export interface ContratSignataire {
  titre: string;         // ex: "Le Client", "Le Prestataire"
  nom: string;
  role: string;          // ex: "Gérant", "Directeur Marketing"
}

export interface ContratPrestataireDetail {
  nom: string;
  role: string;
  siret: string;
  adresse: string;
  montantHT: number;
  tvaLabel: string;
  echeance: string;
  iban: string;
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
  signLieu?: string;
  signDate?: string;
  referentNom?: string;
  // SOW Annexe 1
  sowReferentClient?: string;
  sowReferentPrestataires?: string;
  signataires?: ContratSignataire[];
  prestataires?: ContratPrestataireDetail[];
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
/**
 * Injecte les coordonnées bancaires (IBAN / BIC) dans la section paiement du document.
 * Les templates facture/devis contiennent un placeholder « IBAN : FR76 XXXX … — BIC : XXXXXXXX »
 * dans un span[contenteditable] à l'intérieur de .payment-info / .payment-note.
 */
function injectBankDetails(doc: Document, provider: ProviderData | undefined) {
  if (!provider?.iban) return;

  const ibanFormatted = provider.iban.replace(/(.{4})/g, '$1 ').trim();
  const bicDisplay = provider.bic || '—';
  const bankText = `IBAN : ${ibanFormatted} — BIC : ${bicDisplay}`;

  // Facture: .payment-info span[contenteditable] containing "IBAN" or "Virement"
  // Devis: .payment-note span[contenteditable] containing "IBAN"
  const paymentEls = doc.querySelectorAll('.payment-info span[contenteditable], .payment-note span[contenteditable]');
  paymentEls.forEach((el) => {
    const text = el.textContent || '';
    if (text.includes('IBAN') || text.includes('Virement') || text.includes('virement')) {
      el.textContent = bankText;
    }
  });
}

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
    } else if (label.includes('compte') && label.includes('vers')) {
      // "✓ Acompte versé" row — show only if paid
      if (!data.acompte || !data.acomptePaye) {
        rowEl.style.display = 'none';
      } else {
        rowEl.style.display = '';
        setContent(valEl, formatEuro(data.acompte));
      }
    } else if (label.includes('compte') && !label.includes('vers')) {
      // "⬦ Acompte à régler" or generic acompte row
      if (!data.acompte) {
        rowEl.style.display = 'none';
      } else {
        rowEl.style.display = '';
        setContent(valEl, formatEuro(data.acompte));
        // Update label to reflect status
        const labelEl = row.querySelector('span:first-child, .label, td:first-child');
        if (labelEl && data.acomptePaye) {
          labelEl.textContent = '✓ Acompte versé';
        }
      }
    } else if (label.includes('reste') || label.includes('solde')) {
      const reste = data.resteAPayer ?? Math.round((data.montantTTC - (data.acompte || 0)) * 100) / 100;
      if (!data.acompte) {
        rowEl.style.display = 'none';
      } else {
        rowEl.style.display = '';
        setContent(valEl, formatEuro(reste));
      }
    }
  });

  // ── Échéance paiement ──────────────────────────────────────────────────────
  if (data.echeanceJours) {
    const paymentEls = doc.querySelectorAll('.payment-info span[contenteditable]');
    paymentEls.forEach((el) => {
      const text = el.textContent || '';
      if (text.includes('jours') || text.includes('réception') || text.includes('Échéance')) {
        el.textContent = `${data.echeanceJours} jours à réception`;
      }
    });
  }

  // ── Notes / Mentions ──────────────────────────────────────────────────────
  if (data.notes) {
    const notesEl = doc.querySelector('.notes, .mentions, [data-field="notes"], .remarques');
    if (notesEl) {
      const span = notesEl.querySelector('span[contenteditable], p') ?? notesEl;
      setContent(span, data.notes);
    }
  }

  // ── Coordonnées bancaires (IBAN / BIC) ───────────────────────────────────
  injectBankDetails(doc, data.provider);

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

  // ── Coordonnées bancaires (IBAN / BIC) ───────────────────────────────────
  injectBankDetails(doc, data.provider);

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

  // ── Lieu + Date de signature ────────────────────────────────────────────────
  const encarts = doc.querySelectorAll('.encart-box');
  encarts.forEach((encart) => {
    const label = encart.querySelector('.encart-lbl')?.textContent || '';
    const field = encart.querySelector('.field');
    if (!field) return;
    if (label.includes('Fait') && data.signLieu) {
      setContent(field, data.signLieu);
    }
    if (label.includes('Le')) {
      setContent(field, formatDate(data.signDate || data.date));
    }
  });

  // ── Signataires dans les blocs de signature ────────────────────────────────
  // Template uses .signature-box inside #sig-grid (created by makeSigBox in render())
  const sigGrid = doc.getElementById('sig-grid');
  if (sigGrid) {
    // Always clear template defaults, rebuild from CRM data
    sigGrid.innerHTML = '';
    if (data.signataires && data.signataires.length > 0) {
      data.signataires.forEach((sig) => {
        const box = doc.createElement('div');
        box.className = 'signature-box';
        const label2 = sig.titre.includes('Client') ? 'Fonction' : 'SIRET';
        box.innerHTML = `
          <button class="btn-del-sig" onclick="supprimerSig(this)" title="Supprimer">✕</button>
          <h4 contenteditable="true">${escapeHtml(sig.titre)}</h4>
          <p><strong>Nom :</strong> <span class="field" contenteditable="true">${escapeHtml(sig.nom)}</span></p>
          <p><strong>${label2} :</strong> <span class="field" contenteditable="true">${escapeHtml(sig.role)}</span></p>
          <p style="margin-top:6px"><strong>Signature :</strong></p>
          <div class="sig-area"></div>`;
        sigGrid.appendChild(box);
      });
    }
  }

  // ── Référent coordination ────────────────────────────────────────────────
  if (data.referentNom) {
    const artBodies = doc.querySelectorAll('.art-body');
    artBodies.forEach((body) => {
      const text = body.textContent || '';
      if (text.includes('référent') || text.includes('coordination')) {
        const fields = body.querySelectorAll('.field');
        fields.forEach((f) => {
          if (f.textContent?.includes('____')) {
            setContent(f, data.referentNom!);
          }
        });
      }
    });
  }

  // ── Prestataires dans #liste-prestataires ──────────────────────────────────
  const listePrest = doc.getElementById('liste-prestataires');
  if (listePrest) {
    if (data.prestataires && data.prestataires.length > 0) {
      // Clear existing items and rebuild from CRM data
      listePrest.innerHTML = '';
      data.prestataires.forEach((prest, idx) => {
        const item = doc.createElement('div');
        item.className = 'prest-item';
        if (idx > 0) item.style.marginTop = '4px';
        item.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><strong contenteditable="true" style="color:var(--gold);font-size:10px">${idx + 1}. ${escapeHtml(prest.role || prest.nom)}</strong><button onclick="supprimerPrest(this)" class="btn-del-prest" style="background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:12px;padding:0 4px">✕</button></div><ul class="party-list" style="margin-top:3px"><li contenteditable="true"><strong>Nom :</strong> <span class="field">${escapeHtml(prest.nom)}</span></li><li contenteditable="true"><strong>SIRET :</strong> <span class="field">${escapeHtml(prest.siret || '—')}</span></li><li contenteditable="true"><strong>Adresse :</strong> <span class="field">${escapeHtml(prest.adresse || '—')}</span></li></ul>`;
        listePrest.appendChild(item);
      });
    }
  }

  // ── Annexe 2 — Tableau de répartition des paiements ────────────────────────
  const ann2Tbody = doc.getElementById('ann2-tbody');
  if (ann2Tbody) {
    // Always clear template defaults, rebuild from CRM data
    ann2Tbody.innerHTML = '';
    if (data.prestataires && data.prestataires.length > 0) {
      data.prestataires.forEach((prest) => {
        const montantTTC = prest.montantHT;
        const tr = doc.createElement('tr');
        tr.innerHTML = [
          `<td contenteditable="true">${escapeHtml(prest.nom)}</td>`,
          `<td contenteditable="true">${escapeHtml(prest.role)}</td>`,
          `<td contenteditable="true">${formatEuro(prest.montantHT)}</td>`,
          `<td contenteditable="true">${escapeHtml(prest.tvaLabel)}</td>`,
          `<td contenteditable="true">${formatEuro(montantTTC)}</td>`,
          `<td contenteditable="true">${escapeHtml(prest.echeance)}</td>`,
          `<td contenteditable="true">${escapeHtml(prest.iban || '—')}</td>`,
          `<td style="width:26px;text-align:center;padding:2px"><button class="btn-del-row" onclick="this.closest('tr').remove()">✕</button></td>`,
        ].join('');
        ann2Tbody.appendChild(tr);
      });
    }
  }

  // ── SOW Annexe 1 — champs .field dans l'annexe-wrap ────────────────────────
  const annexeWraps = doc.querySelectorAll('.annexe-wrap');
  annexeWraps.forEach((wrap) => {
    const heading = wrap.querySelector('h2');
    const headingText = heading?.textContent || '';

    // Annexe 1 — SOW fields
    if (headingText.includes('ANNEXE 1') || headingText.includes('SOW') || headingText.includes('STATEMENT')) {
      const sowFields = wrap.querySelectorAll('.field');
      let sowIdx = 0;
      sowFields.forEach((f) => {
        if (!f.textContent?.includes('____')) return;
        switch (sowIdx) {
          case 0: if (data.projetNom) setContent(f, data.projetNom); break;
          case 1: if (data.clientNom) setContent(f, data.clientNom); break;
          case 2: if (data.sowReferentClient || data.clientRepresentant) setContent(f, data.sowReferentClient || data.clientRepresentant); break;
          case 3: if (data.sowReferentPrestataires || data.referentNom) setContent(f, data.sowReferentPrestataires || data.referentNom || ''); break;
        }
        sowIdx++;
      });
    }

    // Annexe 2 — Total contrat
    if (headingText.includes('ANNEXE 2') || headingText.includes('PAIEMENT')) {
      if (data.prestataires && data.prestataires.length > 0) {
        const totalContrat = data.prestataires.reduce((s, p) => s + p.montantHT, 0);
        const allPs = wrap.querySelectorAll('p');
        allPs.forEach((p) => {
          if (p.textContent?.includes('Total contrat')) {
            p.innerHTML = p.innerHTML.replace(/[\d\s]+,?\d*\s*€/, formatEuro(totalContrat));
          }
        });
      }
    }
  });

  // ── Prestataire (Provider) ─────────────────────────────────────────────────
  injectProvider(doc, data.provider);
}

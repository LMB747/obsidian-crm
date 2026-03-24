import { describe, it, expect } from 'vitest';
import { generateFEC } from '../fecExport';

describe('generateFEC', () => {
  const mockInvoices = [
    {
      id: '1',
      numero: 'FAC-0001',
      clientId: 'client-001',
      clientNom: 'Test Client',
      statut: 'en attente',
      dateEmission: '2026-03-15',
      total: 1200,
      sousTotal: 1000,
      tva: 200,
    },
  ];

  const exercice = { debut: '2026-01-01', fin: '2026-12-31' };

  it('generates valid FEC header', () => {
    const fec = generateFEC(mockInvoices, exercice);
    const lines = fec.split('\n');
    expect(lines[0]).toContain('JournalCode');
    expect(lines[0]).toContain('EcritureNum');
    expect(lines[0]).toContain('Montantdevise');
  });

  it('generates correct number of lines for unpaid invoice', () => {
    const fec = generateFEC(mockInvoices, exercice);
    const lines = fec.split('\n');
    // Header + 3 lines (debit client, credit produit, credit TVA)
    expect(lines.length).toBe(4);
  });

  it('generates more lines for paid invoice', () => {
    const paid = [{ ...mockInvoices[0], statut: 'payée' }];
    const fec = generateFEC(paid, exercice);
    const lines = fec.split('\n');
    // Header + 3 (vente) + 2 (encaissement) = 6
    expect(lines.length).toBe(6);
  });

  it('uses pipe delimiter', () => {
    const fec = generateFEC(mockInvoices, exercice);
    const lines = fec.split('\n');
    lines.forEach(line => {
      expect(line.split('|').length).toBeGreaterThanOrEqual(18);
    });
  });

  it('filters by exercise period', () => {
    const outOfRange = [{ ...mockInvoices[0], dateEmission: '2025-01-01' }];
    const fec = generateFEC(outOfRange, exercice);
    const lines = fec.split('\n');
    expect(lines.length).toBe(1); // header only
  });

  it('formats amounts with comma separator', () => {
    const fec = generateFEC(mockInvoices, exercice);
    expect(fec).toContain('1200,00');
    expect(fec).toContain('1000,00');
    expect(fec).toContain('200,00');
  });
});

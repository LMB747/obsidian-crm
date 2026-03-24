import { describe, it, expect } from 'vitest';
import { formatMontant, DEVISE_CONFIG, DEVISES } from '../currency';

describe('formatMontant', () => {
  it('formats EUR correctly', () => {
    const result = formatMontant(1234.56, 'EUR');
    expect(result).toContain('1');
    expect(result).toContain('234');
  });

  it('formats USD correctly', () => {
    const result = formatMontant(1000, 'USD');
    expect(result).toContain('1');
    expect(result).toContain('000');
  });

  it('formats XOF without decimals', () => {
    const result = formatMontant(5000, 'XOF');
    expect(result).toContain('5');
    expect(result).toContain('000');
  });

  it('defaults to EUR', () => {
    const result = formatMontant(100);
    expect(result).toContain('100');
  });
});

describe('DEVISE_CONFIG', () => {
  it('has all expected currencies', () => {
    expect(Object.keys(DEVISE_CONFIG)).toEqual(['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'MAD', 'XOF']);
  });

  it('each currency has symbol and label', () => {
    Object.values(DEVISE_CONFIG).forEach(config => {
      expect(config.symbol).toBeTruthy();
      expect(config.label).toBeTruthy();
      expect(config.locale).toBeTruthy();
    });
  });
});

describe('DEVISES', () => {
  it('returns array of currency objects', () => {
    expect(DEVISES.length).toBe(7);
    DEVISES.forEach(d => {
      expect(d.code).toBeTruthy();
      expect(d.symbol).toBeTruthy();
    });
  });
});

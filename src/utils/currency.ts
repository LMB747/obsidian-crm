export type Devise = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'CAD' | 'MAD' | 'XOF';

export const DEVISE_CONFIG: Record<Devise, { symbol: string; label: string; locale: string }> = {
  EUR: { symbol: '\u20ac', label: 'Euro', locale: 'fr-FR' },
  USD: { symbol: '$', label: 'Dollar US', locale: 'en-US' },
  GBP: { symbol: '\u00a3', label: 'Livre Sterling', locale: 'en-GB' },
  CHF: { symbol: 'CHF', label: 'Franc Suisse', locale: 'fr-CH' },
  CAD: { symbol: 'CA$', label: 'Dollar Canadien', locale: 'en-CA' },
  MAD: { symbol: 'DH', label: 'Dirham Marocain', locale: 'fr-MA' },
  XOF: { symbol: 'CFA', label: 'Franc CFA', locale: 'fr-FR' },
};

export function formatMontant(amount: number, devise: Devise = 'EUR'): string {
  const config = DEVISE_CONFIG[devise];
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: devise,
      minimumFractionDigits: devise === 'XOF' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('fr-FR')} ${config.symbol}`;
  }
}

export const DEVISES = Object.entries(DEVISE_CONFIG).map(([code, config]) => ({
  code: code as Devise,
  ...config,
}));

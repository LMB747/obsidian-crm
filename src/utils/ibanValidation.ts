/**
 * IBAN validation + formatting utilities (ISO 13616)
 */

/** Remove all whitespace from an IBAN string */
function sanitize(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase();
}

/** Validate IBAN using mod-97 check (ISO 13616) */
export function validateIBAN(raw: string): { valid: boolean; error?: string } {
  const iban = sanitize(raw);

  if (!iban) return { valid: true }; // empty = optional, not invalid

  // Basic format: 2 letters + 2 digits + 10-30 alphanumeric
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) {
    return { valid: false, error: 'Format IBAN invalide (ex: FR76 1234 5678 9012 3456 7890 123)' };
  }

  // Country-specific length check (common ones)
  const lengths: Record<string, number> = {
    FR: 27, DE: 22, ES: 24, IT: 27, BE: 16, NL: 18, LU: 20,
    CH: 21, GB: 22, PT: 25, AT: 20, IE: 22, MC: 27,
  };
  const country = iban.slice(0, 2);
  if (lengths[country] && iban.length !== lengths[country]) {
    return { valid: false, error: `Un IBAN ${country} doit contenir ${lengths[country]} caractères (${iban.length} trouvés)` };
  }

  // Mod-97 check: move first 4 chars to end, convert letters to digits, check mod 97
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));

  // Process in chunks to avoid BigInt (works in all environments)
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const chunk = String(remainder) + numeric.slice(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }

  if (remainder !== 1) {
    return { valid: false, error: 'IBAN invalide (clé de contrôle incorrecte)' };
  }

  return { valid: true };
}

/** Format IBAN with spaces every 4 characters for display */
export function formatIBAN(raw: string): string {
  const clean = sanitize(raw);
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

/** Validate BIC/SWIFT code */
export function validateBIC(raw: string): { valid: boolean; error?: string } {
  const bic = raw.replace(/\s+/g, '').toUpperCase();

  if (!bic) return { valid: true }; // empty = optional

  // BIC format: 4 letters (bank) + 2 letters (country) + 2 alphanum (location) + optional 3 alphanum (branch)
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) {
    return { valid: false, error: 'Format BIC invalide (ex: BNPAFRPP ou BNPAFRPPXXX)' };
  }

  return { valid: true };
}

/**
 * Crypto utilities — hachage de mots de passe
 * Utilise Web Crypto API (built-in navigateur, pas de dépendance externe).
 */

const LEGACY_SALT = 'obsidian-crm-2026-secure-salt';

/** @deprecated Utiliser hashPasswordWithSalt() pour les nouveaux comptes */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + LEGACY_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Hash avec sel aléatoire individuel — format retourné : `saltHex:hashHex` */
export async function hashPasswordWithSalt(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const encoder = new TextEncoder();
  const data = encoder.encode(password + saltHex);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${saltHex}:${hashHex}`;
}

/** Vérifie un mot de passe — supporte nouveau format (sel:hash) et legacy */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.includes(':')) {
    // Nouveau format avec sel individuel
    const [saltHex, expectedHash] = stored.split(':');
    const encoder = new TextEncoder();
    const data = encoder.encode(password + saltHex);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const computedHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return computedHash === expectedHash;
  }
  // Fallback legacy (ancien hash sans sel individuel)
  const legacyHash = await hashPassword(password);
  return legacyHash === stored;
}

export function generateRandomPassword(length = 12): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map(b => chars[b % chars.length])
    .join('');
}

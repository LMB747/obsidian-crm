const STORAGE_PREFIX = 'obsidian_crm_';

export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('[Storage] Échec écriture:', key, e);
    }
  },

  remove: (key: string): void => {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  clear: (): void => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX));
    keys.forEach((k) => localStorage.removeItem(k));
  },

  /** List all obsidian_crm_ keys */
  keys: (): string[] => {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .map((k) => k.slice(STORAGE_PREFIX.length));
  },
};

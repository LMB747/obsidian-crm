/**
 * Auth Service — gère l'authentification via API serverless
 * Les identifiants sont stockés côté serveur (Vercel env vars).
 * Le client garde juste un token de session dans localStorage.
 */

const SESSION_KEY = 'obsidian-session';

export interface SessionUser {
  email: string;
  role: string;
  nom: string;
  token: string;
}

/** Login via API serverless */
export async function loginAPI(email: string, password: string): Promise<{ success: boolean; user?: SessionUser; error?: string }> {
  try {
    // Try API endpoint first (production on Vercel)
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.success && data.user) {
      const session: SessionUser = {
        email: data.user.email,
        role: data.user.role,
        nom: data.user.nom,
        token: data.token,
      };
      saveSession(session);
      return { success: true, user: session };
    }

    return { success: false, error: data.error || 'Erreur de connexion.' };
  } catch {
    // Fallback for local dev (no API available) — use localStorage-based auth
    return { success: false, error: 'Serveur non disponible. Vérifiez votre connexion.' };
  }
}

/** Save session to localStorage */
export function saveSession(user: SessionUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

/** Get current session from localStorage */
export function getSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

/** Clear session (logout) */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/** Check if user is authenticated */
export function isAuthenticated(): boolean {
  return getSession() !== null;
}

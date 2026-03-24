import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/login
 * Body: { email: string, password: string }
 *
 * Verifies credentials against AUTH_USERS env var.
 * Format: AUTH_USERS = email1:password1,email2:password2,...
 *
 * Returns: { success: true, user: { email, role, nom } } or { success: false, error: string }
 */

// Simple hash for session token
async function hashToken(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input + (process.env.AUTH_SECRET || 'obsidian-crm-2026'));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email et mot de passe requis.' });
  }

  // Parse AUTH_USERS env var: "email1:password1:role1:nom1,email2:password2:role2:nom2"
  const authUsers = process.env.AUTH_USERS || '';
  if (!authUsers) {
    return res.status(500).json({ success: false, error: 'Aucun utilisateur configuré. Ajoutez AUTH_USERS dans les variables d\'environnement Vercel.' });
  }

  const users = authUsers.split(',').map(entry => {
    const [uEmail, uPassword, uRole, uNom] = entry.trim().split(':');
    return { email: uEmail?.trim(), password: uPassword?.trim(), role: uRole?.trim() || 'admin', nom: uNom?.trim() || 'Utilisateur' };
  });

  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());

  if (!user) {
    return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect.' });
  }

  if (user.password !== password) {
    return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect.' });
  }

  // Generate session token
  const token = await hashToken(`${user.email}-${Date.now()}-${Math.random()}`);

  return res.status(200).json({
    success: true,
    user: {
      email: user.email,
      role: user.role,
      nom: user.nom,
    },
    token,
  });
}

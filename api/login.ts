import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash, randomBytes } from 'crypto';

/**
 * POST /api/login
 * Body: { email: string, password: string }
 *
 * Verifies credentials against AUTH_USERS env var.
 * Format: AUTH_USERS = email1:password1:role1:nom1,email2:password2:role2:nom2
 */

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email et mot de passe requis.' });
    }

    const authUsers = process.env.AUTH_USERS || '';
    if (!authUsers) {
      return res.status(500).json({ success: false, error: 'Aucun utilisateur configuré côté serveur.' });
    }

    const users = authUsers.split(',').map(entry => {
      const parts = entry.trim().split(':');
      return {
        email: parts[0]?.trim() || '',
        password: parts[1]?.trim() || '',
        role: parts[2]?.trim() || 'admin',
        nom: parts[3]?.trim() || 'Utilisateur',
      };
    });

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect.' });
    }

    // Simple session token
    const token = createHash('sha256')
      .update(`${user.email}-${Date.now()}-${randomBytes(16).toString('hex')}`)
      .digest('hex');

    return res.status(200).json({
      success: true,
      user: { email: user.email, role: user.role, nom: user.nom },
      token,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Erreur serveur: ' + (err.message || 'inconnue') });
  }
}

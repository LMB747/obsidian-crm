import type { VercelRequest, VercelResponse } from '@vercel/node';

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
      return res.status(500).json({ success: false, error: 'AUTH_USERS non configuré.' });
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

    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return res.status(200).json({
      success: true,
      user: { email: user.email, role: user.role, nom: user.nom },
      token,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Erreur serveur' });
  }
}

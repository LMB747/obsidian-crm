import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  const email = req.body?.email || '';
  const password = req.body?.password || '';

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email et mot de passe requis.' });
  }

  const authUsers = process.env.AUTH_USERS || '';
  if (!authUsers) {
    return res.status(500).json({ success: false, error: 'AUTH_USERS non configure.' });
  }

  const parts = authUsers.split(',');
  for (const entry of parts) {
    const [uEmail, uPassword, uRole, uNom] = entry.trim().split(':');
    if (uEmail && uEmail.toLowerCase() === email.toLowerCase().trim() && uPassword === password) {
      return res.status(200).json({
        success: true,
        user: { email: uEmail, role: uRole || 'admin', nom: uNom || 'User' },
        token: Date.now().toString(36) + Math.random().toString(36).slice(2),
      });
    }
  }

  return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect.' });
}

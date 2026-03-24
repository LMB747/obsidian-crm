export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  const email = req.body?.email || '';
  const password = req.body?.password || '';

  if (!email || !password) return res.status(400).json({ success: false, error: 'Champs requis.' });

  const raw = process.env.AUTH_USERS || '';
  if (!raw) return res.status(500).json({ success: false, error: 'AUTH_USERS manquant.' });

  for (const entry of raw.split(',')) {
    const p = entry.trim().split(':');
    if (p[0]?.toLowerCase() === email.toLowerCase().trim() && p[1] === password) {
      return res.status(200).json({
        success: true,
        user: { email: p[0], role: p[2] || 'admin', nom: p[3] || 'User' },
        token: Date.now().toString(36),
      });
    }
  }

  return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect.' });
}

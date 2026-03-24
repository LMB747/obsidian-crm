var crypto = require('crypto');

module.exports = function handler(req, res) {
  // CORS: restrict to same origin in production
  var origin = req.headers.origin || '';
  var allowed = process.env.ALLOWED_ORIGIN || origin; // fallback: allow same origin
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  var email = (req.body && req.body.email) || '';
  var password = (req.body && req.body.password) || '';

  if (!email || !password) return res.status(400).json({ success: false, error: 'Champs requis.' });

  var raw = process.env.AUTH_USERS || '';
  if (!raw) return res.status(500).json({ success: false, error: 'AUTH_USERS manquant.' });

  var entries = raw.split(',');
  for (var i = 0; i < entries.length; i++) {
    var p = entries[i].trim().split(':');
    if (p[0] && p[0].toLowerCase() === email.toLowerCase().trim() && p[1] === password) {
      // Secure token: 32 bytes of cryptographic randomness
      var token = crypto.randomBytes(32).toString('hex');
      return res.status(200).json({
        success: true,
        user: { email: p[0], role: p[2] || 'admin', nom: p[3] || 'User' },
        token: token,
      });
    }
  }

  return res.status(401).json({ success: false, error: 'Identifiants incorrects.' });
};

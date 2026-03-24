const { createClient } = require('@supabase/supabase-js');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  var email = req.body?.email || '';
  var password = req.body?.password || '';
  var nom = req.body?.nom || '';
  var prenom = req.body?.prenom || '';
  var role = req.body?.role || 'viewer';

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email et mot de passe requis.' });
  }

  // Password minimum 6 chars for Supabase
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Le mot de passe doit faire au moins 6 caractères.' });
  }

  var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  var serviceKey = process.env.SUPABASE_SERVICE_KEY || '';

  if (!supabaseUrl || !serviceKey) {
    // Fallback: add to AUTH_USERS if no service key
    return res.status(500).json({
      success: false,
      error: 'SUPABASE_SERVICE_KEY non configuré. Ajoutez-le dans Vercel → Settings → Environment Variables.'
    });
  }

  var supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Create user via admin API (doesn't affect current session)
  supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: { nom: nom, prenom: prenom, role: role }
  }).then(function(result) {
    if (result.error) {
      var msg = result.error.message;
      if (msg.includes('already been registered')) msg = 'Cet email est déjà utilisé.';
      return res.status(400).json({ success: false, error: msg });
    }

    // Also insert/update profile
    var userId = result.data.user.id;
    supabase.from('profiles').upsert({
      id: userId,
      email: email,
      nom: nom,
      prenom: prenom,
      role: role,
      is_active: true,
    }).then(function() {
      return res.status(200).json({
        success: true,
        user: { id: userId, email: email, nom: nom, prenom: prenom, role: role }
      });
    });
  }).catch(function(err) {
    return res.status(500).json({ success: false, error: err.message || 'Erreur serveur' });
  });
};

const { createClient } = require('@supabase/supabase-js');

const VALID_ROLES = ['admin', 'freelancer', 'viewer'];

const DEFAULT_PERMISSIONS = {
  admin: ['dashboard','clients','freelancers','projects','worktracking','invoices','documents','snooze','calendar','analytics','media-buying','prospection','personal','settings','admin'],
  freelancer: ['dashboard','projects','worktracking','calendar','personal','settings'],
  viewer: ['dashboard','calendar','personal','settings'],
};

module.exports = async function handler(req, res) {
  // CORS: strict origin check
  var allowed = process.env.ALLOWED_ORIGIN;
  if (!allowed) {
    return res.status(500).json({ success: false, error: 'ALLOWED_ORIGIN non configuré.' });
  }
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  var email = (req.body?.email || '').trim();
  var password = req.body?.password || '';
  var nom = (req.body?.nom || '').trim();
  var prenom = (req.body?.prenom || '').trim();
  var role = (req.body?.role || 'viewer').trim();
  var customPermissions = req.body?.permissions || null;

  // Input validation
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email et mot de passe requis.' });
  }

  // Email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Format d\'email invalide.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Le mot de passe doit faire au moins 6 caractères.' });
  }

  // Role whitelist validation
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ success: false, error: 'Rôle invalide. Valeurs acceptées : admin, freelancer, viewer.' });
  }

  var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  var serviceKey = process.env.SUPABASE_SERVICE_KEY || '';

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({
      success: false,
      error: 'SUPABASE_SERVICE_KEY non configuré. Ajoutez-le dans Vercel → Settings → Environment Variables.'
    });
  }

  var supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Create user via admin API
    var result = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { nom: nom, prenom: prenom, role: role }
    });

    if (result.error) {
      var msg = result.error.message;
      if (msg.includes('already been registered')) msg = 'Cet email est déjà utilisé.';
      return res.status(400).json({ success: false, error: msg });
    }

    var userId = result.data.user.id;

    // Insert/update profile with custom or default permissions
    var permissions = (Array.isArray(customPermissions) && customPermissions.length > 0)
      ? customPermissions
      : (DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.viewer);
    var profileResult = await supabase.from('profiles').upsert({
      id: userId,
      email: email,
      nom: nom,
      prenom: prenom,
      role: role,
      is_active: true,
      permissions: permissions,
    });

    if (profileResult.error) {
      return res.status(500).json({ success: false, error: 'Compte créé mais erreur profil: ' + profileResult.error.message });
    }

    return res.status(200).json({
      success: true,
      user: { id: userId, email: email, nom: nom, prenom: prenom, role: role }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Erreur serveur' });
  }
};

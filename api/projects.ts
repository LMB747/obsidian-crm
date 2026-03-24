import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

const cors = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
};

const authenticate = async (req: VercelRequest): Promise<string | null> => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return error ? null : user?.id || null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = await authenticate(req);
  if (!userId) return res.status(401).json({ error: 'Non autorisé' });

  try {
    switch (req.method) {
      case 'GET': {
        const { data, error } = await supabase.from('projects').select('*');
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ data });
      }
      case 'POST': {
        const { data, error } = await supabase.from('projects').insert(req.body).select().single();
        if (error) return res.status(400).json({ error: error.message });
        return res.status(201).json({ data });
      }
      default:
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

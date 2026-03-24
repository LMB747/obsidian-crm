import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

const cors = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
        const { data } = await supabase.from('webhooks').select('*').eq('user_id', userId);
        return res.status(200).json({ data: data || [] });
      }
      case 'POST': {
        const { url, events } = req.body;
        if (!url || !events?.length) return res.status(400).json({ error: 'URL et events requis' });
        const secret = crypto.randomBytes(32).toString('hex');
        const { data, error } = await supabase.from('webhooks').insert({
          user_id: userId,
          url,
          events,
          secret,
          active: true,
        }).select().single();
        if (error) return res.status(400).json({ error: error.message });
        return res.status(201).json({ data: { ...data, secret } });
      }
      case 'DELETE': {
        const id = req.query.id as string;
        if (!id) return res.status(400).json({ error: 'ID requis' });
        await supabase.from('webhooks').delete().eq('id', id).eq('user_id', userId);
        return res.status(200).json({ success: true });
      }
      default:
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

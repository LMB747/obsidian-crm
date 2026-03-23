import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { action, apiKey, actor, input, runId } = req.body || {};

    if (!apiKey) return res.status(400).json({ error: 'apiKey requis' });

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let url = '';
    let method = 'GET';
    let body: string | undefined;

    if (action === 'start') {
      url = `https://api.apify.com/v2/acts/${actor}/runs`;
      method = 'POST';
      body = JSON.stringify(input || {});
    } else if (action === 'status') {
      url = `https://api.apify.com/v2/actor-runs/${runId}`;
    } else if (action === 'results') {
      url = `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?limit=100&clean=true`;
    } else {
      return res.status(400).json({ error: 'action invalide' });
    }

    const response = await fetch(url, { method, headers, body });
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (err: unknown) {
    return res.status(500).json({ error: String(err) });
  }
}

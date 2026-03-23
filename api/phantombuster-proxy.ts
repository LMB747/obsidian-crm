import type { VercelRequest, VercelResponse } from '@vercel/node';

const PB_BASE = 'https://api.phantombuster.com/api/v2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { action, apiKey, agentId, argument, containerId } = req.body || {};

    if (!apiKey) return res.status(400).json({ error: 'apiKey requis' });

    const headers: Record<string, string> = {
      'X-Phantombuster-Key-1': apiKey,
      'Content-Type': 'application/json',
    };

    let url = '';
    let method = 'GET';
    let body: string | undefined;

    if (action === 'list-agents') {
      url = `${PB_BASE}/agents/fetch-all`;
    } else if (action === 'launch') {
      url = `${PB_BASE}/agents/launch`;
      method = 'POST';
      const payload: Record<string, unknown> = { id: agentId };
      if (argument) payload.argument = argument;
      body = JSON.stringify(payload);
    } else if (action === 'status') {
      url = `${PB_BASE}/containers/fetch?id=${containerId}`;
    } else if (action === 'results') {
      url = `${PB_BASE}/containers/fetch-result-object?id=${containerId}`;
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

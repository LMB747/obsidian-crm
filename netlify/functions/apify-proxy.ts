import type { Handler } from '@netlify/functions';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { action, apiKey, actor, input, runId } = JSON.parse(event.body || '{}');

    if (!apiKey) {
      return { statusCode: 400, body: JSON.stringify({ error: 'apiKey requis' }) };
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let url = '';
    let method = 'GET';
    let body: string | undefined;

    if (action === 'start') {
      // Démarre un actor Apify
      url = `https://api.apify.com/v2/acts/${actor}/runs`;
      method = 'POST';
      body = JSON.stringify(input || {});
    } else if (action === 'status') {
      // Vérifie le statut d'un run
      url = `https://api.apify.com/v2/actor-runs/${runId}`;
    } else if (action === 'results') {
      // Récupère les résultats
      url = `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?limit=100&clean=true`;
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: 'action invalide' }) };
    }

    const res = await fetch(url, { method, headers, body });
    const data = await res.json();

    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err: unknown) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err) }),
    };
  }
};

export { handler };

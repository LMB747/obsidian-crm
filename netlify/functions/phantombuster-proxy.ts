import type { Handler } from '@netlify/functions';

const PB_BASE = 'https://api.phantombuster.com/api/v2';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { action, apiKey, agentId, argument, containerId } = JSON.parse(event.body || '{}');

    if (!apiKey) {
      return { statusCode: 400, body: JSON.stringify({ error: 'apiKey requis' }) };
    }

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

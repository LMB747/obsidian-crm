import type { Handler } from '@netlify/functions';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { apiKey, domain, firstName, lastName, company } = JSON.parse(event.body || '{}');

    if (!apiKey) {
      return { statusCode: 400, body: JSON.stringify({ error: 'apiKey requis' }) };
    }

    const params = new URLSearchParams({ api_key: apiKey });
    if (domain) params.set('domain', domain);
    if (firstName) params.set('first_name', firstName);
    if (lastName) params.set('last_name', lastName);
    if (company) params.set('company', company);

    const res = await fetch(
      `https://api.hunter.io/v2/email-finder?${params.toString()}`
    );
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

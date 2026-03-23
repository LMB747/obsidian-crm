/**
 * Netlify Function — Proxy RevenueCat API
 * Évite le blocage CORS lors des appels depuis le navigateur.
 *
 * Déploiement : netlify deploy
 * URL : /.netlify/functions/revenuecat-proxy
 *
 * Usage depuis PayToSnooze.tsx :
 *   const res = await fetch('/.netlify/functions/revenuecat-proxy', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ apiKey, subscriberId })
 *   })
 */

import type { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { apiKey, subscriberId } = JSON.parse(event.body ?? '{}')

    if (!apiKey || !subscriberId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'apiKey and subscriberId are required' }) }
    }

    const rcResponse = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(subscriberId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await rcResponse.json()

    return {
      statusCode: rcResponse.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal proxy error', details: String(err) }),
    }
  }
}

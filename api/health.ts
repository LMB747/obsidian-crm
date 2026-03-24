import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: ['/api/health', '/api/clients', '/api/projects', '/api/invoices', '/api/webhooks'],
  });
}

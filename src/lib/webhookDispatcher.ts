interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
}

export async function dispatchWebhook(event: string, data: any) {
  try {
    // This would ideally be called from a serverless function
    // For now, store the event for later processing
    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    // Log webhook event (will be processed by a background job or edge function)
    console.log('[Webhook]', event, payload);
  } catch (err) {
    console.error('[Webhook dispatch error]', err);
  }
}

export const WEBHOOK_EVENTS = [
  'client.created',
  'client.updated',
  'client.deleted',
  'project.created',
  'project.updated',
  'project.status_changed',
  'invoice.created',
  'invoice.paid',
  'task.status_changed',
  'deliverable.submitted',
  'deliverable.reviewed',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

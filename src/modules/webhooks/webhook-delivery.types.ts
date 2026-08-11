export const WEBHOOK_DELIVERY_QUEUE = 'webhook-deliveries';

export const WEBHOOK_DELIVERY_MAX_ATTEMPTS = 5;

export interface DealWonEventData {
  dealId: string;
  title: string;
  value: number;
  contactId: string;
  wonAt: string;
}

export type WebhookEventData = DealWonEventData;

export interface WebhookDeliveryJobPayload {
  webhookId: string;
  event: string;
  data: WebhookEventData;
  /** ISO timestamp of when the event occurred (not the delivery attempt). */
  occurredAt: string;
}

/**
 * Known outbound webhook event types an organization can subscribe to.
 * Stored as a plain string[] on Webhook.subscribedEvents (not a DB enum) so
 * new event types can be added without a migration; validated against this
 * list at the DTO layer.
 */
export const WEBHOOK_EVENT_TYPES = [
  'deal.won',
  'deal.lost',
  'deal.stage_changed',
  'task.overdue',
  'lead.assigned',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

import { createHmac } from 'crypto';

/**
 * Stripe-style signature scheme: sign `${timestamp}.${rawBody}` with the
 * webhook's secret, so receivers get both replay protection (timestamp) and
 * payload integrity (HMAC). Mirrors the format BillingService already
 * verifies for inbound Stripe webhooks (`t=...,v1=...`).
 */
export function signWebhookPayload(
  secret: string,
  timestamp: number,
  rawBody: string,
): string {
  const signedPayload = `${timestamp}.${rawBody}`;
  const signature = createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

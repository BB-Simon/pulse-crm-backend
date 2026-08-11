import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { WebhookDeliveryStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  WEBHOOK_DELIVERY_QUEUE,
  WebhookDeliveryJobPayload,
} from './webhook-delivery.types';
import { signWebhookPayload } from './webhook-signing.util';

const DELIVERY_TIMEOUT_MS = 10_000;

@Processor(WEBHOOK_DELIVERY_QUEUE)
export class WebhookDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<WebhookDeliveryJobPayload>): Promise<void> {
    const { webhookId, event, data, occurredAt } = job.data;
    const attempt = job.attemptsMade + 1;

    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
    });
    if (!webhook || !webhook.isActive) {
      this.logger.warn(
        `Skipping delivery for webhook ${webhookId} (not found or inactive)`,
      );
      return;
    }

    const body = JSON.stringify({ id: job.id, event, occurredAt, data });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signWebhookPayload(webhook.secret, timestamp, body);

    let responseCode: number | null = null;
    let errorMessage: string | null = null;

    try {
      const response = await fetch(webhook.targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PulseCRM-Signature': signature,
          'X-PulseCRM-Event': event,
        },
        body,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });
      responseCode = response.status;
      if (!response.ok) {
        errorMessage = `HTTP ${response.status}`;
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    const status = errorMessage
      ? WebhookDeliveryStatus.FAILED
      : WebhookDeliveryStatus.SUCCESS;

    await this.prisma.webhookDelivery.create({
      data: {
        webhookId,
        eventType: event,
        status,
        responseCode,
        error: errorMessage,
        attempt,
      },
    });

    if (errorMessage) {
      this.logger.warn(
        `Delivery failed for webhook ${webhookId} (attempt ${attempt}): ${errorMessage}`,
      );
      throw new Error(errorMessage);
    }

    this.logger.log(
      `Delivered ${event} to webhook ${webhookId} (attempt ${attempt}, HTTP ${responseCode})`,
    );
  }
}

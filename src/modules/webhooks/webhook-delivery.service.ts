import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  DealWonEventData,
  WEBHOOK_DELIVERY_MAX_ATTEMPTS,
  WEBHOOK_DELIVERY_QUEUE,
  WebhookDeliveryJobPayload,
} from './webhook-delivery.types';

const DEAL_WON_EVENT = 'deal.won';

@Injectable()
export class WebhookDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(WEBHOOK_DELIVERY_QUEUE) private readonly queue: Queue,
  ) {}

  async enqueueDealWon(
    organizationId: string,
    data: DealWonEventData,
  ): Promise<void> {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        organizationId,
        isActive: true,
        subscribedEvents: { has: DEAL_WON_EVENT },
      },
      select: { id: true },
    });

    await Promise.all(
      webhooks.map((webhook) => {
        const payload: WebhookDeliveryJobPayload = {
          webhookId: webhook.id,
          event: DEAL_WON_EVENT,
          data,
          occurredAt: new Date().toISOString(),
        };
        return this.queue.add('deliver', payload, {
          attempts: WEBHOOK_DELIVERY_MAX_ATTEMPTS,
          backoff: { type: 'exponential', delay: 1000 },
        });
      }),
    );
  }
}

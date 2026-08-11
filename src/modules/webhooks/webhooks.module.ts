import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { WebhookDeliveryProcessor } from './webhook-delivery.processor';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WEBHOOK_DELIVERY_QUEUE } from './webhook-delivery.types';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [BullModule.registerQueue({ name: WEBHOOK_DELIVERY_QUEUE })],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    WebhookDeliveryProcessor,
    WebhookDeliveryService,
  ],
  exports: [WebhookDeliveryService],
})
export class WebhooksModule {}

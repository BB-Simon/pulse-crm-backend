import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsQueryService } from './notifications-query.service';
import { NotificationsService } from './notifications.service';
import { NOTIFICATIONS_QUEUE } from './notifications.types';

@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  controllers: [NotificationsController],
  providers: [
    NotificationsProcessor,
    NotificationsService,
    NotificationsQueryService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}

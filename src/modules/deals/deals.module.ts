import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ContactsModule } from '../contacts/contacts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { DealSummaryService } from './deal-summary.service';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';
import { FollowUpDraftService } from './follow-up-draft.service';

@Module({
  imports: [
    ContactsModule,
    NotificationsModule,
    AiModule,
    WebhooksModule,
    RealtimeModule,
  ],
  controllers: [DealsController],
  providers: [DealsService, FollowUpDraftService, DealSummaryService],
  exports: [DealsService],
})
export class DealsModule {}

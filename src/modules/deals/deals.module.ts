import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ContactsModule } from '../contacts/contacts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DealSummaryService } from './deal-summary.service';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';
import { FollowUpDraftService } from './follow-up-draft.service';

@Module({
  imports: [ContactsModule, NotificationsModule, AiModule],
  controllers: [DealsController],
  providers: [DealsService, FollowUpDraftService, DealSummaryService],
  exports: [DealsService],
})
export class DealsModule {}

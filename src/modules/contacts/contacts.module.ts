import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { LeadScoringService } from './lead-scoring.service';

@Module({
  imports: [BillingModule, NotificationsModule, AiModule],
  controllers: [ContactsController],
  providers: [ContactsService, LeadScoringService],
  exports: [ContactsService],
})
export class ContactsModule {}

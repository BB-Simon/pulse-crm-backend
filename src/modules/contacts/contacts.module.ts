import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContactImportController } from './contact-import.controller';
import { ContactImportService } from './contact-import.service';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { LeadScoringService } from './lead-scoring.service';

@Module({
  imports: [BillingModule, NotificationsModule, AiModule],
  controllers: [ContactsController, ContactImportController],
  providers: [ContactsService, LeadScoringService, ContactImportService],
  exports: [ContactsService],
})
export class ContactsModule {}

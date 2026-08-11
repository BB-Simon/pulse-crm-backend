import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PublicApiController } from './public-api.controller';
import { PublicContactsController } from './public-contacts.controller';
import { PublicContactsService } from './public-contacts.service';
import { PublicDealsController } from './public-deals.controller';
import { PublicDealsService } from './public-deals.service';
import { PublicPipelineStagesController } from './public-pipeline-stages.controller';

@Module({
  imports: [
    BillingModule,
    NotificationsModule,
    // 100 requests/minute per API key. ApiKeyThrottlerGuard is applied
    // per-controller below (not as an APP_GUARD), so this only rate-limits
    // /public/v1/* and never touches the internal JWT-auth API.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  controllers: [
    PublicApiController,
    PublicContactsController,
    PublicDealsController,
    PublicPipelineStagesController,
  ],
  providers: [PublicContactsService, PublicDealsService],
})
export class PublicApiModule {}

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PlanLimitsService } from './plan-limits.service';
import { STRIPE_CLIENT } from './stripe-client.token';

@Module({
  controllers: [BillingController],
  providers: [
    BillingService,
    PlanLimitsService,
    {
      provide: STRIPE_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Falls back to a placeholder so DI can construct the client even when
        // Stripe isn't configured; BillingService checks STRIPE_SECRET_KEY itself
        // and fails fast with a clear error before this client is ever called.
        const secretKey =
          configService.get<string>('STRIPE_SECRET_KEY') ||
          'sk_test_stripe_not_configured';
        return new Stripe(secretKey);
      },
    },
  ],
  exports: [PlanLimitsService],
})
export class BillingModule {}

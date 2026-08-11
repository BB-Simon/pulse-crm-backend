import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { ReadOnlyModeMiddleware } from './common/middleware/read-only-mode.middleware';
import { PrismaModule } from './modules/prisma/prisma.module';
import { QueueModule } from './modules/queue/queue.module';
import { MailModule } from './modules/mail/mail.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { DealsModule } from './modules/deals/deals.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SearchModule } from './modules/search/search.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    PrismaModule,
    QueueModule,
    MailModule,
    NotificationsModule,
    AuthModule,
    BillingModule,
    OrganizationsModule,
    UsersModule,
    CompaniesModule,
    ContactsModule,
    DealsModule,
    ActivitiesModule,
    TasksModule,
    DashboardModule,
    SearchModule,
    CalendarModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService, ReadOnlyModeMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Auth (needed to authenticate at all) and Billing (needed to fix the
    // lapsed subscription that triggered read-only mode) must stay reachable
    // even while the rest of the API is locked to reads.
    consumer
      .apply(ReadOnlyModeMiddleware)
      .exclude(
        { path: 'auth/*path', method: RequestMethod.ALL },
        { path: 'billing/*path', method: RequestMethod.ALL },
      )
      .forRoutes('*path');
  }
}

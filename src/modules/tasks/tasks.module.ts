import { Module } from '@nestjs/common';
import { ContactsModule } from '../contacts/contacts.module';
import { DealsModule } from '../deals/deals.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksOverdueCron } from './tasks-overdue.cron';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [ContactsModule, DealsModule, NotificationsModule],
  controllers: [TasksController],
  providers: [TasksService, TasksOverdueCron],
})
export class TasksModule {}

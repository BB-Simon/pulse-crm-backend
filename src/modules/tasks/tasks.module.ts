import { Module } from '@nestjs/common';
import { ContactsModule } from '../contacts/contacts.module';
import { DealsModule } from '../deals/deals.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [ContactsModule, DealsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}

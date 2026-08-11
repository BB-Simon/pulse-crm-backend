import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  DealStageChangedJobPayload,
  LeadAssignedJobPayload,
  NOTIFICATIONS_QUEUE,
  NotificationJobName,
  TaskOverdueJobPayload,
} from './notifications.types';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
  ) {}

  async enqueueDealStageChanged(
    payload: DealStageChangedJobPayload,
  ): Promise<void> {
    await this.queue.add(NotificationJobName.DEAL_STAGE_CHANGED, payload);
  }

  async enqueueTaskOverdue(payload: TaskOverdueJobPayload): Promise<void> {
    await this.queue.add(NotificationJobName.TASK_OVERDUE, payload);
  }

  async enqueueLeadAssigned(payload: LeadAssignedJobPayload): Promise<void> {
    await this.queue.add(NotificationJobName.LEAD_ASSIGNED, payload);
  }
}

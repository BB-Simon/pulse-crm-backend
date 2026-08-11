import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { Job } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  DealStageChangedJobPayload,
  LeadAssignedJobPayload,
  NOTIFICATIONS_QUEUE,
  NotificationJobName,
  NotificationJobPayload,
  TaskOverdueJobPayload,
} from './notifications.types';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {
    super();
  }

  process(
    job: Job<NotificationJobPayload, void, NotificationJobName>,
  ): Promise<void> {
    switch (job.name) {
      case NotificationJobName.DEAL_STAGE_CHANGED:
        return this.handleDealStageChanged(
          job as Job<DealStageChangedJobPayload>,
        );
      case NotificationJobName.TASK_OVERDUE:
        return this.handleTaskOverdue(job as Job<TaskOverdueJobPayload>);
      case NotificationJobName.LEAD_ASSIGNED:
        return this.handleLeadAssigned(job as Job<LeadAssignedJobPayload>);
      default:
        this.logger.warn(`Unrecognized job name: ${String(job.name)}`);
        return Promise.resolve();
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.error(
      `Job ${job?.name ?? '(unknown)'} (${job?.id ?? '?'}) failed: ${error.message}`,
      error.stack,
    );
  }

  private async handleDealStageChanged(
    job: Job<DealStageChangedJobPayload>,
  ): Promise<void> {
    const {
      organizationId,
      dealId,
      dealTitle,
      dealOwnerId,
      fromStage,
      toStage,
    } = job.data;

    const recipient = await this.prisma.user.findUnique({
      where: { id: dealOwnerId },
    });
    if (!recipient) {
      this.logger.warn(
        `[${job.name}] recipient user ${dealOwnerId} not found; skipping`,
      );
      return;
    }

    await Promise.all([
      this.persistNotification({
        organizationId,
        userId: recipient.id,
        type: NotificationType.DEAL_STAGE_CHANGED,
        title: `Deal moved to ${toStage}`,
        body: `"${dealTitle}" moved from ${fromStage} to ${toStage}.`,
        link: `/deals/${dealId}`,
      }),
      this.mailService.sendDealStageChangedEmail({
        to: recipient.email,
        dealTitle,
        fromStage,
        toStage,
      }),
    ]);

    this.logger.log(`[${job.name}] notified ${recipient.email}`);
  }

  private async handleTaskOverdue(
    job: Job<TaskOverdueJobPayload>,
  ): Promise<void> {
    const { organizationId, taskId, taskTitle, assigneeId, dueDate } = job.data;

    const recipient = await this.prisma.user.findUnique({
      where: { id: assigneeId },
    });
    if (!recipient) {
      this.logger.warn(
        `[${job.name}] recipient user ${assigneeId} not found; skipping`,
      );
      return;
    }

    const dueDateLabel = new Date(dueDate).toLocaleDateString();

    await Promise.all([
      this.persistNotification({
        organizationId,
        userId: recipient.id,
        type: NotificationType.TASK_OVERDUE,
        title: 'Task overdue',
        body: `"${taskTitle}" was due on ${dueDateLabel} and is now overdue.`,
        link: `/tasks/${taskId}`,
      }),
      this.mailService.sendTaskOverdueEmail({
        to: recipient.email,
        taskTitle,
        dueDate,
      }),
    ]);

    this.logger.log(`[${job.name}] notified ${recipient.email}`);
  }

  private async handleLeadAssigned(
    job: Job<LeadAssignedJobPayload>,
  ): Promise<void> {
    const { organizationId, contactId, contactName, assignedToUserId } =
      job.data;

    const recipient = await this.prisma.user.findUnique({
      where: { id: assignedToUserId },
    });
    if (!recipient) {
      this.logger.warn(
        `[${job.name}] recipient user ${assignedToUserId} not found; skipping`,
      );
      return;
    }

    await Promise.all([
      this.persistNotification({
        organizationId,
        userId: recipient.id,
        type: NotificationType.LEAD_ASSIGNED,
        title: 'New lead assigned',
        body: `You've been assigned a new lead: ${contactName}.`,
        link: `/contacts/${contactId}`,
      }),
      this.mailService.sendLeadAssignedEmail({
        to: recipient.email,
        contactName,
      }),
    ]);

    this.logger.log(`[${job.name}] notified ${recipient.email}`);
  }

  private async persistNotification(data: {
    organizationId: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
  }): Promise<void> {
    await this.prisma.notification.create({ data });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksOverdueCron {
  private readonly logger = new Logger(TasksOverdueCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkOverdueTasks(): Promise<void> {
    const newlyOverdueTasks = await this.prisma.task.findMany({
      where: {
        completed: false,
        dueDate: { lt: new Date() },
        overdueNotifiedAt: null,
      },
    });

    if (newlyOverdueTasks.length === 0) {
      return;
    }

    for (const task of newlyOverdueTasks) {
      await this.notificationsService.enqueueTaskOverdue({
        organizationId: task.organizationId,
        taskId: task.id,
        taskTitle: task.title,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate.toISOString(),
      });
    }

    await this.prisma.task.updateMany({
      where: { id: { in: newlyOverdueTasks.map((task) => task.id) } },
      data: { overdueNotifiedAt: new Date() },
    });

    this.logger.log(
      `Enqueued task.overdue notifications for ${newlyOverdueTasks.length} task(s).`,
    );
  }
}

/**
 * Manual smoke test for the notifications queue: enqueues one job per known
 * job name directly (bypassing the app, since no producer exists yet) so you
 * can confirm NotificationsProcessor picks them up and logs them.
 *
 * Usage (with the app running via `npm run start:dev` in another terminal):
 *   npm run notifications:test-enqueue
 */
import 'dotenv/config';
import { Queue } from 'bullmq';
import {
  NOTIFICATIONS_QUEUE,
  NotificationJobName,
} from '../src/modules/notifications/notifications.types';

async function main() {
  const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  const connection = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port) || 6379,
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
  };

  const queue = new Queue(NOTIFICATIONS_QUEUE, { connection });

  await queue.add(NotificationJobName.DEAL_STAGE_CHANGED, {
    organizationId: 'org_test',
    dealId: 'deal_test',
    fromStage: 'Lead',
    toStage: 'Proposal',
    changedByUserId: 'user_test',
  });

  await queue.add(NotificationJobName.TASK_OVERDUE, {
    organizationId: 'org_test',
    taskId: 'task_test',
    assigneeId: 'user_test',
    dueDate: new Date().toISOString(),
  });

  await queue.add(NotificationJobName.LEAD_ASSIGNED, {
    organizationId: 'org_test',
    contactId: 'contact_test',
    assignedToUserId: 'user_test',
    assignedByUserId: 'user_test_2',
  });

  console.log('Enqueued 3 test jobs onto the notifications queue.');
  await queue.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

export const NOTIFICATIONS_QUEUE = 'notifications';

export const NotificationJobName = {
  DEAL_STAGE_CHANGED: 'deal.stage_changed',
  TASK_OVERDUE: 'task.overdue',
  LEAD_ASSIGNED: 'lead.assigned',
} as const;

export type NotificationJobName =
  (typeof NotificationJobName)[keyof typeof NotificationJobName];

export interface DealStageChangedJobPayload {
  organizationId: string;
  dealId: string;
  dealTitle: string;
  dealOwnerId: string;
  fromStage: string;
  toStage: string;
  changedByUserId: string;
}

export interface TaskOverdueJobPayload {
  organizationId: string;
  taskId: string;
  taskTitle: string;
  assigneeId: string;
  /** ISO string — job data is JSON-serialized, so Date objects don't survive. */
  dueDate: string;
}

export interface LeadAssignedJobPayload {
  organizationId: string;
  contactId: string;
  contactName: string;
  assignedToUserId: string;
  assignedByUserId: string;
}

export type NotificationJobPayload =
  DealStageChangedJobPayload | TaskOverdueJobPayload | LeadAssignedJobPayload;

export const DEAL_STAGE_CHANGED_EVENT = 'deal.stage_changed' as const;

export interface DealStageChangedEvent {
  dealId: string;
  dealTitle: string;
  dealOwnerId: string;
  fromStageId: string;
  fromStageName: string;
  toStageId: string;
  toStageName: string;
  changedByUserId: string;
  /** ISO timestamp of when the stage change occurred. */
  changedAt: string;
}

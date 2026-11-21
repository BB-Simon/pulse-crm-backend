import { ApiProperty } from '@nestjs/swagger';
import { Plan, SubscriptionStatus } from '@prisma/client';

export class SubscriptionSummaryDto {
  @ApiProperty({ enum: Plan })
  plan: Plan;

  @ApiProperty()
  planName: string;

  @ApiProperty({ enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @ApiProperty()
  seatLimit: number;

  @ApiProperty()
  seatsUsed: number;

  @ApiProperty()
  contactLimit: number;

  @ApiProperty()
  contactsUsed: number;

  @ApiProperty({ nullable: true, description: 'ISO date string' })
  currentPeriodEnd: string | null;

  @ApiProperty({
    description:
      'True while status is TRIALING — currentPeriodEnd is the trial end date',
  })
  isTrialing: boolean;

  @ApiProperty({
    description:
      'True when the organization is restricted to read-only access (past_due/canceled)',
  })
  isReadOnly: boolean;

  @ApiProperty()
  hasBillingAccount: boolean;
}

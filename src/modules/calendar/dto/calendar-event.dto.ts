import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealStatus } from '@prisma/client';

export enum CalendarEventType {
  DEAL = 'deal',
  TASK = 'task',
}

export class CalendarEventDto {
  @ApiProperty({ enum: CalendarEventType })
  type: CalendarEventType;

  @ApiProperty()
  id: string;

  @ApiProperty({ description: "Deal's expectedCloseDate, or Task's dueDate" })
  date: Date;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ nullable: true }) contactId: string | null;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Linked deal id (for task events with one)',
  })
  dealId: string | null;

  @ApiProperty({ description: "Deal's owner, or Task's assignee" })
  ownerId: string;

  @ApiPropertyOptional({ nullable: true, description: 'Deal-only' })
  value: number | null;

  @ApiPropertyOptional({
    nullable: true,
    enum: DealStatus,
    description: 'Deal-only',
  })
  status: DealStatus | null;

  @ApiPropertyOptional({ nullable: true, description: 'Task-only' })
  completed: boolean | null;
}

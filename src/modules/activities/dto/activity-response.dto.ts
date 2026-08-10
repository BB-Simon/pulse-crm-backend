import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType } from '@prisma/client';

export class ActivityResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() userId: string;
  @ApiPropertyOptional({ nullable: true }) contactId: string | null;
  @ApiPropertyOptional({ nullable: true }) dealId: string | null;
  @ApiProperty({ enum: ActivityType }) type: ActivityType;
  @ApiProperty() content: string;
  @ApiProperty() occurredAt: Date;
  @ApiProperty() createdAt: Date;
}

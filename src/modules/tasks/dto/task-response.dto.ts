import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaskResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() assigneeId: string;
  @ApiPropertyOptional({ nullable: true }) contactId: string | null;
  @ApiPropertyOptional({ nullable: true }) dealId: string | null;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty() dueDate: Date;
  @ApiProperty() completed: boolean;
  @ApiPropertyOptional({ nullable: true }) completedAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

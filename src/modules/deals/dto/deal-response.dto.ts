import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealStatus } from '@prisma/client';

export class DealResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() ownerId: string;
  @ApiProperty() contactId: string;
  @ApiPropertyOptional({ nullable: true }) companyId: string | null;
  @ApiProperty() pipelineStageId: string;
  @ApiProperty() title: string;
  @ApiProperty({ example: 15000 }) value: number;
  @ApiProperty({ enum: DealStatus }) status: DealStatus;
  @ApiPropertyOptional({ nullable: true }) expectedCloseDate: Date | null;
  @ApiPropertyOptional({ nullable: true }) closedAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealStatus } from '@prisma/client';

export class SearchDealResultDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty({ example: 15000 }) value: number;
  @ApiProperty({ enum: DealStatus }) status: DealStatus;
  @ApiProperty() contactId: string;
  @ApiProperty() contactName: string;
  @ApiPropertyOptional({ nullable: true }) companyId: string | null;
  @ApiPropertyOptional({ nullable: true }) companyName: string | null;
}

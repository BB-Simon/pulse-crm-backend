import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class TeamAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Only include deals closed on or after this date',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Only include deals closed on or before this date',
    example: '2026-06-30',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

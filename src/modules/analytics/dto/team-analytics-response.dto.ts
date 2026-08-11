import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RepMetricsDto } from './rep-metrics.dto';

export class TeamAnalyticsResponseDto {
  @ApiPropertyOptional({ nullable: true })
  rangeStart: Date | null;

  @ApiPropertyOptional({ nullable: true })
  rangeEnd: Date | null;

  @ApiProperty({ type: [RepMetricsDto] })
  reps: RepMetricsDto[];
}

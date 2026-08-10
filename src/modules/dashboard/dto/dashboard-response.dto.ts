import { ApiProperty } from '@nestjs/swagger';
import { DealsThisMonthDto } from './deals-this-month.dto';
import { PipelineStageValueDto } from './pipeline-stage-value.dto';
import { RevenueTrendPointDto } from './revenue-trend-point.dto';

export class DashboardResponseDto {
  @ApiProperty({ type: [PipelineStageValueDto] })
  pipelineByStage: PipelineStageValueDto[];

  @ApiProperty({ type: DealsThisMonthDto })
  dealsThisMonth: DealsThisMonthDto;

  @ApiProperty({
    type: [RevenueTrendPointDto],
    description:
      'Won-deal revenue per month for the last 6 months, oldest first',
  })
  revenueTrend: RevenueTrendPointDto[];
}

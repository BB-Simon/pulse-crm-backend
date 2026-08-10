import { ApiProperty } from '@nestjs/swagger';

export class PipelineStageValueDto {
  @ApiProperty() pipelineStageId: string;
  @ApiProperty() stageName: string;
  @ApiProperty() order: number;
  @ApiProperty() dealCount: number;
  @ApiProperty({ example: 42000 }) totalValue: number;
}

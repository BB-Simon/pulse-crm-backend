import { ApiProperty } from '@nestjs/swagger';

export class PipelineStageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() name: string;
  @ApiProperty() order: number;
  @ApiProperty() isWon: boolean;
  @ApiProperty() isLost: boolean;
}

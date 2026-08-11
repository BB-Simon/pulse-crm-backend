import { ApiProperty } from '@nestjs/swagger';

export class PublicPipelineStageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() order: number;
  @ApiProperty() isWon: boolean;
  @ApiProperty() isLost: boolean;
}

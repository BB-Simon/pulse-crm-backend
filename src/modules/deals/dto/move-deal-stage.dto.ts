import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MoveDealStageDto {
  @ApiProperty({ description: 'The pipeline stage to move this deal to' })
  @IsString()
  @IsNotEmpty()
  pipelineStageId: string;
}

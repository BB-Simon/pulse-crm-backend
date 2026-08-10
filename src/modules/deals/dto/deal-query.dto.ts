import { ApiPropertyOptional } from '@nestjs/swagger';
import { DealStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class DealQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by pipeline stage' })
  @IsOptional()
  @IsString()
  pipelineStageId?: string;

  @ApiPropertyOptional({ enum: DealStatus })
  @IsOptional()
  @IsEnum(DealStatus)
  status?: DealStatus;

  @ApiPropertyOptional({
    description: 'Filter by owner (Manager/Admin only — ignored for Reps)',
  })
  @IsOptional()
  @IsString()
  ownerId?: string;
}

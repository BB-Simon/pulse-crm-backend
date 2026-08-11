import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PublicContactQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by tag', example: 'vip' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Filter by owner user id' })
  @IsOptional()
  @IsString()
  ownerId?: string;
}

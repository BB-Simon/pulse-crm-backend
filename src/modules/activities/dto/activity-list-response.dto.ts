import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { ActivityResponseDto } from './activity-response.dto';

export class ActivityListResponseDto {
  @ApiProperty({ type: [ActivityResponseDto] })
  data: ActivityResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

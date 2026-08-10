import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { DealResponseDto } from './deal-response.dto';

export class DealListResponseDto {
  @ApiProperty({ type: [DealResponseDto] })
  data: DealResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { PublicDealResponseDto } from './public-deal-response.dto';

export class PublicDealListResponseDto {
  @ApiProperty({ type: [PublicDealResponseDto] })
  data: PublicDealResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

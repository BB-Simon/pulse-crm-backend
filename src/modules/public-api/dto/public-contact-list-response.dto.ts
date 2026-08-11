import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { PublicContactResponseDto } from './public-contact-response.dto';

export class PublicContactListResponseDto {
  @ApiProperty({ type: [PublicContactResponseDto] })
  data: PublicContactResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

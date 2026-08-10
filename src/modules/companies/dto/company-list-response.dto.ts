import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { CompanyResponseDto } from './company-response.dto';

export class CompanyListResponseDto {
  @ApiProperty({ type: [CompanyResponseDto] })
  data: CompanyResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

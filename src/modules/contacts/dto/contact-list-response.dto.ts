import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { ContactResponseDto } from './contact-response.dto';

export class ContactListResponseDto {
  @ApiProperty({ type: [ContactResponseDto] })
  data: ContactResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

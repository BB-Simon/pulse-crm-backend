import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { ApiKeyResponseDto } from './api-key-response.dto';

export class ApiKeyListResponseDto {
  @ApiProperty({ type: [ApiKeyResponseDto] })
  data: ApiKeyResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { WebhookResponseDto } from './webhook-response.dto';

export class WebhookListResponseDto {
  @ApiProperty({ type: [WebhookResponseDto] })
  data: WebhookResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

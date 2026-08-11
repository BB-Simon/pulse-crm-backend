import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { WebhookDeliveryResponseDto } from './webhook-delivery-response.dto';

export class WebhookDeliveryListResponseDto {
  @ApiProperty({ type: [WebhookDeliveryResponseDto] })
  data: WebhookDeliveryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

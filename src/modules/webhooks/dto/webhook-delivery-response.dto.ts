import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookDeliveryStatus } from '@prisma/client';

export class WebhookDeliveryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() eventType: string;
  @ApiProperty({ enum: WebhookDeliveryStatus }) status: WebhookDeliveryStatus;
  @ApiPropertyOptional({ nullable: true }) responseCode: number | null;
  @ApiPropertyOptional({ nullable: true }) error: string | null;
  @ApiProperty() attempt: number;
  @ApiProperty() deliveredAt: Date;
}

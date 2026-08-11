import { ApiProperty } from '@nestjs/swagger';

export class WebhookResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() targetUrl: string;
  @ApiProperty({ type: [String] }) subscribedEvents: string[];
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdById: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

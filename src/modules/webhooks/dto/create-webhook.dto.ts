import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsIn, IsUrl } from 'class-validator';
import { WEBHOOK_EVENT_TYPES, WebhookEventType } from '../webhook-event-type';

export class CreateWebhookDto {
  @ApiProperty({ example: 'https://hooks.slack.com/services/...' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  targetUrl: string;

  @ApiProperty({
    type: [String],
    enum: WEBHOOK_EVENT_TYPES,
    example: ['deal.won'],
    description: 'Event types this webhook should fire on',
  })
  @ArrayNotEmpty()
  @IsIn(WEBHOOK_EVENT_TYPES, { each: true })
  subscribedEvents: WebhookEventType[];
}

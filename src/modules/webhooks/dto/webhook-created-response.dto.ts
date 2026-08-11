import { ApiProperty } from '@nestjs/swagger';
import { WebhookResponseDto } from './webhook-response.dto';

export class WebhookCreatedResponseDto extends WebhookResponseDto {
  @ApiProperty({
    description:
      'Signing secret for verifying delivered payloads. Shown ONLY here — it cannot be retrieved again after this response. Store it securely.',
    example: 'whsec_3f9a1c...redacted',
  })
  secret: string;
}

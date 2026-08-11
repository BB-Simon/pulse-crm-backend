import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateWebhookDto } from './create-webhook.dto';

export class UpdateWebhookDto extends PartialType(CreateWebhookDto) {
  @ApiPropertyOptional({
    description:
      'Pause (false) or resume (true) delivery without deleting the webhook',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

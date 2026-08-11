import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyResponseDto } from './api-key-response.dto';

export class ApiKeyCreatedResponseDto extends ApiKeyResponseDto {
  @ApiProperty({
    description:
      'The full API key. Shown ONLY here — it cannot be retrieved again after this response. Store it securely.',
    example: 'pcrm_3f9a1c78b2e04d61a9f7c0e5d3b8a291f4c6d0e8b1a2c3d4',
  })
  key: string;
}

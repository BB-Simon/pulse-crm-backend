import { ApiProperty } from '@nestjs/swagger';

export class PublicApiMeResponseDto {
  @ApiProperty({ description: 'The organization this API key belongs to' })
  organizationId: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiKeyResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ example: 'pcrm_3f9a1c78...' }) keyPreview: string;
  @ApiProperty() createdById: string;
  @ApiPropertyOptional({ nullable: true }) lastUsedAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) revokedAt: Date | null;
  @ApiProperty() createdAt: Date;
}

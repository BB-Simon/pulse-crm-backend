import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() ownerId: string;
  @ApiPropertyOptional({ nullable: true }) companyId: string | null;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiPropertyOptional({ nullable: true }) email: string | null;
  @ApiPropertyOptional({ nullable: true }) phone: string | null;
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiPropertyOptional({ nullable: true, example: 72 }) leadScore:
    number | null;
  @ApiPropertyOptional({ nullable: true }) leadScoreRationale: string | null;
  @ApiPropertyOptional({ nullable: true }) leadScoredAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

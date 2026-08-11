import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicContactResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() ownerId: string;
  @ApiPropertyOptional({ nullable: true }) companyId: string | null;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiPropertyOptional({ nullable: true }) email: string | null;
  @ApiPropertyOptional({ nullable: true }) phone: string | null;
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

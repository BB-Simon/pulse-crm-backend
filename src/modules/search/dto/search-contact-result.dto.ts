import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchContactResultDto {
  @ApiProperty() id: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiPropertyOptional({ nullable: true }) email: string | null;
  @ApiPropertyOptional({ nullable: true }) companyId: string | null;
  @ApiPropertyOptional({ nullable: true }) companyName: string | null;
}

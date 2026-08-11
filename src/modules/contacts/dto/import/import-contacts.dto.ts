import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Column mapping for a CSV import commit. Sent as plain multipart text
 * fields (not a JSON blob) so a plain HTML form can submit it directly —
 * each value is the CSV header the client picked for that target field.
 */
export class ImportContactsDto {
  @ApiProperty({ description: 'CSV column header mapped to firstName' })
  @IsString()
  @IsNotEmpty()
  firstNameColumn: string;

  @ApiProperty({ description: 'CSV column header mapped to lastName' })
  @IsString()
  @IsNotEmpty()
  lastNameColumn: string;

  @ApiPropertyOptional({ description: 'CSV column header mapped to email' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  emailColumn?: string;

  @ApiPropertyOptional({ description: 'CSV column header mapped to phone' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phoneColumn?: string;

  @ApiPropertyOptional({
    description: 'CSV column header mapped to tags (cell value split on ";")',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tagsColumn?: string;

  @ApiPropertyOptional({
    description:
      'CSV column header mapped to the owner’s email (Manager/Admin only — ignored for Reps, who always import as themselves)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  ownerEmailColumn?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'Validate every row and report the outcome without creating any contacts',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  dryRun?: boolean;
}

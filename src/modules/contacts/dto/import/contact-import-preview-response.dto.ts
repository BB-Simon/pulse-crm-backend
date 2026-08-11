import { ApiProperty } from '@nestjs/swagger';

export class SuggestedContactMappingDto {
  @ApiProperty({ nullable: true, type: String }) firstNameColumn: string | null;
  @ApiProperty({ nullable: true, type: String }) lastNameColumn: string | null;
  @ApiProperty({ nullable: true, type: String }) emailColumn: string | null;
  @ApiProperty({ nullable: true, type: String }) phoneColumn: string | null;
  @ApiProperty({ nullable: true, type: String }) tagsColumn: string | null;
  @ApiProperty({ nullable: true, type: String }) ownerEmailColumn:
    string | null;
}

export class ContactImportPreviewResponseDto {
  @ApiProperty({ type: [String] })
  headers: string[];

  @ApiProperty({
    description: 'Total data rows in the file (excluding header)',
  })
  totalRows: number;

  @ApiProperty({
    description:
      'First few rows, keyed by CSV header, for the user to sanity-check',
    type: 'array',
    items: { type: 'object', additionalProperties: { type: 'string' } },
  })
  sampleRows: Record<string, string>[];

  @ApiProperty({
    type: SuggestedContactMappingDto,
    description:
      'Best-guess column mapping based on common header names — the client should let the user confirm/edit before committing',
  })
  suggestedMapping: SuggestedContactMappingDto;
}

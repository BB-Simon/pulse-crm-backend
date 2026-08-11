import { ApiProperty } from '@nestjs/swagger';

export class ContactImportRowErrorDto {
  @ApiProperty({
    description: '1-based row number within the file, excluding the header row',
  })
  row: number;

  @ApiProperty()
  message: string;
}

export class ContactImportResultDto {
  @ApiProperty()
  dryRun: boolean;

  @ApiProperty({
    description: 'Total data rows in the file (excluding header)',
  })
  totalRows: number;

  @ApiProperty({
    description:
      'Rows created (or, for a dry run, that would have been created)',
  })
  importedCount: number;

  @ApiProperty({
    description:
      'Rows skipped due to a validation error, duplicate, or plan limit',
  })
  skippedCount: number;

  @ApiProperty({ type: [ContactImportRowErrorDto] })
  errors: ContactImportRowErrorDto[];
}

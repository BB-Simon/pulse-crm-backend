import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class CalendarQueryDto {
  @ApiProperty({
    example: '2026-08-01',
    description: 'Start of the date range (inclusive)',
  })
  @IsDateString()
  from: string;

  @ApiProperty({
    example: '2026-08-31',
    description: 'End of the date range (inclusive)',
  })
  @IsDateString()
  to: string;
}

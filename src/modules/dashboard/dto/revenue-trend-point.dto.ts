import { ApiProperty } from '@nestjs/swagger';

export class RevenueTrendPointDto {
  @ApiProperty({ example: '2026-08', description: 'Calendar month, YYYY-MM' })
  month: string;

  @ApiProperty({ example: 32000 })
  revenue: number;
}

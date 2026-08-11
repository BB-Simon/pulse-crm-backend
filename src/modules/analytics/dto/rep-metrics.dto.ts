import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class RepMetricsDto {
  @ApiProperty() userId: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: Role }) role: Role;

  @ApiProperty({ description: 'Count of deals won in the date range' })
  dealsClosed: number;

  @ApiProperty({
    description: 'Sum of value across deals won in the date range',
  })
  totalRevenue: number;

  @ApiProperty({
    description:
      'Won deals / (won + lost deals) in the date range. 0 if none closed.',
    example: 0.42,
  })
  conversionRate: number;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Average days from deal creation to close, across won deals in the date range. Null if none won.',
  })
  avgDealCycleDays: number | null;
}

import { ApiProperty } from '@nestjs/swagger';
import { Plan } from '@prisma/client';

export class PlanCatalogEntryDto {
  @ApiProperty({ enum: Plan })
  plan: Plan;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ description: 'Price per seat, per month, in cents' })
  pricePerSeatCents: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  seatLimit: number;

  @ApiProperty()
  contactLimit: number;
}

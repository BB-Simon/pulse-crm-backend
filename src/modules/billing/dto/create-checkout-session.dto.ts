import { ApiProperty } from '@nestjs/swagger';
import { Plan } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty({
    enum: Plan,
    example: Plan.GROWTH,
    description: 'The plan the organization wants to subscribe to',
  })
  @IsEnum(Plan)
  plan: Plan;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateActivityDto {
  @ApiProperty({ enum: ActivityType, example: ActivityType.CALL })
  @IsEnum(ActivityType)
  type: ActivityType;

  @ApiProperty({
    example: 'Called to follow up on the proposal — left a voicemail.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @ApiProperty({ description: 'Contact this activity is logged against' })
  @IsString()
  @IsNotEmpty()
  contactId: string;

  @ApiPropertyOptional({
    description: 'Optionally link this activity to a deal on the same contact',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  dealId?: string;

  @ApiPropertyOptional({
    example: '2026-08-09T14:30:00.000Z',
    description: 'When this happened; defaults to now if omitted',
  })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

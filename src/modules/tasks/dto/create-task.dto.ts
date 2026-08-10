import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Send follow-up proposal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Include updated pricing sheet' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: '2026-08-15T17:00:00.000Z' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ description: 'Contact this task relates to' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Deal this task relates to' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  dealId?: string;

  @ApiPropertyOptional({
    description:
      'Assign this task to a specific teammate (Manager/Admin only — ignored for Reps, defaults to yourself)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  assigneeId?: string;
}

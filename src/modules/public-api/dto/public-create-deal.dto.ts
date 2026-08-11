import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class PublicCreateDealDto {
  @ApiProperty({ example: 'Acme Corp — annual contract' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 15000, description: 'Deal value in dollars' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value: number;

  @ApiProperty({ description: 'Contact this deal is tied to' })
  @IsString()
  @IsNotEmpty()
  contactId: string;

  @ApiPropertyOptional({
    description: 'Defaults to the contact’s company if omitted',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  companyId?: string;

  @ApiPropertyOptional({
    description:
      'Pipeline stage to create the deal in; defaults to the organization’s first stage (e.g. "Lead")',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  pipelineStageId?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @ApiProperty({
    description: 'User id (within your organization) to assign this deal to',
  })
  @IsString()
  @IsNotEmpty()
  ownerId: string;
}

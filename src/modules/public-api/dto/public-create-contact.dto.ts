import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class PublicCreateContactDto {
  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ example: 'jane.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1-555-0100' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Company this contact belongs to' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  companyId?: string;

  @ApiPropertyOptional({ type: [String], example: ['vip', 'newsletter'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: 'User id (within your organization) to assign this contact to',
  })
  @IsString()
  @IsNotEmpty()
  ownerId: string;
}

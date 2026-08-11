import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({ example: 'jane', description: 'Search term' })
  @IsString()
  @IsNotEmpty()
  q: string;

  @ApiPropertyOptional({
    default: 10,
    minimum: 1,
    maximum: 25,
    description: 'Max results per category (contacts/deals)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  limit?: number = 10;
}

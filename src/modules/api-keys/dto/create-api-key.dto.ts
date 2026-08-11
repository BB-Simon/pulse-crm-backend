import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Zapier integration' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

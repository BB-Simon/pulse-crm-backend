import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @ApiProperty({ description: 'The invite token from the accept-invite link' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'S3curePassword!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum } from 'class-validator';

export class InviteUserDto {
  @ApiProperty({ example: 'newrep@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: Role, example: Role.REP })
  @IsEnum(Role)
  role: Role;
}

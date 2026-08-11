import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class NotificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: NotificationType }) type: NotificationType;
  @ApiProperty() title: string;
  @ApiProperty() body: string;
  @ApiPropertyOptional({ nullable: true }) link: string | null;
  @ApiPropertyOptional({ nullable: true }) readAt: Date | null;
  @ApiProperty() createdAt: Date;
}

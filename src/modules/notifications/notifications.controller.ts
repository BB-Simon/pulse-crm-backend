import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { NotificationListResponseDto } from './dto/notification-list-response.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { UnreadCountResponseDto } from './dto/unread-count-response.dto';
import { NotificationsQueryService } from './notifications-query.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsQueryService: NotificationsQueryService,
  ) {}

  @Get('unread-count')
  @ApiOperation({ summary: "Get the current user's unread notification count" })
  @ApiOkResponse({ type: UnreadCountResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async unreadCount(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UnreadCountResponseDto> {
    return { count: await this.notificationsQueryService.unreadCount(user) };
  }

  @Get()
  @ApiOperation({
    summary: "List the current user's notifications (paginated, newest first)",
  })
  @ApiOkResponse({ type: NotificationListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificationQueryDto,
  ): Promise<NotificationListResponseDto> {
    return this.notificationsQueryService.list(user, query);
  }

  @Patch('read-all')
  @ApiOperation({
    summary: "Mark all of the current user's notifications as read",
  })
  @ApiOkResponse({ description: 'Number of notifications marked read' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async markAllRead(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ updated: number }> {
    return { updated: await this.notificationsQueryService.markAllRead(user) };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationsQueryService.markRead(user, id);
  }
}

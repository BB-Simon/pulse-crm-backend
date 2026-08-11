import { Injectable, NotFoundException } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationListResponseDto } from './dto/notification-list-response.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

@Injectable()
export class NotificationsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: AuthenticatedUser,
    query: NotificationQueryDto,
  ): Promise<NotificationListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.NotificationWhereInput = {
      organizationId: user.organizationId,
      userId: user.id,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [rows, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          organizationId: user.organizationId,
          userId: user.id,
          readAt: null,
        },
      }),
    ]);

    return {
      data: rows.map((notification) => this.toResponseDto(notification)),
      meta: buildPaginationMeta(total, page, limit),
      unreadCount,
    };
  }

  async unreadCount(user: AuthenticatedUser): Promise<number> {
    return this.prisma.notification.count({
      where: {
        organizationId: user.organizationId,
        userId: user.id,
        readAt: null,
      },
    });
  }

  async markRead(
    user: AuthenticatedUser,
    id: string,
  ): Promise<NotificationResponseDto> {
    const existing = await this.prisma.notification.findFirst({
      where: { id, organizationId: user.organizationId, userId: user.id },
    });
    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    const notification = await this.prisma.notification.update({
      where: { id },
      data: existing.readAt ? {} : { readAt: new Date() },
    });
    return this.toResponseDto(notification);
  }

  async markAllRead(user: AuthenticatedUser): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        organizationId: user.organizationId,
        userId: user.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  private toResponseDto(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}

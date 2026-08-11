import { Injectable, NotFoundException } from '@nestjs/common';
import { Webhook, WebhookDelivery } from '@prisma/client';
import { randomBytes } from 'crypto';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhookCreatedResponseDto } from './dto/webhook-created-response.dto';
import { WebhookDeliveryListResponseDto } from './dto/webhook-delivery-list-response.dto';
import { WebhookDeliveryResponseDto } from './dto/webhook-delivery-response.dto';
import { WebhookListResponseDto } from './dto/webhook-list-response.dto';
import { WebhookQueryDto } from './dto/webhook-query.dto';
import { WebhookResponseDto } from './dto/webhook-response.dto';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: AuthenticatedUser,
    query: WebhookQueryDto,
  ): Promise<WebhookListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { organizationId: user.organizationId };

    const [rows, total] = await Promise.all([
      this.prisma.webhook.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.webhook.count({ where }),
    ]);

    return {
      data: rows.map((webhook) => this.toResponseDto(webhook)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(
    user: AuthenticatedUser,
    id: string,
  ): Promise<WebhookResponseDto> {
    const webhook = await this.getOrgScoped(user.organizationId, id);
    return this.toResponseDto(webhook);
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateWebhookDto,
  ): Promise<WebhookCreatedResponseDto> {
    const secret = this.generateSecret();

    const webhook = await this.prisma.webhook.create({
      data: {
        organizationId: user.organizationId,
        targetUrl: dto.targetUrl,
        subscribedEvents: dto.subscribedEvents,
        secret,
        createdById: user.id,
      },
    });

    // The only point in this webhook's lifecycle where the secret is ever
    // returned to a client.
    return { ...this.toResponseDto(webhook), secret };
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateWebhookDto,
  ): Promise<WebhookResponseDto> {
    await this.getOrgScoped(user.organizationId, id);

    const webhook = await this.prisma.webhook.update({
      where: { id },
      data: {
        ...(dto.targetUrl !== undefined ? { targetUrl: dto.targetUrl } : {}),
        ...(dto.subscribedEvents !== undefined
          ? { subscribedEvents: dto.subscribedEvents }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return this.toResponseDto(webhook);
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    await this.getOrgScoped(user.organizationId, id);
    await this.prisma.webhook.delete({ where: { id } });
  }

  async listDeliveries(
    user: AuthenticatedUser,
    webhookId: string,
    query: PaginationQueryDto,
  ): Promise<WebhookDeliveryListResponseDto> {
    await this.getOrgScoped(user.organizationId, webhookId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { webhookId };

    const [rows, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { deliveredAt: 'desc' },
      }),
      this.prisma.webhookDelivery.count({ where }),
    ]);

    return {
      data: rows.map((delivery) => this.toDeliveryResponseDto(delivery)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  private async getOrgScoped(
    organizationId: string,
    id: string,
  ): Promise<Webhook> {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id, organizationId },
    });
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }
    return webhook;
  }

  private generateSecret(): string {
    return `whsec_${randomBytes(32).toString('hex')}`;
  }

  private toResponseDto(webhook: Webhook): WebhookResponseDto {
    return {
      id: webhook.id,
      targetUrl: webhook.targetUrl,
      subscribedEvents: webhook.subscribedEvents,
      isActive: webhook.isActive,
      createdById: webhook.createdById,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    };
  }

  private toDeliveryResponseDto(
    delivery: WebhookDelivery,
  ): WebhookDeliveryResponseDto {
    return {
      id: delivery.id,
      eventType: delivery.eventType,
      status: delivery.status,
      responseCode: delivery.responseCode,
      error: delivery.error,
      attempt: delivery.attempt,
      deliveredAt: delivery.deliveredAt,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKey } from '@prisma/client';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { generateApiKey } from '../../common/utils/api-key.util';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKeyCreatedResponseDto } from './dto/api-key-created-response.dto';
import { ApiKeyListResponseDto } from './dto/api-key-list-response.dto';
import { ApiKeyResponseDto } from './dto/api-key-response.dto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: AuthenticatedUser,
    query: PaginationQueryDto,
  ): Promise<ApiKeyListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { organizationId: user.organizationId };

    const [rows, total] = await Promise.all([
      this.prisma.apiKey.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.apiKey.count({ where }),
    ]);

    return {
      data: rows.map((apiKey) => this.toResponseDto(apiKey)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedResponseDto> {
    const { rawKey, keyPreview, hashedKey } = generateApiKey();

    const apiKey = await this.prisma.apiKey.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name,
        keyPreview,
        hashedKey,
        createdById: user.id,
      },
    });

    // The only point in this key's lifecycle where the raw value is ever
    // returned to a client.
    return { ...this.toResponseDto(apiKey), key: rawKey };
  }

  async revoke(
    user: AuthenticatedUser,
    id: string,
  ): Promise<ApiKeyResponseDto> {
    const existing = await this.getOrgScoped(user.organizationId, id);
    if (existing.revokedAt) {
      return this.toResponseDto(existing);
    }

    const apiKey = await this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return this.toResponseDto(apiKey);
  }

  private async getOrgScoped(
    organizationId: string,
    id: string,
  ): Promise<ApiKey> {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, organizationId },
    });
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }
    return apiKey;
  }

  private toResponseDto(apiKey: ApiKey): ApiKeyResponseDto {
    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPreview: apiKey.keyPreview,
      createdById: apiKey.createdById,
      lastUsedAt: apiKey.lastUsedAt,
      revokedAt: apiKey.revokedAt,
      createdAt: apiKey.createdAt,
    };
  }
}

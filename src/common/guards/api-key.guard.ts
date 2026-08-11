import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { hashApiKey } from '../utils/api-key.util';
import { PrismaService } from '../../modules/prisma/prisma.service';

/**
 * Authenticates requests to the public API (/public/v1/*) via an X-API-Key
 * header, separate from the main app's JwtAuthGuard. On success, attaches
 * request.apiKeyContext so handlers can scope queries to the key's org
 * (see CurrentApiKeyOrg decorator).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawKey = this.extractKey(request);
    if (!rawKey) {
      throw new UnauthorizedException('Missing API key');
    }

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { hashedKey: hashApiKey(rawKey) },
    });

    if (!apiKey || apiKey.revokedAt) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    request.apiKeyContext = {
      organizationId: apiKey.organizationId,
      apiKeyId: apiKey.id,
    };

    // Best-effort usage tracking — never block the request on it.
    this.prisma.apiKey
      .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      .catch((error: unknown) => {
        this.logger.warn(
          `Failed to update lastUsedAt for API key ${apiKey.id}: ${String(error)}`,
        );
      });

    return true;
  }

  private extractKey(request: Request): string | undefined {
    const header = request.headers['x-api-key'];
    return typeof header === 'string' ? header : undefined;
  }
}

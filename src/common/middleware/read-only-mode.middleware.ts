import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SubscriptionStatus } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { JwtPayload } from '../../modules/auth/types/jwt-payload.interface';
import { PrismaService } from '../../modules/prisma/prisma.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const RESTRICTED_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.CANCELED,
]);

/**
 * Blocks mutating requests for organizations whose subscription has lapsed
 * (past_due/canceled), leaving reads open. Runs ahead of JwtAuthGuard, so it
 * decodes the token itself; any auth failure here is silently passed through
 * to let JwtAuthGuard produce the real 401.
 */
@Injectable()
export class ReadOnlyModeMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    const token = this.extractToken(req);
    if (!token) {
      return next();
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      return next();
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: payload.organizationId },
      select: { status: true },
    });

    if (subscription && RESTRICTED_STATUSES.has(subscription.status)) {
      throw new ForbiddenException(
        `This organization is in read-only mode because its subscription is ${subscription.status.toLowerCase().replace('_', ' ')}. Update your billing details to restore full access.`,
      );
    }

    next();
  }

  private extractToken(req: Request): string | undefined {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

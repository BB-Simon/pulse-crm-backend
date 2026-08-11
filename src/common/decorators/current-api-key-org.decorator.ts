import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/** Extracts the organizationId resolved by ApiKeyGuard. Must be used on a route guarded by ApiKeyGuard. */
export const CurrentApiKeyOrg = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.apiKeyContext) {
      throw new UnauthorizedException('Missing API key context');
    }
    return request.apiKeyContext.organizationId;
  },
);

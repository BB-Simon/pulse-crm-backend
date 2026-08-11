import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Rate-limits the public API per API key rather than per IP (the default),
 * since many integrations may share an egress IP and a single key should
 * have one shared budget regardless of source address. Must run after
 * ApiKeyGuard so request.apiKeyContext is already populated.
 */
@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    return Promise.resolve(req.apiKeyContext?.apiKeyId ?? req.ip ?? 'unknown');
  }
}

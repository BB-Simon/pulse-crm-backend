import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PlanLimitResource } from '../../modules/billing/plan-limit-resource.enum';
import { PlanLimitsService } from '../../modules/billing/plan-limits.service';
import { PLAN_LIMIT_KEY } from '../decorators/enforce-plan-limit.decorator';

@Injectable()
export class PlanLimitsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.getAllAndOverride<
      PlanLimitResource | undefined
    >(PLAN_LIMIT_KEY, [context.getHandler(), context.getClass()]);

    if (!resource) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const organizationId = request.user?.organizationId;
    if (!organizationId) {
      return true;
    }

    await this.planLimitsService.assertWithinLimit(organizationId, resource);
    return true;
  }
}

import { SetMetadata } from '@nestjs/common';
import { PlanLimitResource } from '../../modules/billing/plan-limit-resource.enum';

export const PLAN_LIMIT_KEY = 'planLimitResource';

/**
 * Marks a route as consuming one unit of the given plan-limited resource.
 * Requires PlanLimitsGuard to be applied (and JwtAuthGuard to run first so
 * request.user.organizationId is populated).
 */
export const EnforcePlanLimit = (resource: PlanLimitResource) =>
  SetMetadata(PLAN_LIMIT_KEY, resource);

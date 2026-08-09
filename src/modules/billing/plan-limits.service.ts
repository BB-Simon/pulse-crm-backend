import { Injectable, NotFoundException } from '@nestjs/common';
import { InviteStatus, Subscription } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlanLimitExceededException } from './exceptions/plan-limit-exceeded.exception';
import { PlanLimitResource } from './plan-limit-resource.enum';

interface UsageSnapshot {
  used: number;
  limit: number;
  label: string;
}

@Injectable()
export class PlanLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  async assertWithinLimit(
    organizationId: string,
    resource: PlanLimitResource,
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });
    if (!subscription) {
      throw new NotFoundException(
        'No subscription found for this organization',
      );
    }

    const { used, limit, label } = await this.getUsage(
      organizationId,
      resource,
      subscription,
    );

    if (used >= limit) {
      throw new PlanLimitExceededException(
        resource,
        `Upgrade required: the ${subscription.plan} plan allows up to ${limit} ${label}, and this organization has reached that limit.`,
      );
    }
  }

  private async getUsage(
    organizationId: string,
    resource: PlanLimitResource,
    subscription: Subscription,
  ): Promise<UsageSnapshot> {
    switch (resource) {
      case PlanLimitResource.SEATS: {
        const [userCount, pendingInviteCount] = await Promise.all([
          this.prisma.user.count({ where: { organizationId } }),
          this.prisma.invite.count({
            where: { organizationId, status: InviteStatus.PENDING },
          }),
        ]);
        return {
          used: userCount + pendingInviteCount,
          limit: subscription.seatLimit,
          label: 'seats',
        };
      }
      case PlanLimitResource.CONTACTS: {
        const contactCount = await this.prisma.contact.count({
          where: { organizationId },
        });
        return {
          used: contactCount,
          limit: subscription.contactLimit,
          label: 'contacts',
        };
      }
    }
  }
}

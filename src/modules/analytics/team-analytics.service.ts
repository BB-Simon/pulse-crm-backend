import { Injectable } from '@nestjs/common';
import { DealStatus, Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RepMetricsDto } from './dto/rep-metrics.dto';
import { TeamAnalyticsQueryDto } from './dto/team-analytics-query.dto';
import { TeamAnalyticsResponseDto } from './dto/team-analytics-response.dto';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

interface ClosedDeal {
  ownerId: string;
  value: Prisma.Decimal;
  status: DealStatus;
  createdAt: Date;
  closedAt: Date | null;
}

@Injectable()
export class TeamAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeamAnalytics(
    organizationId: string,
    query: TeamAnalyticsQueryDto,
  ): Promise<TeamAnalyticsResponseDto> {
    const { start, end } = this.resolveRange(query);

    const [users, closedDeals] = await Promise.all([
      this.prisma.user.findMany({
        where: { organizationId },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
      this.prisma.deal.findMany({
        where: {
          organizationId,
          status: { in: [DealStatus.WON, DealStatus.LOST] },
          ...(start || end
            ? {
                closedAt: {
                  ...(start ? { gte: start } : {}),
                  ...(end ? { lt: end } : {}),
                },
              }
            : {}),
        },
        select: {
          ownerId: true,
          value: true,
          status: true,
          createdAt: true,
          closedAt: true,
        },
      }),
    ]);

    const dealsByOwner = new Map<string, ClosedDeal[]>();
    for (const deal of closedDeals) {
      const list = dealsByOwner.get(deal.ownerId) ?? [];
      list.push(deal);
      dealsByOwner.set(deal.ownerId, list);
    }

    const reps = users.map((user) =>
      this.toRepMetrics(user, dealsByOwner.get(user.id) ?? []),
    );

    return { rangeStart: start ?? null, rangeEnd: end ?? null, reps };
  }

  private toRepMetrics(
    user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'role'>,
    deals: ClosedDeal[],
  ): RepMetricsDto {
    const won = deals.filter((deal) => deal.status === DealStatus.WON);

    const totalRevenue = won.reduce((sum, deal) => sum + Number(deal.value), 0);

    const conversionRate = deals.length > 0 ? won.length / deals.length : 0;

    const cycleDays = won
      .filter(
        (deal): deal is ClosedDeal & { closedAt: Date } =>
          deal.closedAt !== null,
      )
      .map(
        (deal) =>
          (deal.closedAt.getTime() - deal.createdAt.getTime()) / MS_PER_DAY,
      );
    const avgDealCycleDays =
      cycleDays.length > 0
        ? cycleDays.reduce((sum, days) => sum + days, 0) / cycleDays.length
        : null;

    return {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      dealsClosed: won.length,
      totalRevenue,
      conversionRate,
      avgDealCycleDays,
    };
  }

  /** endDate is inclusive of the whole day, so the upper bound is exclusive (endDate + 1 day). */
  private resolveRange(query: TeamAnalyticsQueryDto): {
    start?: Date;
    end?: Date;
  } {
    const start = query.startDate ? new Date(query.startDate) : undefined;
    const end = query.endDate
      ? new Date(new Date(query.endDate).getTime() + MS_PER_DAY)
      : undefined;
    return { start, end };
  }
}

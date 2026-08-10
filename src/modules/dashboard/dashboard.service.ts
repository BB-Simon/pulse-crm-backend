import { Injectable } from '@nestjs/common';
import { DealStatus, Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { DealsThisMonthDto } from './dto/deals-this-month.dto';
import { PipelineStageValueDto } from './dto/pipeline-stage-value.dto';
import { RevenueTrendPointDto } from './dto/revenue-trend-point.dto';

const REVENUE_TREND_MONTHS = 6;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(user: AuthenticatedUser): Promise<DashboardResponseDto> {
    const dealWhere = this.resolveDealVisibility(user);

    const [pipelineByStage, dealsThisMonth, revenueTrend] = await Promise.all([
      this.getPipelineByStage(user.organizationId, dealWhere),
      this.getDealsThisMonth(dealWhere),
      this.getRevenueTrend(dealWhere),
    ]);

    return { pipelineByStage, dealsThisMonth, revenueTrend };
  }

  private resolveDealVisibility(
    user: AuthenticatedUser,
  ): Prisma.DealWhereInput {
    const base: Prisma.DealWhereInput = { organizationId: user.organizationId };
    return user.role === Role.REP ? { ...base, ownerId: user.id } : base;
  }

  private async getPipelineByStage(
    organizationId: string,
    dealWhere: Prisma.DealWhereInput,
  ): Promise<PipelineStageValueDto[]> {
    const [stages, grouped] = await Promise.all([
      this.prisma.pipelineStage.findMany({
        where: { organizationId },
        orderBy: { order: 'asc' },
      }),
      this.prisma.deal.groupBy({
        by: ['pipelineStageId'],
        where: dealWhere,
        _sum: { value: true },
        _count: { _all: true },
      }),
    ]);

    const byStageId = new Map(
      grouped.map((group) => [group.pipelineStageId, group]),
    );

    return stages.map((stage) => {
      const group = byStageId.get(stage.id);
      return {
        pipelineStageId: stage.id,
        stageName: stage.name,
        order: stage.order,
        dealCount: group?._count._all ?? 0,
        totalValue: group?._sum.value ? Number(group._sum.value) : 0,
      };
    });
  }

  private async getDealsThisMonth(
    dealWhere: Prisma.DealWhereInput,
  ): Promise<DealsThisMonthDto> {
    const { start, end } = this.monthRange(0);

    const [won, lost] = await Promise.all([
      this.prisma.deal.aggregate({
        where: {
          ...dealWhere,
          status: DealStatus.WON,
          closedAt: { gte: start, lt: end },
        },
        _sum: { value: true },
        _count: { _all: true },
      }),
      this.prisma.deal.aggregate({
        where: {
          ...dealWhere,
          status: DealStatus.LOST,
          closedAt: { gte: start, lt: end },
        },
        _sum: { value: true },
        _count: { _all: true },
      }),
    ]);

    return {
      won: {
        count: won._count._all,
        value: won._sum.value ? Number(won._sum.value) : 0,
      },
      lost: {
        count: lost._count._all,
        value: lost._sum.value ? Number(lost._sum.value) : 0,
      },
    };
  }

  private async getRevenueTrend(
    dealWhere: Prisma.DealWhereInput,
  ): Promise<RevenueTrendPointDto[]> {
    const monthOffsets = Array.from(
      { length: REVENUE_TREND_MONTHS },
      (_, i) => REVENUE_TREND_MONTHS - 1 - i,
    );

    return Promise.all(
      monthOffsets.map(async (monthsAgo) => {
        const { key, start, end } = this.monthRange(monthsAgo);
        const aggregate = await this.prisma.deal.aggregate({
          where: {
            ...dealWhere,
            status: DealStatus.WON,
            closedAt: { gte: start, lt: end },
          },
          _sum: { value: true },
        });
        return {
          month: key,
          revenue: aggregate._sum.value ? Number(aggregate._sum.value) : 0,
        };
      }),
    );
  }

  /** UTC calendar-month range starting `monthsAgo` months before the current month. */
  private monthRange(monthsAgo: number): {
    key: string;
    start: Date;
    end: Date;
  } {
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1),
    );
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo + 1, 1),
    );
    const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    return { key, start, end };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Deal, DealStatus, PipelineStage, Prisma } from '@prisma/client';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import { OrgMembershipService } from '../../common/services/org-membership.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicDealListResponseDto } from './dto/public-deal-list-response.dto';
import { PublicDealQueryDto } from './dto/public-deal-query.dto';
import { PublicDealResponseDto } from './dto/public-deal-response.dto';
import { PublicCreateDealDto } from './dto/public-create-deal.dto';
import { PublicPipelineStageResponseDto } from './dto/public-pipeline-stage-response.dto';

/**
 * Public-API counterpart to DealsService — see PublicContactsService for why
 * this is a separate service rather than reusing the internal one.
 */
@Injectable()
export class PublicDealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgMembership: OrgMembershipService,
  ) {}

  async list(
    organizationId: string,
    query: PublicDealQueryDto,
  ): Promise<PublicDealListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.DealWhereInput = {
      organizationId,
      ...(query.pipelineStageId
        ? { pipelineStageId: query.pipelineStageId }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deal.count({ where }),
    ]);

    return {
      data: rows.map((deal) => this.toResponseDto(deal)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(
    organizationId: string,
    id: string,
  ): Promise<PublicDealResponseDto> {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId },
    });
    if (!deal) {
      throw new NotFoundException('Deal not found');
    }
    return this.toResponseDto(deal);
  }

  async create(
    organizationId: string,
    dto: PublicCreateDealDto,
  ): Promise<PublicDealResponseDto> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: dto.contactId, organizationId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found in this organization');
    }

    const ownerId = await this.orgMembership.assertUserInOrg(
      organizationId,
      dto.ownerId,
    );
    const stage = await this.resolvePipelineStage(
      organizationId,
      dto.pipelineStageId,
    );

    const companyId = dto.companyId ?? contact.companyId ?? undefined;
    if (dto.companyId) {
      await this.assertCompanyInOrg(organizationId, dto.companyId);
    }

    const status = this.statusForStage(stage);

    const deal = await this.prisma.deal.create({
      data: {
        organizationId,
        ownerId,
        contactId: contact.id,
        companyId,
        pipelineStageId: stage.id,
        title: dto.title,
        value: dto.value,
        status,
        expectedCloseDate: dto.expectedCloseDate
          ? new Date(dto.expectedCloseDate)
          : undefined,
        closedAt: status !== DealStatus.OPEN ? new Date() : undefined,
      },
    });
    return this.toResponseDto(deal);
  }

  async listPipelineStages(
    organizationId: string,
  ): Promise<PublicPipelineStageResponseDto[]> {
    const stages = await this.prisma.pipelineStage.findMany({
      where: { organizationId },
      orderBy: { order: 'asc' },
    });
    return stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      order: stage.order,
      isWon: stage.isWon,
      isLost: stage.isLost,
    }));
  }

  private async resolvePipelineStage(
    organizationId: string,
    pipelineStageId?: string,
  ): Promise<PipelineStage> {
    if (pipelineStageId) {
      const stage = await this.prisma.pipelineStage.findFirst({
        where: { id: pipelineStageId, organizationId },
      });
      if (!stage) {
        throw new NotFoundException(
          'Pipeline stage not found in this organization',
        );
      }
      return stage;
    }

    const defaultStage = await this.prisma.pipelineStage.findFirst({
      where: { organizationId },
      orderBy: { order: 'asc' },
    });
    if (!defaultStage) {
      throw new NotFoundException(
        'No pipeline stages configured for this organization',
      );
    }
    return defaultStage;
  }

  private statusForStage(stage: PipelineStage): DealStatus {
    if (stage.isWon) return DealStatus.WON;
    if (stage.isLost) return DealStatus.LOST;
    return DealStatus.OPEN;
  }

  private async assertCompanyInOrg(
    organizationId: string,
    companyId: string,
  ): Promise<void> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, organizationId },
    });
    if (!company) {
      throw new NotFoundException('Company not found in this organization');
    }
  }

  private toResponseDto(deal: Deal): PublicDealResponseDto {
    return {
      id: deal.id,
      ownerId: deal.ownerId,
      contactId: deal.contactId,
      companyId: deal.companyId,
      pipelineStageId: deal.pipelineStageId,
      title: deal.title,
      value: Number(deal.value),
      status: deal.status,
      expectedCloseDate: deal.expectedCloseDate,
      closedAt: deal.closedAt,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
    };
  }
}

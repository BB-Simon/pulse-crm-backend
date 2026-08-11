import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Deal, DealStatus, PipelineStage, Prisma, Role } from '@prisma/client';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { OrgMembershipService } from '../../common/services/org-membership.service';
import { ContactsService } from '../contacts/contacts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { WebhookDeliveryService } from '../webhooks/webhook-delivery.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { DealListResponseDto } from './dto/deal-list-response.dto';
import { DealQueryDto } from './dto/deal-query.dto';
import { DealResponseDto } from './dto/deal-response.dto';
import { MoveDealStageDto } from './dto/move-deal-stage.dto';
import { PipelineStageResponseDto } from './dto/pipeline-stage-response.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgMembership: OrgMembershipService,
    private readonly contactsService: ContactsService,
    private readonly notificationsService: NotificationsService,
    private readonly webhookDeliveryService: WebhookDeliveryService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: DealQueryDto,
  ): Promise<DealListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.DealWhereInput = {
      organizationId: user.organizationId,
      ...(query.pipelineStageId
        ? { pipelineStageId: query.pipelineStageId }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...this.resolveOwnerFilter(user, query.ownerId),
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

  async listPipelineStages(
    user: AuthenticatedUser,
  ): Promise<PipelineStageResponseDto[]> {
    const stages = await this.prisma.pipelineStage.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { order: 'asc' },
    });
    return stages.map((stage) => ({
      id: stage.id,
      organizationId: stage.organizationId,
      name: stage.name,
      order: stage.order,
      isWon: stage.isWon,
      isLost: stage.isLost,
    }));
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<DealResponseDto> {
    const deal = await this.getVisibleOrThrow(user, id);
    return this.toResponseDto(deal);
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateDealDto,
  ): Promise<DealResponseDto> {
    const contact = await this.contactsService.findOne(user, dto.contactId);
    const ownerId = await this.orgMembership.resolveOwnerId(user, dto.ownerId);
    const stage = await this.resolvePipelineStage(
      user.organizationId,
      dto.pipelineStageId,
    );

    const companyId = dto.companyId ?? contact.companyId ?? undefined;
    if (dto.companyId) {
      await this.assertCompanyInOrg(user.organizationId, dto.companyId);
    }

    const status = this.statusForStage(stage);

    const deal = await this.prisma.deal.create({
      data: {
        organizationId: user.organizationId,
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

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateDealDto,
  ): Promise<DealResponseDto> {
    const existing = await this.getVisibleOrThrow(user, id);

    let ownerId: string | undefined;
    if (dto.ownerId !== undefined && dto.ownerId !== existing.ownerId) {
      if (user.role === Role.REP) {
        throw new ForbiddenException('Reps cannot reassign deal ownership');
      }
      ownerId = await this.orgMembership.assertUserInOrg(
        user.organizationId,
        dto.ownerId,
      );
    }

    if (dto.contactId !== undefined && dto.contactId !== existing.contactId) {
      await this.contactsService.findOne(user, dto.contactId);
    }

    if (dto.companyId !== undefined) {
      await this.assertCompanyInOrg(user.organizationId, dto.companyId);
    }

    const deal = await this.prisma.deal.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.value !== undefined ? { value: dto.value } : {}),
        ...(dto.contactId !== undefined ? { contactId: dto.contactId } : {}),
        ...(dto.companyId !== undefined ? { companyId: dto.companyId } : {}),
        ...(dto.expectedCloseDate !== undefined
          ? { expectedCloseDate: new Date(dto.expectedCloseDate) }
          : {}),
        ...(ownerId !== undefined ? { ownerId } : {}),
      },
    });
    return this.toResponseDto(deal);
  }

  async moveStage(
    user: AuthenticatedUser,
    id: string,
    dto: MoveDealStageDto,
  ): Promise<DealResponseDto> {
    const existing = await this.getVisibleOrThrow(user, id);
    const stage = await this.resolvePipelineStage(
      user.organizationId,
      dto.pipelineStageId,
    );
    const status = this.statusForStage(stage);

    const deal = await this.prisma.deal.update({
      where: { id },
      data: {
        pipelineStageId: stage.id,
        status,
        closedAt: status !== DealStatus.OPEN ? new Date() : null,
      },
    });

    if (existing.pipelineStageId !== stage.id) {
      const fromStage = await this.prisma.pipelineStage.findUnique({
        where: { id: existing.pipelineStageId },
      });
      await this.notificationsService.enqueueDealStageChanged({
        organizationId: user.organizationId,
        dealId: deal.id,
        dealTitle: deal.title,
        dealOwnerId: deal.ownerId,
        fromStage: fromStage?.name ?? existing.pipelineStageId,
        toStage: stage.name,
        changedByUserId: user.id,
      });
      this.realtimeGateway.broadcastDealStageChanged(user.organizationId, {
        dealId: deal.id,
        dealTitle: deal.title,
        dealOwnerId: deal.ownerId,
        fromStageId: existing.pipelineStageId,
        fromStageName: fromStage?.name ?? existing.pipelineStageId,
        toStageId: stage.id,
        toStageName: stage.name,
        changedByUserId: user.id,
        changedAt: deal.updatedAt.toISOString(),
      });
    }

    if (stage.isWon && existing.status !== DealStatus.WON) {
      await this.webhookDeliveryService.enqueueDealWon(user.organizationId, {
        dealId: deal.id,
        title: deal.title,
        value: Number(deal.value),
        contactId: deal.contactId,
        wonAt: (deal.closedAt ?? new Date()).toISOString(),
      });
    }

    return this.toResponseDto(deal);
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    await this.getVisibleOrThrow(user, id);
    await this.prisma.deal.delete({ where: { id } });
  }

  private async getVisibleOrThrow(
    user: AuthenticatedUser,
    id: string,
  ): Promise<Deal> {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!deal || !this.isVisible(user, deal)) {
      throw new NotFoundException('Deal not found');
    }
    return deal;
  }

  private isVisible(
    user: AuthenticatedUser,
    deal: Pick<Deal, 'ownerId'>,
  ): boolean {
    return user.role !== Role.REP || deal.ownerId === user.id;
  }

  private resolveOwnerFilter(
    user: AuthenticatedUser,
    ownerId?: string,
  ): Prisma.DealWhereInput {
    if (user.role === Role.REP) {
      return { ownerId: user.id };
    }
    return ownerId ? { ownerId } : {};
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

  private toResponseDto(deal: Deal): DealResponseDto {
    return {
      id: deal.id,
      organizationId: deal.organizationId,
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

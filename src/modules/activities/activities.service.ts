import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Activity, Prisma, Role } from '@prisma/client';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ContactsService } from '../contacts/contacts.service';
import { DealsService } from '../deals/deals.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityListResponseDto } from './dto/activity-list-response.dto';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { ActivityResponseDto } from './dto/activity-response.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contactsService: ContactsService,
    private readonly dealsService: DealsService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: ActivityQueryDto,
  ): Promise<ActivityListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ActivityWhereInput = {
      organizationId: user.organizationId,
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.dealId ? { dealId: query.dealId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(user.role === Role.REP ? { contact: { ownerId: user.id } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      data: rows.map((activity) => this.toResponseDto(activity)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(
    user: AuthenticatedUser,
    id: string,
  ): Promise<ActivityResponseDto> {
    const activity = await this.getVisibleOrThrow(user, id);
    return this.toResponseDto(activity);
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateActivityDto,
  ): Promise<ActivityResponseDto> {
    const contact = await this.contactsService.findOne(user, dto.contactId);

    if (dto.dealId) {
      await this.assertDealMatchesContact(user, dto.dealId, contact.id);
    }

    const activity = await this.prisma.activity.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        contactId: contact.id,
        dealId: dto.dealId,
        type: dto.type,
        content: dto.content,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      },
    });
    return this.toResponseDto(activity);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateActivityDto,
  ): Promise<ActivityResponseDto> {
    const existing = await this.getVisibleOrThrow(user, id);

    if (dto.dealId) {
      // contactId is always set by create(); this record was made through this API.
      await this.assertDealMatchesContact(
        user,
        dto.dealId,
        existing.contactId!,
      );
    }

    const activity = await this.prisma.activity.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.dealId !== undefined ? { dealId: dto.dealId } : {}),
        ...(dto.occurredAt !== undefined
          ? { occurredAt: new Date(dto.occurredAt) }
          : {}),
      },
    });
    return this.toResponseDto(activity);
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    await this.getVisibleOrThrow(user, id);
    await this.prisma.activity.delete({ where: { id } });
  }

  private async getVisibleOrThrow(
    user: AuthenticatedUser,
    id: string,
  ): Promise<Activity> {
    const activity = await this.prisma.activity.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        ...(user.role === Role.REP ? { contact: { ownerId: user.id } } : {}),
      },
    });
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }
    return activity;
  }

  private async assertDealMatchesContact(
    user: AuthenticatedUser,
    dealId: string,
    contactId: string,
  ): Promise<void> {
    const deal = await this.dealsService.findOne(user, dealId);
    if (deal.contactId !== contactId) {
      throw new BadRequestException(
        'The given deal does not belong to the given contact',
      );
    }
  }

  private toResponseDto(activity: Activity): ActivityResponseDto {
    return {
      id: activity.id,
      organizationId: activity.organizationId,
      userId: activity.userId,
      contactId: activity.contactId,
      dealId: activity.dealId,
      type: activity.type,
      content: activity.content,
      occurredAt: activity.occurredAt,
      createdAt: activity.createdAt,
    };
  }
}

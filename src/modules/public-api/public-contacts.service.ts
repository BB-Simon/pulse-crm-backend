import { Injectable, NotFoundException } from '@nestjs/common';
import { Contact, Prisma } from '@prisma/client';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import { OrgMembershipService } from '../../common/services/org-membership.service';
import { PlanLimitResource } from '../billing/plan-limit-resource.enum';
import { PlanLimitsService } from '../billing/plan-limits.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicContactListResponseDto } from './dto/public-contact-list-response.dto';
import { PublicContactQueryDto } from './dto/public-contact-query.dto';
import { PublicContactResponseDto } from './dto/public-contact-response.dto';
import { PublicCreateContactDto } from './dto/public-create-contact.dto';

/**
 * Public-API counterpart to ContactsService. Deliberately separate: there is
 * no per-user Rep/Manager/Admin visibility concept for an API-key-scoped
 * integration, so this always operates at the full organization level.
 */
@Injectable()
export class PublicContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgMembership: OrgMembershipService,
    private readonly planLimitsService: PlanLimitsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(
    organizationId: string,
    query: PublicContactQueryDto,
  ): Promise<PublicContactListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ContactWhereInput = {
      organizationId,
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data: rows.map((contact) => this.toResponseDto(contact)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(
    organizationId: string,
    id: string,
  ): Promise<PublicContactResponseDto> {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    return this.toResponseDto(contact);
  }

  async create(
    organizationId: string,
    dto: PublicCreateContactDto,
  ): Promise<PublicContactResponseDto> {
    await this.planLimitsService.assertWithinLimit(
      organizationId,
      PlanLimitResource.CONTACTS,
    );
    const ownerId = await this.orgMembership.assertUserInOrg(
      organizationId,
      dto.ownerId,
    );
    if (dto.companyId) {
      await this.assertCompanyInOrg(organizationId, dto.companyId);
    }

    const contact = await this.prisma.contact.create({
      data: {
        organizationId,
        ownerId,
        companyId: dto.companyId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        tags: dto.tags ?? [],
      },
    });

    await this.notificationsService.enqueueLeadAssigned({
      organizationId,
      contactId: contact.id,
      contactName: `${contact.firstName} ${contact.lastName}`,
      assignedToUserId: ownerId,
      assignedByUserId: ownerId,
    });

    return this.toResponseDto(contact);
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

  private toResponseDto(contact: Contact): PublicContactResponseDto {
    return {
      id: contact.id,
      ownerId: contact.ownerId,
      companyId: contact.companyId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      tags: contact.tags,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  }
}

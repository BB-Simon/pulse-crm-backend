import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Contact, Prisma, Role } from '@prisma/client';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { OrgMembershipService } from '../../common/services/org-membership.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContactListResponseDto } from './dto/contact-list-response.dto';
import { ContactQueryDto } from './dto/contact-query.dto';
import { ContactResponseDto } from './dto/contact-response.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgMembership: OrgMembershipService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: ContactQueryDto,
  ): Promise<ContactListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ContactWhereInput = {
      organizationId: user.organizationId,
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...this.resolveOwnerFilter(user, query.ownerId),
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
    user: AuthenticatedUser,
    id: string,
  ): Promise<ContactResponseDto> {
    const contact = await this.getVisibleOrThrow(user, id);
    return this.toResponseDto(contact);
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateContactDto,
  ): Promise<ContactResponseDto> {
    const ownerId = await this.orgMembership.resolveOwnerId(user, dto.ownerId);

    if (dto.companyId) {
      await this.assertCompanyInOrg(user.organizationId, dto.companyId);
    }

    const contact = await this.prisma.contact.create({
      data: {
        organizationId: user.organizationId,
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
      organizationId: user.organizationId,
      contactId: contact.id,
      contactName: `${contact.firstName} ${contact.lastName}`,
      assignedToUserId: ownerId,
      assignedByUserId: user.id,
    });

    return this.toResponseDto(contact);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateContactDto,
  ): Promise<ContactResponseDto> {
    const existing = await this.getVisibleOrThrow(user, id);

    let ownerId: string | undefined;
    if (dto.ownerId !== undefined && dto.ownerId !== existing.ownerId) {
      if (user.role === Role.REP) {
        throw new ForbiddenException('Reps cannot reassign contact ownership');
      }
      ownerId = await this.orgMembership.assertUserInOrg(
        user.organizationId,
        dto.ownerId,
      );
    }

    if (dto.companyId !== undefined) {
      await this.assertCompanyInOrg(user.organizationId, dto.companyId);
    }

    const contact = await this.prisma.contact.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.companyId !== undefined ? { companyId: dto.companyId } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
        ...(ownerId !== undefined ? { ownerId } : {}),
      },
    });
    return this.toResponseDto(contact);
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    await this.getVisibleOrThrow(user, id);
    await this.prisma.contact.delete({ where: { id } });
  }

  private async getVisibleOrThrow(
    user: AuthenticatedUser,
    id: string,
  ): Promise<Contact> {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!contact || !this.isVisible(user, contact)) {
      throw new NotFoundException('Contact not found');
    }
    return contact;
  }

  private isVisible(
    user: AuthenticatedUser,
    contact: Pick<Contact, 'ownerId'>,
  ): boolean {
    return user.role !== Role.REP || contact.ownerId === user.id;
  }

  private resolveOwnerFilter(
    user: AuthenticatedUser,
    ownerId?: string,
  ): Prisma.ContactWhereInput {
    if (user.role === Role.REP) {
      return { ownerId: user.id };
    }
    return ownerId ? { ownerId } : {};
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

  private toResponseDto(contact: Contact): ContactResponseDto {
    return {
      id: contact.id,
      organizationId: contact.organizationId,
      ownerId: contact.ownerId,
      companyId: contact.companyId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      tags: contact.tags,
      leadScore: contact.leadScore,
      leadScoreRationale: contact.leadScoreRationale,
      leadScoredAt: contact.leadScoredAt,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  }
}

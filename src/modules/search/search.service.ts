import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResponseDto } from './dto/search-response.dto';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    user: AuthenticatedUser,
    query: SearchQueryDto,
  ): Promise<SearchResponseDto> {
    const limit = query.limit ?? 10;
    const term = query.q;
    const ownerScope =
      user.role === Role.REP ? { ownerId: user.id } : undefined;

    const contactWhere: Prisma.ContactWhereInput = {
      organizationId: user.organizationId,
      ...ownerScope,
      OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { company: { name: { contains: term, mode: 'insensitive' } } },
      ],
    };

    const dealWhere: Prisma.DealWhereInput = {
      organizationId: user.organizationId,
      ...ownerScope,
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { company: { name: { contains: term, mode: 'insensitive' } } },
        { contact: { firstName: { contains: term, mode: 'insensitive' } } },
        { contact: { lastName: { contains: term, mode: 'insensitive' } } },
        { contact: { email: { contains: term, mode: 'insensitive' } } },
      ],
    };

    const [contacts, deals] = await Promise.all([
      this.prisma.contact.findMany({
        where: contactWhere,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { company: { select: { name: true } } },
      }),
      this.prisma.deal.findMany({
        where: dealWhere,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { name: true } },
          contact: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      contacts: contacts.map((contact) => ({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        companyId: contact.companyId,
        companyName: contact.company?.name ?? null,
      })),
      deals: deals.map((deal) => ({
        id: deal.id,
        title: deal.title,
        value: Number(deal.value),
        status: deal.status,
        contactId: deal.contactId,
        contactName: `${deal.contact.firstName} ${deal.contact.lastName}`,
        companyId: deal.companyId,
        companyName: deal.company?.name ?? null,
      })),
    };
  }
}

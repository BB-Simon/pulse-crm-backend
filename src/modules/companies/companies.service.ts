import { Injectable, NotFoundException } from '@nestjs/common';
import { Company, Prisma } from '@prisma/client';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyListResponseDto } from './dto/company-list-response.dto';
import { CompanyQueryDto } from './dto/company-query.dto';
import { CompanyResponseDto } from './dto/company-response.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: AuthenticatedUser,
    query: CompanyQueryDto,
  ): Promise<CompanyListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.CompanyWhereInput = {
      organizationId: user.organizationId,
    };

    const [rows, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data: rows.map((company) => this.toResponseDto(company)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(
    user: AuthenticatedUser,
    id: string,
  ): Promise<CompanyResponseDto> {
    const company = await this.getOrgScoped(user.organizationId, id);
    return this.toResponseDto(company);
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateCompanyDto,
  ): Promise<CompanyResponseDto> {
    const company = await this.prisma.company.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name,
        domain: dto.domain,
        industry: dto.industry,
      },
    });
    return this.toResponseDto(company);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    await this.getOrgScoped(user.organizationId, id);

    const company = await this.prisma.company.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.domain !== undefined ? { domain: dto.domain } : {}),
        ...(dto.industry !== undefined ? { industry: dto.industry } : {}),
      },
    });
    return this.toResponseDto(company);
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    await this.getOrgScoped(user.organizationId, id);
    await this.prisma.company.delete({ where: { id } });
  }

  private async getOrgScoped(
    organizationId: string,
    id: string,
  ): Promise<Company> {
    const company = await this.prisma.company.findFirst({
      where: { id, organizationId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  private toResponseDto(company: Company): CompanyResponseDto {
    return {
      id: company.id,
      organizationId: company.organizationId,
      name: company.name,
      domain: company.domain,
      industry: company.industry,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { isEmail } from 'class-validator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import {
  ContactImportPreviewResponseDto,
  SuggestedContactMappingDto,
} from './dto/import/contact-import-preview-response.dto';
import { ContactImportResultDto } from './dto/import/contact-import-result.dto';
import { ImportContactsDto } from './dto/import/import-contacts.dto';

const MAX_FILE_ROWS = 5000;
const PREVIEW_SAMPLE_SIZE = 5;
const MAX_FIELD_LENGTH = 200;

const HEADER_ALIASES: Record<keyof SuggestedContactMappingDto, string[]> = {
  firstNameColumn: ['firstname', 'fname', 'first'],
  lastNameColumn: ['lastname', 'lname', 'last', 'surname'],
  emailColumn: ['email', 'emailaddress'],
  phoneColumn: ['phone', 'phonenumber', 'mobile', 'telephone', 'cell'],
  tagsColumn: ['tags', 'tag', 'labels'],
  ownerEmailColumn: [
    'owner',
    'owneremail',
    'assignedto',
    'repemail',
    'salesrep',
  ],
};

type CsvRow = Record<string, string>;

@Injectable()
export class ContactImportService {
  constructor(private readonly prisma: PrismaService) {}

  preview(
    file: Express.Multer.File | undefined,
  ): ContactImportPreviewResponseDto {
    const rows = this.parseFile(file);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      headers,
      totalRows: rows.length,
      sampleRows: rows.slice(0, PREVIEW_SAMPLE_SIZE),
      suggestedMapping: this.suggestMapping(headers),
    };
  }

  async commit(
    user: AuthenticatedUser,
    file: Express.Multer.File | undefined,
    dto: ImportContactsDto,
  ): Promise<ContactImportResultDto> {
    const rows = this.parseFile(file);
    this.assertColumnExists(rows, dto.firstNameColumn, 'firstNameColumn');
    this.assertColumnExists(rows, dto.lastNameColumn, 'lastNameColumn');
    if (dto.emailColumn)
      this.assertColumnExists(rows, dto.emailColumn, 'emailColumn');
    if (dto.phoneColumn)
      this.assertColumnExists(rows, dto.phoneColumn, 'phoneColumn');
    if (dto.tagsColumn)
      this.assertColumnExists(rows, dto.tagsColumn, 'tagsColumn');
    if (dto.ownerEmailColumn) {
      this.assertColumnExists(rows, dto.ownerEmailColumn, 'ownerEmailColumn');
    }

    const dryRun = dto.dryRun ?? false;
    const errors: { row: number; message: string }[] = [];
    const seenEmailsInFile = new Set<string>();

    const existingEmails = new Set(
      (
        await this.prisma.contact.findMany({
          where: { organizationId: user.organizationId, email: { not: null } },
          select: { email: true },
        })
      ).map((c) => c.email!.toLowerCase()),
    );

    const ownerEmailCache = new Map<string, string | null>();
    const remainingQuota = await this.getRemainingContactQuota(
      user.organizationId,
    );

    interface ValidatedRow {
      row: number;
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      tags: string[];
      ownerId: string;
    }
    const validRows: ValidatedRow[] = [];

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 1;
      const firstName = dto.firstNameColumn
        ? row[dto.firstNameColumn]?.trim()
        : '';
      const lastName = dto.lastNameColumn
        ? row[dto.lastNameColumn]?.trim()
        : '';
      const emailRaw = dto.emailColumn ? row[dto.emailColumn]?.trim() : '';
      const phone = dto.phoneColumn ? row[dto.phoneColumn]?.trim() : '';
      const tagsRaw = dto.tagsColumn ? row[dto.tagsColumn]?.trim() : '';
      const ownerEmailRaw = dto.ownerEmailColumn
        ? row[dto.ownerEmailColumn]?.trim()
        : '';

      if (!firstName || firstName.length > MAX_FIELD_LENGTH) {
        errors.push({
          row: rowNumber,
          message: 'firstName is required (max 200 chars)',
        });
        continue;
      }
      if (!lastName || lastName.length > MAX_FIELD_LENGTH) {
        errors.push({
          row: rowNumber,
          message: 'lastName is required (max 200 chars)',
        });
        continue;
      }

      let email: string | undefined;
      if (emailRaw) {
        if (!isEmail(emailRaw)) {
          errors.push({
            row: rowNumber,
            message: `"${emailRaw}" is not a valid email`,
          });
          continue;
        }
        email = emailRaw.toLowerCase();
        if (existingEmails.has(email)) {
          errors.push({
            row: rowNumber,
            message: `A contact with email ${email} already exists in this organization`,
          });
          continue;
        }
        if (seenEmailsInFile.has(email)) {
          errors.push({
            row: rowNumber,
            message: `Duplicate email ${email} appears earlier in this file`,
          });
          continue;
        }
      }

      let ownerId = user.id;
      if (ownerEmailRaw && user.role !== Role.REP) {
        if (!ownerEmailCache.has(ownerEmailRaw.toLowerCase())) {
          const owner = await this.prisma.user.findFirst({
            where: {
              organizationId: user.organizationId,
              email: ownerEmailRaw,
            },
          });
          ownerEmailCache.set(ownerEmailRaw.toLowerCase(), owner?.id ?? null);
        }
        const resolvedOwnerId = ownerEmailCache.get(
          ownerEmailRaw.toLowerCase(),
        );
        if (!resolvedOwnerId) {
          errors.push({
            row: rowNumber,
            message: `Owner email "${ownerEmailRaw}" not found in this organization`,
          });
          continue;
        }
        ownerId = resolvedOwnerId;
      }

      if (email) seenEmailsInFile.add(email);

      validRows.push({
        row: rowNumber,
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        tags: tagsRaw
          ? tagsRaw
              .split(';')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        ownerId,
      });
    }

    const importable = validRows.slice(0, remainingQuota);
    const overQuota = validRows.slice(remainingQuota);
    for (const row of overQuota) {
      errors.push({
        row: row.row,
        message:
          'Contact limit reached for the current plan — upgrade required',
      });
    }

    if (!dryRun) {
      for (const row of importable) {
        await this.prisma.contact.create({
          data: {
            organizationId: user.organizationId,
            ownerId: row.ownerId,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone,
            tags: row.tags,
          },
        });
      }
    }

    errors.sort((a, b) => a.row - b.row);

    return {
      dryRun,
      totalRows: rows.length,
      importedCount: importable.length,
      skippedCount: rows.length - importable.length,
      errors,
    };
  }

  private parseFile(file: Express.Multer.File | undefined): CsvRow[] {
    if (!file) {
      throw new BadRequestException('A CSV file is required');
    }
    if (
      !file.originalname.toLowerCase().endsWith('.csv') &&
      !file.mimetype.includes('csv')
    ) {
      throw new BadRequestException('File must be a .csv file');
    }

    let rows: CsvRow[];
    try {
      rows = parse(file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }) as CsvRow[];
    } catch (error) {
      throw new BadRequestException(
        `Could not parse CSV file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (rows.length === 0) {
      throw new BadRequestException('CSV file has no data rows');
    }
    if (rows.length > MAX_FILE_ROWS) {
      throw new BadRequestException(
        `CSV file has ${rows.length} rows; the maximum supported is ${MAX_FILE_ROWS}`,
      );
    }

    return rows;
  }

  private assertColumnExists(
    rows: CsvRow[],
    column: string,
    field: string,
  ): void {
    if (!(column in rows[0])) {
      throw new BadRequestException(
        `${field} references column "${column}", which was not found in the CSV header`,
      );
    }
  }

  private suggestMapping(headers: string[]): SuggestedContactMappingDto {
    const normalize = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedHeaders = headers.map((header) => ({
      header,
      normalized: normalize(header),
    }));

    const findMatch = (aliases: string[]): string | null => {
      const match = normalizedHeaders.find(({ normalized }) =>
        aliases.includes(normalized),
      );
      return match?.header ?? null;
    };

    return {
      firstNameColumn: findMatch(HEADER_ALIASES.firstNameColumn),
      lastNameColumn: findMatch(HEADER_ALIASES.lastNameColumn),
      emailColumn: findMatch(HEADER_ALIASES.emailColumn),
      phoneColumn: findMatch(HEADER_ALIASES.phoneColumn),
      tagsColumn: findMatch(HEADER_ALIASES.tagsColumn),
      ownerEmailColumn: findMatch(HEADER_ALIASES.ownerEmailColumn),
    };
  }

  /**
   * Bulk imports need "how many more fit" rather than PlanLimitsService's
   * single-record assertWithinLimit, so the usage snapshot is queried
   * directly here instead.
   */
  private async getRemainingContactQuota(
    organizationId: string,
  ): Promise<number> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });
    if (!subscription) {
      throw new BadRequestException(
        'No subscription found for this organization',
      );
    }
    const currentCount = await this.prisma.contact.count({
      where: { organizationId },
    });
    return Math.max(0, subscription.contactLimit - currentCount);
  }
}

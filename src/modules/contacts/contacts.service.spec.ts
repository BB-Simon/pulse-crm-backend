import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Contact, Role } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { OrgMembershipService } from '../../common/services/org-membership.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from './contacts.service';

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'contact-1',
    organizationId: 'org-1',
    ownerId: 'rep-1',
    companyId: null,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: null,
    tags: [],
    leadScore: null,
    leadScoreRationale: null,
    leadScoredAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return { id: 'rep-1', organizationId: 'org-1', role: Role.REP, ...overrides };
}

describe('ContactsService', () => {
  let prisma: {
    contact: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    company: { findFirst: jest.Mock };
  };
  let orgMembership: { resolveOwnerId: jest.Mock; assertUserInOrg: jest.Mock };
  let notificationsService: { enqueueLeadAssigned: jest.Mock };
  let service: ContactsService;

  beforeEach(() => {
    prisma = {
      contact: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      company: { findFirst: jest.fn() },
    };
    orgMembership = { resolveOwnerId: jest.fn(), assertUserInOrg: jest.fn() };
    notificationsService = { enqueueLeadAssigned: jest.fn() };

    service = new ContactsService(
      prisma as unknown as PrismaService,
      orgMembership as unknown as OrgMembershipService,
      notificationsService as unknown as NotificationsService,
    );
  });

  describe('list', () => {
    it('forces the owner filter to self for a Rep, ignoring the requested ownerId', async () => {
      prisma.contact.findMany.mockResolvedValue([]);
      prisma.contact.count.mockResolvedValue(0);

      await service.list(makeUser({ role: Role.REP, id: 'rep-1' }), {
        ownerId: 'someone-else',
        page: 1,
        limit: 20,
      });

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            ownerId: 'rep-1',
          }),
        }),
      );
    });

    it('lets a Manager filter by an arbitrary ownerId', async () => {
      prisma.contact.findMany.mockResolvedValue([]);
      prisma.contact.count.mockResolvedValue(0);

      await service.list(makeUser({ role: Role.MANAGER, id: 'mgr-1' }), {
        ownerId: 'rep-2',
        page: 1,
        limit: 20,
      });

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerId: 'rep-2' }),
        }),
      );
    });

    it('maps rows to response DTOs with pagination metadata', async () => {
      prisma.contact.findMany.mockResolvedValue([makeContact()]);
      prisma.contact.count.mockResolvedValue(1);

      const result = await service.list(makeUser({ role: Role.ADMIN }), {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('contact-1');
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the contact does not exist', async () => {
      prisma.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(makeUser(), 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws NotFoundException when a Rep views another rep's contact", async () => {
      prisma.contact.findFirst.mockResolvedValue(
        makeContact({ ownerId: 'someone-else' }),
      );

      await expect(
        service.findOne(makeUser({ role: Role.REP, id: 'rep-1' }), 'contact-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the contact when visible', async () => {
      prisma.contact.findFirst.mockResolvedValue(
        makeContact({ ownerId: 'rep-1' }),
      );

      const result = await service.findOne(
        makeUser({ role: Role.REP, id: 'rep-1' }),
        'contact-1',
      );

      expect(result.id).toBe('contact-1');
    });

    it('lets a Manager view any contact in the org', async () => {
      prisma.contact.findFirst.mockResolvedValue(
        makeContact({ ownerId: 'someone-else' }),
      );

      const result = await service.findOne(
        makeUser({ role: Role.MANAGER, id: 'mgr-1' }),
        'contact-1',
      );

      expect(result.id).toBe('contact-1');
    });
  });

  describe('create', () => {
    it('creates a contact with the resolved owner and enqueues a lead-assigned notification', async () => {
      orgMembership.resolveOwnerId.mockResolvedValue('rep-1');
      prisma.contact.create.mockResolvedValue(makeContact());

      const user = makeUser({ role: Role.REP, id: 'rep-1' });
      const result = await service.create(user, {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      });

      expect(orgMembership.resolveOwnerId).toHaveBeenCalledWith(
        user,
        undefined,
      );
      expect(prisma.contact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-1',
          ownerId: 'rep-1',
          firstName: 'Jane',
          lastName: 'Doe',
          tags: [],
        }),
      });
      expect(notificationsService.enqueueLeadAssigned).toHaveBeenCalledWith({
        organizationId: 'org-1',
        contactId: 'contact-1',
        contactName: 'Jane Doe',
        assignedToUserId: 'rep-1',
        assignedByUserId: 'rep-1',
      });
      expect(result.id).toBe('contact-1');
    });

    it('throws NotFoundException when companyId is not in the organization', async () => {
      orgMembership.resolveOwnerId.mockResolvedValue('rep-1');
      prisma.company.findFirst.mockResolvedValue(null);

      await expect(
        service.create(makeUser(), {
          firstName: 'Jane',
          lastName: 'Doe',
          companyId: 'bad-company',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.contact.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when a Rep tries to reassign ownership', async () => {
      prisma.contact.findFirst.mockResolvedValue(
        makeContact({ ownerId: 'rep-1' }),
      );

      await expect(
        service.update(makeUser({ role: Role.REP, id: 'rep-1' }), 'contact-1', {
          ownerId: 'someone-else',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.contact.update).not.toHaveBeenCalled();
    });

    it('lets a Manager reassign ownership after validating org membership', async () => {
      prisma.contact.findFirst.mockResolvedValue(
        makeContact({ ownerId: 'rep-1' }),
      );
      orgMembership.assertUserInOrg.mockResolvedValue('rep-2');
      prisma.contact.update.mockResolvedValue(
        makeContact({ ownerId: 'rep-2' }),
      );

      const result = await service.update(
        makeUser({ role: Role.MANAGER, id: 'mgr-1' }),
        'contact-1',
        { ownerId: 'rep-2' },
      );

      expect(orgMembership.assertUserInOrg).toHaveBeenCalledWith(
        'org-1',
        'rep-2',
      );
      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
        data: expect.objectContaining({ ownerId: 'rep-2' }),
      });
      expect(result.ownerId).toBe('rep-2');
    });
  });

  describe('remove', () => {
    it('deletes the contact after a visibility check', async () => {
      prisma.contact.findFirst.mockResolvedValue(
        makeContact({ ownerId: 'rep-1' }),
      );

      await service.remove(
        makeUser({ role: Role.REP, id: 'rep-1' }),
        'contact-1',
      );

      expect(prisma.contact.delete).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
      });
    });

    it('throws NotFoundException and does not delete when not visible', async () => {
      prisma.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(makeUser(), 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.contact.delete).not.toHaveBeenCalled();
    });
  });
});

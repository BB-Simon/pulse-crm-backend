import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Deal, DealStatus, PipelineStage, Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { OrgMembershipService } from '../../common/services/org-membership.service';
import { ContactsService } from '../contacts/contacts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { WebhookDeliveryService } from '../webhooks/webhook-delivery.service';
import { DealsService } from './deals.service';

function makeStage(overrides: Partial<PipelineStage> = {}): PipelineStage {
  return {
    id: 'stage-lead',
    organizationId: 'org-1',
    name: 'Lead',
    order: 0,
    isWon: false,
    isLost: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'deal-1',
    organizationId: 'org-1',
    ownerId: 'rep-1',
    contactId: 'contact-1',
    companyId: null,
    pipelineStageId: 'stage-lead',
    title: 'Acme deal',
    value: new Prisma.Decimal(1000),
    status: DealStatus.OPEN,
    expectedCloseDate: null,
    closedAt: null,
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

describe('DealsService', () => {
  let prisma: {
    deal: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    pipelineStage: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
    };
    company: { findFirst: jest.Mock };
  };
  let orgMembership: { resolveOwnerId: jest.Mock; assertUserInOrg: jest.Mock };
  let contactsService: { findOne: jest.Mock };
  let notificationsService: { enqueueDealStageChanged: jest.Mock };
  let webhookDeliveryService: { enqueueDealWon: jest.Mock };
  let realtimeGateway: { broadcastDealStageChanged: jest.Mock };
  let service: DealsService;

  beforeEach(() => {
    prisma = {
      deal: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      pipelineStage: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      company: { findFirst: jest.fn() },
    };
    orgMembership = { resolveOwnerId: jest.fn(), assertUserInOrg: jest.fn() };
    contactsService = { findOne: jest.fn() };
    notificationsService = { enqueueDealStageChanged: jest.fn() };
    webhookDeliveryService = { enqueueDealWon: jest.fn() };
    realtimeGateway = { broadcastDealStageChanged: jest.fn() };

    service = new DealsService(
      prisma as unknown as PrismaService,
      orgMembership as unknown as OrgMembershipService,
      contactsService as unknown as ContactsService,
      notificationsService as unknown as NotificationsService,
      webhookDeliveryService as unknown as WebhookDeliveryService,
      realtimeGateway as unknown as RealtimeGateway,
    );
  });

  describe('create', () => {
    it('defaults to the org’s first pipeline stage and the contact’s company when unspecified', async () => {
      contactsService.findOne.mockResolvedValue({
        id: 'contact-1',
        companyId: 'company-from-contact',
      });
      orgMembership.resolveOwnerId.mockResolvedValue('rep-1');
      prisma.pipelineStage.findFirst.mockResolvedValue(makeStage());
      prisma.deal.create.mockResolvedValue(makeDeal());

      const result = await service.create(makeUser(), {
        title: 'Acme deal',
        value: 1000,
        contactId: 'contact-1',
      });

      expect(prisma.pipelineStage.findFirst).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: { order: 'asc' },
      });
      expect(prisma.deal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'company-from-contact',
          pipelineStageId: 'stage-lead',
          status: DealStatus.OPEN,
        }),
      });
      expect(result.id).toBe('deal-1');
    });

    it('marks the deal WON with closedAt set when created directly into a won stage', async () => {
      contactsService.findOne.mockResolvedValue({
        id: 'contact-1',
        companyId: null,
      });
      orgMembership.resolveOwnerId.mockResolvedValue('rep-1');
      prisma.pipelineStage.findFirst.mockResolvedValue(
        makeStage({ id: 'stage-won', name: 'Won', isWon: true }),
      );
      prisma.deal.create.mockResolvedValue(
        makeDeal({ status: DealStatus.WON, pipelineStageId: 'stage-won' }),
      );

      await service.create(makeUser(), {
        title: 'Acme deal',
        value: 1000,
        contactId: 'contact-1',
        pipelineStageId: 'stage-won',
      });

      expect(prisma.deal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: DealStatus.WON,
          closedAt: expect.any(Date),
        }),
      });
    });

    it('throws NotFoundException when the requested pipeline stage is not in the organization', async () => {
      contactsService.findOne.mockResolvedValue({
        id: 'contact-1',
        companyId: null,
      });
      orgMembership.resolveOwnerId.mockResolvedValue('rep-1');
      prisma.pipelineStage.findFirst.mockResolvedValue(null);

      await expect(
        service.create(makeUser(), {
          title: 'Acme deal',
          value: 1000,
          contactId: 'contact-1',
          pipelineStageId: 'not-in-org',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.deal.create).not.toHaveBeenCalled();
    });
  });

  describe('moveStage', () => {
    it('updates the deal and fires the notification + realtime broadcast when the stage actually changes', async () => {
      prisma.deal.findFirst.mockResolvedValue(
        makeDeal({ pipelineStageId: 'stage-lead', status: DealStatus.OPEN }),
      );
      const toStage = makeStage({ id: 'stage-contacted', name: 'Contacted' });
      prisma.pipelineStage.findFirst.mockResolvedValue(toStage);
      prisma.pipelineStage.findUnique.mockResolvedValue(makeStage());
      prisma.deal.update.mockResolvedValue(
        makeDeal({ pipelineStageId: 'stage-contacted' }),
      );

      const user = makeUser({ role: Role.ADMIN, id: 'admin-1' });
      await service.moveStage(user, 'deal-1', {
        pipelineStageId: 'stage-contacted',
      });

      expect(prisma.deal.update).toHaveBeenCalledWith({
        where: { id: 'deal-1' },
        data: {
          pipelineStageId: 'stage-contacted',
          status: DealStatus.OPEN,
          closedAt: null,
        },
      });
      expect(notificationsService.enqueueDealStageChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          dealId: 'deal-1',
          fromStage: 'Lead',
          toStage: 'Contacted',
          changedByUserId: 'admin-1',
        }),
      );
      expect(realtimeGateway.broadcastDealStageChanged).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          dealId: 'deal-1',
          fromStageId: 'stage-lead',
          fromStageName: 'Lead',
          toStageId: 'stage-contacted',
          toStageName: 'Contacted',
          changedByUserId: 'admin-1',
        }),
      );
      expect(webhookDeliveryService.enqueueDealWon).not.toHaveBeenCalled();
    });

    it('does not fire the notification or realtime broadcast when the stage is unchanged', async () => {
      prisma.deal.findFirst.mockResolvedValue(
        makeDeal({ pipelineStageId: 'stage-lead' }),
      );
      prisma.pipelineStage.findFirst.mockResolvedValue(makeStage());
      prisma.deal.update.mockResolvedValue(makeDeal());

      await service.moveStage(makeUser({ role: Role.ADMIN }), 'deal-1', {
        pipelineStageId: 'stage-lead',
      });

      expect(
        notificationsService.enqueueDealStageChanged,
      ).not.toHaveBeenCalled();
      expect(realtimeGateway.broadcastDealStageChanged).not.toHaveBeenCalled();
    });

    it('fires the deal.won webhook when moving into a won stage from a non-won status', async () => {
      prisma.deal.findFirst.mockResolvedValue(
        makeDeal({ pipelineStageId: 'stage-lead', status: DealStatus.OPEN }),
      );
      const wonStage = makeStage({ id: 'stage-won', name: 'Won', isWon: true });
      prisma.pipelineStage.findFirst.mockResolvedValue(wonStage);
      prisma.pipelineStage.findUnique.mockResolvedValue(makeStage());
      prisma.deal.update.mockResolvedValue(
        makeDeal({
          pipelineStageId: 'stage-won',
          status: DealStatus.WON,
          closedAt: new Date('2026-02-01T00:00:00Z'),
        }),
      );

      await service.moveStage(makeUser({ role: Role.ADMIN }), 'deal-1', {
        pipelineStageId: 'stage-won',
      });

      expect(webhookDeliveryService.enqueueDealWon).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ dealId: 'deal-1' }),
      );
    });

    it('does not fire the webhook when moving between two non-won stages', async () => {
      prisma.deal.findFirst.mockResolvedValue(
        makeDeal({ pipelineStageId: 'stage-lead', status: DealStatus.OPEN }),
      );
      const toStage = makeStage({ id: 'stage-proposal', name: 'Proposal' });
      prisma.pipelineStage.findFirst.mockResolvedValue(toStage);
      prisma.pipelineStage.findUnique.mockResolvedValue(makeStage());
      prisma.deal.update.mockResolvedValue(
        makeDeal({ pipelineStageId: 'stage-proposal' }),
      );

      await service.moveStage(makeUser({ role: Role.ADMIN }), 'deal-1', {
        pipelineStageId: 'stage-proposal',
      });

      expect(webhookDeliveryService.enqueueDealWon).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when a Rep tries to move a deal they do not own', async () => {
      prisma.deal.findFirst.mockResolvedValue(
        makeDeal({ ownerId: 'someone-else' }),
      );

      await expect(
        service.moveStage(makeUser({ role: Role.REP, id: 'rep-1' }), 'deal-1', {
          pipelineStageId: 'stage-contacted',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.deal.update).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when a Rep tries to reassign ownership', async () => {
      prisma.deal.findFirst.mockResolvedValue(makeDeal({ ownerId: 'rep-1' }));

      await expect(
        service.update(makeUser({ role: Role.REP, id: 'rep-1' }), 'deal-1', {
          ownerId: 'someone-else',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.deal.update).not.toHaveBeenCalled();
    });
  });

  describe('listPipelineStages', () => {
    it('returns stages ordered, mapped to response DTOs', async () => {
      prisma.pipelineStage.findMany.mockResolvedValue([
        makeStage({ id: 'a', order: 0 }),
        makeStage({ id: 'b', order: 1, name: 'Contacted' }),
      ]);

      const result = await service.listPipelineStages(makeUser());

      expect(prisma.pipelineStage.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: { order: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[1].name).toBe('Contacted');
    });
  });
});

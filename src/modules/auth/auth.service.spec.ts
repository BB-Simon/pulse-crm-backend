import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Invite, InviteStatus, Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    organizationId: 'org-1',
    email: 'jane@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Jane',
    lastName: 'Doe',
    role: Role.ADMIN,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeInvite(overrides: Partial<Invite> = {}): Invite {
  return {
    id: 'invite-1',
    organizationId: 'org-1',
    email: 'newrep@example.com',
    role: Role.REP,
    token: 'invite-token',
    status: InviteStatus.PENDING,
    invitedById: 'admin-1',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    acceptedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('AuthService', () => {
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
    organization: { create: jest.Mock; findUnique: jest.Mock };
    subscription: { create: jest.Mock };
    pipelineStage: { createMany: jest.Mock };
    invite: { findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let configService: { get: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      organization: { create: jest.fn(), findUnique: jest.fn() },
      subscription: { create: jest.fn() },
      pipelineStage: { createMany: jest.fn() },
      invite: { findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    };
    // The real callback form: run the callback against the same mock, since
    // every model method used inside the transaction is mocked identically
    // on `tx` and on the top-level client.
    prisma.$transaction.mockImplementation(
      (callback: (tx: unknown) => unknown) => callback(prisma),
    );

    jwtService = { signAsync: jest.fn(), verifyAsync: jest.fn() };
    jwtService.signAsync.mockResolvedValue('signed-token');

    configService = { get: jest.fn() };

    mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
    mockedBcrypt.compare.mockResolvedValue(true as never);

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  describe('signup', () => {
    it('throws ConflictException when the email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());

      await expect(
        service.signup({
          organizationName: 'Acme',
          email: 'jane@example.com',
          password: 'Password123!',
          firstName: 'Jane',
          lastName: 'Doe',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.organization.create).not.toHaveBeenCalled();
    });

    it('creates an org, subscription, default pipeline stages, and an ADMIN user, returning tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.organization.findUnique.mockResolvedValue(null);
      prisma.organization.create.mockResolvedValue({
        id: 'org-1',
        name: 'Acme',
        slug: 'acme',
      });
      prisma.user.create.mockResolvedValue(makeUser());

      const result = await service.signup({
        organizationName: 'Acme',
        email: 'jane@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
      expect(prisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organizationId: 'org-1' }),
        }),
      );
      expect(prisma.pipelineStage.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ name: 'Lead', organizationId: 'org-1' }),
          ]),
        }),
      );
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-1',
          email: 'jane@example.com',
          role: Role.ADMIN,
        }),
      });
      expect(result.user.role).toBe(Role.ADMIN);
      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
    });

    it('appends a numeric suffix to the slug when the base slug is taken', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.organization.findUnique
        .mockResolvedValueOnce({ id: 'existing-org', slug: 'acme' })
        .mockResolvedValueOnce(null);
      prisma.organization.create.mockResolvedValue({
        id: 'org-2',
        name: 'Acme',
        slug: 'acme-2',
      });
      prisma.user.create.mockResolvedValue(makeUser());

      await service.signup({
        organizationName: 'Acme',
        email: 'jane@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(prisma.organization.create).toHaveBeenCalledWith({
        data: { name: 'Acme', slug: 'acme-2' },
      });
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'jane@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns tokens and the auth user on success', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await service.login({
        email: 'jane@example.com',
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('signed-token');
      expect(result.user.email).toBe('jane@example.com');
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when the refresh token is invalid', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('bad token'));

      await expect(service.refresh('bad-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when the user no longer exists', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'jane@example.com',
        organizationId: 'org-1',
        role: Role.ADMIN,
      });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('some-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('issues a new token pair when the refresh token is valid', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'jane@example.com',
        organizationId: 'org-1',
        role: Role.ADMIN,
      });
      prisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await service.refresh('some-token');

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
    });
  });

  describe('acceptInvite', () => {
    it('throws UnauthorizedException when the invite does not exist', async () => {
      prisma.invite.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptInvite({
          token: 'bad-token',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'Rep',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when the invite has expired', async () => {
      prisma.invite.findUnique.mockResolvedValue(
        makeInvite({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(
        service.acceptInvite({
          token: 'invite-token',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'Rep',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when the invite was already accepted', async () => {
      prisma.invite.findUnique.mockResolvedValue(
        makeInvite({ status: InviteStatus.ACCEPTED }),
      );

      await expect(
        service.acceptInvite({
          token: 'invite-token',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'Rep',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws ConflictException when the invite email is already registered', async () => {
      prisma.invite.findUnique.mockResolvedValue(makeInvite());
      prisma.user.findUnique.mockResolvedValue(makeUser());

      await expect(
        service.acceptInvite({
          token: 'invite-token',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'Rep',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates the user with the invite’s role and org, and marks the invite accepted', async () => {
      const invite = makeInvite();
      prisma.invite.findUnique.mockResolvedValue(invite);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(
        makeUser({
          id: 'new-rep',
          email: invite.email,
          role: invite.role,
          organizationId: invite.organizationId,
        }),
      );

      const result = await service.acceptInvite({
        token: 'invite-token',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'Rep',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: invite.organizationId,
          email: invite.email,
          role: invite.role,
        }),
      });
      expect(prisma.invite.update).toHaveBeenCalledWith({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED, acceptedAt: expect.any(Date) },
      });
      expect(result.user.role).toBe(Role.REP);
    });
  });
});

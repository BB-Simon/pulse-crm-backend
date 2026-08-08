import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InviteStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { InviteResponseDto } from './dto/invite-response.dto';
import { InviteUserDto } from './dto/invite-user.dto';

const INVITE_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async inviteUser(
    inviter: AuthenticatedUser,
    dto: InviteUserDto,
  ): Promise<InviteResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const [organization, invitedBy, pendingInvite] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: inviter.organizationId },
      }),
      this.prisma.user.findUnique({ where: { id: inviter.id } }),
      this.prisma.invite.findFirst({
        where: {
          organizationId: inviter.organizationId,
          email: dto.email,
          status: InviteStatus.PENDING,
        },
      }),
    ]);

    if (!organization || !invitedBy) {
      throw new NotFoundException('Inviting organization or user not found');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_EXPIRES_IN_MS);

    const invite = pendingInvite
      ? await this.prisma.invite.update({
          where: { id: pendingInvite.id },
          data: { role: dto.role, token, expiresAt },
        })
      : await this.prisma.invite.create({
          data: {
            organizationId: inviter.organizationId,
            email: dto.email,
            role: dto.role,
            token,
            expiresAt,
            invitedById: inviter.id,
          },
        });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? DEFAULT_FRONTEND_URL;

    await this.mailService.sendInviteEmail({
      to: invite.email,
      organizationName: organization.name,
      inviterName: `${invitedBy.firstName} ${invitedBy.lastName}`,
      acceptUrl: `${frontendUrl}/accept-invite?token=${token}`,
    });

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
    };
  }
}

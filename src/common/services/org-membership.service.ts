import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class OrgMembershipService {
  constructor(private readonly prisma: PrismaService) {}

  /** Throws if userId isn't a member of organizationId; otherwise returns it. */
  async assertUserInOrg(
    organizationId: string,
    userId: string,
  ): Promise<string> {
    const target = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });
    if (!target) {
      throw new NotFoundException('User not found in this organization');
    }
    return target.id;
  }

  /**
   * Resolves the owner for a record being created/reassigned: Reps are
   * always forced to themselves; Managers/Admins may target any teammate
   * (validated to be in-org), defaulting to themselves if none given.
   */
  async resolveOwnerId(
    user: AuthenticatedUser,
    requestedOwnerId?: string,
  ): Promise<string> {
    if (!requestedOwnerId || user.role === Role.REP) {
      return user.id;
    }
    return this.assertUserInOrg(user.organizationId, requestedOwnerId);
  }
}

import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  role: Role;
}

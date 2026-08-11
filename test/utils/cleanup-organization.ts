import { PrismaClient } from '@prisma/client';

/** Deletes everything an e2e test may have created under one organization. */
export async function cleanupOrganization(
  prisma: PrismaClient,
  organizationId: string,
): Promise<void> {
  await prisma.deal.deleteMany({ where: { organizationId } });
  await prisma.contact.deleteMany({ where: { organizationId } });
  await prisma.company.deleteMany({ where: { organizationId } });
  await prisma.pipelineStage.deleteMany({ where: { organizationId } });
  await prisma.subscription.deleteMany({ where: { organizationId } });
  await prisma.invite.deleteMany({ where: { organizationId } });
  await prisma.user.deleteMany({ where: { organizationId } });
  await prisma.organization.deleteMany({ where: { id: organizationId } });
}

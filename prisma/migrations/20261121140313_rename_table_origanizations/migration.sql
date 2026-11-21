-- AlterTable
ALTER TABLE "organizations" RENAME CONSTRAINT "Organization_pkey" TO "organizations_pkey";

-- RenameIndex
ALTER INDEX "Organization_slug_key" RENAME TO "organizations_slug_key";

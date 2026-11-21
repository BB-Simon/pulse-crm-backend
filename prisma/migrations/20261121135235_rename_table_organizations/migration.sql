-- Rename Organization table to organizations
ALTER TABLE "Organization"
RENAME TO "organizations";

-- Rename timestamp columns
ALTER TABLE "organizations"
RENAME COLUMN "createdAt" TO "created_at";

ALTER TABLE "organizations"
RENAME COLUMN "updatedAt" TO "updated_at";
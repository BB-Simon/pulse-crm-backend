-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "leadScore" INTEGER,
ADD COLUMN     "leadScoreRationale" TEXT,
ADD COLUMN     "leadScoredAt" TIMESTAMP(3);

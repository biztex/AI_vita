-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TestType" ADD VALUE 'ENNEAGRAM';
ALTER TYPE "TestType" ADD VALUE 'DISC';
ALTER TYPE "TestType" ADD VALUE 'CLIFTONSTRENGTHS';

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "voiceUrl" TEXT;

-- AlterTable
ALTER TABLE "PersonalityResult" ADD COLUMN     "result" TEXT,
ALTER COLUMN "fileKey" DROP NOT NULL;

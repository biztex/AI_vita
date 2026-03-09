/*
  Warnings:

  - You are about to drop the `ExecuWellDiagnosticResult` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ServiceMode" AS ENUM ('EXECUWELL', 'VITAAI');

-- DropForeignKey
ALTER TABLE "ExecuWellDiagnosticResult" DROP CONSTRAINT "ExecuWellDiagnosticResult_ownerId_fkey";

-- AlterTable
ALTER TABLE "VitaAiProfile" ADD COLUMN     "geneData" JSONB;

-- DropTable
DROP TABLE "ExecuWellDiagnosticResult";

-- CreateTable
CREATE TABLE "MyAIDiagnostic" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "mbtiType" TEXT,
    "mbtiLabel" TEXT,
    "discType" TEXT,
    "discLabel" TEXT,
    "enneagramTop3" JSONB,
    "cognitiveTrend" TEXT,
    "summary" TEXT,
    "phaseInsights" JSONB,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MyAIDiagnostic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineUser" (
    "id" TEXT NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "appUserId" TEXT,
    "displayName" TEXT,
    "userMode" "ServiceMode" NOT NULL DEFAULT 'EXECUWELL',
    "morningPushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineConversation" (
    "id" TEXT NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "service" "ServiceMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sender" "Sender" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MyAIDiagnostic_ownerId_key" ON "MyAIDiagnostic"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "LineUser_lineUserId_key" ON "LineUser"("lineUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LineUser_appUserId_key" ON "LineUser"("appUserId");

-- CreateIndex
CREATE INDEX "LineUser_lineUserId_idx" ON "LineUser"("lineUserId");

-- CreateIndex
CREATE INDEX "LineConversation_lineUserId_idx" ON "LineConversation"("lineUserId");

-- CreateIndex
CREATE INDEX "LineMessage_conversationId_idx" ON "LineMessage"("conversationId");

-- AddForeignKey
ALTER TABLE "MyAIDiagnostic" ADD CONSTRAINT "MyAIDiagnostic_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser"("supabaseUserId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineUser" ADD CONSTRAINT "LineUser_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("supabaseUserId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineConversation" ADD CONSTRAINT "LineConversation_lineUserId_fkey" FOREIGN KEY ("lineUserId") REFERENCES "LineUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineMessage" ADD CONSTRAINT "LineMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "LineConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

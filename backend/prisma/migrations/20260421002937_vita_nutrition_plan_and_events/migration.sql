-- AlterTable
ALTER TABLE "LineUser" ADD COLUMN     "lastVitaThresholdPushAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VitaNutritionPlan" (
    "id" TEXT NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "ownerId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextReviewAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastHearingReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VitaNutritionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitaDecisionEvent" (
    "id" TEXT NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "hasImportantDecision" BOOLEAN NOT NULL DEFAULT false,
    "hesitationLevel" INTEGER,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitaDecisionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VitaNutritionPlan_lineUserId_isActive_idx" ON "VitaNutritionPlan"("lineUserId", "isActive");

-- CreateIndex
CREATE INDEX "VitaNutritionPlan_ownerId_isActive_idx" ON "VitaNutritionPlan"("ownerId", "isActive");

-- CreateIndex
CREATE INDEX "VitaDecisionEvent_lineUserId_idx" ON "VitaDecisionEvent"("lineUserId");

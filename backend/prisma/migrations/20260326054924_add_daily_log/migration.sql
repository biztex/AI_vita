-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "condition" TEXT,
    "decisions" TEXT,
    "meals" TEXT,
    "memo" TEXT,
    "logDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyLog_lineUserId_idx" ON "DailyLog"("lineUserId");

-- CreateIndex
CREATE INDEX "DailyLog_logDate_idx" ON "DailyLog"("logDate");

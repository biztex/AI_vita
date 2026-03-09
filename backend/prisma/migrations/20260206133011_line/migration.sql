-- CreateTable
CREATE TABLE "ExecuWellDiagnosticResult" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "mbti" TEXT,
    "disc" TEXT,
    "enneagramTop3" TEXT[],
    "profileJson" JSONB,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecuWellDiagnosticResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExecuWellDiagnosticResult_ownerId_createdAt_idx" ON "ExecuWellDiagnosticResult"("ownerId", "createdAt");

-- AddForeignKey
ALTER TABLE "ExecuWellDiagnosticResult" ADD CONSTRAINT "ExecuWellDiagnosticResult_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser"("supabaseUserId") ON DELETE RESTRICT ON UPDATE CASCADE;

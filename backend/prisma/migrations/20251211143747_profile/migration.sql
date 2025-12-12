-- CreateTable
CREATE TABLE "PersonalProfile" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "fullName" TEXT,
    "company" TEXT,
    "position" TEXT,
    "birthDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecuWellProfile" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "mbti" TEXT,
    "enneagram" INTEGER,
    "disc" TEXT,
    "industries" TEXT[],
    "currentRoles" TEXT[],
    "licenses" TEXT[],
    "businessGoal" TEXT,
    "values" TEXT[],
    "interests" TEXT[],
    "tone" TEXT,
    "motivationStyle" TEXT,
    "analysisDepth" TEXT,
    "businessChallenges" TEXT[],
    "healthScore" INTEGER,
    "selfScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecuWellProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitaAiProfile" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "testId" TEXT,
    "testDate" TIMESTAMP(3),
    "geneticSummary" JSONB,
    "sportsProfile" JSONB,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VitaAiProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalProfile_ownerId_key" ON "PersonalProfile"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ExecuWellProfile_profileId_key" ON "ExecuWellProfile"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "VitaAiProfile_profileId_key" ON "VitaAiProfile"("profileId");

-- AddForeignKey
ALTER TABLE "PersonalProfile" ADD CONSTRAINT "PersonalProfile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser"("supabaseUserId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecuWellProfile" ADD CONSTRAINT "ExecuWellProfile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PersonalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitaAiProfile" ADD CONSTRAINT "VitaAiProfile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PersonalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

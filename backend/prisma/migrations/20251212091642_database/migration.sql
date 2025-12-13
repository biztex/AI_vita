-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Subscription" AS ENUM ('VITAAI', 'EXECUWELL', 'INTEGRATED');

-- CreateEnum
CREATE TYPE "Service" AS ENUM ('VITAAI', 'EXECUWELL');

-- CreateEnum
CREATE TYPE "Sender" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('TEXT', 'VOICE', 'IMAGE');

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('SIXTEEN_PERSONALITIES', 'STRENGTHSFINDER', 'ENNEAGRAM', 'DISC', 'CLIFTONSTRENGTHS');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'RECEIVED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NewsCategory" AS ENUM ('business', 'crime', 'education', 'entertainment', 'environment', 'food', 'health', 'lifestyle', 'politics', 'science', 'sports', 'technology', 'top', 'tourism', 'world', 'other');

-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('MANUFACTURING', 'IT_TECHNOLOGY', 'HEALTHCARE_WELFARE', 'RETAIL_SERVICE', 'FINANCE_INSURANCE', 'REAL_ESTATE_BUILDING', 'EDUCATION_HUMAN_RESOURCES', 'GENERAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'UNPAID', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'PAUSED');

-- CreateTable
CREATE TABLE "AppUser" (
    "supabaseUserId" TEXT NOT NULL,
    "email" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "subscription" "Subscription",
    "industries" "NewsCategory"[] DEFAULT ARRAY[]::"NewsCategory"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripeCustomerId" TEXT,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("supabaseUserId")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "service" "Service" NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sender" "Sender" NOT NULL,
    "kind" "MessageKind" NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "voiceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalityResult" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "testType" "TestType" NOT NULL,
    "result" TEXT,
    "fileKey" TEXT,
    "status" "Status" NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalityResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsItem" (
    "id" TEXT NOT NULL,
    "category" "NewsCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "pubDate" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "sourceIcon" TEXT,
    "country" TEXT,
    "industries" "Industry"[] DEFAULT ARRAY[]::"Industry"[],
    "newsDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsItem_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "StripeSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "subscriptionType" "Subscription" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_stripeCustomerId_key" ON "AppUser"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "NewsItem_newsDate_idx" ON "NewsItem"("newsDate");

-- CreateIndex
CREATE INDEX "NewsItem_category_idx" ON "NewsItem"("category");

-- CreateIndex
CREATE INDEX "NewsItem_industries_idx" ON "NewsItem"("industries");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalProfile_ownerId_key" ON "PersonalProfile"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ExecuWellProfile_profileId_key" ON "ExecuWellProfile"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "VitaAiProfile_profileId_key" ON "VitaAiProfile"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeSubscription_stripeSubscriptionId_key" ON "StripeSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "StripeSubscription_userId_idx" ON "StripeSubscription"("userId");

-- CreateIndex
CREATE INDEX "StripeSubscription_stripeSubscriptionId_idx" ON "StripeSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "StripeSubscription_stripeCustomerId_idx" ON "StripeSubscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "StripeSubscription_status_idx" ON "StripeSubscription"("status");

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser"("supabaseUserId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityResult" ADD CONSTRAINT "PersonalityResult_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser"("supabaseUserId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalProfile" ADD CONSTRAINT "PersonalProfile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser"("supabaseUserId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecuWellProfile" ADD CONSTRAINT "ExecuWellProfile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PersonalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitaAiProfile" ADD CONSTRAINT "VitaAiProfile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PersonalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeSubscription" ADD CONSTRAINT "StripeSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("supabaseUserId") ON DELETE CASCADE ON UPDATE CASCADE;

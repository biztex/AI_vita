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

-- CreateTable
CREATE TABLE "AppUser" (
    "supabaseUserId" TEXT NOT NULL,
    "email" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "subscription" "Subscription",
    "industries" "NewsCategory"[] DEFAULT ARRAY[]::"NewsCategory"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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

-- CreateIndex
CREATE INDEX "NewsItem_newsDate_idx" ON "NewsItem"("newsDate");

-- CreateIndex
CREATE INDEX "NewsItem_category_idx" ON "NewsItem"("category");

-- CreateIndex
CREATE INDEX "NewsItem_industries_idx" ON "NewsItem"("industries");

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser"("supabaseUserId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityResult" ADD CONSTRAINT "PersonalityResult_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser"("supabaseUserId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "NewsCategory" AS ENUM ('HEALTH', 'BUSINESS');

-- CreateTable
CREATE TABLE "NewsItem" (
    "id" TEXT NOT NULL,
    "category" "NewsCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "pubDate" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "newsDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsItem_newsDate_idx" ON "NewsItem"("newsDate");

-- CreateIndex
CREATE INDEX "NewsItem_category_idx" ON "NewsItem"("category");

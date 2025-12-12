/*
  Warnings:

  - You are about to drop the column `nextPaymentDate` on the `StripeSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `paymentDate` on the `StripeSubscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StripeSubscription" DROP COLUMN "nextPaymentDate",
DROP COLUMN "paymentDate";

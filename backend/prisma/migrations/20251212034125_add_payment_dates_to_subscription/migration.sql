-- AlterTable
ALTER TABLE "StripeSubscription" ADD COLUMN     "nextPaymentDate" TIMESTAMP(3),
ADD COLUMN     "paymentDate" TIMESTAMP(3);

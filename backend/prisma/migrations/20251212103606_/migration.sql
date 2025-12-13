-- AlterTable
ALTER TABLE "StripeSubscription" ADD COLUMN     "billingCycleAnchor" TIMESTAMP(3),
ADD COLUMN     "cancelAt" TIMESTAMP(3),
ADD COLUMN     "defaultPaymentMethodId" TEXT,
ADD COLUMN     "latestInvoiceId" TEXT,
ADD COLUMN     "trialEnd" TIMESTAMP(3),
ADD COLUMN     "trialStart" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'ACTIVE',
ALTER COLUMN "currentPeriodStart" DROP NOT NULL,
ALTER COLUMN "currentPeriodEnd" DROP NOT NULL;

-- AlterTable: add payment fields to AFARegistration
ALTER TABLE "AFARegistration"
  ADD COLUMN "paymentStatus"    "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "paymentReference" TEXT,
  ADD COLUMN "amountPaid"       DECIMAL(12,2);

-- CreateIndex: unique paymentReference
CREATE UNIQUE INDEX "AFARegistration_paymentReference_key"
  ON "AFARegistration"("paymentReference");

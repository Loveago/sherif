-- CreateTable
CREATE TABLE IF NOT EXISTS "IncomingMomoTransaction" (
    "id" TEXT NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "senderPhone" TEXT,
    "recipientPhone" TEXT,
    "transactionAt" TIMESTAMP(3),
    "rawSms" TEXT NOT NULL,
    "parsedData" TEXT,
    "source" TEXT NOT NULL DEFAULT 'SMS_FORWARDER',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomingMomoTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SendClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "incomingMomoTransactionId" TEXT,
    "walletTransactionId" TEXT,
    "transactionReference" TEXT NOT NULL,
    "claimedAmount" DECIMAL(12,2) NOT NULL,
    "network" TEXT NOT NULL,
    "senderPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "rejectionReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "SendClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SendClaimSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "network" TEXT NOT NULL DEFAULT 'MTN',
    "momoNumber" TEXT NOT NULL DEFAULT '0240000000',
    "accountName" TEXT NOT NULL DEFAULT 'CheapDataPacks',
    "instructions" TEXT,
    "minimumAmount" DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    "maximumAmount" DECIMAL(12,2) NOT NULL DEFAULT 5000.00,
    "claimExpiryHours" INTEGER NOT NULL DEFAULT 168,
    "forwarderSecret" TEXT DEFAULT 'tskconnect_forwarder_secret_2026',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SendClaimSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IncomingMomoTransaction_transactionReference_key" ON "IncomingMomoTransaction"("transactionReference");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IncomingMomoTransaction_transactionReference_idx" ON "IncomingMomoTransaction"("transactionReference");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IncomingMomoTransaction_network_idx" ON "IncomingMomoTransaction"("network");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IncomingMomoTransaction_status_idx" ON "IncomingMomoTransaction"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IncomingMomoTransaction_createdAt_idx" ON "IncomingMomoTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SendClaim_walletTransactionId_key" ON "SendClaim"("walletTransactionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SendClaim_userId_idx" ON "SendClaim"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SendClaim_status_idx" ON "SendClaim"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SendClaim_createdAt_idx" ON "SendClaim"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SendClaim_transactionReference_idx" ON "SendClaim"("transactionReference");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SendClaim_incomingMomoTransactionId_idx" ON "SendClaim"("incomingMomoTransactionId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SendClaim_userId_fkey') THEN
        ALTER TABLE "SendClaim" ADD CONSTRAINT "SendClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SendClaim_incomingMomoTransactionId_fkey') THEN
        ALTER TABLE "SendClaim" ADD CONSTRAINT "SendClaim_incomingMomoTransactionId_fkey" FOREIGN KEY ("incomingMomoTransactionId") REFERENCES "IncomingMomoTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SendClaim_walletTransactionId_fkey') THEN
        ALTER TABLE "SendClaim" ADD CONSTRAINT "SendClaim_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "WalletTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

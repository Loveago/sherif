-- CreateEnum
CREATE TYPE "WithdrawalSource" AS ENUM ('MAIN_WALLET', 'STOREFRONT_WALLET');

-- CreateTable
CREATE TABLE "StorefrontWallet" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "availableBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pendingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GHS',

    CONSTRAINT "StorefrontWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorefrontWalletTransaction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "category" "WalletTransactionCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balanceBefore" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT NOT NULL,

    CONSTRAINT "StorefrontWalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontWallet_userId_key" ON "StorefrontWallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontWalletTransaction_reference_key" ON "StorefrontWalletTransaction"("reference");

-- AddColumn
ALTER TABLE "Withdrawal" ADD COLUMN "source" "WithdrawalSource" NOT NULL DEFAULT 'MAIN_WALLET';

-- AddForeignKey
ALTER TABLE "StorefrontWallet" ADD CONSTRAINT "StorefrontWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorefrontWalletTransaction" ADD CONSTRAINT "StorefrontWalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "StorefrontWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

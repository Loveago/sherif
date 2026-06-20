-- AlterTable (use IF NOT EXISTS for idempotency — key column may already exist from 0_init on some databases)
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "key" TEXT,
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS "usageCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex (IF NOT EXISTS for idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_key_key" ON "ApiKey"("key");

-- Add externalReference column to Order table (stores Shank API batch reference)
ALTER TABLE "Order" ADD COLUMN "externalReference" TEXT;

-- Add shankNetworkId column to Network table (maps local networks to Shank API network IDs)
ALTER TABLE "Network" ADD COLUMN "shankNetworkId" INTEGER;

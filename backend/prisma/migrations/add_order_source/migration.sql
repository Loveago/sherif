-- Create OrderSource enum
CREATE TYPE "OrderSource" AS ENUM ('BUY_NOW', 'BULK', 'STOREFRONT');

-- Add source column to Order table with default BUY_NOW
ALTER TABLE "Order" ADD COLUMN "source" "OrderSource" NOT NULL DEFAULT 'BUY_NOW';

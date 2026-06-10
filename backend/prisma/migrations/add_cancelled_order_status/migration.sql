-- AlterEnum
BEGIN;
-- First, add the new value to the enum
ALTER TYPE "OrderStatus" ADD VALUE 'CANCELLED';
COMMIT;

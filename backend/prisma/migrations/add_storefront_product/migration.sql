-- Create StorefrontProduct table
CREATE TABLE "StorefrontProduct" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storefrontId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customPrice" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StorefrontProduct_pkey" PRIMARY KEY ("id")
);

-- Create unique index
CREATE UNIQUE INDEX "StorefrontProduct_storefrontId_productId_key" ON "StorefrontProduct"("storefrontId", "productId");

-- Add foreign key constraints
ALTER TABLE "StorefrontProduct" ADD CONSTRAINT "StorefrontProduct_storefrontId_fkey" 
    FOREIGN KEY ("storefrontId") REFERENCES "Storefront"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StorefrontProduct" ADD CONSTRAINT "StorefrontProduct_productId_fkey" 
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

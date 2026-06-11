# Migrations

## 1. Add Order Source
**File:** `add_order_source/migration.sql`
- Adds `OrderSource` enum (`BUY_NOW`, `BULK`, `STOREFRONT`)
- Adds `source` column to `Order` table (defaults to `BUY_NOW`)

## 2. Add Storefront Product
**File:** `add_storefront_product/migration.sql`
- Creates `StorefrontProduct` table
- Links storefronts to products with custom prices
- Allows agents to choose which products appear on their storefront

## Run on Render (Option 1 - Quick)

```bash
cd backend
npx prisma db push
```

This applies both schema changes at once.

## Run on Render (Option 2 - Proper migrations)

```bash
cd backend

# Rename folders with timestamps
mv prisma/migrations/add_order_source prisma/migrations/$(date +%Y%m%d%H%M%S)_add_order_source
mv prisma/migrations/add_storefront_product prisma/migrations/$(date +%Y%m%d%H%M%S)_add_storefront_product

# Deploy
npx prisma migrate deploy
```

## After migration
Rebuild and restart:
```bash
npm run build
npm start
```

## What changes

### Backend
- `GET /store/:slug` — Only returns products the agent has added to their storefront
- `GET /storefront/products` — Returns all admin products with agent's storefront status
- `POST /storefront/products` — Add a product to storefront with custom price
- `DELETE /storefront/products/:productId` — Remove from storefront
- Commission only applies to `STOREFRONT` orders (not Buy Now / Bulk)
- Commission = customPrice - base sellingPrice

### Frontend
- Storefront Products tab — Agents see all products grouped by network (MTN, Telecel, AirtelTigo)
- They set custom price and click "Add" to show on their storefront
- Click "Remove" to hide from storefront
- Public storefront only shows added products with custom prices

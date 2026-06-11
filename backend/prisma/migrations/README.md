# Migration: Add Order Source

## What this does
- Adds `OrderSource` enum (`BUY_NOW`, `BULK`, `STOREFRONT`)
- Adds `source` column to `Order` table (defaults to `BUY_NOW`)

## Run on Render

Option 1 - Quick (uses db push):
```bash
cd backend
npx prisma db push
```

Option 2 - Proper migration (uses migrate deploy):
```bash
cd backend
# Rename folder with timestamp first:
mv prisma/migrations/add_order_source prisma/migrations/$(date +%Y%m%d%H%M%S)_add_order_source
# Then deploy:
npx prisma migrate deploy
```

## After migration
Rebuild and restart the backend:
```bash
npm run build
npm start
```

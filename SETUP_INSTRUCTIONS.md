# Setup Instructions - Complete Feature Implementation

## Overview
All features from features.txt have been implemented. This guide walks you through the final setup steps to get everything running.

## Step 1: Database Migration (CRITICAL)

### 1.1 Navigate to Backend
```bash
cd backend
```

### 1.2 Run Database Migration
```bash
npm run db:push
```

**What this does**:
- Creates all new tables (Chat, Message, RolePrice, ReferralCode, AFARegistration, MTNExpressBundle, AdminSettings)
- Adds new columns to existing tables (Product, Announcement, User)
- Sets up relationships and constraints
- Applies all schema changes

**Expected output**:
```
✓ Database synced, migrations applied
```

### 1.3 Regenerate Prisma Client
```bash
npx prisma generate
```

**What this does**:
- Generates TypeScript types for all models
- Resolves all "Module not found" errors
- Updates Prisma client with new models

**Expected output**:
```
✓ Generated Prisma Client (v6.9.0) to ./node_modules/@prisma/client
```

## Step 2: Verify Installation

### 2.1 Check Backend Dependencies
```bash
npm list
```

Ensure these are installed:
- `@prisma/client` ✓
- `express` ✓
- `jsonwebtoken` ✓
- `bcryptjs` ✓
- `axios` ✓

### 2.2 Check Frontend Dependencies
```bash
cd ../frontend
npm list
```

Ensure these are installed:
- `react` ✓
- `next` ✓
- `@tanstack/react-query` ✓
- `tailwindcss` ✓

## Step 3: Environment Configuration

### 3.1 Backend .env
```bash
cd backend
```

Ensure `.env` has:
```
DATABASE_URL=postgresql://user:password@localhost:5432/sherif_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
PORT=4000
FRONTEND_URL=http://localhost:3000
ENCRYPTION_KEY=your-32-character-encryption-key
PAYSTACK_PUBLIC_KEY=pk_test_your_key
PAYSTACK_SECRET_KEY=sk_test_your_key
ADMIN_EMAIL=admin@datahubgh.com
ADMIN_PASSWORD=Admin@123
```

### 3.2 Frontend .env.local
```bash
cd ../frontend
```

Ensure `.env.local` has:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=DATAHUB Ghana
```

## Step 4: Start Development Servers

### 4.1 Terminal 1 - Backend
```bash
cd backend
npm run dev
```

Expected output:
```
Server running on port 4000
Database connected
```

### 4.2 Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

Expected output:
```
▲ Next.js 15.x
- Local: http://localhost:3000
```

## Step 5: Test the Implementation

### 5.1 Admin Features

**1. Product Management**
- Go to http://localhost:3000/admin/products
- Click "Create Product"
- Fill in form with:
  - Name: "2GB Data Bundle"
  - Network: Select MTN
  - Selling Price: 10.00
  - Promo Price: 9.50
  - Stock: 100
  - Check "Show in Shop"
- Click "Create Product"
- Verify product appears in table

**2. User Management**
- Go to http://localhost:3000/admin/users
- Click on a user
- Click "Edit User"
- Change role to "PREMIUM"
- Click "Save"
- Verify role updated

**3. Order Management**
- Go to http://localhost:3000/admin/orders
- Filter by status: "PENDING"
- Click on an order
- Change status to "PROCESSING"
- Verify status updated

### 5.2 Agent Features

**1. Chat**
- Go to http://localhost:3000/chat
- Click "Start Chat"
- Enter admin user ID
- Send a message
- Verify message appears

**2. Complaints**
- Go to http://localhost:3000/complaints
- Click "Submit Complaint"
- Fill in form
- Click "Submit"
- Verify complaint appears in list

**3. Referral Codes**
- Go to http://localhost:3000/referral-codes
- Click "Generate Code"
- Set max uses: 10
- Click "Generate"
- Verify code appears in list

## Step 6: API Testing (Optional)

### 6.1 Test Admin Endpoints
```bash
# Get all users
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:4000/admin/users

# Create product
curl -X POST http://localhost:4000/admin/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "5GB Bundle",
    "description": "5GB data",
    "dataSize": "5GB",
    "sellingPrice": 15.00,
    "agentPrice": 14.00,
    "resellerPrice": 13.00,
    "buyingPrice": 12.00,
    "networkId": "network-id-here"
  }'

# Update stock
curl -X POST http://localhost:4000/admin/products/product-id/stock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "quantity": 50,
    "operation": "add"
  }'

# Set role price
curl -X POST http://localhost:4000/admin/products/product-id/role-price \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "role": "PREMIUM",
    "price": 14.99
  }'
```

### 6.2 Test Agent Endpoints
```bash
# Start chat
curl -X POST http://localhost:4000/chat/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"receiverId": "admin-user-id"}'

# Send message
curl -X POST http://localhost:4000/chats/chat-id/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "content": "Hello admin",
    "receiverId": "admin-user-id"
  }'

# Submit complaint
curl -X POST http://localhost:4000/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Order issue",
    "description": "Data not received",
    "evidenceUrl": "https://example.com/image.jpg"
  }'

# Generate referral code
curl -X POST http://localhost:4000/referral-codes/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "maxUses": 10,
    "expiresAt": "2026-12-31T23:59:59Z"
  }'
```

## Step 7: Troubleshooting

### Issue: "Module not found" errors
**Solution**:
```bash
cd backend
npx prisma generate
npm run dev
```

### Issue: "Database connection failed"
**Solution**:
1. Ensure PostgreSQL is running
2. Check DATABASE_URL in .env
3. Run `npm run db:push` again

### Issue: "JWT token invalid"
**Solution**:
1. Login to get a new token
2. Use token in Authorization header: `Bearer YOUR_TOKEN`
3. Ensure JWT_SECRET matches in .env

### Issue: "Chat messages not encrypting"
**Solution**:
1. Ensure ENCRYPTION_KEY is 32 characters
2. Regenerate Prisma client: `npx prisma generate`
3. Restart backend server

### Issue: "Role price not applying"
**Solution**:
1. Ensure role exists in UserRole enum
2. Set role price via `/admin/products/:id/role-price`
3. Check product's rolePrices relationship

## Step 8: Production Deployment

### 8.1 Build Backend
```bash
cd backend
npm run build
npm start
```

### 8.2 Build Frontend
```bash
cd frontend
npm run build
npm start
```

### 8.3 Environment Variables for Production
```
DATABASE_URL=postgresql://prod-user:prod-pass@prod-host:5432/sherif_prod
REDIS_URL=redis://prod-redis-host:6379
JWT_SECRET=<generate-new-long-random-string>
ENCRYPTION_KEY=<generate-new-32-char-key>
PAYSTACK_PUBLIC_KEY=pk_live_your_live_key
PAYSTACK_SECRET_KEY=sk_live_your_live_key
NODE_ENV=production
```

## Step 9: Verification Checklist

- [ ] Database migration successful
- [ ] Prisma client regenerated
- [ ] Backend server starts without errors
- [ ] Frontend server starts without errors
- [ ] Can login as admin
- [ ] Can create products
- [ ] Can manage users
- [ ] Can send chat messages
- [ ] Can submit complaints
- [ ] Can generate referral codes
- [ ] Role-based pricing works
- [ ] Stock management works
- [ ] Announcements display correctly

## Documentation Files

After setup, refer to these files for detailed information:

1. **QUICK_START.md** - Quick reference for features and endpoints
2. **IMPLEMENTATION_SUMMARY_COMPLETE.md** - Detailed implementation overview
3. **IMPLEMENTATION_PROGRESS.md** - Phase-by-phase breakdown

## Support

If you encounter issues:

1. Check the error message carefully
2. Refer to troubleshooting section above
3. Check database connection
4. Verify environment variables
5. Regenerate Prisma client
6. Restart servers

## Next Steps

After successful setup:

1. **Test all features** using the testing guide above
2. **Implement remaining features** (Phases 6-8) as needed
3. **Deploy to production** following deployment checklist
4. **Monitor logs** for any errors
5. **Set up backups** for database

---

**Setup Status**: Ready to Go
**Last Updated**: June 10, 2026
**Questions**: Refer to documentation files

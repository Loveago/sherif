# CheapDataPacks Ghana

Premium full-stack data bundle marketplace, agent platform, storefront system, and enterprise admin panel for Ghana.

## Stack

- Frontend: Next.js 15, TypeScript, Tailwind CSS, TanStack Query, Zustand, React Hook Form, Zod, Framer Motion
- Backend: Express, TypeScript, PostgreSQL, Prisma, Redis, BullMQ, JWT
- Infrastructure: Docker Compose for PostgreSQL and Redis

## Workspace Structure

- `frontend` - Next.js application
- `backend` - Express API, Prisma schema, queue workers, seed data

## Local Setup

1. Copy environment files:
   - `backend/.env.example` to `backend/.env`
   - `frontend/.env.example` to `frontend/.env.local`
2. Install dependencies from the repo root:
   - `npm install`
3. Start infrastructure:
   - `npm run infra:up`
4. Push the Prisma schema and seed demo data:
   - `npm run db:push`
   - `npm run db:seed`
5. Start both apps:
   - `npm run dev`

## Demo Credentials

- Agent
  - Email: `agent@cheappacksgh.com`
  - Password: `Agent@123`
- Admin
  - Email: `admin@cheappacksgh.com`
  - Password: `Admin@123`

## Environment Notes

- Payments default to mock mode so wallet funding works without external API keys.
- Provider fulfillment defaults to mock mode so order processing works out of the box.
- You can switch to real integrations later by providing production credentials in backend environment variables.

## Main URLs

- Landing page: `http://localhost:3000`
- Agent dashboard: `http://localhost:3000/dashboard`
- Admin dashboard: `http://localhost:3000/admin`
- Sample storefront: `http://localhost:3000/store/kwame-mensah`
- API health: `http://localhost:4000/api/v1/health`

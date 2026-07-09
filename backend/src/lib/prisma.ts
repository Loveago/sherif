import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Recreate client in dev when the generated Prisma types/engine change
// (e.g. after `prisma generate`), so IDE/tsserver pick up new models/fields.
const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

export const prisma = prismaClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaClient;
}

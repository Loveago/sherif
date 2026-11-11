import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Append connect_timeout to handle Neon cold-starts (database may take a few
// seconds to wake from suspension on the free tier).
function buildDatabaseUrl() {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("file:./")) {
    const path = require("path");
    const dbPath = path.resolve(process.cwd(), "prisma", url.replace("file:./", ""));
    return `file:${dbPath}`;
  }
  if (!url || url.startsWith("file:")) return url;
  try {
    const u = new URL(url);
    // Remove problematic channel_binding if present, add a 30s connect timeout
    u.searchParams.delete("channel_binding");
    if (!u.searchParams.has("connect_timeout")) {
      u.searchParams.set("connect_timeout", "30");
    }
    return u.toString();
  } catch {
    return url;
  }
}

const resolvedDbUrl = buildDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    ...(resolvedDbUrl ? { datasourceUrl: resolvedDbUrl } : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

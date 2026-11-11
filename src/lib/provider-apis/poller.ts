import { prisma } from "../prisma";
import { syncTskconnectOrder } from "./router";

let isPolling = false;

export async function getPollerIntervalSeconds(): Promise<number> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "provider_sync_poller_interval_seconds" },
    });
    if (setting && setting.value) {
      const val = parseInt(setting.value, 10);
      if (!isNaN(val) && val >= 10) return val;
    }
  } catch {}

  const envVal = process.env.PROVIDER_SYNC_POLLER_INTERVAL_SECONDS;
  if (envVal) {
    const val = parseInt(envVal, 10);
    if (!isNaN(val) && val >= 10) return val;
  }

  return 30; // Default: 30 seconds
}

/**
 * Self-scheduling background poller for in-flight Tskconnect orders.
 * Automatically synchronizes pending/processing orders (default every 30 seconds, configurable).
 * If there is nothing to poll, it skips provider communication.
 */
export function startProviderSyncPoller() {
  if (typeof window !== "undefined") return;
  if (!process.env.DATABASE_URL) return;

  // In PM2 cluster mode, only instance 0 should run background polling loops
  const instanceId = process.env.pm_id ?? process.env.NODE_APP_INSTANCE;
  if (instanceId !== undefined && instanceId !== "" && instanceId !== "0") {
    console.log(`[ProviderSyncPoller] Skipping poller initialization on PM2 cluster worker #${instanceId}`);
    return;
  }

  const g = globalThis as any;
  if (g.__providerSyncPollerStarted) {
    return;
  }
  g.__providerSyncPollerStarted = true;

  console.log("[ProviderSyncPoller] Automated background status poller initialized for Tskconnect.");

  const poll = async () => {
    if (isPolling) return;
    isPolling = true;
    try {
      // 1. Check if automated poller and API routing are enabled
      const setting = await prisma.systemSetting.findUnique({
        where: { key: "provider_sync_poller_enabled" },
      });
      if (setting && setting.value === "false") {
        return;
      }

      const { getProviderRoutingConfig } = await import("./router");
      const config = await getProviderRoutingConfig();
      if (!config.enabled || !config.tskconnect.enabled || !config.tskconnect.apiKey) {
        return;
      }

      // Distributed DB lock to guarantee only 1 PM2 worker executes this poll cycle across cluster
      const intervalSeconds = await getPollerIntervalSeconds();
      const lockKey = "provider_sync_poller_distributed_lock";
      const now = Date.now();
      const lockExpiry = Math.max(20, intervalSeconds - 5) * 1000;

      try {
        const existingLock = await prisma.systemSetting.findUnique({ where: { key: lockKey } });
        if (existingLock && existingLock.value) {
          const lockExpiresAt = parseInt(existingLock.value, 10);
          if (!isNaN(lockExpiresAt) && now < lockExpiresAt) {
            return;
          }
        }
        await prisma.systemSetting.upsert({
          where: { key: lockKey },
          create: { key: lockKey, value: String(now + lockExpiry) },
          update: { value: String(now + lockExpiry) },
        });
      } catch {
        // If DB lock fails transiently, continue cautiously
      }

      // 2. Configurable rate limit cutoff
      const cutoffTime = new Date(Date.now() - intervalSeconds * 1000);

      // Find in-flight Tskconnect orders (PENDING or PROCESSING) and sync their status
      const inFlightTskOrders = await prisma.order.findMany({
        where: {
          status: { in: ["PENDING", "PROCESSING"] },
          providerReference: { startsWith: "TSKCONNECT:" },
          updatedAt: { lte: cutoffTime },
        },
        take: 100,
        orderBy: { updatedAt: "asc" },
      });

      if (inFlightTskOrders.length > 0) {
        console.log(`[ProviderSyncPoller] Syncing ${inFlightTskOrders.length} in-flight Tskconnect order(s)...`);
        for (const order of inFlightTskOrders) {
          try {
            await syncTskconnectOrder(order, "Automatic Background Poller");
          } catch (err: any) {
            console.error(`[ProviderSyncPoller] Error syncing Tskconnect order #${order.id}:`, err?.message || err);
          }
        }
      }

      // Auto-reconcile any pending Paystack wallet top-ups
      try {
        const { reconcilePendingPaystackTopups } = await import("@/lib/paystack");
        await reconcilePendingPaystackTopups(10);
      } catch {
        // Ignore background transient errors
      }

      // Auto-reconcile unsettled / undispatched Paystack storefront orders
      try {
        const { reconcileUnsettledStorefrontOrders } = await import("@/lib/storefront");
        await reconcileUnsettledStorefrontOrders(24);
      } catch {
        // Ignore background transient errors
      }
    } catch {
      // Ignore background transient errors
    } finally {
      isPolling = false;
    }
  };

  // Self-scheduling loop respecting dynamic interval
  const scheduleNext = async (delayMs?: number) => {
    try {
      const intervalSec = await getPollerIntervalSeconds();
      const delay = delayMs ?? intervalSec * 1000;
      setTimeout(async () => {
        try {
          await poll();
        } finally {
          scheduleNext();
        }
      }, delay);
    } catch {
      setTimeout(() => scheduleNext(), 30000);
    }
  };

  // Initial poll runs after 5s, then dynamically repeats every intervalSeconds
  scheduleNext(5000);
}

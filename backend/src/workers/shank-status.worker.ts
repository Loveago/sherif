import { OrderStatus, WalletTransactionCategory, WalletTransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { shankClient, ShankOrderStatusItem } from '../services/shank.service.js';
import { createNotification } from '../services/notification.service.js';
import { createWalletTransaction } from '../services/wallet.service.js';
import { maybeCreditStorefrontCommission } from '../services/commission.service.js';
import { getBundlePortalFulfilledOrderIds } from '../services/provider.service.js';
import { env } from '../config/env.js';
import { phonesMatch } from '../utils/phone.js';

/** Keep polling longer so slow provider deliveries still settle. */
const STALE_ORDER_MS = 24 * 60 * 60 * 1000; // 24 hours
const POLL_BATCH_SIZE = 80;

/** Prevent overlapping poll cycles when a tick runs longer than the interval. */
let isPolling = false;

/**
 * Map a Shank status item to our OrderStatus.
 * Prefers numeric `status` when present, then falls back to rich text matching
 * on both `status` and `api_status` (providers are inconsistent).
 */
export const mapShankStatusToOrderStatus = (item: ShankOrderStatusItem): OrderStatus | null => {
  const rawApiStatus = (item.api_status || '').toString().trim();
  const rawStatus = (item.status ?? '').toString().trim();

  let numericStatus: number | null = null;
  if (typeof item.status === 'number' && Number.isFinite(item.status)) {
    numericStatus = item.status;
  } else if (rawStatus !== '' && /^\d+$/.test(rawStatus)) {
    numericStatus = Number(rawStatus);
  }

  // Documented / observed numeric codes:
  // 0 = pending, 1 = processing, 2 = processed/successful, 3 = failed
  if (numericStatus === 0) return OrderStatus.PENDING;
  if (numericStatus === 1) return OrderStatus.PROCESSING;
  if (numericStatus === 2) return OrderStatus.SUCCESSFUL;
  if (numericStatus === 3) return OrderStatus.FAILED;
  // Some payloads use 4+ for terminal failure variants
  if (numericStatus !== null && numericStatus >= 4) return OrderStatus.FAILED;

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  // Prefer the more specific delivery field when present
  const candidates = [rawApiStatus, rawStatus]
    .map(normalize)
    .filter((value) => value.length > 0);

  for (const text of candidates) {
    // Terminal success
    if (
      text === 'processed' ||
      text === 'delivered' ||
      text === 'completed' ||
      text === 'complete' ||
      text === 'successful' ||
      text === 'success' ||
      text === 'credited' ||
      text === 'done' ||
      text === 'ok' ||
      text.includes('successful') ||
      text.includes('delivered') ||
      text.includes('completed') ||
      text.includes('credited') ||
      text.includes('processed')
    ) {
      // Avoid treating generic HTTP-ish "success" alone from api_status as delivery
      // when the other field still clearly says pending/processing.
      if (text === 'success' || text === 'ok') {
        const other = candidates.find((c) => c !== text);
        if (other && (other.includes('pend') || other.includes('queue') || other.includes('process'))) {
          continue;
        }
      }
      return OrderStatus.SUCCESSFUL;
    }

    // Terminal failure
    if (
      text === 'failed' ||
      text === 'fail' ||
      text === 'rejected' ||
      text === 'error' ||
      text === 'cancelled' ||
      text === 'canceled' ||
      text === 'declined' ||
      text.includes('fail') ||
      text.includes('reject') ||
      text.includes('error') ||
      text.includes('cancel') ||
      text.includes('decline')
    ) {
      return OrderStatus.FAILED;
    }

    // In progress
    if (
      text === 'processing' ||
      text === 'in progress' ||
      text === 'inprogress' ||
      text === 'accepted' ||
      text.includes('processing') ||
      text.includes('crediting')
    ) {
      return OrderStatus.PROCESSING;
    }

    if (
      text === 'pending' ||
      text === 'queued' ||
      text === 'queue' ||
      text === 'waiting' ||
      text.includes('pending') ||
      text.includes('queued')
    ) {
      return OrderStatus.PENDING;
    }
  }

  return null;
};

const pickMatchingStatusItem = (
  items: ShankOrderStatusItem[] | undefined,
  order: { phoneNumber: string; providerReference: string | null; externalReference: string | null },
): ShankOrderStatusItem | null => {
  if (!items || items.length === 0) return null;

  // 1) Match by beneficiary phone (normalized)
  const byPhone = items.find((item) => phonesMatch(item.beneficiary_number, order.phoneNumber));
  if (byPhone) return byPhone;

  // 2) Match by order_code / order_reference against our providerReference
  if (order.providerReference) {
    const byCode = items.find((item) => {
      const ref = (item.order_reference || '').toString().trim();
      return ref && ref === order.providerReference;
    });
    if (byCode) return byCode;
  }

  // 3) Single-item responses are almost always the order we asked for
  if (items.length === 1) return items[0];

  // 4) Last resort — first item (better than leaving the order stuck forever)
  console.warn(
    `[ShankWorker] No exact match for phone=${order.phoneNumber} ref=${order.externalReference}; using first item`,
  );
  return items[0];
};

const applyOrderStatusUpdate = async (
  order: {
    id: string;
    userId: string;
    amount: { toNumber: () => number };
    receiptNumber: string;
    source: string;
    status: OrderStatus;
    phoneNumber: string;
    product: { name: string };
    user: { wallet: { id: string } | null };
  },
  newStatus: OrderStatus,
): Promise<boolean> => {
  // Never downgrade PROCESSING → PENDING
  if (order.status === OrderStatus.PROCESSING && newStatus === OrderStatus.PENDING) {
    return false;
  }
  if (order.status === newStatus) {
    return false;
  }

  // Only terminal statuses should notify; intermediate transitions are silent
  const isTerminal = newStatus === OrderStatus.SUCCESSFUL || newStatus === OrderStatus.FAILED;

  let didUpdate = false;

  await prisma.$transaction(async (tx) => {
    // Conditional update prevents races / double-refunds if another path already settled the order
    const result = await tx.order.updateMany({
      where: {
        id: order.id,
        status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
      },
      data: { status: newStatus },
    });

    if (result.count === 0) {
      return;
    }
    didUpdate = true;

    await tx.providerTransaction.updateMany({
      where: {
        orderId: order.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      data: { status: newStatus },
    });

    const isStorefrontOrder = order.source === 'STOREFRONT';

    if (newStatus === OrderStatus.FAILED && order.user.wallet && !isStorefrontOrder) {
      const existingRefund = await tx.refund.findUnique({ where: { orderId: order.id } });
      if (!existingRefund) {
        await createWalletTransaction(
          order.user.wallet.id,
          order.amount.toNumber(),
          WalletTransactionType.CREDIT,
          WalletTransactionCategory.REFUND,
          `Automatic refund for failed order ${order.receiptNumber}`,
          tx,
        );

        await tx.refund.create({
          data: {
            userId: order.userId,
            orderId: order.id,
            amount: order.amount as any,
            reason: 'Automatic refund — Shank API reported delivery failure',
            status: 'REFUNDED',
          },
        });
      }
    }
  });

  if (!didUpdate) {
    return false;
  }

  if (newStatus === OrderStatus.SUCCESSFUL) {
    await maybeCreditStorefrontCommission(order.id);
  }

  if (isTerminal) {
    await createNotification(
      order.userId,
      newStatus === OrderStatus.SUCCESSFUL ? 'Order completed' : 'Order failed',
      `${order.product.name} for ${order.phoneNumber} is now ${newStatus.toLowerCase()}.`,
      'ORDER',
    );
  }

  return true;
};

export const pollOrderStatuses = async (): Promise<{ checked: number; updated: number }> => {
  if (!(await shankClient.isConfigured())) {
    return { checked: 0, updated: 0 };
  }

  if (isPolling) {
    console.log('[ShankWorker] Previous poll still running — skipping this tick');
    return { checked: 0, updated: 0 };
  }

  isPolling = true;
  try {
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
        externalReference: { not: null },
        product: {
          network: {
            code: 'MTN',
          },
        },
      },
      include: {
        product: { include: { network: true } },
        user: { include: { wallet: true } },
      },
      // Prefer freshest open orders so a backlog of stuck rows doesn't starve new ones
      orderBy: { createdAt: 'desc' },
      take: POLL_BATCH_SIZE,
    });

    if (pendingOrders.length === 0) {
      return { checked: 0, updated: 0 };
    }

    const now = Date.now();

    // Soft-skip very old rows (still logged); they can be re-checked via admin poll-now
    const activeOrders = pendingOrders.filter((o) => {
      const createdAt = new Date(o.createdAt).getTime();
      return now - createdAt <= STALE_ORDER_MS;
    });

    const skippedCount = pendingOrders.length - activeOrders.length;
    if (skippedCount > 0) {
      console.log(`[ShankWorker] Skipping ${skippedCount} orders older than 24 hours`);
    }

    if (activeOrders.length === 0) {
      return { checked: 0, updated: 0 };
    }

    // MTN orders that were routed through Bundle Portal belong to the Bundle Portal
    // status worker — never poll them against Shank (wrong reference space).
    const bundlePortalOrderIds = await getBundlePortalFulfilledOrderIds(activeOrders.map((o) => o.id));
    const shankOrders =
      bundlePortalOrderIds.size > 0
        ? activeOrders.filter((o) => !bundlePortalOrderIds.has(o.id))
        : activeOrders;

    if (shankOrders.length === 0) {
      console.log('[ShankWorker] Candidate MTN orders are all Bundle Portal-fulfilled; nothing to poll');
      return { checked: 0, updated: 0 };
    }

    const externalRefs = [...new Set(shankOrders.map((o) => o.externalReference!))];
    let updated = 0;

    for (const externalRef of externalRefs) {
      try {
        const statusResponse = await shankClient.getOrderStatus(externalRef);
        console.log(`[ShankWorker] Status response for ${externalRef}:`, JSON.stringify(statusResponse));

        const items = Array.isArray(statusResponse?.items) ? statusResponse.items : [];
        if (items.length === 0) {
          console.warn(`[ShankWorker] Empty items[] for ${externalRef}`);
          continue;
        }

        const ordersForRef = shankOrders.filter((o) => o.externalReference === externalRef);

        for (const order of ordersForRef) {
          const matchingItem = pickMatchingStatusItem(items, order);
          if (!matchingItem) continue;

          const newStatus = mapShankStatusToOrderStatus(matchingItem);
          console.log(
            `[ShankWorker] ${order.receiptNumber} phone=${order.phoneNumber} raw status=${JSON.stringify(
              matchingItem.status,
            )} api_status=${matchingItem.api_status ?? ''} -> ${newStatus}`,
          );

          if (!newStatus) {
            console.warn(
              `[ShankWorker] Unmapped Shank status for ${externalRef} / ${order.receiptNumber}:`,
              JSON.stringify(matchingItem),
            );
            continue;
          }

          const changed = await applyOrderStatusUpdate(order as any, newStatus);
          if (changed) {
            updated++;
            console.log(
              `[ShankWorker] Updated ${order.receiptNumber} ${order.status} -> ${newStatus}`,
            );
          }
        }
      } catch (error) {
        const errorMessage = shankClient.getErrorMessage(error);
        console.error(`[ShankWorker] Error polling status for ${externalRef}:`, errorMessage);
      }
    }

    console.log(`[ShankWorker] Checked ${shankOrders.length} orders, updated ${updated}`);
    return { checked: shankOrders.length, updated };
  } finally {
    isPolling = false;
  }
};

let workerTimer: NodeJS.Timeout | null = null;

export const startShankStatusWorker = () => {
  if (workerTimer) {
    console.log('[ShankWorker] Already running');
    return;
  }

  const intervalMs = env.SHANK_WORKER_INTERVAL_MS;

  const tick = async () => {
    try {
      await pollOrderStatuses();
    } catch (error) {
      console.error('[ShankWorker] Unexpected error during polling cycle:', error);
    }
  };

  workerTimer = setInterval(tick, intervalMs);
  setTimeout(tick, 5000);

  console.log(`[ShankWorker] Started — polling every ${intervalMs}ms`);
};

export const stopShankStatusWorker = () => {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
    console.log('[ShankWorker] Stopped');
  }
};

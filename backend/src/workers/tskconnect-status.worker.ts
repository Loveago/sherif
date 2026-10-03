import { OrderStatus, WalletTransactionCategory, WalletTransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { tskconnectClient, TskconnectError, TskconnectOrder } from '../services/tskconnect.service.js';
import { createNotification } from '../services/notification.service.js';
import { createWalletTransaction } from '../services/wallet.service.js';
import { maybeCreditStorefrontCommission } from '../services/commission.service.js';
import { env } from '../config/env.js';

const STALE_ORDER_MS = 24 * 60 * 60 * 1000; // 24 hours
const POLL_BATCH_SIZE = 100;

let isPolling = false;

export const mapTskconnectStatusToOrderStatus = (
  status: string | null | undefined,
): OrderStatus | null => {
  if (!status) return null;
  const upper = status.toString().trim().toUpperCase();

  switch (upper) {
    case 'COMPLETED':
    case 'TEST_COMPLETED':
    case 'PROCESSED':
    case 'SUCCESSFUL':
    case 'SUCCESS':
      return OrderStatus.SUCCESSFUL;

    case 'FAILED':
    case 'CANCELLED':
    case 'CANCELED':
    case 'REJECTED':
      return OrderStatus.FAILED;

    case 'PROCESSING':
    case 'IN_PROGRESS':
      return OrderStatus.PROCESSING;

    case 'PENDING':
    case 'QUEUED':
      return OrderStatus.PENDING;

    default:
      if (upper.includes('FAIL') || upper.includes('CANCEL') || upper.includes('REJECT')) {
        return OrderStatus.FAILED;
      }
      if (upper.includes('COMPLET') || upper.includes('SUCCESS') || upper.includes('PROCESSED')) {
        return OrderStatus.SUCCESSFUL;
      }
      if (upper.includes('PROCESS')) {
        return OrderStatus.PROCESSING;
      }
      return null;
  }
};

export const applyTskconnectOrderStatusUpdate = async (
  order: {
    id: string;
    userId: string;
    amount: { toNumber: () => number } | number;
    receiptNumber: string;
    source: string;
    status: OrderStatus;
    phoneNumber: string;
    product: { name: string };
    user: { wallet: { id: string } | null };
  },
  newStatus: OrderStatus,
  failureReason?: string | null,
): Promise<boolean> => {
  if (order.status === OrderStatus.PROCESSING && newStatus === OrderStatus.PENDING) {
    return false;
  }
  if (order.status === newStatus) {
    return false;
  }

  const isTerminal = newStatus === OrderStatus.SUCCESSFUL || newStatus === OrderStatus.FAILED;
  let didUpdate = false;
  const orderAmount = typeof order.amount === 'number' ? order.amount : order.amount.toNumber();

  await prisma.$transaction(async (tx) => {
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
          orderAmount,
          WalletTransactionType.CREDIT,
          WalletTransactionCategory.REFUND,
          `Automatic refund for failed order ${order.receiptNumber}: ${failureReason || 'Tskconnect delivery failed'}`,
          tx,
        );

        await tx.refund.create({
          data: {
            userId: order.userId,
            orderId: order.id,
            amount: orderAmount as any,
            reason: failureReason || 'Automatic refund for failed Tskconnect delivery',
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
      `${order.product.name} for ${order.phoneNumber} is now ${newStatus.toLowerCase()}.${newStatus === OrderStatus.FAILED ? ' Your wallet has been refunded.' : ''}`,
      'ORDER',
    );
  }

  return true;
};

export const pollTskconnectOrderStatuses = async (): Promise<{ checked: number; updated: number }> => {
  if (!(await tskconnectClient.isConfigured())) {
    return { checked: 0, updated: 0 };
  }

  if (isPolling) {
    console.log('[TskconnectWorker] Previous poll still in flight — skipping tick');
    return { checked: 0, updated: 0 };
  }

  isPolling = true;
  try {
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
      },
      include: {
        product: { include: { network: true } },
        user: { include: { wallet: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: POLL_BATCH_SIZE,
    });

    if (pendingOrders.length === 0) {
      return { checked: 0, updated: 0 };
    }

    const now = Date.now();
    const activeOrders = pendingOrders.filter((o) => {
      const createdAt = new Date(o.createdAt).getTime();
      return now - createdAt <= STALE_ORDER_MS;
    });

    if (activeOrders.length === 0) {
      return { checked: 0, updated: 0 };
    }

    // Filter to only orders fulfilled via Tskconnect
    const orderIds = activeOrders.map((o) => o.id);
    const transactions = await prisma.providerTransaction.findMany({
      where: { orderId: { in: orderIds } },
      select: { orderId: true, responsePayload: true },
    });

    const tskOrderIds = new Set<string>();
    for (const tx of transactions) {
      if (!tx.orderId) continue;
      const payload = tx.responsePayload as Record<string, unknown> | null;
      if (payload && typeof payload === 'object' && payload.provider === 'TSKCONNECT') {
        tskOrderIds.add(tx.orderId);
      }
    }

    const ordersToPoll = activeOrders.filter((o) => tskOrderIds.has(o.id));
    if (ordersToPoll.length === 0) {
      return { checked: 0, updated: 0 };
    }

    let updatedCount = 0;

    // Collect order IDs (API-xxxx or stored in providerReference)
    const ordersWithOrderId = ordersToPoll.filter((o) => o.providerReference && o.providerReference.startsWith('API-'));
    const tskOrderIdsList = ordersWithOrderId.map((o) => o.providerReference!);

    // 1. Bulk check with POST /orders/status (up to 100 at a time)
    if (tskOrderIdsList.length > 0) {
      try {
        const statuses = await tskconnectClient.getBulkOrderStatus(tskOrderIdsList);
        const statusMap = new Map<string, TskconnectOrder>();
        for (const st of statuses) {
          if (st.orderId) statusMap.set(st.orderId, st);
        }

        for (const order of ordersWithOrderId) {
          const remoteOrder = statusMap.get(order.providerReference!);
          if (!remoteOrder) continue;

          const mappedStatus = mapTskconnectStatusToOrderStatus(remoteOrder.status);
          if (mappedStatus && mappedStatus !== order.status) {
            const didUpdate = await applyTskconnectOrderStatusUpdate(
              order as any,
              mappedStatus,
              (remoteOrder as any).failureReason || (remoteOrder as any).reason,
            );
            if (didUpdate) updatedCount++;
          }
        }
      } catch (err) {
        console.warn('[TskconnectWorker] Bulk status check failed, falling back to individual checks:', tskconnectClient.getErrorMessage(err));
      }
    }

    // 2. Individual check for orders without an orderId or not covered by bulk check
    const remainingOrders = ordersToPoll.filter(
      (o) => !o.providerReference || !o.providerReference.startsWith('API-'),
    );

    for (const order of remainingOrders) {
      try {
        const ref = order.externalReference || order.receiptNumber;
        const remoteOrder = await tskconnectClient.getOrderByReference(ref);
        const mappedStatus = mapTskconnectStatusToOrderStatus(remoteOrder.status);

        if (mappedStatus && mappedStatus !== order.status) {
          const didUpdate = await applyTskconnectOrderStatusUpdate(
            order as any,
            mappedStatus,
            (remoteOrder as any).failureReason,
          );
          if (didUpdate) updatedCount++;
        }
      } catch (err) {
        // Not found or transient error
        if (err instanceof TskconnectError && err.status === 404) {
          continue;
        }
        console.warn(`[TskconnectWorker] Failed to check status for order ${order.receiptNumber}:`, tskconnectClient.getErrorMessage(err));
      }
    }

    return { checked: ordersToPoll.length, updated: updatedCount };
  } catch (error) {
    console.error('[TskconnectWorker] Poll loop error:', error);
    return { checked: 0, updated: 0 };
  } finally {
    isPolling = false;
  }
};

export const startTskconnectStatusWorker = () => {
  const intervalMs = env.TSKCONNECT_WORKER_INTERVAL_MS || 30000;
  console.log(`[TskconnectWorker] Starting status worker (interval: ${intervalMs}ms)`);

  // Initial poll on startup
  setTimeout(() => {
    pollTskconnectOrderStatuses().catch((err) => {
      console.error('[TskconnectWorker] Initial poll error:', err);
    });
  }, 5000);

  setInterval(() => {
    pollTskconnectOrderStatuses().catch((err) => {
      console.error('[TskconnectWorker] Interval poll error:', err);
    });
  }, intervalMs);
};

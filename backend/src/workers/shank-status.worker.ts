import { OrderStatus, WalletTransactionCategory, WalletTransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { shankClient, ShankOrderStatusItem } from '../services/shank.service.js';
import { createNotification } from '../services/notification.service.js';
import { createWalletTransaction } from '../services/wallet.service.js';
import { maybeCreditStorefrontCommission } from '../services/commission.service.js';
import { env } from '../config/env.js';

const mapShankStatusToOrderStatus = (item: ShankOrderStatusItem): OrderStatus | null => {
  const rawApiStatus = (item.api_status || '').toString().toLowerCase().trim();
  const rawStatus = (item.status ?? '').toString().toLowerCase().trim();

  // Try to interpret numeric codes first if present.
  let numericStatus: number | null = null;
  if (typeof item.status === 'number') {
    numericStatus = item.status;
  } else {
    const parsed = Number(item.status);
    if (!Number.isNaN(parsed)) {
      numericStatus = parsed;
    }
  }

  // Shank docs: numeric status is the order status. Treat it as the source of truth.
  // Common mappings reported by users: 0 = pending, 1 = processing, 2 = processed.
  if (numericStatus === 0) return OrderStatus.PENDING;
  if (numericStatus === 1) return OrderStatus.PROCESSING;
  if (numericStatus === 2) return OrderStatus.SUCCESSFUL;
  if (numericStatus === 3) return OrderStatus.FAILED;

  // Fallback to textual status when numeric codes are not provided or not usable.
  const combinedStatus = rawStatus || rawApiStatus;

  // "success" is intentionally ignored because it usually means the API call succeeded,
  // not that the order itself is delivered.
  if (combinedStatus === 'processed' || combinedStatus === 'delivered' || combinedStatus === 'completed') {
    return OrderStatus.SUCCESSFUL;
  }

  if (combinedStatus === 'failed' || combinedStatus === 'rejected' || combinedStatus === 'error') {
    return OrderStatus.FAILED;
  }

  if (combinedStatus === 'processing') {
    return OrderStatus.PROCESSING;
  }

  if (combinedStatus === 'pending' || combinedStatus === 'queued') {
    return OrderStatus.PENDING;
  }

  return null;
};

export const pollOrderStatuses = async (): Promise<{ checked: number; updated: number }> => {
  if (!shankClient.isConfigured()) {
    return { checked: 0, updated: 0 };
  }

  const pendingOrders = await prisma.order.findMany({
    where: {
      status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
      externalReference: { not: null },
    },
    include: {
      product: { include: { network: true } },
      user: { include: { wallet: true } },
    },
    take: 50,
  });

  if (pendingOrders.length === 0) {
    return { checked: 0, updated: 0 };
  }

  const externalRefs = [...new Set(pendingOrders.map((o) => o.externalReference!))];

  let updated = 0;

  for (const externalRef of externalRefs) {
    try {
      const statusResponse = await shankClient.getOrderStatus(externalRef);
      console.log(`[ShankWorker] Status response for ${externalRef}:`, JSON.stringify(statusResponse));
      const ordersForRef = pendingOrders.filter((o) => o.externalReference === externalRef);

      for (const order of ordersForRef) {
        const matchingItem = statusResponse.items.find(
          (item) => item.beneficiary_number === order.phoneNumber,
        ) ?? statusResponse.items[0];

        if (!matchingItem) continue;

        const newStatus = mapShankStatusToOrderStatus(matchingItem);

        if (!newStatus || newStatus === order.status) continue;

        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { status: newStatus },
          });

          const isStorefrontOrder = order.source === 'STOREFRONT';

          if (newStatus === OrderStatus.FAILED && order.user.wallet && !isStorefrontOrder) {
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
                amount: order.amount,
                reason: 'Automatic refund — Shank API reported delivery failure',
                status: 'REFUNDED',
              },
            });
          }
        });

        if (newStatus === OrderStatus.SUCCESSFUL) {
          await maybeCreditStorefrontCommission(order.id);
        }

        await createNotification(
          order.userId,
          newStatus === OrderStatus.SUCCESSFUL ? 'Order completed' : 'Order failed',
          `${order.product.name} for ${order.phoneNumber} is now ${newStatus.toLowerCase()}.`,
          'ORDER',
        );

        updated++;
      }
    } catch (error) {
      const errorMessage = shankClient.getErrorMessage(error);
      console.error(`[ShankWorker] Error polling status for ${externalRef}:`, errorMessage);
    }
  }

  console.log(`[ShankWorker] Checked ${pendingOrders.length} orders, updated ${updated}`);
  return { checked: pendingOrders.length, updated };
};

let workerTimer: NodeJS.Timeout | null = null;

export const startShankStatusWorker = () => {
  if (!shankClient.isConfigured()) {
    console.log('[ShankWorker] SHANK_API_KEY not set, status worker disabled');
    return;
  }

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

import { OrderStatus, WalletTransactionCategory, WalletTransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { codecraftClient } from '../services/codecraft.service.js';
import { createNotification } from '../services/notification.service.js';
import { createWalletTransaction } from '../services/wallet.service.js';
import { maybeCreditStorefrontCommission } from '../services/commission.service.js';
import { env } from '../config/env.js';

const mapCodecraftStatusToOrderStatus = (orderStatus: string | null | undefined): OrderStatus | null => {
  const value = (orderStatus || '').toString().toLowerCase().trim();
  if (!value) return null;
  if (value === 'successful' || value === 'completed' || value === 'delivered') return OrderStatus.SUCCESSFUL;
  if (value === 'failed' || value === 'rejected' || value === 'error') return OrderStatus.FAILED;
  if (value === 'processing') return OrderStatus.PROCESSING;
  if (value === 'pending' || value === 'queued') return OrderStatus.PENDING;
  return null;
};

const STALE_ORDER_MS = 5 * 60 * 60 * 1000; // 5 hours

export const pollCodecraftOrderStatuses = async (): Promise<{ checked: number; updated: number }> => {
  if (!codecraftClient.isConfigured()) {
    return { checked: 0, updated: 0 };
  }

  const pendingOrders = await prisma.order.findMany({
    where: {
      status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
      externalReference: { not: null },
      product: {
        network: {
          code: { in: ['TELECEL', 'AIRTELTIGO'] },
        },
      },
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

  const now = Date.now();

  // Skip orders older than 5 hours — stop polling them but don't change their status
  const activeOrders = pendingOrders.filter((o) => {
    const createdAt = new Date(o.createdAt).getTime();
    return now - createdAt <= STALE_ORDER_MS;
  });

  const skippedCount = pendingOrders.length - activeOrders.length;
  if (skippedCount > 0) {
    console.log(`[CodecraftWorker] Skipping ${skippedCount} orders older than 5 hours`);
  }

  const externalRefs = [...new Set(activeOrders.map((o) => o.externalReference!))];

  let updated = 0;

  for (const externalRef of externalRefs) {
    try {
      const ordersForRef = activeOrders.filter((o) => o.externalReference === externalRef);
      if (ordersForRef.length === 0) {
        continue;
      }

      const sample = ordersForRef[0];
      const networkCode = sample.product.network.code.toUpperCase();
      const isAt = networkCode === 'AIRTELTIGO';
      const isBigTime = isAt && (sample.product.name + ' ' + sample.product.description).toLowerCase().includes('bigtime');

      const statusResponse = isBigTime
        ? await codecraftClient.getBigTimeOrderStatus(externalRef)
        : await codecraftClient.getRegularOrderStatus(externalRef);

      console.log(`[CodecraftWorker] Raw status response for ${externalRef}:`, JSON.stringify(statusResponse));

      if (!statusResponse.data) {
        console.log(`[CodecraftWorker] No data in response for ${externalRef}, skipping`);
        continue;
      }

      // Handle data as either an object or an array (API may return either)
      const dataObj = Array.isArray(statusResponse.data)
        ? statusResponse.data[0]
        : statusResponse.data;

      if (!dataObj) {
        console.log(`[CodecraftWorker] Empty data array for ${externalRef}, skipping`);
        continue;
      }

      const newStatus = mapCodecraftStatusToOrderStatus(dataObj.order_status);
      console.log(`[CodecraftWorker] Mapped status "${dataObj.order_status}" -> ${newStatus} for ${externalRef}`);
      if (!newStatus) {
        continue;
      }

      for (const order of ordersForRef) {
        if (order.status === newStatus) {
          continue;
        }

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
                reason: 'Automatic refund for failed provider delivery',
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
      const errorMessage = codecraftClient.getErrorMessage(error);
      console.error(`[CodecraftWorker] Error polling status for ${externalRef}:`, errorMessage);
    }
  }

  console.log(`[CodecraftWorker] Checked ${activeOrders.length} orders, updated ${updated}`);
  return { checked: activeOrders.length, updated };
};

let workerTimer: NodeJS.Timeout | null = null;

export const startCodecraftStatusWorker = () => {
  if (!codecraftClient.isConfigured()) {
    console.log('[CodecraftWorker] CODECRAFT_API_KEY not set, status worker disabled');
    return;
  }

  if (workerTimer) {
    console.log('[CodecraftWorker] Already running');
    return;
  }

  const intervalMs = env.CODECRAFT_WORKER_INTERVAL_MS;

  const tick = async () => {
    try {
      await pollCodecraftOrderStatuses();
    } catch (error) {
      console.error('[CodecraftWorker] Unexpected error during polling cycle:', error);
    }
  };

  workerTimer = setInterval(tick, intervalMs);

  setTimeout(tick, 5000);

  console.log(`[CodecraftWorker] Started — polling every ${intervalMs}ms`);
};

export const stopCodecraftStatusWorker = () => {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
    console.log('[CodecraftWorker] Stopped');
  }
};

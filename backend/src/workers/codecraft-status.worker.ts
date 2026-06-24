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

  const externalRefs = [...new Set(pendingOrders.map((o) => o.externalReference!))];

  let updated = 0;

  for (const externalRef of externalRefs) {
    try {
      const ordersForRef = pendingOrders.filter((o) => o.externalReference === externalRef);
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

      if (!statusResponse.data) {
        continue;
      }

      const newStatus = mapCodecraftStatusToOrderStatus(statusResponse.data.order_status);
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

  console.log(`[CodecraftWorker] Checked ${pendingOrders.length} orders, updated ${updated}`);
  return { checked: pendingOrders.length, updated };
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

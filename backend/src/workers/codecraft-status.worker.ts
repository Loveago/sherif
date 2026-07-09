import { OrderStatus, WalletTransactionCategory, WalletTransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { codecraftClient } from '../services/codecraft.service.js';
import { createNotification } from '../services/notification.service.js';
import { createWalletTransaction } from '../services/wallet.service.js';
import { maybeCreditStorefrontCommission } from '../services/commission.service.js';
import { env } from '../config/env.js';
import { isBigTimeProduct, toCodecraftNetwork } from '../utils/codecraft-mapping.js';

/**
 * Extract a human-readable order status string from CodeCraft status payloads.
 * The API is inconsistent: docs show `order_status`, but live responses may use
 * `status`, nested objects, or arrays.
 */
const extractCodecraftOrderStatus = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null;

  const root = payload as Record<string, unknown>;

  // Prefer nested data when present
  let data: unknown = root.data !== undefined ? root.data : root;
  if (Array.isArray(data)) {
    data = data[0];
  }
  if (!data || typeof data !== 'object') {
    // Some responses put the status at the top level only
    data = root;
  }

  const obj = data as Record<string, unknown>;
  const candidates = [
    obj.order_status,
    obj.orderStatus,
    obj.OrderStatus,
    obj.Order_Status,
    obj.delivery_status,
    obj.deliveryStatus,
    obj.api_status,
    obj.apiStatus,
    // Avoid bare top-level numeric `status` (often HTTP/API code 200)
    typeof obj.status === 'string' ? obj.status : null,
    typeof obj.Status === 'string' ? obj.Status : null,
  ];

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    const text = String(candidate).trim();
    if (!text) continue;
    // Ignore pure HTTP-like success codes that are not order delivery states
    if (/^\d+$/.test(text)) continue;
    return text;
  }

  return null;
};

const mapCodecraftStatusToOrderStatus = (orderStatus: string | null | undefined): OrderStatus | null => {
  const value = (orderStatus || '').toString().toLowerCase().trim();
  if (!value) return null;

  // Normalize separators so "crediting-successful" / "credit_successful" still match
  const normalized = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  // Terminal success — include bare "success" because CodeCraft often returns that
  const successExact = new Set([
    'successful',
    'success',
    'completed',
    'complete',
    'delivered',
    'delivery successful',
    'crediting successful',
    'credit successful',
    'credited successfully',
    'credited',
    'processed',
    'done',
    'ok',
  ]);
  if (successExact.has(normalized)) return OrderStatus.SUCCESSFUL;
  if (
    normalized.includes('successful') ||
    normalized.includes('delivered') ||
    normalized.includes('completed') ||
    normalized.includes('credited') ||
    normalized === 'success' ||
    normalized.includes('processed')
  ) {
    return OrderStatus.SUCCESSFUL;
  }

  // Terminal failure
  const failExact = new Set(['failed', 'fail', 'rejected', 'error', 'cancelled', 'canceled', 'declined']);
  if (failExact.has(normalized)) return OrderStatus.FAILED;
  if (
    normalized.includes('fail') ||
    normalized.includes('reject') ||
    normalized.includes('error') ||
    normalized.includes('cancel') ||
    normalized.includes('decline')
  ) {
    return OrderStatus.FAILED;
  }

  // In-progress
  if (
    normalized === 'processing' ||
    normalized === 'in progress' ||
    normalized === 'in-progress' ||
    normalized.includes('processing') ||
    normalized.includes('crediting')
  ) {
    return OrderStatus.PROCESSING;
  }

  if (normalized === 'pending' || normalized === 'queued' || normalized === 'queue' || normalized === 'waiting') {
    return OrderStatus.PENDING;
  }

  return null;
};

const STALE_ORDER_MS = 5 * 60 * 60 * 1000; // 5 hours

const fetchCodecraftStatus = async (externalRef: string, preferBigTime: boolean) => {
  const primary = preferBigTime
    ? () => codecraftClient.getBigTimeOrderStatus(externalRef)
    : () => codecraftClient.getRegularOrderStatus(externalRef);
  const secondary = preferBigTime
    ? () => codecraftClient.getRegularOrderStatus(externalRef)
    : () => codecraftClient.getBigTimeOrderStatus(externalRef);

  try {
    const response = await primary();
    const statusText = extractCodecraftOrderStatus(response);
    if (statusText || response?.data) {
      return { response, statusText, endpoint: preferBigTime ? 'big_time' : 'regular' as const };
    }
  } catch (error) {
    console.warn(
      `[CodecraftWorker] Primary status endpoint failed for ${externalRef}:`,
      codecraftClient.getErrorMessage(error),
    );
  }

  // Fallback: wrong package type may have been used (bigtime vs regular)
  try {
    const response = await secondary();
    const statusText = extractCodecraftOrderStatus(response);
    return { response, statusText, endpoint: preferBigTime ? 'regular' : 'big_time' as const };
  } catch (error) {
    console.warn(
      `[CodecraftWorker] Fallback status endpoint failed for ${externalRef}:`,
      codecraftClient.getErrorMessage(error),
    );
    throw error;
  }
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
          // Include common AT aliases so status polling still works if network code was renamed
          code: { in: ['TELECEL', 'AIRTELTIGO', 'AT', 'AIRTEL', 'TIGO', 'VODAFONE'] },
        },
      },
    },
    include: {
      product: { include: { network: true } },
      user: { include: { wallet: true } },
    },
    // Prefer freshest open orders so a backlog of stuck rows doesn't starve new ones
    orderBy: { createdAt: 'desc' },
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

  if (activeOrders.length === 0) {
    return { checked: 0, updated: 0 };
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
      const mapped = toCodecraftNetwork(networkCode);
      const preferBigTime =
        mapped === 'AT' &&
        isBigTimeProduct(
          sample.product.name,
          sample.product.description,
          sample.product.slug,
          sample.product.dataSize,
        );

      const { response: statusResponse, statusText, endpoint } = await fetchCodecraftStatus(
        externalRef,
        preferBigTime,
      );

      console.log(
        `[CodecraftWorker] Raw status response for ${externalRef} via ${endpoint}:`,
        JSON.stringify(statusResponse),
      );

      const newStatus = mapCodecraftStatusToOrderStatus(statusText);
      console.log(
        `[CodecraftWorker] Mapped status "${statusText ?? ''}" -> ${newStatus} for ${externalRef}`,
      );

      if (!statusText) {
        console.log(`[CodecraftWorker] No order status field found for ${externalRef}, skipping`);
        continue;
      }

      if (!newStatus) {
        console.warn(
          `[CodecraftWorker] Unmapped CodeCraft status "${statusText}" for ${externalRef} — not updating`,
        );
        continue;
      }

      for (const order of ordersForRef) {
        // Never downgrade a more advanced non-terminal status to an earlier one
        if (order.status === newStatus) {
          continue;
        }
        if (
          order.status === OrderStatus.PROCESSING &&
          (newStatus === OrderStatus.PENDING)
        ) {
          continue;
        }

        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { status: newStatus },
          });

          // Keep provider transaction rows in sync when present
          await tx.providerTransaction.updateMany({
            where: {
              orderId: order.id,
              status: { in: ['PENDING', 'PROCESSING'] },
            },
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

        if (newStatus === OrderStatus.SUCCESSFUL || newStatus === OrderStatus.FAILED) {
          await createNotification(
            order.userId,
            newStatus === OrderStatus.SUCCESSFUL ? 'Order completed' : 'Order failed',
            `${order.product.name} for ${order.phoneNumber} is now ${newStatus.toLowerCase()}.`,
            'ORDER',
          );
        }

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

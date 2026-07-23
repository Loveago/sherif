import { OrderStatus, WalletTransactionCategory, WalletTransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { codecraftClient } from '../services/codecraft.service.js';
import { createNotification } from '../services/notification.service.js';
import { createWalletTransaction } from '../services/wallet.service.js';
import { maybeCreditStorefrontCommission } from '../services/commission.service.js';
import { env } from '../config/env.js';
import { isBigTimeProduct, toCodecraftNetwork } from '../utils/codecraft-mapping.js';
import { phonesMatch } from '../utils/phone.js';

/** Keep polling longer so slow provider deliveries still settle. */
const STALE_ORDER_MS = 24 * 60 * 60 * 1000; // 24 hours
const POLL_BATCH_SIZE = 80;

/** Prevent overlapping poll cycles when a tick runs longer than the interval. */
let isPolling = false;

/**
 * Extract a human-readable order status string from CodeCraft status payloads.
 * The API is inconsistent: docs show `order_status`, but live responses may use
 * `status`, nested objects, or arrays.
 */
export const extractCodecraftOrderStatus = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') {
    if (typeof payload === 'string' && payload.trim()) return payload.trim();
    return null;
  }

  const root = payload as Record<string, unknown>;

  // Live CodeCraft status responses nest the order under `order_details`
  // (docs historically used `data`). Prefer the richest nested object first.
  const nestedCandidates: unknown[] = [
    root.order_details,
    root.orderDetails,
    root.OrderDetails,
    root.data,
    root.order,
    root.result,
    root,
  ];

  const objectsToScan: Record<string, unknown>[] = [];

  for (const candidate of nestedCandidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate)) {
      for (const entry of candidate) {
        if (entry && typeof entry === 'object') {
          objectsToScan.push(entry as Record<string, unknown>);
        }
      }
      continue;
    }
    if (typeof candidate === 'object') {
      objectsToScan.push(candidate as Record<string, unknown>);
    }
  }

  // Always include root last so nested delivery fields win over envelope "status":"success"
  if (!objectsToScan.includes(root)) {
    objectsToScan.push(root);
  }

  for (const obj of objectsToScan) {
    const hasDedicatedStatusField =
      obj.order_status != null ||
      obj.orderStatus != null ||
      obj.OrderStatus != null ||
      obj.Order_Status != null ||
      obj.delivery_status != null ||
      obj.deliveryStatus != null ||
      obj.api_status != null ||
      obj.apiStatus != null;

    const candidates = [
      obj.order_status,
      obj.orderStatus,
      obj.OrderStatus,
      obj.Order_Status,
      obj.delivery_status,
      obj.deliveryStatus,
      obj.api_status,
      obj.apiStatus,
      // Only treat bare `status` as delivery state when it is not a pure envelope flag
      // or when a dedicated delivery field is present on this same object.
      typeof obj.status === 'string' ? obj.status : null,
      typeof obj.Status === 'string' ? obj.Status : null,
      obj.message,
    ];

    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined) continue;
      const text = String(candidate).trim();
      if (!text) continue;
      // Ignore pure HTTP-like success codes that are not order delivery states
      if (/^\d+$/.test(text)) continue;

      const lower = text.toLowerCase();
      if (lower === 'order found' || lower === 'order not found') continue;

      // Envelope-level "success"/"successful" without a dedicated order status field
      // means the API call worked, not that the bundle was delivered.
      if (
        (lower === 'successful' || lower === 'success') &&
        !hasDedicatedStatusField &&
        obj === root
      ) {
        continue;
      }

      return text;
    }
  }

  // As a last resort, if nested data is a plain string treat it as the status
  if (typeof root.data === 'string' && root.data.trim()) {
    return root.data.trim();
  }
  if (typeof root.order_details === 'string' && root.order_details.trim()) {
    return root.order_details.trim();
  }

  return null;
};

export const mapCodecraftStatusToOrderStatus = (orderStatus: string | null | undefined): OrderStatus | null => {
  const value = (orderStatus || '').toString().toLowerCase().trim();
  if (!value) return null;

  // Normalize separators so "crediting-successful" / "credit_successful" still match
  const normalized = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  // Terminal success — live CodeCraft returns "Delivered"; docs also use "successful"
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
    normalized === 'accepted' ||
    normalized.includes('processing') ||
    normalized.includes('crediting')
  ) {
    return OrderStatus.PROCESSING;
  }

  if (
    normalized === 'pending' ||
    normalized === 'queued' ||
    normalized === 'queue' ||
    normalized === 'waiting' ||
    normalized.includes('pending') ||
    normalized.includes('queued')
  ) {
    return OrderStatus.PENDING;
  }

  return null;
};

/**
 * When CodeCraft returns an array of order rows, pick the one for this beneficiary.
 */
const pickStatusPayloadForOrder = (
  response: unknown,
  phoneNumber: string,
): unknown => {
  if (!response || typeof response !== 'object') return response;
  const root = response as Record<string, unknown>;
  if (!Array.isArray(root.data)) return response;

  const match = root.data.find((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const row = entry as Record<string, unknown>;
    const beneficiary = (row.beneficiary || row.beneficiary_number || row.recipient || row.phone) as
      | string
      | undefined;
    return phonesMatch(beneficiary, phoneNumber);
  });

  if (match) {
    return { ...root, data: match };
  }
  return response;
};

const fetchCodecraftStatus = async (externalRef: string, _preferBigTime: boolean) => {
  // Live CodeCraft API uses a single POST /response.php for all package types.
  // Docs still list response_regular.php / response_big_time.php but those 404.
  const response = await codecraftClient.getOrderStatus(externalRef);
  const statusText = extractCodecraftOrderStatus(response);
  return { response, statusText, endpoint: 'response' as const };
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

  const isTerminal = newStatus === OrderStatus.SUCCESSFUL || newStatus === OrderStatus.FAILED;
  let didUpdate = false;

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
            reason: 'Automatic refund for failed provider delivery',
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

export const pollCodecraftOrderStatuses = async (): Promise<{ checked: number; updated: number }> => {
  if (!codecraftClient.isConfigured()) {
    return { checked: 0, updated: 0 };
  }

  if (isPolling) {
    console.log('[CodecraftWorker] Previous poll still running — skipping this tick');
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

    const skippedCount = pendingOrders.length - activeOrders.length;
    if (skippedCount > 0) {
      console.log(`[CodecraftWorker] Skipping ${skippedCount} orders older than 24 hours`);
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

        const { response: statusResponse, statusText: rawStatusText, endpoint } = await fetchCodecraftStatus(
          externalRef,
          preferBigTime,
        );

        console.log(
          `[CodecraftWorker] Raw status response for ${externalRef} via ${endpoint}:`,
          JSON.stringify(statusResponse),
        );

        for (const order of ordersForRef) {
          // If CodeCraft returns multiple rows, resolve the one for this phone
          const scoped = pickStatusPayloadForOrder(statusResponse, order.phoneNumber);
          const statusText =
            ordersForRef.length > 1 ? extractCodecraftOrderStatus(scoped) ?? rawStatusText : rawStatusText;

          const newStatus = mapCodecraftStatusToOrderStatus(statusText);
          console.log(
            `[CodecraftWorker] ${order.receiptNumber} mapped status "${statusText ?? ''}" -> ${newStatus} for ${externalRef}`,
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

          const changed = await applyOrderStatusUpdate(order as any, newStatus);
          if (changed) {
            updated++;
            console.log(
              `[CodecraftWorker] Updated ${order.receiptNumber} ${order.status} -> ${newStatus}`,
            );
          }
        }
      } catch (error) {
        const errorMessage = codecraftClient.getErrorMessage(error);
        console.error(`[CodecraftWorker] Error polling status for ${externalRef}:`, errorMessage);
      }
    }

    console.log(`[CodecraftWorker] Checked ${activeOrders.length} orders, updated ${updated}`);
    return { checked: activeOrders.length, updated };
  } finally {
    isPolling = false;
  }
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

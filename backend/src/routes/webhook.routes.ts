import crypto from 'crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { OrderStatus, WalletTransactionCategory, WalletTransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { createSuccessResponse } from '../utils/response.js';
import { createNotification } from '../services/notification.service.js';
import { createWalletTransaction } from '../services/wallet.service.js';
import { maybeCreditStorefrontCommission } from '../services/commission.service.js';
import { mapShankStatusToOrderStatus } from '../workers/shank-status.worker.js';
import {
  applyBundlePortalOrderStatusUpdate,
  mapBundlePortalStatusToOrderStatus,
} from '../workers/bundle-portal-status.worker.js';
import { getBundlePortalWebhookSecret } from '../services/provider-credentials.service.js';
import type { ShankOrderStatusItem } from '../services/shank.service.js';

export const webhookRouter = Router();

webhookRouter.post('/webhooks/:event', async (request, response, next) => {
  try {
    const event = request.params.event;
    const signature = request.headers['x-webhook-signature'] as string | undefined;

    const payload = JSON.stringify(request.body);

    await prisma.webhookLog.create({
      data: {
        event,
        statusCode: 200,
        success: true,
        responseBody: payload,
        webhook: {
          connectOrCreate: {
            where: { id: 'incoming-default' },
            create: {
              id: 'incoming-default',
              event,
              url: request.originalUrl,
              secret: signature || '',
              active: true,
            },
          },
        },
      },
    });

    return response.status(200).json(createSuccessResponse({ received: true, event }, 'Webhook received'));
  } catch (error) {
    return next(error);
  }
});

webhookRouter.get('/webhooks/logs', async (_request, response, next) => {
  try {
    const logs = await prisma.webhookLog.findMany({
      include: { webhook: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return response.json(createSuccessResponse(logs));
  } catch (error) {
    return next(error);
  }
});

webhookRouter.post('/webhooks/shank/orders-processed', async (request, response, next) => {
  try {
    const payload = request.body;

    if (payload.event !== 'orders.processed' || !Array.isArray(payload.items)) {
      return response.status(400).json({ success: false, message: 'Invalid webhook payload' });
    }

    for (const item of payload.items) {
      const orderCode = item.order_code || item.order_reference;
      if (!orderCode) continue;

      const order = await prisma.order.findFirst({
        where: {
          status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
          OR: [{ providerReference: orderCode }, { externalReference: orderCode }],
        },
        include: { product: { include: { network: true } }, user: { include: { wallet: true } } },
      });

      if (!order) continue;

      // Reuse the same mapping logic as the status worker
      const statusItem = {
        id: Number(item.id) || 0,
        beneficiary_number: item.beneficiary_number || order.phoneNumber,
        order_reference: item.order_reference || item.order_code || orderCode,
        status: item.status,
        api_status: item.api_status || '',
        api_source: item.api_source || '',
        volume: item.volume || '',
        network: item.network || order.product.network.code,
        price: Number(item.price) || 0,
        created_at: item.created_at || new Date().toISOString(),
      } as ShankOrderStatusItem;

      const newStatus = mapShankStatusToOrderStatus(statusItem);

      if (!newStatus || newStatus === order.status) continue;
      // Never downgrade PROCESSING → PENDING
      if (order.status === OrderStatus.PROCESSING && newStatus === OrderStatus.PENDING) continue;

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
        if (result.count === 0) return;
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
                amount: order.amount,
                reason: 'Automatic refund — Shank webhook reported delivery failure',
                status: 'REFUNDED',
              },
            });
          }
        }
      });

      if (!didUpdate) continue;

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
    }

    return response.status(200).json({ received: true });
  } catch (error) {
    return next(error);
  }
});

const handleBundlePortalWebhook = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const rawBody = (request as any).rawBody || Buffer.from(JSON.stringify(request.body));
    const signatureHeader = (request.headers['x-bundleportal-signature'] || '') as string;

    const secret = await getBundlePortalWebhookSecret();
    if (secret) {
      const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const signatureBuf = Buffer.from(signatureHeader);
      const expectedBuf = Buffer.from(expected);
      if (
        signatureBuf.length !== expectedBuf.length ||
        !crypto.timingSafeEqual(signatureBuf, expectedBuf)
      ) {
        console.warn('[BundlePortalWebhook] Received callback with invalid HMAC signature');
        return response.status(401).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const payload = request.body || {};
    console.log('[BundlePortalWebhook] Received event:', payload.event, 'order_id:', payload.order_id, 'status:', payload.status);

    // Respond 200 quickly within the 5 second timeout requirement
    response.status(200).json({ success: true, message: 'Webhook received' });

    // Process order update asynchronously
    const orderId = payload.order_id;
    const reference = payload.reference;
    const rawStatus = payload.status || (typeof payload.event === 'string' ? payload.event.replace('order.', '') : null);

    if (!orderId && !reference) {
      return;
    }

    const order = await prisma.order.findFirst({
      where: {
        status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
        OR: [
          ...(orderId ? [{ receiptNumber: String(orderId) }, { externalReference: String(orderId) }, { providerReference: String(orderId) }] : []),
          ...(reference ? [{ externalReference: String(reference) }, { providerReference: String(reference) }] : []),
        ],
      },
      include: {
        product: { include: { network: true } },
        user: { include: { wallet: true } },
      },
    });

    if (!order) {
      console.log(`[BundlePortalWebhook] No pending order found matching order_id "${orderId}" / ref "${reference}"`);
      return;
    }

    const mappedStatus = mapBundlePortalStatusToOrderStatus(rawStatus);
    if (!mappedStatus) {
      console.warn(`[BundlePortalWebhook] Could not map status "${rawStatus}" for order ${order.receiptNumber}`);
      return;
    }

    await applyBundlePortalOrderStatusUpdate(order as any, mappedStatus, payload.failure_reason);
    console.log(`[BundlePortalWebhook] Updated order ${order.receiptNumber} -> ${mappedStatus}`);
  } catch (error) {
    console.error('[BundlePortalWebhook] Error processing webhook:', error);
    if (!response.headersSent) {
      return next(error);
    }
  }
};

webhookRouter.post('/webhooks/bundleportal', handleBundlePortalWebhook);
webhookRouter.post('/webhooks/bundle-portal', handleBundlePortalWebhook);


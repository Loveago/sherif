import { Router } from 'express';
import crypto from 'crypto';
import { OrderStatus, WalletTransactionCategory, WalletTransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { createSuccessResponse } from '../utils/response.js';
import { createNotification } from '../services/notification.service.js';
import { createWalletTransaction } from '../services/wallet.service.js';
import { maybeCreditStorefrontCommission } from '../services/commission.service.js';

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
          OR: [{ providerReference: orderCode }, { externalReference: orderCode }],
        },
        include: { product: { include: { network: true } }, user: { include: { wallet: true } } },
      });

      if (!order) continue;

      const rawApiStatus = (item.api_status || '').toString().toLowerCase().trim();
      const rawStatus = (item.status ?? '').toString().toLowerCase().trim();
      const apiStatus = rawStatus || rawApiStatus;

      let numericStatus: number | null = null;
      if (typeof item.status === 'number') {
        numericStatus = item.status;
      } else {
        const parsed = Number(item.status);
        if (!Number.isNaN(parsed)) {
          numericStatus = parsed;
        }
      }

      let newStatus: OrderStatus | null = null;

      if (numericStatus === 0) newStatus = OrderStatus.PENDING;
      else if (numericStatus === 1) newStatus = OrderStatus.PROCESSING;
      else if (numericStatus === 2) newStatus = OrderStatus.SUCCESSFUL;
      else if (numericStatus === 3) newStatus = OrderStatus.FAILED;

      if (!newStatus) {
        if (apiStatus === 'processed' || apiStatus === 'delivered' || apiStatus === 'completed') {
          newStatus = OrderStatus.SUCCESSFUL;
        } else if (apiStatus === 'failed' || apiStatus === 'rejected' || apiStatus === 'error') {
          newStatus = OrderStatus.FAILED;
        } else if (apiStatus === 'processing') {
          newStatus = OrderStatus.PROCESSING;
        } else if (apiStatus === 'pending' || apiStatus === 'queued') {
          newStatus = OrderStatus.PENDING;
        }
      }

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
              reason: 'Automatic refund — Shank webhook reported delivery failure',
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
    }

    return response.status(200).json({ received: true });
  } catch (error) {
    return next(error);
  }
});

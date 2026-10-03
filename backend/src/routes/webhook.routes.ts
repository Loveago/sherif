import crypto from 'crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { OrderStatus, Prisma, WalletTransactionCategory, WalletTransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { createSuccessResponse } from '../utils/response.js';
import { createNotification } from '../services/notification.service.js';
import { createWalletTransaction, getWalletByUserId } from '../services/wallet.service.js';
import { maybeCreditStorefrontCommission } from '../services/commission.service.js';
import { mapShankStatusToOrderStatus } from '../workers/shank-status.worker.js';
import {
  applyBundlePortalOrderStatusUpdate,
  mapBundlePortalStatusToOrderStatus,
} from '../workers/bundle-portal-status.worker.js';
import {
  applyTskconnectOrderStatusUpdate,
  mapTskconnectStatusToOrderStatus,
} from '../workers/tskconnect-status.worker.js';
import {
  getBundlePortalWebhookSecret,
  getTskconnectWebhookSecret,
} from '../services/provider-credentials.service.js';
import { verifyTskconnectWebhook } from '../services/tskconnect.service.js';
import { getPaystackSecretKey } from '../services/paystack.service.js';
import { emitWebhookEvent } from '../services/webhook.service.js';
import { queueFulfillment } from '../queues/index.js';
import { generateReference } from '../utils/refs.js';
import type { ShankOrderStatusItem } from '../services/shank.service.js';
import { verifyForwarderSecret, processIncomingForwardedSms } from '../services/send-claim.service.js';

const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));

export const webhookRouter = Router();

/**
 * Handle incoming Paystack webhook events (e.g. charge.success)
 * Fully validates HMAC SHA512 signature and processes:
 * 1. Storefront orders (marks paid, increments sales, queues fulfillment)
 * 2. Wallet deposits (credits wallet balance, updates payment status)
 * 3. AFA Registrations (marks paymentStatus successful)
 */
export const handlePaystackWebhook = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const signature = request.headers['x-paystack-signature'] as string | undefined;
    const secretKey = await getPaystackSecretKey();

    if (secretKey) {
      if (!signature) {
        console.warn('[PaystackWebhook] Webhook received without x-paystack-signature header');
        return response.status(401).json({ success: false, message: 'Missing signature' });
      }

      const rawBody = (request as any).rawBody || Buffer.from(JSON.stringify(request.body));
      const hash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');

      if (hash !== signature) {
        console.warn('[PaystackWebhook] Invalid HMAC signature for webhook');
        return response.status(401).json({ success: false, message: 'Invalid signature' });
      }
    } else {
      console.warn('[PaystackWebhook] No Paystack secret key configured, skipping signature check');
    }

    const payload = request.body;
    const event = payload?.event;
    const data = payload?.data;

    // Log the incoming webhook to webhook logs
    try {
      await prisma.webhookLog.create({
        data: {
          event: event ? `paystack.${event}` : 'paystack.unknown',
          statusCode: 200,
          success: true,
          responseBody: JSON.stringify(payload).slice(0, 5000),
          webhook: {
            connectOrCreate: {
              where: { id: 'incoming-paystack' },
              create: {
                id: 'incoming-paystack',
                event: event || 'paystack',
                url: request.originalUrl,
                secret: signature || '',
                active: true,
              },
            },
          },
        },
      });
    } catch (logErr) {
      console.error('[PaystackWebhook] Failed to log webhook to DB:', logErr);
    }

    // Acknowledge non-charge.success events immediately
    if (event !== 'charge.success' || !data || data.status !== 'success') {
      return response.status(200).json({ success: true, message: 'Event acknowledged' });
    }

    // Process the successful charge
    await processPaystackSuccessfulCharge(data);

    return response.status(200).json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('[PaystackWebhook] Error processing webhook:', error);
    if (!response.headersSent) {
      return response.status(500).json({ success: false, message: 'Internal error processing webhook' });
    }
  }
};

async function processPaystackSuccessfulCharge(data: any) {
  const reference = String(data.reference || '');
  const metadata = data.metadata || {};
  const amountInCedis = (Number(data.amount) || 0) / 100;

  console.log(`[PaystackWebhook] Processing charge.success for reference "${reference}", amount: GHS ${amountInCedis}`);

  // ─── 1. Check Storefront Order ───
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { receiptNumber: reference },
        { providerReference: reference },
        ...(metadata.orderId ? [{ receiptNumber: metadata.orderId }] : []),
      ],
    },
    include: {
      product: { include: { network: true } },
    },
  });

  if (order) {
    if (order.status === 'PENDING' && !order.providerReference) {
      console.log(`[PaystackWebhook] Fulfilling storefront order ${order.receiptNumber}`);
      const storefront = await prisma.storefront.findFirst({
        where: { userId: order.userId },
      });

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { providerReference: reference },
        });

        if (storefront) {
          const nextSalesCount = storefront.sales + 1;
          const conversionRate = storefront.visits > 0
            ? Number(((nextSalesCount / storefront.visits) * 100).toFixed(2))
            : 0;

          await tx.storefront.update({
            where: { id: storefront.id },
            data: {
              sales: { increment: 1 },
              conversionRate: toDecimal(conversionRate),
            },
          });
        }
      });

      await createNotification(
        order.userId,
        'Storefront order paid (Paystack)',
        `Order ${order.receiptNumber} for ${order.phoneNumber} has been confirmed and queued for delivery.`,
        'ORDER',
      );

      await emitWebhookEvent('order.created', {
        orderId: order.id,
        userId: order.userId,
        source: 'STOREFRONT',
        viaWebhook: true,
      });

      queueFulfillment(order.id).catch((err) => {
        console.error(`[PaystackWebhook] Fulfillment failed for order ${order.id}:`, err);
      });
      return;
    } else {
      console.log(`[PaystackWebhook] Storefront order ${order.receiptNumber} already validated/processed.`);
      return;
    }
  }

  // ─── 2. Check Wallet Deposit (Payment) ───
  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { providerRef: reference },
        { reference: reference },
      ],
      method: 'PAYSTACK',
    },
  });

  if (payment) {
    if (payment.status !== 'SUCCESSFUL') {
      console.log(`[PaystackWebhook] Crediting wallet for payment ${payment.id}, amount: GHS ${payment.amount}`);
      const wallet = await getWalletByUserId(payment.userId);

      await prisma.$transaction(async (tx) => {
        await createWalletTransaction(
          wallet.id,
          payment.amount.toNumber(),
          WalletTransactionType.CREDIT,
          WalletTransactionCategory.FUNDING,
          'Wallet funded via Paystack (Webhook)',
          tx,
        );

        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'SUCCESSFUL' },
        });
      });

      await createNotification(
        payment.userId,
        'Wallet funded',
        `Your wallet has been credited with GHS ${payment.amount.toFixed(2)}.`,
        'WALLET',
      );

      await emitWebhookEvent('wallet.funded', {
        userId: payment.userId,
        amount: payment.amount.toNumber(),
        reference: payment.providerRef || payment.reference,
        viaWebhook: true,
      });
      return;
    } else {
      console.log(`[PaystackWebhook] Payment ${payment.id} already marked SUCCESSFUL.`);
      return;
    }
  }

  // Fallback: If payment record was not created beforehand but metadata has userId for wallet funding:
  if (
    metadata.userId &&
    (metadata.amount || amountInCedis > 0) &&
    metadata.type !== 'AFA_REGISTRATION' &&
    metadata.source !== 'STOREFRONT'
  ) {
    const user = await prisma.user.findUnique({ where: { id: metadata.userId } });
    if (user) {
      const depositAmount = Number(metadata.amount) || amountInCedis;
      console.log(`[PaystackWebhook] Creating and crediting wallet for user ${user.id}, amount: GHS ${depositAmount}`);
      const wallet = await getWalletByUserId(user.id);

      await prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            userId: user.id,
            amount: toDecimal(depositAmount),
            method: 'PAYSTACK',
            status: 'SUCCESSFUL',
            reference: generateReference('PAY'),
            providerRef: reference,
          },
        });

        await createWalletTransaction(
          wallet.id,
          depositAmount,
          WalletTransactionType.CREDIT,
          WalletTransactionCategory.FUNDING,
          'Wallet funded via Paystack (Webhook)',
          tx,
        );
      });

      await createNotification(
        user.id,
        'Wallet funded',
        `Your wallet has been credited with GHS ${depositAmount.toFixed(2)}.`,
        'WALLET',
      );

      await emitWebhookEvent('wallet.funded', {
        userId: user.id,
        amount: depositAmount,
        reference,
        viaWebhook: true,
      });
      return;
    }
  }

  // ─── 3. Check AFA Registration ───
  const afa = await prisma.aFARegistration.findFirst({
    where: { paymentReference: reference },
  });

  if (afa) {
    if (afa.paymentStatus !== 'SUCCESSFUL') {
      console.log(`[PaystackWebhook] Marking AFA registration ${afa.id} as SUCCESSFUL`);
      const relatedPayment = await prisma.payment.findFirst({
        where: { providerRef: reference },
      });

      await prisma.$transaction(async (tx) => {
        await tx.aFARegistration.update({
          where: { id: afa.id },
          data: { paymentStatus: 'SUCCESSFUL' },
        });

        if (relatedPayment) {
          await tx.payment.update({
            where: { id: relatedPayment.id },
            data: { status: 'SUCCESSFUL' },
          });
        }
      });

      await createNotification(
        afa.userId,
        'AFA Registration Submitted',
        `Your AFA registration payment of GHS ${afa.amountPaid?.toFixed(2) || amountInCedis.toFixed(2)} was successful and is now under review.`,
        'SYSTEM',
      );
      return;
    } else {
      console.log(`[PaystackWebhook] AFA registration ${afa.id} already SUCCESSFUL.`);
      return;
    }
  }

  console.warn(`[PaystackWebhook] Unhandled charge.success for ref "${reference}" - no matching order, payment, or AFA registration`);
}

// Paystack webhook routes
webhookRouter.post('/webhooks/paystack', handlePaystackWebhook);
webhookRouter.post('/paystack/webhook', handlePaystackWebhook);
webhookRouter.post('/paystack', handlePaystackWebhook);

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

const handleTskconnectWebhook = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const rawBody = (request as any).rawBody || Buffer.from(JSON.stringify(request.body));
    const signatureHeader = (request.headers['x-tskconnect-signature'] || '') as string;
    const timestampHeader = (request.headers['x-tskconnect-timestamp'] || '') as string;

    const secret = await getTskconnectWebhookSecret();
    if (secret) {
      const isValid = verifyTskconnectWebhook(rawBody, signatureHeader, timestampHeader, secret);
      if (!isValid) {
        console.warn('[TskconnectWebhook] Received callback with invalid HMAC signature');
        return response.status(401).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const payload = request.body || {};
    console.log('[TskconnectWebhook] Received event:', payload.event, 'orderId:', payload.orderId || payload.data?.orderId);

    // Fast 200 response to prevent provider retries/timeouts
    response.status(200).json({ success: true, message: 'Webhook received' });

    // Handle test / ping webhook
    if (payload.event === 'webhook.test' || payload.type === 'test') {
      console.log('[TskconnectWebhook] Successfully verified test webhook ping');
      return;
    }

    // Process order update asynchronously
    const data = (payload.data && typeof payload.data === 'object') ? payload.data : payload;
    const orderId = data.orderId || payload.orderId;
    const reference = data.reference || payload.reference || data.externalReference || payload.externalReference;
    const rawStatus = data.status || payload.status || (typeof payload.event === 'string' ? payload.event.replace('order.', '') : null);

    if (!orderId && !reference) {
      return;
    }

    const order = await prisma.order.findFirst({
      where: {
        status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
        OR: [
          ...(orderId ? [{ receiptNumber: String(orderId) }, { externalReference: String(orderId) }, { providerReference: String(orderId) }] : []),
          ...(reference ? [{ externalReference: String(reference) }, { providerReference: String(reference) }, { receiptNumber: String(reference) }] : []),
        ],
      },
      include: {
        product: { include: { network: true } },
        user: { include: { wallet: true } },
      },
    });

    if (!order) {
      console.log(`[TskconnectWebhook] No pending order found matching orderId "${orderId}" / ref "${reference}"`);
      return;
    }

    const mappedStatus = mapTskconnectStatusToOrderStatus(rawStatus);
    if (!mappedStatus) {
      console.warn(`[TskconnectWebhook] Could not map status "${rawStatus}" for order ${order.receiptNumber}`);
      return;
    }

    await applyTskconnectOrderStatusUpdate(
      order as any,
      mappedStatus,
      data.failureReason || data.reason || payload.failureReason,
    );
    console.log(`[TskconnectWebhook] Updated order ${order.receiptNumber} -> ${mappedStatus}`);
  } catch (error) {
    console.error('[TskconnectWebhook] Error processing webhook:', error);
    if (!response.headersSent) {
      return next(error);
    }
  }
};

webhookRouter.post('/webhooks/tskconnect', handleTskconnectWebhook);
webhookRouter.post('/webhooks/tsk-connect', handleTskconnectWebhook);

/**
 * Handle incoming SMS Forwarder webhook for Send & Claim Mobile Money deposits.
 * Compatible with common Android SMS Forwarder apps sending JSON or form payloads.
 */
export const handleMomoSmsWebhook = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const authHeader = request.headers.authorization as string | undefined;
    const secretHeader = (request.headers['x-forwarder-secret'] as string | undefined);
    const apiKeyHeader = (request.headers['x-api-key'] as string | undefined);
    const querySecret = (request.query.secret as string | undefined) || (request.query.token as string | undefined);
    const bodySecret = typeof request.body === 'object' && request.body ? (request.body.secret as string | undefined) : undefined;
    const token = authHeader || secretHeader || apiKeyHeader || querySecret || bodySecret;

    if (!verifyForwarderSecret(token)) {
      console.warn('[MomoSmsWebhook] Unauthorized SMS forwarder attempt. Token provided:', token ? 'YES (masked)' : 'NONE');
      return response.status(401).json({ success: false, message: 'Unauthorized: Invalid forwarder secret' });
    }

    const body = (typeof request.body === 'object' && request.body !== null) ? request.body : {};
    const rawSms = (
      body.message ||
      body.body ||
      body.text ||
      body.content ||
      body.sms ||
      body.msg ||
      body.textMsg ||
      body.desp ||
      body.data ||
      (typeof request.body === 'string' ? request.body : '')
    );

    if (!rawSms || typeof rawSms !== 'string' || !rawSms.trim()) {
      return response.status(400).json({ success: false, message: 'Missing SMS body or message text' });
    }

    const senderPhone = body.from || body.sender || body.phone || null;
    const recipientPhone = body.to || body.recipient || body.simNumber || null;
    const networkHint = body.network || body.carrier || body.sim || null;

    const result = await processIncomingForwardedSms({
      rawSms: rawSms.trim(),
      senderPhone: senderPhone ? String(senderPhone) : null,
      recipientPhone: recipientPhone ? String(recipientPhone) : null,
      networkHint: networkHint ? String(networkHint) : null,
      source: 'SMS_FORWARDER',
    });

    console.log(`[MomoSmsWebhook] Processed incoming SMS -> Status: ${result.status} (ID: ${result.transactionId})`);
    return response.status(200).json({
      received: true,
      ...result,
    });
  } catch (error) {
    console.error('[MomoSmsWebhook] Error processing forwarded SMS:', error);
    if (!response.headersSent) {
      return next(error);
    }
  }
};

// GET ping endpoints for connectivity testing
webhookRouter.get('/webhooks/momo/sms', (_req, res) => res.json({ status: 'ok', service: 'momo-sms-webhook' }));
webhookRouter.get('/momo/sms', (_req, res) => res.json({ status: 'ok', service: 'momo-sms-webhook' }));

webhookRouter.post('/webhooks/momo/sms', handleMomoSmsWebhook);
webhookRouter.post('/momo/sms', handleMomoSmsWebhook);



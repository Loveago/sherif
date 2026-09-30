import { Prisma, WalletTransactionCategory, WalletTransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { verifyPaystackPayment } from './paystack.service.js';
import { createNotification } from './notification.service.js';
import { emitWebhookEvent } from './webhook.service.js';
import { queueFulfillment } from '../queues/index.js';
import { createWalletTransaction, getWalletByUserId } from './wallet.service.js';

const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));

export interface ReconciliationResult {
  checked: number;
  reconciled: number;
  failed: number;
  skipped: number;
}

export const findPendingStorefrontOrders = async (after?: Date) => {
  return prisma.order.findMany({
    where: {
      source: 'STOREFRONT',
      status: 'PENDING',
      providerReference: null,
      ...(after && { createdAt: { gt: after } }),
    },
    include: {
      product: { include: { network: true } },
      user: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });
};

export const findPendingWalletPayments = async (after?: Date) => {
  return prisma.payment.findMany({
    where: {
      method: 'PAYSTACK',
      status: 'PENDING',
      providerRef: { not: null },
      ...(after && { createdAt: { gt: after } }),
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
};

export const reconcileSinglePayment = async (paymentId: string): Promise<'reconciled' | 'failed' | 'skipped'> => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.status !== 'PENDING' || !payment.providerRef) {
      return 'skipped';
    }

    const paystackResponse = await verifyPaystackPayment(payment.providerRef);
    if (!paystackResponse.status || paystackResponse.data.status !== 'success') {
      return 'skipped';
    }

    // Double check it hasn't been credited already
    const freshPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
      select: { status: true },
    });

    if (!freshPayment || freshPayment.status !== 'PENDING') {
      return 'skipped';
    }

    const wallet = await getWalletByUserId(payment.userId);

    await prisma.$transaction(async (tx) => {
      await createWalletTransaction(
        wallet.id,
        payment.amount.toNumber(),
        WalletTransactionType.CREDIT,
        WalletTransactionCategory.FUNDING,
        'Wallet funded via Paystack (Reconciled)',
        tx,
      );

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCESSFUL' },
      });
    });

    await createNotification(
      payment.userId,
      'Wallet funded (reconciled)',
      `Your wallet has been credited with GHS ${payment.amount.toFixed(2)}.`,
      'WALLET',
    );

    await emitWebhookEvent('wallet.funded', {
      userId: payment.userId,
      amount: payment.amount.toNumber(),
      reference: payment.providerRef,
      reconciled: true,
    });

    return 'reconciled';
  } catch (error: any) {
    const message = error?.message || String(error);
    if (message.includes('not found') || message.includes('No transaction') || message.includes('404')) {
      return 'skipped';
    }
    console.error(`[Reconciler] Error reconciling payment ${paymentId}:`, message);
    return 'failed';
  }
};

export const reconcileSingleOrder = async (order: Awaited<ReturnType<typeof findPendingStorefrontOrders>>[number]): Promise<'reconciled' | 'failed' | 'skipped'> => {
  try {
    // Extra safety: never touch orders that have already been processed
    if (order.status !== 'PENDING') {
      return 'skipped';
    }

    // Check Paystack for this order
    const paystackResponse = await verifyPaystackPayment(order.receiptNumber);

    if (!paystackResponse.status || paystackResponse.data.status !== 'success') {
      // Not paid yet — skip silently
      return 'skipped';
    }

    // Race-condition guard: re-check order hasn't been processed since we started
    const freshOrder = await prisma.order.findUnique({
      where: { id: order.id },
      select: { providerReference: true, status: true },
    });

    if (!freshOrder || freshOrder.providerReference || freshOrder.status !== 'PENDING') {
      return 'skipped';
    }

    // Payment is successful but order is still pending — reconcile it
    const storefront = await prisma.storefront.findFirst({
      where: { userId: order.userId },
    });

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          providerReference: order.receiptNumber,
        },
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
      'Storefront order paid (reconciled)',
      `Order ${order.receiptNumber} for ${order.phoneNumber} was paid via Paystack and has been reconciled automatically.`,
      'ORDER',
    );

    await emitWebhookEvent('order.created', {
      orderId: order.id,
      userId: order.userId,
      source: 'STOREFRONT',
      reconciled: true,
    });

    // Queue fulfillment to send to provider
    queueFulfillment(order.id).catch((error) => {
      console.error(`[Reconciler] Fulfillment failed for order ${order.id}:`, error);
    });

    return 'reconciled';
  } catch (error: any) {
    // If Paystack says transaction not found, that's expected for unpaid orders
    const message = error?.message || String(error);
    if (message.includes('not found') || message.includes('No transaction') || message.includes('404')) {
      return 'skipped';
    }

    console.error(`[Reconciler] Error reconciling order ${order.receiptNumber}:`, message);
    return 'failed';
  }
};

export const runReconciliation = async (after?: Date): Promise<ReconciliationResult> => {
  const pendingOrders = await findPendingStorefrontOrders(after);
  const pendingPayments = await findPendingWalletPayments(after);

  if (pendingOrders.length === 0 && pendingPayments.length === 0) {
    return { checked: 0, reconciled: 0, failed: 0, skipped: 0 };
  }

  let reconciled = 0;
  let failed = 0;
  let skipped = 0;

  for (const order of pendingOrders) {
    const result = await reconcileSingleOrder(order);
    if (result === 'reconciled') reconciled++;
    else if (result === 'failed') failed++;
    else skipped++;
  }

  for (const payment of pendingPayments) {
    const result = await reconcileSinglePayment(payment.id);
    if (result === 'reconciled') reconciled++;
    else if (result === 'failed') failed++;
    else skipped++;
  }

  const totalChecked = pendingOrders.length + pendingPayments.length;
  console.log(
    `[Reconciler] Checked ${totalChecked} items (${pendingOrders.length} orders, ${pendingPayments.length} deposits): ${reconciled} reconciled, ${failed} failed, ${skipped} skipped`
  );

  return {
    checked: totalChecked,
    reconciled,
    failed,
    skipped,
  };
};

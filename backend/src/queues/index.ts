import { OrderStatus, WalletTransactionCategory, WalletTransactionType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { fulfillOrderWithProvider } from '../services/provider.service.js';
import { createNotification } from '../services/notification.service.js';
import { createWalletTransaction } from '../services/wallet.service.js';

const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));

export const processFulfillmentJob = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { include: { wallet: true } },
      product: true,
      batch: true,
    },
  });

  if (!order || !order.user.wallet) {
    return;
  }

  const wallet = order.user.wallet;

  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.PROCESSING },
  });

  const result = await fulfillOrderWithProvider(orderId);
  const nextStatus = result.status === 'SUCCESSFUL' ? OrderStatus.SUCCESSFUL : OrderStatus.FAILED;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        providerReference: result.providerReference,
      },
    });

    if (nextStatus === OrderStatus.SUCCESSFUL) {
      const isStorefrontOrder = order.source === 'STOREFRONT';

      if (isStorefrontOrder) {
        // Commission = what customer paid (custom price) - base selling price
        const commissionAmount = Number(
          (order.amount.toNumber() - order.product.sellingPrice.toNumber()).toFixed(2),
        );

        await tx.commission.create({
          data: {
            userId: order.userId,
            orderId: order.id,
            amount: toDecimal(Math.max(commissionAmount, 0)),
            source: 'Storefront Commission',
          },
        });

        await createWalletTransaction(
          wallet.id,
          Math.max(commissionAmount, 0),
          WalletTransactionType.CREDIT,
          WalletTransactionCategory.COMMISSION,
          `Commission for ${order.product.name}`,
          tx,
        );
      }
    }

    if (nextStatus === OrderStatus.FAILED) {
      await createWalletTransaction(
        wallet.id,
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
          reason: 'Automatic refund for failed provider fulfillment',
          status: 'REFUNDED',
        },
      });
    }

    if (order.batchId) {
      const orders = await tx.order.findMany({ where: { batchId: order.batchId } });
      const successfulCount = orders.filter((entry) => entry.status === OrderStatus.SUCCESSFUL).length + (nextStatus === OrderStatus.SUCCESSFUL ? 1 : 0);
      const failedCount = orders.filter((entry) => entry.status === OrderStatus.FAILED).length + (nextStatus === OrderStatus.FAILED ? 1 : 0);
      const processingCount = orders.filter((entry) => entry.status === OrderStatus.PENDING || entry.status === OrderStatus.PROCESSING).length - 1;
      const status = processingCount <= 0 ? 'COMPLETED' : 'RUNNING';

      await tx.orderBatch.update({
        where: { id: order.batchId },
        data: {
          successfulCount,
          failedCount,
          processingCount: Math.max(processingCount, 0),
          status,
        },
      });
    }
  });

  await createNotification(
    order.userId,
    nextStatus === OrderStatus.SUCCESSFUL ? 'Order completed' : 'Order failed',
    `${order.product.name} for ${order.phoneNumber} is now ${nextStatus.toLowerCase()}.`,
    'ORDER',
  );
};

export const queueFulfillment = async (orderId: string) => {
  await processFulfillmentJob(orderId);
};

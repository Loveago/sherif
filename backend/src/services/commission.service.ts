import { Prisma, WalletTransactionType, WalletTransactionCategory } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { generateReference } from '../utils/refs.js';

const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));

export async function maybeCreditStorefrontCommission(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true, user: { include: { wallet: true } }, commission: true },
  });

  if (!order) {
    console.log('[Commission] Order not found:', orderId);
    return;
  }

  if (order.status !== 'SUCCESSFUL') {
    console.log('[Commission] Order not SUCCESSFUL:', order.status);
    return;
  }

  if (!order.user.wallet) {
    console.log('[Commission] No wallet for user:', order.userId);
    return;
  }

  if (order.commission) {
    console.log('[Commission] Already credited for order:', orderId);
    return;
  }

  const isStorefront = order.source === 'STOREFRONT' || order.receiptNumber.startsWith('STORE-');
  if (!isStorefront) {
    console.log('[Commission] Not a storefront order:', order.receiptNumber);
    return;
  }

  const commissionAmount = Number(
    (order.amount.toNumber() - order.product.sellingPrice.toNumber()).toFixed(2),
  );

  if (commissionAmount <= 0) {
    console.log('[Commission] Commission <= 0:', commissionAmount);
    return;
  }

  const wallet = order.user.wallet;

  try {
    await prisma.$transaction([
      prisma.commission.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          amount: toDecimal(commissionAmount),
          source: 'Storefront Commission',
        },
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: toDecimal(wallet.availableBalance.toNumber() + commissionAmount),
        },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.CREDIT,
          category: WalletTransactionCategory.COMMISSION,
          amount: toDecimal(commissionAmount),
          balanceBefore: wallet.availableBalance,
          balanceAfter: toDecimal(wallet.availableBalance.toNumber() + commissionAmount),
          description: `Commission for ${order.product.name}`,
          reference: generateReference('WAL'),
        },
      }),
    ]);

    console.log('[Commission] Credited', commissionAmount, 'to wallet', wallet.id, 'for order', orderId);
  } catch (err) {
    console.error('[Commission] Failed to credit commission for order', orderId, err);
  }
}

import { Prisma, WalletTransactionType, WalletTransactionCategory } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { generateReference } from '../utils/refs.js';

const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));

export async function maybeCreditStorefrontCommission(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true, user: { include: { wallet: true, storefrontWallet: true } }, commission: true },
  });

  if (!order) {
    console.log('[Commission] Order not found:', orderId);
    return;
  }

  if (order.status !== 'SUCCESSFUL') {
    console.log('[Commission] Order not SUCCESSFUL:', order.status);
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

  let storefrontWallet = order.user.storefrontWallet;

  if (!storefrontWallet) {
    storefrontWallet = await prisma.storefrontWallet.create({
      data: {
        userId: order.userId,
        availableBalance: toDecimal(0),
        pendingBalance: toDecimal(0),
      },
    });
    console.log('[Commission] Created storefront wallet for user:', order.userId);
  }

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
      prisma.storefrontWallet.update({
        where: { id: storefrontWallet.id },
        data: {
          availableBalance: toDecimal(storefrontWallet.availableBalance.toNumber() + commissionAmount),
        },
      }),
      prisma.storefrontWalletTransaction.create({
        data: {
          walletId: storefrontWallet.id,
          type: WalletTransactionType.CREDIT,
          category: WalletTransactionCategory.COMMISSION,
          amount: toDecimal(commissionAmount),
          balanceBefore: storefrontWallet.availableBalance,
          balanceAfter: toDecimal(storefrontWallet.availableBalance.toNumber() + commissionAmount),
          description: `Commission for ${order.product.name}`,
          reference: generateReference('SWAL'),
        },
      }),
    ]);

    console.log('[Commission] Credited', commissionAmount, 'to storefront wallet', storefrontWallet.id, 'for order', orderId);
  } catch (err) {
    console.error('[Commission] Failed to credit commission for order', orderId, err);
  }
}

import { WalletTransactionCategory, WalletTransactionType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { generateReference } from '../utils/refs.js';

const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));

export const getWalletByUserId = async (userId: string) => {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  return wallet;
};

export const createWalletTransaction = async (
  walletId: string,
  amount: number,
  type: WalletTransactionType,
  category: WalletTransactionCategory,
  description: string,
  tx?: Prisma.TransactionClient,
) => {
  const client = tx ?? prisma;
  const wallet = await client.wallet.findUnique({ where: { id: walletId } });

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  const balanceBefore = wallet.availableBalance;
  const nextBalanceNumber =
    type === WalletTransactionType.CREDIT
      ? wallet.availableBalance.toNumber() + amount
      : wallet.availableBalance.toNumber() - amount;

  if (nextBalanceNumber < 0) {
    throw new Error('Insufficient wallet balance');
  }

  const balanceAfter = toDecimal(nextBalanceNumber);

  const updatedWallet = await client.wallet.update({
    where: { id: walletId },
    data: {
      availableBalance: balanceAfter,
    },
  });

  const transaction = await client.walletTransaction.create({
    data: {
      walletId,
      type,
      category,
      amount: toDecimal(amount),
      balanceBefore,
      balanceAfter,
      description,
      reference: generateReference('WAL'),
    },
  });

  return { updatedWallet, transaction };
};

import { Router } from 'express';
import { Prisma, UserRole, WalletTransactionCategory, WalletTransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { announcementSchema, createProductSchema, creditWalletSchema } from '../schemas/admin.schema.js';
import { createSuccessResponse } from '../utils/response.js';
import { generateReference } from '../utils/refs.js';
import { createWalletTransaction } from '../services/wallet.service.js';

const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(UserRole.ADMIN));

adminRouter.get('/dashboard', async (_request, response, next) => {
  try {
    const [users, wallets, orders, refunds, complaints, withdrawals, products, commissions] = await Promise.all([
      prisma.user.findMany({ where: { deletedAt: null } }),
      prisma.wallet.findMany(),
      prisma.order.findMany({ include: { product: { include: { network: true } } } }),
      prisma.refund.findMany(),
      prisma.complaint.findMany(),
      prisma.withdrawal.findMany(),
      prisma.product.findMany({ include: { network: true } }),
      prisma.commission.findMany(),
    ]);

    const revenue = orders.reduce((sum, order) => sum + order.amount.toNumber(), 0);
    const walletBalances = wallets.reduce((sum, wallet) => sum + wallet.availableBalance.toNumber(), 0);
    const activeAgents = users.filter((user) => user.role === 'AGENT').length;
    const successRate = orders.length ? (orders.filter((order) => order.status === 'SUCCESSFUL').length / orders.length) * 100 : 0;
    const networkUsage = ['MTN', 'TELECEL', 'AIRTELTIGO'].map((code) => ({
      code,
      count: orders.filter((order) => order.product.network.code === code).length,
    }));

    return response.json(
      createSuccessResponse({
        metrics: {
          revenue,
          walletBalances,
          activeUsers: users.length,
          activeAgents,
          orders: orders.length,
          refunds: refunds.length,
          complaints: complaints.length,
          commissions: commissions.reduce((sum, item) => sum + item.amount.toNumber(), 0),
          pendingWithdrawals: withdrawals.filter((item) => item.status === 'PENDING').length,
          successRate: Number(successRate.toFixed(2)),
        },
        charts: {
          revenueTrends: Array.from({ length: 6 }).map((_, index) => ({
            label: `M${index + 1}`,
            value: Number((revenue / 6 + index * 550).toFixed(2)),
          })),
          orderTrends: Array.from({ length: 7 }).map((_, index) => ({
            label: `D${index + 1}`,
            value: Math.max(Math.round(orders.length / 7 + index * 2), 1),
          })),
          networkUsage,
        },
        recentOrders: orders.slice(0, 10),
        products: products.slice(0, 10),
      }),
    );
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/users', async (_request, response, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      include: { wallet: true, storefront: true },
      orderBy: { createdAt: 'desc' },
    });
    return response.json(createSuccessResponse(users));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/products', async (_request, response, next) => {
  try {
    const [products, networks] = await Promise.all([
      prisma.product.findMany({ include: { network: true }, orderBy: { createdAt: 'desc' } }),
      prisma.network.findMany({ orderBy: { name: 'asc' } }),
    ]);
    return response.json(createSuccessResponse({ products, networks }));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/products', validate(createProductSchema), async (request, response, next) => {
  try {
    const product = await prisma.product.create({
      data: {
        ...request.body,
        slug: `${request.body.name}-${Date.now()}`.toLowerCase().replace(/\s+/g, '-'),
        sellingPrice: toDecimal(request.body.sellingPrice),
        agentPrice: toDecimal(request.body.agentPrice),
        resellerPrice: toDecimal(request.body.resellerPrice),
        buyingPrice: toDecimal(request.body.buyingPrice),
      },
      include: { network: true },
    });

    return response.status(201).json(createSuccessResponse(product, 'Product created'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.put('/products/:id', validate(createProductSchema), async (request, response, next) => {
  try {
    const product = await prisma.product.update({
      where: { id: String(request.params.id) },
      data: {
        ...request.body,
        sellingPrice: toDecimal(request.body.sellingPrice),
        agentPrice: toDecimal(request.body.agentPrice),
        resellerPrice: toDecimal(request.body.resellerPrice),
        buyingPrice: toDecimal(request.body.buyingPrice),
      },
      include: { network: true },
    });

    return response.json(createSuccessResponse(product, 'Product updated'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.delete('/products/:id', async (request, response, next) => {
  try {
    await prisma.product.update({
      where: { id: request.params.id },
      data: { deletedAt: new Date(), status: false },
    });

    return response.json(createSuccessResponse({ id: request.params.id }, 'Product deleted'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/users/:id/suspend', async (request, response, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: String(request.params.id) },
      data: { deletedAt: new Date() },
    });
    return response.json(createSuccessResponse(user, 'User suspended'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/wallets/debit', validate(creditWalletSchema), async (request, response, next) => {
  try {
    const wallet = await prisma.wallet.findUnique({ where: { userId: request.body.userId } });

    if (!wallet) {
      return response.status(404).json({ success: false, message: 'Wallet not found' });
    }

    await prisma.$transaction(async (tx) => {
      await createWalletTransaction(
        wallet.id,
        request.body.amount,
        WalletTransactionType.DEBIT,
        WalletTransactionCategory.ADJUSTMENT,
        request.body.description,
        tx,
      );
    });

    return response.json(createSuccessResponse({ userId: request.body.userId }, 'Wallet debited'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/wallets/credit', validate(creditWalletSchema), async (request, response, next) => {
  try {
    const wallet = await prisma.wallet.findUnique({ where: { userId: request.body.userId } });

    if (!wallet) {
      return response.status(404).json({ success: false, message: 'Wallet not found' });
    }

    await prisma.$transaction(async (tx) => {
      await createWalletTransaction(
        wallet.id,
        request.body.amount,
        WalletTransactionType.CREDIT,
        WalletTransactionCategory.ADJUSTMENT,
        request.body.description,
        tx,
      );
    });

    return response.json(createSuccessResponse({ userId: request.body.userId }, 'Wallet credited'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/refunds', async (_request, response, next) => {
  try {
    const refunds = await prisma.refund.findMany({
      include: { order: { include: { product: true } }, user: true },
      orderBy: { createdAt: 'desc' },
    });
    return response.json(createSuccessResponse(refunds));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/refunds/:id/approve', async (request, response, next) => {
  try {
    const refund = await prisma.refund.findUnique({
      where: { id: request.params.id },
      include: { user: { include: { wallet: true } }, order: true },
    });

    if (!refund || !refund.user.wallet) {
      return response.status(404).json({ success: false, message: 'Refund not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      await createWalletTransaction(
        refund.user.wallet!.id,
        refund.amount.toNumber(),
        WalletTransactionType.CREDIT,
        WalletTransactionCategory.REFUND,
        `Manual refund for ${refund.order.receiptNumber}`,
        tx,
      );

      await tx.order.update({
        where: { id: refund.orderId },
        data: { status: 'REFUNDED' },
      });

      return tx.refund.update({
        where: { id: request.params.id },
        data: { status: 'REFUNDED' },
      });
    });

    return response.json(createSuccessResponse(result, 'Refund processed'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/withdrawals', async (_request, response, next) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    return response.json(createSuccessResponse(withdrawals));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/withdrawals/:id/approve', async (request, response, next) => {
  try {
    const withdrawal = await prisma.withdrawal.update({
      where: { id: request.params.id },
      data: { status: 'APPROVED' },
    });
    return response.json(createSuccessResponse(withdrawal, 'Withdrawal approved'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/withdrawals/:id/paid', async (request, response, next) => {
  try {
    const withdrawal = await prisma.withdrawal.update({
      where: { id: request.params.id },
      data: { status: 'PAID' },
    });
    return response.json(createSuccessResponse(withdrawal, 'Withdrawal marked as paid'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/complaints', async (_request, response, next) => {
  try {
    const complaints = await prisma.complaint.findMany({
      include: { user: true, assignedTo: true },
      orderBy: { createdAt: 'desc' },
    });
    return response.json(createSuccessResponse(complaints));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/complaints/:id/resolve', async (request, response, next) => {
  try {
    const complaint = await prisma.complaint.update({
      where: { id: request.params.id },
      data: { status: 'RESOLVED' },
    });
    return response.json(createSuccessResponse(complaint, 'Complaint resolved'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/announcements', async (_request, response, next) => {
  try {
    const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
    return response.json(createSuccessResponse(announcements));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/announcements', validate(announcementSchema), async (request, response, next) => {
  try {
    const announcement = await prisma.announcement.create({
      data: {
        ...request.body,
      },
    });
    return response.status(201).json(createSuccessResponse(announcement, 'Announcement created'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/providers', async (_request, response, next) => {
  try {
    const providers = await prisma.provider.findMany({ orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }] });
    return response.json(createSuccessResponse(providers));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/providers/:id/activate', async (request, response, next) => {
  try {
    await prisma.provider.updateMany({ data: { status: 'INACTIVE' }, where: {} });
    const provider = await prisma.provider.update({
      where: { id: request.params.id },
      data: { status: 'ACTIVE' },
    });
    return response.json(createSuccessResponse(provider, 'Provider activated'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/payments', async (_request, response, next) => {
  try {
    const payments = await prisma.payment.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } });
    return response.json(createSuccessResponse(payments));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/settings', async (_request, response, next) => {
  try {
    return response.json(
      createSuccessResponse({
        platformFees: { withdrawalFee: 2.5, serviceFee: 0 },
        commissionRules: [
          { type: 'fixed', value: 0.5 },
          { type: 'percentage', value: 5 },
          { type: 'tier', value: 'Silver / Gold / Platinum' },
        ],
        paymentSettings: {
          paystackEnabled: true,
          momoEnabled: true,
        },
        branding: {
          appName: 'DATAHUB Ghana',
          theme: 'dark-premium',
        },
        providerStrategy: {
          mode: 'priority-failover',
          activeProviderReference: generateReference('CFG'),
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
});

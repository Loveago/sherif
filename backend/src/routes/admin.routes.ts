import { Router } from 'express';
import { Prisma, UserRole, OrderStatus, OrderSource, WalletTransactionCategory, WalletTransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { announcementSchema, createProductSchema, creditWalletSchema, updateProviderCredentialsSchema, updateSettingsSchema } from '../schemas/admin.schema.js';
import { createSuccessResponse } from '../utils/response.js';
import { generateReference } from '../utils/refs.js';
import { createWalletTransaction } from '../services/wallet.service.js';
import { createNotification } from '../services/notification.service.js';
import { createAuditLog } from '../services/audit.service.js';
import { maybeCreditStorefrontCommission } from '../services/commission.service.js';
import { exportToCSV, exportToExcel } from '../services/export.service.js';
import { shankClient } from '../services/shank.service.js';
import { pollOrderStatuses } from '../workers/shank-status.worker.js';
import { pollBundlePortalOrderStatuses } from '../workers/bundle-portal-status.worker.js';
import { bundlePortalClient } from '../services/bundle-portal.service.js';
import { normalizeDataSize } from '../utils/shank-mapping.js';
import {
  getReconcilerStatus,
  runReconcilerTick,
  togglePaymentReconciler,
  reconcilerState,
} from '../workers/payment-reconciler.worker.js';
import { findPendingStorefrontOrders, reconcileSingleOrder } from '../services/reconciler.service.js';
import {
  getProviderCredentialSummaries,
  saveProviderCredentials,
} from '../services/provider-credentials.service.js';

const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));

export const adminRouter = Router();

// Public settings endpoint (no auth) — used by wallet page for MoMo number
adminRouter.get('/settings/public', async (_request, response, next) => {
  try {
    const settings = await prisma.adminSettings.findMany();
    const map: Record<string, string> = {};
    settings.forEach((s) => { map[s.key] = s.value; });

    return response.json(
      createSuccessResponse({
        momoNumber: map.momoNumber || '',
        momoName: map.momoName || '',
        momoEnabled: map.momoEnabled === 'true',
        whatsappNumber: map.whatsappNumber || '',
      }),
    );
  } catch (error) {
    return next(error);
  }
});

// Public AFA registration fee endpoint (no auth)
adminRouter.get('/settings/afa-fee', async (_request, response, next) => {
  try {
    const feeSetting = await prisma.adminSettings.findUnique({ where: { key: 'afaRegistrationFee' } });
    const fee = feeSetting ? Number(feeSetting.value) : 20;

    return response.json(createSuccessResponse({ fee }));
  } catch (error) {
    return next(error);
  }
});

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
      prisma.product.findMany({
        where: { deletedAt: null },
        include: { network: true, rolePrices: true },
        orderBy: [
          { network: { name: 'asc' } },
          { createdAt: 'asc' },
        ],
      }),
      prisma.network.findMany({ orderBy: { name: 'asc' } }),
    ]);
    return response.json(createSuccessResponse({ products, networks }));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/products', validate(createProductSchema), async (request, response, next) => {
  try {
    const { rolePrices, promoPrice, showInShop, showForAgents, status, ...productData } = request.body;
    // Prefer explicit size in description ("50GB"), then name ("AT BigTime 50GB")
    const dataSize =
      normalizeDataSize(productData.description || '') ||
      normalizeDataSize(productData.name || '') ||
      String(productData.description || productData.name || '').trim();
    const product = await prisma.product.create({
      data: {
        ...productData,
        dataSize,
        slug: `${productData.name}-${Date.now()}`.toLowerCase().replace(/\s+/g, '-'),
        sellingPrice: toDecimal(productData.sellingPrice),
        agentPrice: toDecimal(productData.agentPrice),
        resellerPrice: toDecimal(productData.resellerPrice),
        buyingPrice: toDecimal(productData.buyingPrice),
        promoPrice: promoPrice ? toDecimal(promoPrice) : undefined,
        showInShop: showInShop ?? true,
        showForAgents: showForAgents ?? true,
        status: status ?? true,
      },
      include: { network: true },
    });

    if (rolePrices && Object.keys(rolePrices).length > 0) {
      await prisma.rolePrice.createMany({
        data: Object.entries(rolePrices).map(([role, price]) => ({
          productId: product.id,
          role: role as any,
          price: toDecimal(price as number),
          userId: '',
        })),
        skipDuplicates: true,
      });
    }

    return response.status(201).json(createSuccessResponse(product, 'Product created'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.put('/products/:id', validate(createProductSchema), async (request, response, next) => {
  try {
    const { rolePrices, promoPrice, showInShop, showForAgents, status, id, ...productData } = request.body;
    const dataSize =
      normalizeDataSize(productData.description || '') ||
      normalizeDataSize(productData.name || '') ||
      String(productData.description || productData.name || '').trim();
    const product = await prisma.product.update({
      where: { id: String(request.params.id) },
      data: {
        ...productData,
        dataSize,
        sellingPrice: toDecimal(productData.sellingPrice),
        agentPrice: toDecimal(productData.agentPrice),
        resellerPrice: toDecimal(productData.resellerPrice),
        buyingPrice: toDecimal(productData.buyingPrice),
        promoPrice: promoPrice ? toDecimal(promoPrice) : null,
        showInShop: showInShop ?? true,
        showForAgents: showForAgents ?? true,
        status: status ?? true,
      },
      include: { network: true, rolePrices: true },
    });

    if (rolePrices && Object.keys(rolePrices).length > 0) {
      for (const [role, price] of Object.entries(rolePrices)) {
        await prisma.rolePrice.upsert({
          where: { productId_role: { productId: product.id, role: role as any } },
          update: { price: toDecimal(price as number) },
          create: {
            productId: product.id,
            role: role as any,
            price: toDecimal(price as number),
            userId: '',
          },
        });
      }
    }

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

adminRouter.patch('/products/:id', async (request, response, next) => {
  try {
    const product = await prisma.product.update({
      where: { id: String(request.params.id) },
      data: request.body,
      include: { network: true, rolePrices: true },
    });
    return response.json(createSuccessResponse(product, 'Product updated'));
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

adminRouter.get('/withdrawals', async (request, response, next) => {
  try {
    const { status, source, search } = request.query;
    const page = Math.max(Number(request.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(request.query.limit) || 25, 1), 100);
    const searchTerm = typeof search === 'string' ? search.trim() : '';

    const where: Prisma.WithdrawalWhereInput = {
      ...(status && ['PENDING', 'REVIEW', 'APPROVED', 'PAID', 'REJECTED'].includes(String(status))
        ? { status: String(status) as any }
        : {}),
      ...(source && ['MAIN_WALLET', 'STOREFRONT_WALLET'].includes(String(source))
        ? { source: String(source) as any }
        : {}),
      ...(searchTerm
        ? {
            OR: [
              { reference: { contains: searchTerm, mode: 'insensitive' } },
              { accountName: { contains: searchTerm, mode: 'insensitive' } },
              { accountNumber: { contains: searchTerm } },
              { user: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
              { user: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
              { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [withdrawals, total, pendingSummary] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          amount: true,
          method: true,
          accountName: true,
          accountNumber: true,
          bankName: true,
          status: true,
          reference: true,
          source: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.withdrawal.count({ where }),
      prisma.withdrawal.aggregate({
        where: { status: { in: ['PENDING', 'REVIEW', 'APPROVED'] } },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    return response.json(createSuccessResponse({
      withdrawals,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      summary: {
        pendingCount: pendingSummary._count,
        pendingAmount: pendingSummary._sum.amount ?? 0,
      },
    }));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/withdrawals/:id/approve', async (request, response, next) => {
  try {
    const existing = await prisma.withdrawal.findUnique({ where: { id: request.params.id } });
    if (!existing) return response.status(404).json({ success: false, message: 'Withdrawal not found' });
    if (!['PENDING', 'REVIEW'].includes(existing.status)) {
      return response.status(400).json({ success: false, message: 'Only pending withdrawals can be approved' });
    }

    const withdrawal = await prisma.withdrawal.update({
      where: { id: existing.id },
      data: { status: 'APPROVED' },
    });

    await createNotification(
      existing.userId,
      'Withdrawal approved',
      `Your withdrawal of GHS ${existing.amount.toFixed(2)} has been approved and is ready for payment.`,
      'WITHDRAWAL',
    );
    await createAuditLog(request.auth!.userId, 'WITHDRAWAL_APPROVED', 'Withdrawal', existing.id, {
      reference: existing.reference,
      amount: existing.amount.toNumber(),
      source: existing.source,
    });

    return response.json(createSuccessResponse(withdrawal, 'Withdrawal approved'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/withdrawals/:id/paid', async (request, response, next) => {
  try {
    const existing = await prisma.withdrawal.findUnique({ where: { id: request.params.id } });
    if (!existing) return response.status(404).json({ success: false, message: 'Withdrawal not found' });
    if (existing.status !== 'APPROVED') {
      return response.status(400).json({ success: false, message: 'Only approved withdrawals can be marked as paid' });
    }

    const withdrawal = await prisma.withdrawal.update({
      where: { id: existing.id },
      data: { status: 'PAID' },
    });

    await createNotification(
      existing.userId,
      'Withdrawal paid',
      `Your withdrawal of GHS ${existing.amount.toFixed(2)} has been paid to ${existing.accountName} at ${existing.accountNumber}.`,
      'WITHDRAWAL',
    );
    await createAuditLog(request.auth!.userId, 'WITHDRAWAL_PAID', 'Withdrawal', existing.id, {
      reference: existing.reference,
      amount: existing.amount.toNumber(),
      accountName: existing.accountName,
      accountNumber: existing.accountNumber,
      source: existing.source,
    });

    return response.json(createSuccessResponse(withdrawal, 'Withdrawal marked as paid'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/withdrawals/:id/reject', async (request, response, next) => {
  try {
    const existing = await prisma.withdrawal.findUnique({
      where: { id: request.params.id },
    });

    if (!existing) {
      return response.status(404).json({ success: false, message: 'Withdrawal not found' });
    }

    if (!['PENDING', 'REVIEW'].includes(existing.status)) {
      return response.status(400).json({ success: false, message: 'Only pending withdrawals can be rejected' });
    }

    // `source` is WithdrawalSource in schema (MAIN_WALLET | STOREFRONT_WALLET)
    const isStorefrontWallet = existing.source === 'STOREFRONT_WALLET';

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.withdrawal.update({
        where: { id: request.params.id },
        data: { status: 'REJECTED' },
      });

      if (isStorefrontWallet) {
        const sfWallet = await tx.storefrontWallet.findUnique({ where: { userId: existing.userId } });

        if (sfWallet) {
          const balanceBefore = sfWallet.availableBalance;
          const balanceAfter = toDecimal(balanceBefore.toNumber() + existing.amount.toNumber());

          await tx.storefrontWallet.update({ where: { id: sfWallet.id }, data: { availableBalance: balanceAfter } });
          await tx.storefrontWalletTransaction.create({
            data: {
              walletId: sfWallet.id,
              type: WalletTransactionType.CREDIT,
              category: WalletTransactionCategory.REFUND,
              amount: existing.amount,
              balanceBefore,
              balanceAfter,
              description: `Refund for rejected withdrawal ${existing.reference}`,
              reference: generateReference('SWAL'),
            },
          });
        }
      } else {
        const wallet = await tx.wallet.findUnique({ where: { userId: existing.userId } });
        if (wallet) {
          await createWalletTransaction(
            wallet.id,
            existing.amount.toNumber(),
            WalletTransactionType.CREDIT,
            WalletTransactionCategory.REFUND,
            `Refund for rejected withdrawal ${existing.reference}`,
            tx,
          );
        }
      }

      return updated;
    });

    await createNotification(
      existing.userId,
      'Withdrawal rejected',
      `Your withdrawal of GHS ${existing.amount.toFixed(2)} has been rejected. Funds returned to your ${isStorefrontWallet ? 'storefront wallet' : 'account'}.`,
      'WITHDRAWAL',
    );
    await createAuditLog(request.auth!.userId, 'WITHDRAWAL_REJECTED', 'Withdrawal', existing.id, {
      reference: existing.reference,
      amount: existing.amount.toNumber(),
      source: existing.source,
      reason: request.body?.reason || null,
    });

    return response.json(createSuccessResponse(result, 'Withdrawal rejected and funds refunded'));
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
    const dbSettings = await prisma.adminSettings.findMany();
    const map: Record<string, string> = {};
    dbSettings.forEach((s) => { map[s.key] = s.value; });

    return response.json(
      createSuccessResponse({
        platformFees: { withdrawalFee: Number(map.withdrawalFee ?? 2.5), serviceFee: Number(map.serviceFee ?? 0) },
        commissionRules: [
          { type: 'fixed', value: Number(map.commissionFixed ?? 0.5) },
          { type: 'percentage', value: Number(map.commissionPercentage ?? 5) },
          { type: 'tier', value: map.commissionTier ?? 'Silver / Gold / Platinum' },
        ],
        paymentSettings: {
          paystackEnabled: map.paystackEnabled !== 'false',
          momoEnabled: map.momoEnabled !== 'false',
        },
        branding: {
          appName: map.appName ?? 'CheapDataPacks Ghana',
          theme: map.theme ?? 'dark-premium',
        },
        providerStrategy: {
          mode: map.providerMode ?? 'priority-failover',
          activeProviderReference: map.activeProviderReference || generateReference('CFG'),
          mtnProvider: map.mtnProvider === 'bundleportal' ? 'bundleportal' : 'shank',
        },
        momoSettings: {
          momoNumber: map.momoNumber || '',
          momoName: map.momoName || '',
          momoEnabled: map.momoEnabled === 'true',
        },
        whatsappNumber: map.whatsappNumber || '',
        afaRegistrationFee: Number(map.afaRegistrationFee ?? 20),
        paystackPublicKey: map.paystackPublicKey || process.env.PAYSTACK_PUBLIC_KEY || '',
        paystackSecretKey: map.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY || '',
        providerCredentials: await getProviderCredentialSummaries(),
        catalog: {
          productsEnabled: map.productsEnabled !== 'false',
          mtnEnabled: map.productsMtnEnabled !== 'false',
          telecelEnabled: map.productsTelecelEnabled !== 'false',
          airteltigoEnabled: map.productsAirteltigoEnabled !== 'false',
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
});

adminRouter.put('/settings', validate(updateSettingsSchema), async (request, response, next) => {
  try {
    const updates = request.body;

    await prisma.$transaction(
      Object.entries(updates).map(([key, value]) =>
        prisma.adminSettings.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    return response.json(createSuccessResponse({ updated: Object.keys(updates) }, 'Settings updated'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.put('/settings/providers/:provider', validate(updateProviderCredentialsSchema), async (request, response, next) => {
  try {
    await saveProviderCredentials(request.params.provider as 'shank' | 'bundleportal', request.body);
    return response.json(createSuccessResponse(await getProviderCredentialSummaries(), 'Provider credentials updated'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/users/:id', async (request, response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: request.params.id },
      include: {
        wallet: true,
        storefront: true,
        orders: { take: 10 },
        withdrawals: { take: 10 },
        commissions: { take: 10 },
      },
    });

    if (!user) {
      return response.status(404).json({ success: false, message: 'User not found' });
    }

    return response.json(createSuccessResponse(user));
  } catch (error) {
    return next(error);
  }
});

adminRouter.put('/users/:id', async (request, response, next) => {
  try {
    const { firstName, lastName, email, phone, role } = request.body;
    const user = await prisma.user.update({
      where: { id: request.params.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(role && { role }),
      },
      include: { wallet: true, storefront: true },
    });

    return response.json(createSuccessResponse(user, 'User updated'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/users/:id/unsuspend', async (request, response, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: request.params.id },
      data: { deletedAt: null },
    });
    return response.json(createSuccessResponse(user, 'User unsuspended'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/users/:id/change-password', async (request, response, next) => {
  try {
    const { password } = request.body;
    if (!password) {
      return response.status(400).json({ success: false, message: 'Password is required' });
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: request.params.id },
      data: { passwordHash },
    });

    return response.json(createSuccessResponse(user, 'Password changed'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/products/:id/stock', async (request, response, next) => {
  try {
    const { quantity, operation } = request.body;
    const product = await prisma.product.findUnique({
      where: { id: request.params.id },
    });

    if (!product) {
      return response.status(404).json({ success: false, message: 'Product not found' });
    }

    const newStock = operation === 'add' 
      ? product.stock + quantity 
      : Math.max(0, product.stock - quantity);

    const updated = await prisma.product.update({
      where: { id: request.params.id },
      data: { stock: newStock },
      include: { network: true },
    });

    return response.json(createSuccessResponse(updated, 'Stock updated'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/products/:id/role-price', async (request, response, next) => {
  try {
    const { role, price } = request.body;
    
    const rolePrice = await prisma.rolePrice.upsert({
      where: {
        productId_role: {
          productId: request.params.id,
          role,
        },
      },
      update: { price: toDecimal(price) },
      create: {
        productId: request.params.id,
        role,
        price: toDecimal(price),
        userId: '', // Placeholder
      },
    });

    return response.json(createSuccessResponse(rolePrice, 'Role price updated'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/orders', async (request, response, next) => {
  try {
    const { status, userId, productId, startDate, endDate, search, source } = request.query;

    const where: Prisma.OrderWhereInput = {
      ...(status && { status: status as OrderStatus }),
      ...(userId && { userId: String(userId) }),
      ...(productId && { productId: String(productId) }),
      ...(startDate && { createdAt: { gte: new Date(String(startDate)) } }),
      ...(endDate && { createdAt: { lte: new Date(String(endDate)) } }),
    };

    if (source && typeof source === 'string' && source.trim()) {
      const normalized = source.toUpperCase();

      if (normalized === 'DASHBOARD') {
        where.source = OrderSource.BUY_NOW;
      } else if (normalized === 'BULK') {
        where.source = OrderSource.BULK;
      } else if (normalized === 'STOREFRONT') {
        where.source = OrderSource.STOREFRONT;
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim();

      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];

      where.AND = [
        ...existingAnd,
        {
          OR: [
            { receiptNumber: { contains: term, mode: 'insensitive' } },
            { phoneNumber: { contains: term } },
            {
              user: {
                OR: [
                  { firstName: { contains: term, mode: 'insensitive' } },
                  { lastName: { contains: term, mode: 'insensitive' } },
                  { email: { contains: term, mode: 'insensitive' } },
                ],
              },
            },
          ],
        },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        product: { include: { network: true } },
        user: true,
        commission: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return response.json(createSuccessResponse(orders));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/orders/:id', async (request, response, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: request.params.id },
      include: {
        product: { include: { network: true } },
        user: true,
        refund: true,
        commission: true,
        batch: true,
      },
    });

    if (!order) {
      return response.status(404).json({ success: false, message: 'Order not found' });
    }

    return response.json(createSuccessResponse(order));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/commissions', async (request, response, next) => {
  try {
    const { userId, startDate, endDate } = request.query;
    
    const commissions = await prisma.commission.findMany({
      where: {
        ...(userId && { userId: String(userId) }),
        ...(startDate && { createdAt: { gte: new Date(String(startDate)) } }),
        ...(endDate && { createdAt: { lte: new Date(String(endDate)) } }),
      },
      include: {
        user: true,
        order: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = commissions.reduce((sum, c) => sum + c.amount.toNumber(), 0);
    const pending = commissions.filter((c) => c.status === 'PENDING').length;
    const paid = commissions.filter((c) => c.status === 'PAID').length;

    const topAgent = commissions.reduce(
      (acc, c) => {
        const amount = c.amount.toNumber();
        if (amount > acc.amount) {
          return { name: `${c.user.firstName} ${c.user.lastName}`, amount };
        }
        return acc;
      },
      { name: '', amount: 0 }
    );

    return response.json(createSuccessResponse({ 
      commissions, 
      total,
      stats: { total, pending, paid, topAgent }
    }));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/commissions/:id/payout', async (request, response, next) => {
  try {
    const commission = await prisma.commission.update({
      where: { id: request.params.id },
      data: { status: 'PAID', paidAt: new Date() },
      include: { user: true, order: true },
    });

    await createNotification(
      commission.userId,
      'Commission Paid',
      `Your commission of GHS ${commission.amount} has been paid.`,
      'COMMISSION'
    );

    return response.json(createSuccessResponse(commission, 'Commission payout processed'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/announcements/:id', async (request, response, next) => {
  try {
    const { title, content, targetRole, displayLocation, priority, pinned, active } = request.body;
    
    const announcement = await prisma.announcement.update({
      where: { id: request.params.id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(targetRole && { targetRole }),
        ...(displayLocation && { displayLocation }),
        ...(priority && { priority }),
        ...(pinned !== undefined && { pinned }),
        ...(active !== undefined && { active }),
      },
    });

    return response.json(createSuccessResponse(announcement, 'Announcement updated'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.delete('/announcements/:id', async (request, response, next) => {
  try {
    await prisma.announcement.delete({
      where: { id: request.params.id },
    });

    return response.json(createSuccessResponse({ id: request.params.id }, 'Announcement deleted'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/reports/:type', async (request, response, next) => {
  try {
    const { type } = request.params;
    const { startDate, endDate } = request.query;

    const whereClause = {
      ...(startDate && { createdAt: { gte: new Date(String(startDate)) } }),
      ...(endDate && { createdAt: { lte: new Date(String(endDate)) } }),
    };

    const [orders, users, products, payments] = await Promise.all([
      prisma.order.findMany({ where: whereClause, include: { product: true } }),
      prisma.user.findMany({ where: { ...whereClause, deletedAt: null } }),
      prisma.product.findMany(),
      prisma.walletTransaction.findMany({ where: whereClause }),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + o.amount.toNumber(), 0);
    const totalOrders = orders.length;
    const totalUsers = users.length;
    const successfulOrders = orders.filter((o) => o.status === 'SUCCESSFUL').length;
    const successRate = totalOrders > 0 ? (successfulOrders / totalOrders) * 100 : 0;

    // Sales data (daily)
    const salesByDate: Record<string, number> = {};
    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      salesByDate[date] = (salesByDate[date] || 0) + order.amount.toNumber();
    });

    const sales = Object.entries(salesByDate).map(([date, amount]) => ({ date, amount }));

    // User growth (daily)
    const usersByDate: Record<string, number> = {};
    users.forEach((user) => {
      const date = user.createdAt.toISOString().split('T')[0];
      usersByDate[date] = (usersByDate[date] || 0) + 1;
    });

    const userGrowth = Object.entries(usersByDate).map(([date, count]) => ({ date, count }));

    // Orders by status
    const ordersByStatus = [
      { status: 'SUCCESSFUL', count: orders.filter((o) => o.status === 'SUCCESSFUL').length },
      { status: 'PENDING', count: orders.filter((o) => o.status === 'PENDING').length },
      { status: 'FAILED', count: orders.filter((o) => o.status === 'FAILED').length },
      { status: 'CANCELLED', count: orders.filter((o) => o.status === 'CANCELLED').length },
    ];

    // Top products
    const productSales: Record<string, { sales: number; revenue: number }> = {};
    orders.forEach((order) => {
      const productName = order.product.name;
      if (!productSales[productName]) {
        productSales[productName] = { sales: 0, revenue: 0 };
      }
      productSales[productName].sales += 1;
      productSales[productName].revenue += order.amount.toNumber();
    });

    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Payment methods
    const paymentMethods: Record<string, { count: number; amount: number }> = {};
    payments.forEach((payment) => {
      const method = payment.category || 'Other';
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, amount: 0 };
      }
      paymentMethods[method].count += 1;
      paymentMethods[method].amount += payment.amount.toNumber();
    });

    const paymentMethodsArray = Object.entries(paymentMethods).map(([method, data]) => ({ method, ...data }));

    const reportData = {
      sales,
      users: userGrowth,
      orders: ordersByStatus,
      topProducts,
      paymentMethods: paymentMethodsArray,
      totalRevenue,
      totalOrders,
      totalUsers,
      successRate,
    };

    return response.json(createSuccessResponse(reportData));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/export/users', async (request, response, next) => {
  try {
    const { format = 'csv' } = request.query;
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    if (format === 'excel') {
      const buffer = exportToExcel(users, 'users');
      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      response.setHeader('Content-Disposition', 'attachment; filename="users.xlsx"');
      return response.send(buffer);
    } else {
      const buffer = exportToCSV(users, 'users');
      response.setHeader('Content-Type', 'text/csv');
      response.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
      return response.send(buffer);
    }
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/export/orders', async (request, response, next) => {
  try {
    const { format = 'csv' } = request.query;
    const orders = await prisma.order.findMany({
      include: {
        product: { select: { name: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedOrders = orders.map((order) => ({
      receiptNumber: order.receiptNumber,
      customer: `${order.user.firstName} ${order.user.lastName}`,
      email: order.user.email,
      product: order.product.name,
      phoneNumber: order.phoneNumber,
      amount: order.amount.toNumber(),
      status: order.status,
      createdAt: order.createdAt,
    }));

    if (format === 'excel') {
      const buffer = exportToExcel(formattedOrders, 'orders');
      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      response.setHeader('Content-Disposition', 'attachment; filename="orders.xlsx"');
      return response.send(buffer);
    } else {
      const buffer = exportToCSV(formattedOrders, 'orders');
      response.setHeader('Content-Type', 'text/csv');
      response.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
      return response.send(buffer);
    }
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/export/commissions', async (request, response, next) => {
  try {
    const { format = 'csv' } = request.query;
    const commissions = await prisma.commission.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        order: { select: { receiptNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedCommissions = commissions.map((commission) => ({
      agent: `${commission.user.firstName} ${commission.user.lastName}`,
      email: commission.user.email,
      orderNumber: commission.order.receiptNumber,
      amount: commission.amount.toNumber(),
      status: commission.status || 'PENDING',
      createdAt: commission.createdAt,
    }));

    if (format === 'excel') {
      const buffer = exportToExcel(formattedCommissions, 'commissions');
      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      response.setHeader('Content-Disposition', 'attachment; filename="commissions.xlsx"');
      return response.send(buffer);
    } else {
      const buffer = exportToCSV(formattedCommissions, 'commissions');
      response.setHeader('Content-Type', 'text/csv');
      response.setHeader('Content-Disposition', 'attachment; filename="commissions.csv"');
      return response.send(buffer);
    }
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/audit-logs', async (request, response, next) => {
  try {
    const { search = '', action = '' } = request.query;

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(search && {
          OR: [
            { action: { contains: String(search), mode: 'insensitive' } },
            { entity: { contains: String(search), mode: 'insensitive' } },
            { actor: { OR: [
              { firstName: { contains: String(search), mode: 'insensitive' } },
              { lastName: { contains: String(search), mode: 'insensitive' } },
              { email: { contains: String(search), mode: 'insensitive' } },
            ]}},
          ],
        }),
        ...(action && { action: String(action) }),
      },
      include: {
        actor: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      userId: log.actorId,
      action: log.action,
      resource: log.entity,
      resourceId: log.entityId,
      changes: log.metadata,
      ipAddress: '',
      userAgent: '',
      status: 'SUCCESS',
      createdAt: log.createdAt,
      user: {
        firstName: log.actor.firstName,
        lastName: log.actor.lastName,
        email: log.actor.email,
      },
    }));

    return response.json(createSuccessResponse(formattedLogs));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/users', async (request, response, next) => {
  try {
    const { search = '' } = request.query;

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(search && {
          OR: [
            { firstName: { contains: String(search), mode: 'insensitive' } },
            { lastName: { contains: String(search), mode: 'insensitive' } },
            { email: { contains: String(search), mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        wallet: { select: { availableBalance: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return response.json(createSuccessResponse(users));
  } catch (error) {
    return next(error);
  }
});

adminRouter.put('/users/:id', async (request, response, next) => {
  try {
    const { firstName, lastName, email, phone } = request.body;

    const user = await prisma.user.update({
      where: { id: request.params.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(phone && { phone }),
      },
      include: { wallet: { select: { availableBalance: true } } },
    });

    return response.json(createSuccessResponse(user, 'User updated successfully'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.delete('/users/:id', async (request, response, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: request.params.id },
      data: { deletedAt: new Date() },
    });

    return response.json(createSuccessResponse(user, 'User deleted successfully'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/users/:id/wallet', async (request, response, next) => {
  try {
    const { amount, type, reason } = request.body;

    if (!amount || !type || !reason) {
      return response.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const numAmount = parseFloat(String(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      return response.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const user = await prisma.user.findUnique({
      where: { id: request.params.id },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      return response.status(404).json({ success: false, message: 'User or wallet not found' });
    }

    const walletId = user.wallet.id;
    const transactionType = type === 'ADD' ? WalletTransactionType.CREDIT : WalletTransactionType.DEBIT;
    const transactionCategory = WalletTransactionCategory.ADJUSTMENT;

    const result = await prisma.$transaction(async (tx) => {
      const { updatedWallet, transaction } = await createWalletTransaction(
        walletId,
        numAmount,
        transactionType,
        transactionCategory,
        `Admin ${type === 'ADD' ? 'credit' : 'debit'}: ${reason}`,
        tx,
      );

      await createNotification(
        user.id,
        'Wallet Updated',
        `Your wallet has been ${type === 'ADD' ? 'credited' : 'debited'} with GHS ${numAmount}. Reason: ${reason}`,
        'WALLET'
      );

      return { updatedWallet, transaction };
    });

    return response.json(createSuccessResponse(result, 'Wallet updated successfully'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/orders', async (request, response, next) => {
  try {
    const { search = '', status = '' } = request.query;

    const orders = await prisma.order.findMany({
      where: {
        ...(search && {
          OR: [
            { receiptNumber: { contains: String(search), mode: 'insensitive' } },
            { user: { OR: [
              { firstName: { contains: String(search), mode: 'insensitive' } },
              { lastName: { contains: String(search), mode: 'insensitive' } },
              { email: { contains: String(search), mode: 'insensitive' } },
            ]}},
          ],
        }),
        ...(status && { status: status as OrderStatus }),
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        product: { include: { network: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return response.json(createSuccessResponse(orders));
  } catch (error) {
    return next(error);
  }
});

adminRouter.put('/orders/:id/status', async (request, response, next) => {
  try {
    const { status } = request.body;

    if (!status) {
      return response.status(400).json({ success: false, message: 'Status is required' });
    }

    const nextStatus = status as OrderStatus;

    const order = await prisma.order.update({
      where: { id: request.params.id },
      data: { status: nextStatus },
      include: { product: { include: { network: true } }, user: true },
    });

    if (nextStatus === OrderStatus.SUCCESSFUL) {
      await maybeCreditStorefrontCommission(order.id);
    }

    await createNotification(
      order.userId,
      'Order Status Updated',
      `Your order ${order.receiptNumber} status has been updated to ${status}.`,
      'ORDER'
    );

    return response.json(createSuccessResponse(order, 'Order status updated'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/afa-registrations', async (_request, response, next) => {
  try {
    const registrations = await prisma.aFARegistration.findMany({
      where: { paymentStatus: 'SUCCESSFUL' },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    const total = registrations.length;
    const pending = registrations.filter((r) => r.status === 'PENDING').length;
    const approved = registrations.filter((r) => r.status === 'APPROVED').length;
    const rejected = registrations.filter((r) => r.status === 'REJECTED').length;

    return response.json(
      createSuccessResponse({ registrations, stats: { total, pending, approved, rejected } }),
    );
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/afa-registrations/:id/approve', async (request, response, next) => {
  try {
    const registration = await prisma.aFARegistration.update({
      where: { id: request.params.id },
      data: { status: 'APPROVED' },
      include: { user: true },
    });

    await createNotification(
      registration.userId,
      'AFA Registration Approved',
      'Your AFA registration has been approved.',
      'REGISTRATION',
    );

    return response.json(createSuccessResponse(registration, 'AFA registration approved'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/afa-registrations/:id/reject', async (request, response, next) => {
  try {
    const { notes } = request.body;

    const registration = await prisma.aFARegistration.update({
      where: { id: request.params.id },
      data: { status: 'REJECTED', notes: notes || undefined },
      include: { user: true },
    });

    await createNotification(
      registration.userId,
      'AFA Registration Rejected',
      'Your AFA registration has been rejected. Please contact support for more information.',
      'REGISTRATION',
    );

    return response.json(createSuccessResponse(registration, 'AFA registration rejected'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/shank/networks', async (_request, response, next) => {
  try {
    if (!(await shankClient.isConfigured())) {
      return response.status(400).json({ success: false, message: 'SHANK_API_KEY not configured' });
    }
    const networks = await shankClient.fetchNetworks();
    return response.json(createSuccessResponse(networks));
  } catch (error) {
    return response.status(502).json({ success: false, message: shankClient.getErrorMessage(error) });
  }
});

adminRouter.get('/shank/data-packages', async (_request, response, next) => {
  try {
    if (!(await shankClient.isConfigured())) {
      return response.status(400).json({ success: false, message: 'SHANK_API_KEY not configured' });
    }
    const packages = await shankClient.fetchDataPackages();
    return response.json(createSuccessResponse(packages));
  } catch (error) {
    return response.status(502).json({ success: false, message: shankClient.getErrorMessage(error) });
  }
});

adminRouter.post('/shank/sync-networks', async (_request, response, next) => {
  try {
    if (!(await shankClient.isConfigured())) {
      return response.status(400).json({ success: false, message: 'SHANK_API_KEY not configured' });
    }
    const shankNetworks = await shankClient.fetchNetworks();
    const localNetworks = await prisma.network.findMany();

    let updated = 0;
    for (const local of localNetworks) {
      const match = shankNetworks.find(
        (sn) => sn.name.toUpperCase().includes(local.code.toUpperCase()) ||
                 local.code.toUpperCase().includes(sn.name.toUpperCase().split('-')[0].trim()),
      );
      if (match) {
        await prisma.network.update({
          where: { id: local.id },
          data: { shankNetworkId: match.id },
        });
        updated++;
      }
    }

    return response.json(createSuccessResponse({ shankNetworks, updated }, `Synced ${updated} network mappings`));
  } catch (error) {
    return response.status(502).json({ success: false, message: shankClient.getErrorMessage(error) });
  }
});

adminRouter.post('/shank/poll-now', async (_request, response, next) => {
  try {
    const result = await pollOrderStatuses();
    return response.json(createSuccessResponse(result, `Checked ${result.checked} orders, updated ${result.updated}`));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/bundle-portal/poll-now', async (_request, response, next) => {
  try {
    if (!(await bundlePortalClient.isConfigured())) {
      return response.status(400).json({ success: false, message: 'BUNDLE_PORTAL_API_KEY not configured' });
    }
    const result = await pollBundlePortalOrderStatuses();
    return response.json(
      createSuccessResponse(result, `Checked ${result.checked} orders, updated ${result.updated}`),
    );
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/shank/transaction', async (request, response, next) => {
  try {
    const { transactionId } = request.body;
    if (!transactionId || typeof transactionId !== 'string') {
      return response.status(400).json({ success: false, message: 'transactionId is required' });
    }
    if (!(await shankClient.isConfigured())) {
      return response.status(400).json({ success: false, message: 'SHANK_API_KEY not configured' });
    }
    const transaction = await shankClient.fetchOtherNetworkTransaction(transactionId);
    return response.json(createSuccessResponse(transaction));
  } catch (error) {
    return response.status(502).json({ success: false, message: shankClient.getErrorMessage(error) });
  }
});

adminRouter.get('/referral-codes', async (_request, response, next) => {
  try {
    const codes = await prisma.referralCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        usedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    return response.json(createSuccessResponse(codes));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/referral-codes', async (request, response, next) => {
  try {
    const { code, maxUses, expiresAt, createdById } = request.body;
    const referralCode = await prisma.referralCode.create({
      data: {
        code: code.toUpperCase().trim(),
        createdById: createdById || request.auth!.userId,
        maxUses: maxUses || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: 'ACTIVE',
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    return response.status(201).json(createSuccessResponse(referralCode, 'Referral code created'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.put('/referral-codes/:id/revoke', async (request, response, next) => {
  try {
    const referralCode = await prisma.referralCode.update({
      where: { id: request.params.id },
      data: { status: 'INACTIVE' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        usedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    return response.json(createSuccessResponse(referralCode, 'Referral code revoked'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/products/backfill-data-size', async (_request, response, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { dataSize: '' },
    });

    let updated = 0;
    for (const product of products) {
      const dataSize = normalizeDataSize(product.description || product.name);
      if (!dataSize) continue;
      await prisma.product.update({
        where: { id: product.id },
        data: { dataSize },
      });
      updated++;
    }

    return response.json(createSuccessResponse({ updated }, `Backfilled dataSize for ${updated} products`));
  } catch (error) {
    return next(error);
  }
});

// ─── Payment Reconciler ───

adminRouter.get('/reconciler/status', requireAuth, requireRole(UserRole.ADMIN), async (_request, response, next) => {
  try {
    const status = getReconcilerStatus();
    const pendingCount = await prisma.order.count({
      where: {
        source: 'STOREFRONT',
        status: 'PENDING',
        providerReference: null,
        ...(status.startAfter && { createdAt: { gt: new Date(status.startAfter) } }),
      },
    });

    return response.json(
      createSuccessResponse({
        ...status,
        pendingCount,
      }),
    );
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/reconciler/trigger', requireAuth, requireRole(UserRole.ADMIN), async (_request, response, next) => {
  try {
    const result = await runReconcilerTick();
    return response.json(createSuccessResponse(result, 'Reconciliation triggered'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/reconciler/pending', requireAuth, requireRole(UserRole.ADMIN), async (_request, response, next) => {
  try {
    const pendingOrders = await findPendingStorefrontOrders(
      reconcilerState.startAfter ?? undefined,
    );
    return response.json(createSuccessResponse(pendingOrders));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/reconciler/:orderId/reconcile', requireAuth, requireRole(UserRole.ADMIN), async (request, response, next) => {
  try {
    const orderId = String(request.params.orderId);
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        source: 'STOREFRONT',
        status: 'PENDING',
        providerReference: null,
      },
      include: {
        product: { include: { network: true } },
        user: true,
      },
    });

    if (!order) {
      return response.status(404).json({ success: false, message: 'Order not found or not eligible for reconciliation' });
    }

    // Guard: only reconcile orders created after the reconciler became active
    if (reconcilerState.startAfter && order.createdAt < reconcilerState.startAfter) {
      return response.status(400).json({ success: false, message: 'Order was created before the reconciler was active and cannot be reconciled automatically' });
    }

    const result = await reconcileSingleOrder(order);

    if (result === 'reconciled') {
      return response.json(createSuccessResponse({ result }, 'Order reconciled successfully'));
    }

    if (result === 'failed') {
      return response.status(400).json({ success: false, message: 'Reconciliation failed' });
    }

    return response.json(createSuccessResponse({ result }, 'Order skipped (not paid yet)'));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/reconciler/toggle', requireAuth, requireRole(UserRole.ADMIN), async (request, response, next) => {
  try {
    const { enabled } = request.body;
    togglePaymentReconciler(Boolean(enabled));
    return response.json(createSuccessResponse({ enabled: Boolean(enabled) }, `Reconciler ${enabled ? 'enabled' : 'disabled'}`));
  } catch (error) {
    return next(error);
  }
});

// ─── Failed Orders ───

adminRouter.get('/failed-orders', requireAuth, requireRole(UserRole.ADMIN), async (request, response, next) => {
  try {
    const { search = '', network = '' } = request.query;

    const where: Prisma.OrderWhereInput = {
      status: 'FAILED',
      ...(network && { product: { network: { code: String(network).toUpperCase() } } }),
      ...(search && {
        OR: [
          { receiptNumber: { contains: String(search), mode: 'insensitive' } },
          { phoneNumber: { contains: String(search) } },
          {
            user: {
              OR: [
                { firstName: { contains: String(search), mode: 'insensitive' } },
                { lastName: { contains: String(search), mode: 'insensitive' } },
                { email: { contains: String(search), mode: 'insensitive' } },
              ],
            },
          },
        ],
      }),
    };

    const orders = await prisma.order.findMany({
      where,
      include: {
        product: { include: { network: true } },
        user: true,
        refund: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const orderIds = orders.map((o) => o.id);

    const providerTxs = orderIds.length > 0
      ? await prisma.providerTransaction.findMany({
          where: { orderId: { in: orderIds }, status: 'FAILED' },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const txByOrderId = new Map<string, typeof providerTxs[number]>();
    for (const tx of providerTxs) {
      if (tx.orderId && !txByOrderId.has(tx.orderId)) {
        txByOrderId.set(tx.orderId, tx);
      }
    }

    const formatted = orders.map((order) => {
      const lastTx = txByOrderId.get(order.id);
      const responsePayload = lastTx?.responsePayload as Record<string, any> | null;

      return {
        id: order.id,
        receiptNumber: order.receiptNumber,
        phoneNumber: order.phoneNumber,
        amount: order.amount,
        status: order.status,
        source: order.source,
        createdAt: order.createdAt,
        network: order.product.network.name,
        productName: order.product.name,
        customer: `${order.user.firstName} ${order.user.lastName}`,
        customerEmail: order.user.email,
        refundStatus: order.refund?.status ?? null,
        refundAmount: order.refund?.amount ?? null,
        failureReason: responsePayload?.error ?? responsePayload?.message ?? 'Unknown error',
        attemptedNetworkIds: responsePayload?.attemptedNetworkIds ?? null,
        providerReference: order.providerReference ?? null,
        failedAt: lastTx?.createdAt ?? order.updatedAt,
      };
    });

    return response.json(createSuccessResponse(formatted));
  } catch (error) {
    return next(error);
  }
});

// ─── Critical Issues ───

adminRouter.get('/critical-issues', requireAuth, requireRole(UserRole.ADMIN), async (_request, response, next) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h

    const [
      recentProviderFailures,
      recentWebhookFailures,
      stuckProcessingOrders,
    ] = await Promise.all([
      // Provider transaction failures in last 24h
      prisma.providerTransaction.findMany({
        where: {
          status: 'FAILED',
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      // Webhook failures in last 24h
      prisma.webhookLog.findMany({
        where: {
          success: false,
          createdAt: { gte: since },
        },
        include: { webhook: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      // Orders stuck in PROCESSING for > 30 minutes
      prisma.order.findMany({
        where: {
          status: 'PROCESSING',
          updatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
        },
        include: {
          product: { include: { network: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { updatedAt: 'asc' },
        take: 50,
      }),
    ]);

    const issues: Array<{
      type: string;
      severity: 'critical' | 'warning' | 'info';
      title: string;
      description: string;
      entityId: string;
      createdAt: Date;
      metadata: Record<string, unknown>;
    }> = [];

    const providerFailureOrderIds = recentProviderFailures
      .map((tx) => tx.orderId)
      .filter((id): id is string => !!id);

    const providerFailureOrders = providerFailureOrderIds.length > 0
      ? await prisma.order.findMany({
          where: { id: { in: providerFailureOrderIds } },
          include: {
            product: { include: { network: true } },
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        })
      : [];

    const orderMap = new Map(providerFailureOrders.map((o) => [o.id, o]));

    for (const tx of recentProviderFailures) {
      const payload = tx.responsePayload as Record<string, any> | null;
      const relatedOrder = tx.orderId ? orderMap.get(tx.orderId) : null;
      issues.push({
        type: 'PROVIDER_FAILURE',
        severity: 'critical',
        title: 'Provider fulfillment failed',
        description: payload?.error ?? payload?.message ?? 'Provider rejected order',
        entityId: tx.orderId ?? tx.id,
        createdAt: tx.createdAt,
        metadata: {
          orderId: tx.orderId,
          providerId: tx.providerId,
          receiptNumber: relatedOrder?.receiptNumber,
          network: relatedOrder?.product?.network?.name,
          attemptedIds: payload?.attemptedNetworkIds,
        },
      });
    }

    for (const log of recentWebhookFailures) {
      issues.push({
        type: 'WEBHOOK_FAILURE',
        severity: 'warning',
        title: `Webhook delivery failed (${log.webhook.event})`,
        description: `Status ${log.statusCode} — ${log.responseBody?.slice(0, 100) ?? 'No response'}`,
        entityId: log.webhookId,
        createdAt: log.createdAt,
        metadata: {
          webhookUrl: log.webhook.url,
          event: log.webhook.event,
          statusCode: log.statusCode,
        },
      });
    }

    for (const order of stuckProcessingOrders) {
      issues.push({
        type: 'STUCK_ORDER',
        severity: 'warning',
        title: 'Order stuck in PROCESSING',
        description: `Order ${order.receiptNumber} for ${order.phoneNumber} has been PROCESSING for over 30 minutes.`,
        entityId: order.id,
        createdAt: order.updatedAt,
        metadata: {
          receiptNumber: order.receiptNumber,
          phoneNumber: order.phoneNumber,
          network: order.product?.network?.name,
          product: order.product?.name,
          customer: `${order.user?.firstName ?? ''} ${order.user?.lastName ?? ''}`.trim(),
        },
      });
    }

    return response.json(
      createSuccessResponse({
        issues: issues.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        summary: {
          providerFailures24h: recentProviderFailures.length,
          webhookFailures24h: recentWebhookFailures.length,
          stuckOrders: stuckProcessingOrders.length,
          total: issues.length,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
});

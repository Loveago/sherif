import { Router } from 'express';
import { Prisma, UserRole, OrderStatus, WalletTransactionCategory, WalletTransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { announcementSchema, createProductSchema, creditWalletSchema } from '../schemas/admin.schema.js';
import { createSuccessResponse } from '../utils/response.js';
import { generateReference } from '../utils/refs.js';
import { createWalletTransaction } from '../services/wallet.service.js';
import { createNotification } from '../services/notification.service.js';
import { exportToCSV, exportToExcel } from '../services/export.service.js';

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
    const product = await prisma.product.create({
      data: {
        ...productData,
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
    const { rolePrices, promoPrice, showInShop, showForAgents, status, ...productData } = request.body;
    const product = await prisma.product.update({
      where: { id: String(request.params.id) },
      data: {
        ...productData,
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
    const { status, userId, productId, startDate, endDate } = request.query;
    
    const orders = await prisma.order.findMany({
      where: {
        ...(status && { status: status as OrderStatus }),
        ...(userId && { userId: String(userId) }),
        ...(productId && { productId: String(productId) }),
        ...(startDate && { createdAt: { gte: new Date(String(startDate)) } }),
        ...(endDate && { createdAt: { lte: new Date(String(endDate)) } }),
      },
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

adminRouter.put('/orders/:id/status', async (request, response, next) => {
  try {
    const { status } = request.body;
    const order = await prisma.order.update({
      where: { id: request.params.id },
      data: { status },
      include: { product: { include: { network: true } }, user: true },
    });

    return response.json(createSuccessResponse(order, 'Order status updated'));
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

    const order = await prisma.order.update({
      where: { id: request.params.id },
      data: { status: status as OrderStatus },
      include: {
        product: { include: { network: true } },
      },
    });

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

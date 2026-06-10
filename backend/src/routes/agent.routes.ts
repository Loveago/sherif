import { Router } from 'express';
import multer from 'multer';
import { Prisma, UserRole, WalletTransactionCategory, WalletTransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createSuccessResponse } from '../utils/response.js';
import { fundWalletSchema, withdrawSchema } from '../schemas/wallet.schema.js';
import { createOrderSchema, refundRequestSchema } from '../schemas/orders.schema.js';
import { createComplaintSchema } from '../schemas/complaints.schema.js';
import { updateStorefrontSchema } from '../schemas/storefront.schema.js';
import { createWalletTransaction, getWalletByUserId } from '../services/wallet.service.js';
import { queueFulfillment } from '../queues/index.js';
import { generateReference } from '../utils/refs.js';
import { createNotification } from '../services/notification.service.js';
import { emitWebhookEvent } from '../services/webhook.service.js';
import { parseBulkFile } from '../utils/uploads.js';
import { initializePaystackPayment } from '../services/paystack.service.js';

const upload = multer();
const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));

export const agentRouter = Router();

 agentRouter.get('/products', async (_request, response, next) => {
   try {
     const products = await prisma.product.findMany({
       where: { status: true, deletedAt: null },
       include: { network: true },
       orderBy: [{ network: { name: 'asc' } }, { sellingPrice: 'asc' }],
     });

     return response.json(createSuccessResponse(products));
   } catch (error) {
     return next(error);
   }
 });

 agentRouter.get('/store/:slug', async (request, response, next) => {
   try {
     const storefront = await prisma.storefront.findUnique({
       where: { slug: request.params.slug },
       include: {
         user: true,
       },
     });

     if (!storefront) {
       return response.status(404).json({ success: false, message: 'Storefront not found' });
     }

     await prisma.storefront.update({
       where: { id: storefront.id },
       data: {
         visits: { increment: 1 },
       },
     });

     const products = await prisma.product.findMany({
       where: { status: true, deletedAt: null },
       include: { network: true },
       orderBy: [{ network: { name: 'asc' } }, { sellingPrice: 'asc' }],
     });

     return response.json(createSuccessResponse({ storefront, products }));
   } catch (error) {
     return next(error);
   }
 });

agentRouter.use(requireAuth);

agentRouter.get('/dashboard', async (request, response, next) => {
  try {
    const userId = request.auth!.userId;
    const [user, wallet, orders, commissions, batches, notifications, announcements] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { storefront: true },
      }),
      prisma.wallet.findUnique({ where: { userId } }),
      prisma.order.findMany({
        where: { userId },
        include: { product: { include: { network: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.commission.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.orderBatch.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.announcement.findMany({
        where: {
          OR: [{ targetRole: UserRole.AGENT }, { targetRole: null }],
        },
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),
    ]);

    const totalOrders = orders.length;
    const successfulOrders = orders.filter((entry) => entry.status === 'SUCCESSFUL').length;
    const failedOrders = orders.filter((entry) => entry.status === 'FAILED').length;
    const pendingOrders = orders.filter((entry) => ['PENDING', 'PROCESSING'].includes(entry.status)).length;
    const totalSpending = orders.reduce((sum, entry) => sum + entry.amount.toNumber(), 0);
    const totalEarnings = commissions.reduce((sum, entry) => sum + entry.amount.toNumber(), 0);
    const networkUsage = ['MTN', 'TELECEL', 'AIRTELTIGO'].map((networkCode) => ({
      networkCode,
      orders: orders.filter((entry) => entry.product.network.code === networkCode).length,
    }));

    const revenueSeries = Array.from({ length: 7 }).map((_, index) => ({
      label: `Day ${index + 1}`,
      revenue: Number((totalSpending / 7 + index * 42.5).toFixed(2)),
    }));

    return response.json(
      createSuccessResponse({
        user,
        wallet,
        metrics: {
          totalOrders,
          successfulOrders,
          failedOrders,
          pendingOrders,
          totalSpending,
          totalEarnings,
          walletBalance: wallet?.availableBalance ?? 0,
          pendingBalance: wallet?.pendingBalance ?? 0,
        },
        revenueSeries,
        orders: orders.slice(0, 8),
        batches: batches.slice(0, 6),
        commissions: commissions.slice(0, 8),
        notifications,
        announcements,
        networkUsage,
      }),
    );
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/orders', async (request, response, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: request.auth!.userId },
      include: { product: { include: { network: true } }, refund: true },
      orderBy: { createdAt: 'desc' },
    });

    return response.json(createSuccessResponse(orders));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/wallet/fund', validate(fundWalletSchema), async (request, response, next) => {
  try {
    const wallet = await getWalletByUserId(request.auth!.userId);

    const payment = await prisma.payment.create({
      data: {
        userId: request.auth!.userId,
        amount: toDecimal(request.body.amount),
        method: request.body.method,
        status: 'SUCCESSFUL',
        reference: generateReference('PAY'),
        providerRef: request.body.method === 'PAYSTACK' ? generateReference('PST') : generateReference('MOMO'),
      },
    });

    await prisma.$transaction(async (tx) => {
      await createWalletTransaction(
        wallet.id,
        request.body.amount,
        WalletTransactionType.CREDIT,
        WalletTransactionCategory.FUNDING,
        `Wallet funded via ${request.body.method}`,
        tx,
      );
    });

    await createNotification(
      request.auth!.userId,
      'Wallet funded',
      `Your wallet has been credited with GHS ${request.body.amount.toFixed(2)}.`,
      'WALLET',
    );

    await emitWebhookEvent('wallet.funded', {
      userId: request.auth!.userId,
      amount: request.body.amount,
      reference: payment.reference,
    });

    return response.json(createSuccessResponse(payment, 'Wallet funded successfully'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/wallet/paystack/initialize', validate(fundWalletSchema), async (request, response, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: request.auth!.userId } });
    if (!user) {
      return response.status(404).json({ success: false, message: 'User not found' });
    }

    const reference = generateReference('PST');
    const paystackResponse = await initializePaystackPayment(
      user.email,
      request.body.amount,
      reference,
      {
        userId: user.id,
        amount: request.body.amount,
      }
    );

    return response.json(createSuccessResponse(paystackResponse));
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/wallet', async (request, response, next) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: request.auth!.userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!wallet) {
      return response.status(404).json({ success: false, message: 'Wallet not found' });
    }

    return response.json(createSuccessResponse(wallet));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/wallet/withdraw', validate(withdrawSchema), async (request, response, next) => {
  try {
    const wallet = await getWalletByUserId(request.auth!.userId);

    const result = await prisma.$transaction(async (tx) => {
      await createWalletTransaction(
        wallet.id,
        request.body.amount,
        WalletTransactionType.DEBIT,
        WalletTransactionCategory.WITHDRAWAL,
        `Withdrawal request via ${request.body.method}`,
        tx,
      );

      return tx.withdrawal.create({
        data: {
          userId: request.auth!.userId,
          amount: toDecimal(request.body.amount),
          method: request.body.method,
          accountName: request.body.accountName,
          accountNumber: request.body.accountNumber,
          bankName: request.body.bankName,
          reference: generateReference('WDR'),
          status: 'PENDING',
        },
      });
    });

    await createNotification(
      request.auth!.userId,
      'Withdrawal requested',
      `Your withdrawal of GHS ${request.body.amount.toFixed(2)} is pending review.`,
      'WITHDRAWAL',
    );

    return response.status(201).json(createSuccessResponse(result, 'Withdrawal requested'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/orders', validate(createOrderSchema), async (request, response, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: request.body.productId } });

    if (!product || !product.status || product.deletedAt) {
      return response.status(404).json({ success: false, message: 'Product not found' });
    }

    const wallet = await getWalletByUserId(request.auth!.userId);

    const order = await prisma.$transaction(async (tx) => {
      await createWalletTransaction(
        wallet.id,
        product.sellingPrice.toNumber(),
        WalletTransactionType.DEBIT,
        WalletTransactionCategory.PURCHASE,
        `Purchase of ${product.name}`,
        tx,
      );

      return tx.order.create({
        data: {
          userId: request.auth!.userId,
          productId: product.id,
          phoneNumber: request.body.phoneNumber,
          amount: product.sellingPrice,
          receiptNumber: generateReference('ORD'),
          status: 'PENDING',
        },
        include: {
          product: { include: { network: true } },
        },
      });
    });

    await queueFulfillment(order.id);
    await createNotification(
      request.auth!.userId,
      'Order created',
      `${product.name} order for ${request.body.phoneNumber} has been queued for fulfillment.`,
      'ORDER',
    );
    await emitWebhookEvent('order.created', { orderId: order.id, userId: request.auth!.userId });

    return response.status(201).json(createSuccessResponse(order, 'Order created successfully'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/orders/refund', validate(refundRequestSchema), async (request, response, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: request.body.orderId,
        userId: request.auth!.userId,
      },
      include: { refund: true },
    });

    if (!order) {
      return response.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.refund) {
      return response.status(400).json({ success: false, message: 'Refund already requested' });
    }

    const refund = await prisma.refund.create({
      data: {
        userId: request.auth!.userId,
        orderId: order.id,
        amount: order.amount,
        reason: request.body.reason,
        status: 'PENDING',
      },
    });

    await createNotification(request.auth!.userId, 'Refund requested', 'Your refund request is pending review.', 'REFUND');

    return response.status(201).json(createSuccessResponse(refund, 'Refund request submitted'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/bulk-orders/upload', upload.single('file'), async (request, response, next) => {
  try {
    if (!request.file) {
      return response.status(400).json({ success: false, message: 'File is required' });
    }

    const records = parseBulkFile(request.file.originalname, request.file.buffer);
    const activeProducts = await prisma.product.findMany({ where: { status: true, deletedAt: null } });

    const preview = records.map((record) => {
      const product = activeProducts.find(
        (entry) => entry.name.toLowerCase() === record.productName.toLowerCase(),
      );

      return {
        ...record,
        valid: Boolean(product),
        amount: product?.sellingPrice ?? null,
        productId: product?.id,
      };
    });

    const totalAmount = preview.reduce((sum, record) => sum + Number(record.amount ?? 0), 0);

    return response.json(
      createSuccessResponse({
        records: preview,
        totalAmount,
        totalRecords: preview.length,
      }),
    );
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/bulk-orders/process', async (request, response, next) => {
  try {
    const records = request.body.records as Array<{ phoneNumber: string; productId: string; amount: number; valid: boolean }>;

    if (!Array.isArray(records) || records.length === 0) {
      return response.status(400).json({ success: false, message: 'No records supplied' });
    }

    const validRecords = records.filter((record) => record.valid);
    const totalAmount = validRecords.reduce((sum, record) => sum + record.amount, 0);
    const wallet = await getWalletByUserId(request.auth!.userId);

    const batch = await prisma.$transaction(async (tx) => {
      await createWalletTransaction(
        wallet.id,
        totalAmount,
        WalletTransactionType.DEBIT,
        WalletTransactionCategory.PURCHASE,
        'Bulk order batch purchase',
        tx,
      );

      const createdBatch = await tx.orderBatch.create({
        data: {
          userId: request.auth!.userId,
          fileName: 'uploaded-batch',
          totalRecords: validRecords.length,
          totalAmount: toDecimal(totalAmount),
          processingCount: validRecords.length,
          status: 'RUNNING',
        },
      });

      for (const record of validRecords) {
        const order = await tx.order.create({
          data: {
            userId: request.auth!.userId,
            productId: record.productId,
            phoneNumber: record.phoneNumber,
            amount: toDecimal(record.amount),
            receiptNumber: generateReference('ORD'),
            batchId: createdBatch.id,
            status: 'PENDING',
          },
        });

        await queueFulfillment(order.id);
      }

      return createdBatch;
    });

    return response.status(201).json(createSuccessResponse(batch, 'Bulk order batch created'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/bulk-orders', async (request, response, next) => {
  try {
    const batches = await prisma.orderBatch.findMany({
      where: { userId: request.auth!.userId },
      include: {
        orders: {
          include: { product: true },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return response.json(createSuccessResponse(batches));
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/commissions', async (request, response, next) => {
  try {
    const commissions = await prisma.commission.findMany({
      where: { userId: request.auth!.userId },
      include: { order: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return response.json(createSuccessResponse(commissions));
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/withdrawals', async (request, response, next) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: request.auth!.userId },
      orderBy: { createdAt: 'desc' },
    });

    return response.json(createSuccessResponse(withdrawals));
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/complaints', async (request, response, next) => {
  try {
    const complaints = await prisma.complaint.findMany({
      where: { userId: request.auth!.userId },
      orderBy: { createdAt: 'desc' },
    });

    return response.json(createSuccessResponse(complaints));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/complaints', validate(createComplaintSchema), async (request, response, next) => {
  try {
    const complaint = await prisma.complaint.create({
      data: {
        userId: request.auth!.userId,
        title: request.body.title,
        description: request.body.description,
        evidenceUrl: request.body.evidenceUrl,
      },
    });

    await createNotification(request.auth!.userId, 'Complaint submitted', 'Your complaint has been logged.', 'COMPLAINT');

    return response.status(201).json(createSuccessResponse(complaint, 'Complaint created'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/notifications', async (request, response, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: request.auth!.userId },
      orderBy: { createdAt: 'desc' },
    });

    return response.json(createSuccessResponse(notifications));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/notifications/:id/read', async (request, response, next) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: request.params.id, userId: request.auth!.userId },
      data: { status: 'READ' },
    });
    return response.json(createSuccessResponse(notification));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/notifications/read-all', async (request, response, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: request.auth!.userId, status: 'UNREAD' },
      data: { status: 'READ' },
    });
    return response.json(createSuccessResponse({ count: 1 }, 'All notifications marked as read'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/announcements', async (_request, response, next) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });

    return response.json(createSuccessResponse(announcements));
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/storefront/me', async (request, response, next) => {
  try {
    const storefront = await prisma.storefront.findUnique({ where: { userId: request.auth!.userId } });
    return response.json(createSuccessResponse(storefront));
  } catch (error) {
    return next(error);
  }
});

agentRouter.put('/storefront/me', validate(updateStorefrontSchema), async (request, response, next) => {
  try {
    const storefront = await prisma.storefront.update({
      where: { userId: request.auth!.userId },
      data: request.body,
    });

    return response.json(createSuccessResponse(storefront, 'Storefront updated'));
  } catch (error) {
    return next(error);
  }
});

import { Router } from 'express';
import multer from 'multer';
import { Prisma, UserRole, WalletTransactionCategory, WalletTransactionType, OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createSuccessResponse } from '../utils/response.js';
import { fundWalletSchema, withdrawSchema } from '../schemas/wallet.schema.js';
import {
  createOrderSchema,
  initializeStorefrontCheckoutSchema,
  refundRequestSchema,
  verifyStorefrontCheckoutSchema,
} from '../schemas/orders.schema.js';
import { createComplaintSchema } from '../schemas/complaints.schema.js';
import { updateStorefrontSchema } from '../schemas/storefront.schema.js';
import { updateProfileSchema, changePasswordSchema } from '../schemas/auth.schema.js';
import bcrypt from 'bcryptjs';
import { createWalletTransaction, getWalletByUserId } from '../services/wallet.service.js';
import { generateReference } from '../utils/refs.js';
import { generateOrderReference } from '../utils/order-reference.js';
import { createNotification } from '../services/notification.service.js';
import { emitWebhookEvent } from '../services/webhook.service.js';
import { parseBulkFile } from '../utils/uploads.js';
import { initializePaystackPayment, verifyPaystackPayment } from '../services/paystack.service.js';
import { env } from '../config/env.js';

const upload = multer();
const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));
const getStorefrontCheckoutEmail = (phoneNumber: string, _slug: string) => {
  const normalizedPhone = phoneNumber.replace(/\D/g, '').slice(-10);
  // Use the app's real domain so Paystack accepts the email; fallback to a real public TLD
  let domain = 'storefront.app';
  try {
    if (env.FRONTEND_URL) {
      const hostname = new URL(env.FRONTEND_URL).hostname;
      if (hostname && hostname.includes('.') && !hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
        domain = hostname;
      }
    }
  } catch {
    /* ignore invalid FRONTEND_URL */
  }
  const email = `customer-${normalizedPhone || 'anonymous'}@${domain}`;
  console.log('[Storefront Checkout] Generated email for Paystack:', email);
  return email;
};

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

     const storefrontProducts = await prisma.storefrontProduct.findMany({
       where: { storefrontId: storefront.id, isActive: true },
       include: { product: { include: { network: true } } },
       orderBy: [{ product: { network: { name: 'asc' } } }, { product: { sellingPrice: 'asc' } }],
     });

     const products = storefrontProducts.map((sp) => ({
       ...sp.product,
       sellingPrice: sp.customPrice.toNumber(),
       storefrontProductId: sp.id,
     }));

     return response.json(createSuccessResponse({ storefront, products }));
   } catch (error) {
     return next(error);
   }
 });

agentRouter.post('/store/:slug/paystack/initialize', validate(initializeStorefrontCheckoutSchema), async (request, response, next) => {
  try {
    const slug = String(request.params.slug);
    const storefront = await prisma.storefront.findUnique({
      where: { slug },
    });

    if (!storefront) {
      return response.status(404).json({ success: false, message: 'Storefront not found' });
    }

    const storefrontProduct = await prisma.storefrontProduct.findFirst({
      where: {
        storefrontId: storefront.id,
        productId: request.body.productId,
        isActive: true,
      },
      include: {
        product: {
          include: {
            network: true,
          },
        },
      },
    });

    if (!storefrontProduct || !storefrontProduct.product.status || storefrontProduct.product.deletedAt) {
      return response.status(404).json({ success: false, message: 'Storefront product not found' });
    }

    const orderReference = generateOrderReference('STOREFRONT');
    const callbackUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/store/${storefront.slug}/payment-callback`;
    const customerEmail = getStorefrontCheckoutEmail(request.body.phoneNumber, slug);

    const paystackResponse = await initializePaystackPayment(
      customerEmail,
      storefrontProduct.customPrice.toNumber(),
      orderReference,
      callbackUrl,
      {
        source: 'STOREFRONT',
        orderId: orderReference,
        storefrontId: storefront.id,
        productId: storefrontProduct.product.id,
        phoneNumber: request.body.phoneNumber,
        slug: storefront.slug,
      },
    );

    await prisma.order.create({
      data: {
        userId: storefront.userId,
        productId: storefrontProduct.product.id,
        phoneNumber: request.body.phoneNumber,
        amount: storefrontProduct.customPrice,
        receiptNumber: orderReference,
        status: 'PENDING',
        source: 'STOREFRONT',
      },
    });

    return response.json(
      createSuccessResponse({
        ...paystackResponse.data,
        orderId: orderReference,
        amount: storefrontProduct.customPrice.toNumber(),
      }),
    );
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/store/:slug/paystack/verify', validate(verifyStorefrontCheckoutSchema), async (request, response, next) => {
  try {
    const slug = String(request.params.slug);
    const reference = String(request.query.reference);

    const storefront = await prisma.storefront.findUnique({
      where: { slug },
    });

    if (!storefront) {
      return response.status(404).json({ success: false, message: 'Storefront not found' });
    }

    const order = await prisma.order.findFirst({
      where: {
        receiptNumber: reference,
        userId: storefront.userId,
      },
    });

    if (!order) {
      return response.status(404).json({ success: false, message: 'Order record not found' });
    }

    if (order.status !== 'PENDING' || order.providerReference) {
      return response.json(
        createSuccessResponse(
          {
            orderId: order.receiptNumber,
            status: order.status,
            phoneNumber: order.phoneNumber,
          },
          'Order already validated',
        ),
      );
    }

    const paystackResponse = await verifyPaystackPayment(reference);
    if (!paystackResponse.status || paystackResponse.data.status !== 'success') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED' },
      });
      return response.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const metadataSlug = paystackResponse.data.metadata?.slug;
    if (typeof metadataSlug === 'string' && metadataSlug !== slug) {
      return response.status(400).json({ success: false, message: 'Payment does not belong to this storefront' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        providerReference: reference,
      },
    });

    const nextSalesCount = storefront.sales + 1;
    const conversionRate = storefront.visits > 0 ? Number(((nextSalesCount / storefront.visits) * 100).toFixed(2)) : 0;

    await prisma.storefront.update({
      where: { id: storefront.id },
      data: {
        sales: { increment: 1 },
        conversionRate: toDecimal(conversionRate),
      },
    });

    await createNotification(
      updatedOrder.userId,
      'Storefront order paid',
      `Order ${updatedOrder.receiptNumber} for ${updatedOrder.phoneNumber} is pending admin processing.`,
      'ORDER',
    );

    await emitWebhookEvent('order.created', {
      orderId: updatedOrder.id,
      userId: updatedOrder.userId,
      source: 'STOREFRONT',
    });

    return response.json(
      createSuccessResponse(
        {
          orderId: updatedOrder.receiptNumber,
          status: updatedOrder.status,
          phoneNumber: updatedOrder.phoneNumber,
          amount: updatedOrder.amount,
        },
        'Storefront order validated and queued in pending flow',
      ),
    );
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/store/:slug/orders/:orderId', async (request, response, next) => {
  try {
    const slug = String(request.params.slug);
    const storefront = await prisma.storefront.findUnique({
      where: { slug },
    });

    if (!storefront) {
      return response.status(404).json({ success: false, message: 'Storefront not found' });
    }

    const order = await prisma.order.findFirst({
      where: {
        receiptNumber: request.params.orderId,
        userId: storefront.userId,
      },
    });

    if (!order) {
      return response.status(404).json({ success: false, message: 'Order not found' });
    }

    const product = await prisma.product.findUnique({
      where: { id: order.productId },
      include: { network: true },
    });

    if (!product) {
      return response.status(404).json({ success: false, message: 'Order product not found' });
    }

    return response.json(
      createSuccessResponse({
        orderId: order.receiptNumber,
        status: order.status,
        phoneNumber: order.phoneNumber,
        createdAt: order.createdAt,
        amount: order.amount,
        product: {
          name: product.name,
          dataSize: product.dataSize,
          network: product.network.name,
        },
      }),
    );
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
    // MTN MoMo is manual — create PENDING payment, do not credit wallet
    if (request.body.method === 'MTN_MOMO') {
      const payment = await prisma.payment.create({
        data: {
          userId: request.auth!.userId,
          amount: toDecimal(request.body.amount),
          method: 'MTN_MOMO',
          status: 'PENDING',
          reference: generateReference('PAY'),
          providerRef: generateReference('MOMO'),
        },
      });

      await createNotification(
        request.auth!.userId,
        'Wallet funding initiated',
        `Your MoMo wallet funding of GHS ${request.body.amount.toFixed(2)} is pending. Please send the money to the admin MoMo number and chat admin to claim.`,
        'WALLET',
      );

      return response.json(
        createSuccessResponse({ payment }, 'Wallet funding request created. Please complete the manual transfer.')
      );
    }

    // Paystack flow remains unchanged for now
    const wallet = await getWalletByUserId(request.auth!.userId);

    const payment = await prisma.payment.create({
      data: {
        userId: request.auth!.userId,
        amount: toDecimal(request.body.amount),
        method: request.body.method,
        status: 'SUCCESSFUL',
        reference: generateReference('PAY'),
        providerRef: generateReference('PST'),
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
    const callbackUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/wallet/payment-callback`;

    const paystackResponse = await initializePaystackPayment(
      user.email,
      request.body.amount,
      reference,
      callbackUrl,
      {
        userId: user.id,
        amount: request.body.amount,
      }
    );

    await prisma.payment.create({
      data: {
        userId: user.id,
        amount: toDecimal(request.body.amount),
        method: 'PAYSTACK',
        status: 'PENDING',
        reference: generateReference('PAY'),
        providerRef: reference,
      },
    });

    return response.json(createSuccessResponse(paystackResponse.data));
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/wallet/paystack/verify', async (request, response, next) => {
  try {
    const { reference } = request.query;
    if (!reference || typeof reference !== 'string') {
      return response.status(400).json({ success: false, message: 'Reference is required' });
    }

    const payment = await prisma.payment.findFirst({
      where: { providerRef: reference },
    });

    if (!payment) {
      return response.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (payment.status === 'SUCCESSFUL') {
      return response.json(createSuccessResponse({ status: 'SUCCESSFUL', amount: payment.amount }, 'Payment already verified'));
    }

    const paystackResponse = await verifyPaystackPayment(reference);

    if (!paystackResponse.status || paystackResponse.data.status !== 'success') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      return response.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const wallet = await getWalletByUserId(payment.userId);

    await prisma.$transaction(async (tx) => {
      await createWalletTransaction(
        wallet.id,
        payment.amount.toNumber(),
        WalletTransactionType.CREDIT,
        WalletTransactionCategory.FUNDING,
        'Wallet funded via Paystack',
        tx,
      );
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCESSFUL' },
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
      reference: payment.reference,
    });

    return response.json(createSuccessResponse({ status: 'SUCCESSFUL', amount: payment.amount }, 'Wallet funded successfully'));
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
          source: 'BUY_NOW',
          receiptNumber: generateOrderReference('BUY_NOW'),
          status: 'PENDING',
        },
        include: {
          product: { include: { network: true } },
        },
      });
    });

    await createNotification(
      request.auth!.userId,
      'Order created',
      `${product.name} order for ${request.body.phoneNumber} is pending admin review.`,
      'ORDER',
    );
    await emitWebhookEvent('order.created', { orderId: order.id, userId: request.auth!.userId });

    return response.status(201).json(createSuccessResponse(order, 'Order created successfully'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/orders/:id/cancel', async (request, response, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: request.params.id,
        userId: request.auth!.userId,
      },
      include: { user: { include: { wallet: true } } },
    });

    if (!order) {
      return response.status(404).json({ success: false, message: 'Order not found' });
    }

    if (['SUCCESSFUL', 'REFUNDED', 'CANCELLED'].includes(order.status)) {
      return response.status(400).json({ success: false, message: 'Cannot cancel this order' });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (order.user.wallet) {
        await createWalletTransaction(
          order.user.wallet.id,
          order.amount.toNumber(),
          WalletTransactionType.CREDIT,
          WalletTransactionCategory.REFUND,
          `Order cancellation refund for ${order.receiptNumber}`,
          tx,
        );
      }

      return tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
        include: { product: { include: { network: true } } },
      });
    });

    await createNotification(
      request.auth!.userId,
      'Order cancelled',
      `Your order ${order.receiptNumber} has been cancelled and refunded.`,
      'ORDER'
    );

    return response.json(createSuccessResponse(result, 'Order cancelled successfully'));
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
            source: 'BULK',
            receiptNumber: generateOrderReference('BULK'),
            batchId: createdBatch.id,
            status: 'PENDING',
          },
        });

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

agentRouter.get('/api-keys', async (request, response, next) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: request.auth!.userId },
      select: {
        id: true,
        name: true,
        key: true,
        status: true,
        lastUsedAt: true,
        createdAt: true,
        usageCount: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return response.json(createSuccessResponse(keys));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/api-keys', async (request, response, next) => {
  try {
    const { name } = request.body;

    if (!name || typeof name !== 'string') {
      return response.status(400).json({ success: false, message: 'Name is required' });
    }

    const key = `sk_${generateReference('KEY')}`;

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: request.auth!.userId,
        name,
        key,
        keyHash: key,
        status: 'ACTIVE',
      },
    });

    return response.status(201).json(createSuccessResponse(apiKey, 'API key created successfully'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.delete('/api-keys/:id', async (request, response, next) => {
  try {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: request.params.id,
        userId: request.auth!.userId,
      },
    });

    if (!apiKey) {
      return response.status(404).json({ success: false, message: 'API key not found' });
    }

    await prisma.apiKey.delete({
      where: { id: request.params.id },
    });

    return response.json(createSuccessResponse({ id: request.params.id }, 'API key deleted'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/storefront/analytics', async (request, response, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: request.auth!.userId },
      include: { product: true },
    });

    const commissions = await prisma.commission.findMany({
      where: { userId: request.auth!.userId },
    });

    const totalViews = orders.length * 5; // Placeholder: 5 views per order
    const totalOrders = orders.length;
    const totalCommission = commissions.reduce((sum, c) => sum + c.amount.toNumber(), 0);
    const conversionRate = totalViews > 0 ? (totalOrders / totalViews) * 100 : 0;
    const averageOrderValue = totalOrders > 0 ? orders.reduce((sum, o) => sum + o.amount.toNumber(), 0) / totalOrders : 0;

    // Top products
    const productSales: Record<string, { sales: number; commission: number }> = {};
    orders.forEach((order) => {
      const productName = order.product.name;
      if (!productSales[productName]) {
        productSales[productName] = { sales: 0, commission: 0 };
      }
      productSales[productName].sales += 1;
    });

    commissions.forEach((commission) => {
      const order = orders.find((o) => o.id === commission.orderId);
      if (order && productSales[order.product.name]) {
        productSales[order.product.name].commission += commission.amount.toNumber();
      }
    });

    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.commission - a.commission)
      .slice(0, 5);

    // Daily views (placeholder)
    const dailyViews = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        views: Math.floor(Math.random() * 50) + 10,
      };
    }).reverse();

    // Daily orders
    const dailyOrders: Record<string, { orders: number; revenue: number }> = {};
    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!dailyOrders[date]) {
        dailyOrders[date] = { orders: 0, revenue: 0 };
      }
      dailyOrders[date].orders += 1;
      dailyOrders[date].revenue += order.amount.toNumber();
    });

    const dailyOrdersArray = Object.entries(dailyOrders)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return response.json(
      createSuccessResponse({
        totalViews,
        totalOrders,
        totalCommission,
        topProducts,
        dailyViews,
        dailyOrders: dailyOrdersArray,
        conversionRate,
        averageOrderValue,
      })
    );
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/failed-payments', async (request, response, next) => {
  try {
    const failedOrders = await prisma.order.findMany({
      where: {
        userId: request.auth!.userId,
        status: 'FAILED',
      },
      include: {
        product: { include: { network: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const failedPayments = failedOrders.map((order) => ({
      id: order.id,
      receiptNumber: order.receiptNumber,
      product: order.product.name,
      network: order.product.network.code,
      phoneNumber: order.phoneNumber,
      amount: order.amount.toNumber(),
      status: order.status,
      failureReason: order.notes || 'Payment processing failed',
      createdAt: order.createdAt,
      retryCount: 0,
    }));

    return response.json(createSuccessResponse(failedPayments));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/failed-payments/:id/retry', async (request, response, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: request.params.id,
        userId: request.auth!.userId,
        status: 'FAILED',
      },
      include: { product: { include: { network: true } } },
    });

    if (!order) {
      return response.status(404).json({ success: false, message: 'Order not found' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PENDING' },
      include: { product: { include: { network: true } } },
    });

    await createNotification(
      request.auth!.userId,
      'Payment Retry',
      `Payment retry initiated for order ${order.receiptNumber}`,
      'PAYMENT'
    );

    return response.json(createSuccessResponse(updatedOrder, 'Payment retry initiated'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/afa-registrations', async (request, response, next) => {
  try {
    const registrations = await prisma.aFARegistration.findMany({
      where: { userId: request.auth!.userId },
      orderBy: { createdAt: 'desc' },
    });

    return response.json(createSuccessResponse(registrations));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/afa-registrations', async (request, response, next) => {
  try {
    const { fullName, phone, location, occupation, idType, idNumber, notes } = request.body;

    if (!fullName || !phone || !location) {
      return response.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const registration = await prisma.aFARegistration.create({
      data: {
        userId: request.auth!.userId,
        fullName,
        phone,
        location,
        occupation,
        idType,
        idNumber,
        notes,
      },
    });

    await createNotification(
      request.auth!.userId,
      'AFA Registration Submitted',
      `Your AFA registration has been submitted for review.`,
      'REGISTRATION'
    );

    return response.status(201).json(createSuccessResponse(registration, 'AFA registration submitted'));
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

agentRouter.get('/orders', async (request, response, next) => {
  try {
    const { status = '' } = request.query;

    const orders = await prisma.order.findMany({
      where: {
        userId: request.auth!.userId,
        ...(status && { status: status as OrderStatus }),
      },
      include: {
        product: { include: { network: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return response.json(createSuccessResponse(orders));
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

agentRouter.get('/storefront/orders', async (request, response, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: request.auth!.userId,
        source: 'STOREFRONT',
      },
      include: {
        product: { include: { network: true } },
        commission: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return response.json(createSuccessResponse(orders));
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

// Get all available products with agent's storefront status
agentRouter.get('/storefront/products', async (request, response, next) => {
  try {
    const storefront = await prisma.storefront.findUnique({
      where: { userId: request.auth!.userId },
    });

    const allProducts = await prisma.product.findMany({
      where: { status: true, deletedAt: null, showForAgents: true },
      include: { network: true },
      orderBy: [{ network: { name: 'asc' } }, { sellingPrice: 'asc' }],
    });

    const myProducts = storefront
      ? await prisma.storefrontProduct.findMany({
          where: { storefrontId: storefront.id },
        })
      : [];

    const myProductMap = new Map(myProducts.map((p) => [p.productId, p]));

    const products = allProducts.map((product) => {
      const sp = myProductMap.get(product.id);
      return {
        ...product,
        isOnStorefront: !!sp && sp.isActive,
        customPrice: sp ? sp.customPrice.toNumber() : null,
        storefrontProductId: sp?.id ?? null,
      };
    });

    return response.json(createSuccessResponse(products));
  } catch (error) {
    return next(error);
  }
});

// Add product to storefront
agentRouter.post('/storefront/products', async (request, response, next) => {
  try {
    const { productId, customPrice } = request.body;
    const storefront = await prisma.storefront.findUnique({
      where: { userId: request.auth!.userId },
    });

    if (!storefront) {
      return response.status(400).json({ success: false, message: 'Storefront not found' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return response.status(404).json({ success: false, message: 'Product not found' });
    }

    if (Number(customPrice) < product.sellingPrice.toNumber()) {
      return response.status(400).json({
        success: false,
        message: `Custom price cannot be lower than the base price of ${product.sellingPrice.toNumber()} GHS`,
      });
    }

    const existing = await prisma.storefrontProduct.findUnique({
      where: { storefrontId_productId: { storefrontId: storefront.id, productId } },
    });

    if (existing) {
      const updated = await prisma.storefrontProduct.update({
        where: { id: existing.id },
        data: { customPrice: new Prisma.Decimal(customPrice), isActive: true },
        include: { product: { include: { network: true } } },
      });
      return response.json(createSuccessResponse(updated, 'Product updated'));
    }

    const created = await prisma.storefrontProduct.create({
      data: {
        storefrontId: storefront.id,
        productId,
        customPrice: new Prisma.Decimal(customPrice),
        isActive: true,
      },
      include: { product: { include: { network: true } } },
    });

    return response.status(201).json(createSuccessResponse(created, 'Product added to storefront'));
  } catch (error) {
    return next(error);
  }
});

// Update storefront product price
agentRouter.put('/storefront/products/:productId', async (request, response, next) => {
  try {
    const { customPrice } = request.body;
    const storefront = await prisma.storefront.findUnique({
      where: { userId: request.auth!.userId },
    });

    if (!storefront) {
      return response.status(400).json({ success: false, message: 'Storefront not found' });
    }

    const product = await prisma.product.findUnique({ where: { id: request.params.productId } });
    if (!product) {
      return response.status(404).json({ success: false, message: 'Product not found' });
    }

    if (Number(customPrice) < product.sellingPrice.toNumber()) {
      return response.status(400).json({
        success: false,
        message: `Custom price cannot be lower than the base price of ${product.sellingPrice.toNumber()} GHS`,
      });
    }

    const updated = await prisma.storefrontProduct.update({
      where: {
        storefrontId_productId: {
          storefrontId: storefront.id,
          productId: request.params.productId,
        },
      },
      data: { customPrice: new Prisma.Decimal(customPrice) },
      include: { product: { include: { network: true } } },
    });

    return response.json(createSuccessResponse(updated, 'Price updated'));
  } catch (error) {
    return next(error);
  }
});

// Remove product from storefront
agentRouter.delete('/storefront/products/:productId', async (request, response, next) => {
  try {
    const storefront = await prisma.storefront.findUnique({
      where: { userId: request.auth!.userId },
    });

    if (!storefront) {
      return response.status(400).json({ success: false, message: 'Storefront not found' });
    }

    await prisma.storefrontProduct.update({
      where: {
        storefrontId_productId: {
          storefrontId: storefront.id,
          productId: request.params.productId,
        },
      },
      data: { isActive: false },
    });

    return response.json(createSuccessResponse(null, 'Product removed from storefront'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.put('/me', validate(updateProfileSchema), async (request, response, next) => {
  try {
    const { firstName, lastName, email, phone, companyName } = request.body;
    const user = await prisma.user.update({
      where: { id: request.auth!.userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(companyName !== undefined && { companyName }),
      },
    });
    return response.json(createSuccessResponse(user, 'Profile updated'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/me/change-password', validate(changePasswordSchema), async (request, response, next) => {
  try {
    const { currentPassword, newPassword } = request.body;
    const user = await prisma.user.findUnique({
      where: { id: request.auth!.userId },
    });
    if (!user) {
      return response.status(404).json({ success: false, message: 'User not found' });
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return response.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: request.auth!.userId },
      data: { passwordHash },
    });
    return response.json(createSuccessResponse({}, 'Password changed successfully'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/chat/start', async (request, response, next) => {
  try {
    const { receiverId } = request.body;
    const senderId = request.auth!.userId;

    if (!receiverId) {
      return response.status(400).json({ success: false, message: 'Receiver ID is required' });
    }

    const [id1, id2] = [senderId, receiverId].sort();

    let chat = await prisma.chat.findUnique({
      where: {
        participant1Id_participant2Id: {
          participant1Id: id1,
          participant2Id: id2,
        },
      },
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          type: 'ADMIN_AGENT',
          participant1Id: id1,
          participant2Id: id2,
        },
      });
    }

    return response.json(createSuccessResponse(chat));
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/chats', async (request, response, next) => {
  try {
    const userId = request.auth!.userId;

    const chats = await prisma.chat.findMany({
      where: {
        OR: [
          { participant1Id: userId },
          { participant2Id: userId },
        ],
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        participant1: true,
        participant2: true,
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return response.json(createSuccessResponse(chats));
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/chats/:chatId/messages', async (request, response, next) => {
  try {
    const { limit = '50', offset = '0' } = request.query;

    const messages = await prisma.message.findMany({
      where: { chatId: request.params.chatId },
      include: {
        sender: true,
        receiver: true,
        replyTo: true,
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(String(limit)),
      skip: parseInt(String(offset)),
    });

    return response.json(createSuccessResponse(messages));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/chats/:chatId/messages', async (request, response, next) => {
  try {
    const { content, receiverId, replyToId } = request.body;
    const senderId = request.auth!.userId;

    if (!content || !receiverId) {
      return response.status(400).json({ success: false, message: 'Content and receiver ID are required' });
    }

    const message = await prisma.message.create({
      data: {
        chatId: request.params.chatId,
        senderId,
        receiverId,
        content,
        replyToId,
        status: 'SENT',
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    await prisma.chat.update({
      where: { id: request.params.chatId },
      data: { lastMessageAt: new Date() },
    });

    return response.status(201).json(createSuccessResponse(message, 'Message sent'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/chats/:chatId/messages/:messageId/read', async (request, response, next) => {
  try {
    const message = await prisma.message.update({
      where: { id: request.params.messageId },
      data: {
        status: 'DELIVERED',
        readAt: new Date(),
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    return response.json(createSuccessResponse(message));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/complaints', validate(createComplaintSchema), async (request, response, next) => {
  try {
    const { title, description, evidenceUrl } = request.body;

    const complaint = await prisma.complaint.create({
      data: {
        userId: request.auth!.userId,
        title,
        description,
        evidenceUrl,
        status: 'OPEN',
      },
      include: {
        user: true,
      },
    });

    await createNotification(request.auth!.userId, 'Complaint Submitted', 'Your complaint has been submitted successfully', 'complaint');

    return response.status(201).json(createSuccessResponse(complaint, 'Complaint submitted'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/complaints', async (request, response, next) => {
  try {
    const complaints = await prisma.complaint.findMany({
      where: { userId: request.auth!.userId },
      include: {
        user: true,
        assignedTo: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return response.json(createSuccessResponse(complaints));
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/complaints/:id', async (request, response, next) => {
  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: request.params.id },
      include: {
        user: true,
        assignedTo: true,
      },
    });

    if (!complaint || complaint.userId !== request.auth!.userId) {
      return response.status(404).json({ success: false, message: 'Complaint not found' });
    }

    return response.json(createSuccessResponse(complaint));
  } catch (error) {
    return next(error);
  }
});

agentRouter.post('/referral-codes/generate', async (request, response, next) => {
  try {
    const { maxUses, expiresAt } = request.body;
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    const referralCode = await prisma.referralCode.create({
      data: {
        code,
        createdById: request.auth!.userId,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: 'ACTIVE',
      },
      include: {
        createdBy: true,
        usedBy: true,
      },
    });

    return response.status(201).json(createSuccessResponse(referralCode, 'Referral code generated'));
  } catch (error) {
    return next(error);
  }
});

agentRouter.get('/referral-codes', async (request, response, next) => {
  try {
    const codes = await prisma.referralCode.findMany({
      where: { createdById: request.auth!.userId },
      include: {
        createdBy: true,
        usedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: codes.length,
      active: codes.filter(c => c.status === 'ACTIVE').length,
      totalUses: codes.reduce((sum, c) => sum + c.currentUses, 0),
    };

    return response.json(createSuccessResponse({ codes, stats }));
  } catch (error) {
    return next(error);
  }
});

agentRouter.put('/referral-codes/:id', async (request, response, next) => {
  try {
    const { maxUses, expiresAt, status } = request.body;

    const referralCode = await prisma.referralCode.update({
      where: { id: request.params.id },
      data: {
        ...(maxUses !== undefined && { maxUses }),
        ...(expiresAt && { expiresAt: new Date(expiresAt) }),
        ...(status && { status }),
      },
      include: {
        createdBy: true,
        usedBy: true,
      },
    });

    return response.json(createSuccessResponse(referralCode, 'Referral code updated'));
  } catch (error) {
    return next(error);
  }
});

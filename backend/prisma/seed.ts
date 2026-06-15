import { PrismaClient, Prisma, UserRole, VerificationStatus, OrderStatus, BatchStatus, ComplaintStatus, RefundStatus, WithdrawalStatus, PaymentMethod, PaymentStatus, ProviderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const DEMO_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@datahubgh.com';
const DEMO_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
const DEMO_AGENT_EMAIL = process.env.DEMO_AGENT_EMAIL || 'agent@datahubgh.com';
const DEMO_AGENT_PASSWORD = process.env.DEMO_AGENT_PASSWORD || 'Agent@123';

const prisma = new PrismaClient();
const money = (value: number) => new Prisma.Decimal(value.toFixed(2));

async function main() {
  await prisma.webhookLog.deleteMany();
  await prisma.webhook.deleteMany();
  await prisma.providerTransaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.withdrawal.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.order.deleteMany();
  await prisma.orderBatch.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.storefront.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.referralCode.deleteMany();
  await prisma.aFARegistration.deleteMany();
  await prisma.mTNExpressBundle.deleteMany();
  await prisma.rolePrice.deleteMany();
  await prisma.adminSettings.deleteMany();
  await prisma.product.deleteMany();
  await prisma.network.deleteMany();
  await prisma.user.deleteMany();

  const [mtn, telecel, airtelTigo] = await Promise.all([
    prisma.network.create({ data: { name: 'MTN Ghana', code: 'MTN', color: '#facc15' } }),
    prisma.network.create({ data: { name: 'Telecel Ghana', code: 'TELECEL', color: '#ef4444' } }),
    prisma.network.create({ data: { name: 'AirtelTigo Ghana', code: 'AIRTELTIGO', color: '#3b82f6' } }),
  ]);

  const passwordHashes = await Promise.all([
    bcrypt.hash(DEMO_AGENT_PASSWORD, 12),
    bcrypt.hash(DEMO_ADMIN_PASSWORD, 12),
  ]);

  const agent = await prisma.user.create({
    data: {
      firstName: 'Kofi',
      lastName: 'Mensah',
      email: DEMO_AGENT_EMAIL,
      passwordHash: passwordHashes[0],
      phone: '0551234567',
      role: UserRole.AGENT,
      companyName: 'DATAHUB Kofi Ventures',
      verificationStatus: VerificationStatus.VERIFIED,
      emailVerifiedAt: new Date(),
      wallet: {
        create: {
          availableBalance: money(1245.6),
          pendingBalance: money(0),
        },
      },
      storefront: {
        create: {
          slug: 'kwame-mensah',
          displayName: 'Kofi Data Shop',
          tagline: 'Fast. Reliable. Affordable data.',
          description: 'Premium data bundles for MTN, Telecel and AirtelTigo with instant delivery and fintech-grade support.',
          themeColor: '#7c3aed',
          contactEmail: 'kofi@datahubgh.com',
          contactPhone: '0551234567',
          instagramUrl: 'https://instagram.com/datahubghana',
          twitterUrl: 'https://x.com/datahubghana',
          whatsappUrl: 'https://wa.me/233551234567',
          seoTitle: 'Kofi Data Shop | DATAHUB Ghana',
          seoDescription: 'Premium Ghana data bundles at lightning-fast speed.',
          visits: 1254,
          sales: 356,
          conversionRate: money(28.4),
        },
      },
    },
    include: { wallet: true, storefront: true },
  });

  const admin = await prisma.user.create({
    data: {
      firstName: 'Ama',
      lastName: 'Asante',
      email: DEMO_ADMIN_EMAIL,
      passwordHash: passwordHashes[1],
      phone: '0240000000',
      role: UserRole.ADMIN,
      companyName: 'DATAHUB Ghana HQ',
      verificationStatus: VerificationStatus.VERIFIED,
      emailVerifiedAt: new Date(),
      wallet: {
        create: {
          availableBalance: money(25000),
          pendingBalance: money(0),
        },
      },
      storefront: {
        create: {
          slug: 'datahub-admin',
          displayName: 'DATAHUB Official',
          tagline: 'Enterprise-grade data operations.',
          description: 'Official DATAHUB storefront.',
          themeColor: '#8b5cf6',
          conversionRate: money(31.2),
        },
      },
    },
  });

  const products = await prisma.product.createManyAndReturn({
    data: [
      // MTN products
      { name: 'MTN', slug: 'mtn-1gb', description: '1GB', dataSize: '1GB', sellingPrice: money(4.5), agentPrice: money(4.2), resellerPrice: money(4.0), buyingPrice: money(3.8), networkId: mtn.id, status: true, stock: 999999 },
      { name: 'MTN', slug: 'mtn-2gb', description: '2GB', dataSize: '2GB', sellingPrice: money(7.0), agentPrice: money(6.7), resellerPrice: money(6.5), buyingPrice: money(6.1), networkId: mtn.id, status: true, stock: 999999 },
      { name: 'MTN', slug: 'mtn-5gb', description: '5GB', dataSize: '5GB', sellingPrice: money(15.0), agentPrice: money(14.2), resellerPrice: money(13.8), buyingPrice: money(13.1), networkId: mtn.id, status: true, stock: 999999 },
      { name: 'MTN', slug: 'mtn-10gb', description: '10GB', dataSize: '10GB', sellingPrice: money(28.0), agentPrice: money(27.2), resellerPrice: money(26.6), buyingPrice: money(25.4), networkId: mtn.id, status: true, stock: 999999 },
      // Telecel products
      { name: 'Telecel', slug: 'telecel-1gb', description: '1GB', dataSize: '1GB', sellingPrice: money(4.9), agentPrice: money(4.6), resellerPrice: money(4.4), buyingPrice: money(4.1), networkId: telecel.id, status: true, stock: 999999 },
      { name: 'Telecel', slug: 'telecel-2gb', description: '2GB', dataSize: '2GB', sellingPrice: money(7.9), agentPrice: money(7.4), resellerPrice: money(7.1), buyingPrice: money(6.8), networkId: telecel.id, status: true, stock: 999999 },
      { name: 'Telecel', slug: 'telecel-5gb', description: '5GB', dataSize: '5GB', sellingPrice: money(16.5), agentPrice: money(15.9), resellerPrice: money(15.2), buyingPrice: money(14.7), networkId: telecel.id, status: true, stock: 999999 },
      // AirtelTigo products
      { name: 'AirtelTigo', slug: 'airteltigo-1gb', description: '1GB', dataSize: '1GB', sellingPrice: money(4.7), agentPrice: money(4.4), resellerPrice: money(4.1), buyingPrice: money(3.9), networkId: airtelTigo.id, status: true, stock: 999999 },
      { name: 'AirtelTigo', slug: 'airteltigo-2gb', description: '2GB', dataSize: '2GB', sellingPrice: money(7.5), agentPrice: money(7.1), resellerPrice: money(6.8), buyingPrice: money(6.4), networkId: airtelTigo.id, status: true, stock: 999999 },
      { name: 'AirtelTigo', slug: 'airteltigo-5gb', description: '5GB', dataSize: '5GB', sellingPrice: money(15.8), agentPrice: money(15.1), resellerPrice: money(14.5), buyingPrice: money(13.9), networkId: airtelTigo.id, status: true, stock: 999999 },
    ],
  });

  const activeProvider = await prisma.provider.create({
    data: {
      name: 'Mock Provider Alpha',
      code: 'PROVIDER_ALPHA',
      status: ProviderStatus.ACTIVE,
      priority: 1,
      apiBaseUrl: 'https://mock-provider-alpha.local',
    },
  });

  await prisma.provider.create({
    data: {
      name: 'Mock Provider Beta',
      code: 'PROVIDER_BETA',
      status: ProviderStatus.INACTIVE,
      priority: 2,
      apiBaseUrl: 'https://mock-provider-beta.local',
    },
  });

  await prisma.webhook.create({
    data: {
      event: 'wallet.funded',
      url: 'https://webhook.site/mock-datahub',
      secret: 'whsec_demo',
      active: true,
    },
  });

  await prisma.announcement.createMany({
    data: [
      {
        title: 'Weekend Promo is Live',
        content: 'Enjoy discount opportunities across selected bundles this weekend.',
        pinned: true,
        targetRole: UserRole.AGENT,
      },
      {
        title: 'System Maintenance',
        content: 'Scheduled maintenance runs from 1:00 AM to 3:00 AM on Saturday.',
        pinned: false,
      },
    ],
  });

  const agentWallet = agent.wallet!;

  const walletFundingTx = await prisma.walletTransaction.create({
    data: {
      walletId: agentWallet.id,
      type: 'CREDIT',
      category: 'FUNDING',
      amount: money(1500),
      balanceBefore: money(0),
      balanceAfter: money(1500),
      description: 'Initial wallet funding',
      reference: 'WAL-DEMO0001',
    },
  });

  const orderSeedData = [
    { product: products[0], phoneNumber: '0551234567', amount: 4.5, status: OrderStatus.SUCCESSFUL, receiptNumber: 'ORD-DEMO0001' },
    { product: products[1], phoneNumber: '0249876543', amount: 7.0, status: OrderStatus.SUCCESSFUL, receiptNumber: 'ORD-DEMO0002' },
    { product: products[2], phoneNumber: '0501112222', amount: 15.0, status: OrderStatus.PROCESSING, receiptNumber: 'ORD-DEMO0003' },
    { product: products[4], phoneNumber: '0203456789', amount: 4.9, status: OrderStatus.FAILED, receiptNumber: 'ORD-DEMO0004' },
    { product: products[6], phoneNumber: '0539876543', amount: 16.5, status: OrderStatus.SUCCESSFUL, receiptNumber: 'ORD-DEMO0005' },
    { product: products[9], phoneNumber: '0576543210', amount: 15.8, status: OrderStatus.SUCCESSFUL, receiptNumber: 'ORD-DEMO0006' },
  ];

  const createdOrders = [] as Awaited<ReturnType<typeof prisma.order.create>>[];
  let runningBalance = 1500;

  for (const [index, seed] of orderSeedData.entries()) {
    runningBalance -= seed.amount;

    const order = await prisma.order.create({
      data: {
        userId: agent.id,
        productId: seed.product.id,
        phoneNumber: seed.phoneNumber,
        amount: money(seed.amount),
        status: seed.status,
        providerReference: `PRV-DEMO${index + 1}`,
        receiptNumber: seed.receiptNumber,
      },
    });

    createdOrders.push(order);

    await prisma.walletTransaction.create({
      data: {
        walletId: agentWallet.id,
        type: 'DEBIT',
        category: 'PURCHASE',
        amount: money(seed.amount),
        balanceBefore: money(runningBalance + seed.amount),
        balanceAfter: money(runningBalance),
        description: `Purchase of ${seed.product.name}`,
        reference: `WAL-PURCHASE-${index + 1}`,
      },
    });

    if (seed.status === OrderStatus.SUCCESSFUL) {
      const commissionValue = Number((seed.amount - seed.product.buyingPrice.toNumber()).toFixed(2));
      runningBalance += commissionValue;

      await prisma.commission.create({
        data: {
          userId: agent.id,
          orderId: order.id,
          amount: money(commissionValue),
          source: 'Order Commission',
        },
      });

      await prisma.walletTransaction.create({
        data: {
          walletId: agentWallet.id,
          type: 'CREDIT',
          category: 'COMMISSION',
          amount: money(commissionValue),
          balanceBefore: money(runningBalance - commissionValue),
          balanceAfter: money(runningBalance),
          description: `Commission for ${seed.product.name}`,
          reference: `WAL-COMMISSION-${index + 1}`,
        },
      });
    }

    if (seed.status === OrderStatus.FAILED) {
      runningBalance += seed.amount;

      await prisma.refund.create({
        data: {
          userId: agent.id,
          orderId: order.id,
          amount: money(seed.amount),
          reason: 'Automatic refund for failed fulfillment',
          status: RefundStatus.REFUNDED,
        },
      });

      await prisma.walletTransaction.create({
        data: {
          walletId: agentWallet.id,
          type: 'CREDIT',
          category: 'REFUND',
          amount: money(seed.amount),
          balanceBefore: money(runningBalance - seed.amount),
          balanceAfter: money(runningBalance),
          description: `Automatic refund for ${seed.receiptNumber}`,
          reference: `WAL-REFUND-${index + 1}`,
        },
      });
    }
  }

  const batch = await prisma.orderBatch.create({
    data: {
      userId: agent.id,
      status: BatchStatus.COMPLETED,
      fileName: 'ghana-bulk-orders.xlsx',
      totalRecords: 4,
      totalAmount: money(31.7),
      successfulCount: 3,
      failedCount: 1,
      processingCount: 0,
    },
  });

  await prisma.order.create({
    data: {
      userId: agent.id,
      productId: products[3].id,
      phoneNumber: '0550001111',
      amount: money(28),
      status: OrderStatus.SUCCESSFUL,
      providerReference: 'PRV-BATCH-001',
      receiptNumber: 'ORD-BATCH-0001',
      batchId: batch.id,
    },
  });

  await prisma.order.create({
    data: {
      userId: agent.id,
      productId: products[0].id,
      phoneNumber: '0550001112',
      amount: money(4.5),
      status: OrderStatus.SUCCESSFUL,
      providerReference: 'PRV-BATCH-002',
      receiptNumber: 'ORD-BATCH-0002',
      batchId: batch.id,
    },
  });

  await prisma.order.create({
    data: {
      userId: agent.id,
      productId: products[1].id,
      phoneNumber: '0550001113',
      amount: money(7),
      status: OrderStatus.SUCCESSFUL,
      providerReference: 'PRV-BATCH-003',
      receiptNumber: 'ORD-BATCH-0003',
      batchId: batch.id,
    },
  });

  const failedBatchOrder = await prisma.order.create({
    data: {
      userId: agent.id,
      productId: products[4].id,
      phoneNumber: '0550001114',
      amount: money(4.9),
      status: OrderStatus.FAILED,
      providerReference: 'PRV-BATCH-004',
      receiptNumber: 'ORD-BATCH-0004',
      batchId: batch.id,
    },
  });

  await prisma.refund.create({
    data: {
      userId: agent.id,
      orderId: failedBatchOrder.id,
      amount: money(4.9),
      reason: 'Automatic refund for failed bulk order',
      status: RefundStatus.REFUNDED,
    },
  });

  await prisma.withdrawal.create({
    data: {
      userId: agent.id,
      amount: money(100),
      method: 'MTN Mobile Money',
      accountName: 'Kofi Mensah',
      accountNumber: '0551234567',
      status: WithdrawalStatus.PENDING,
      reference: 'WDR-DEMO-001',
    },
  });

  await prisma.complaint.createMany({
    data: [
      {
        userId: agent.id,
        title: 'Delayed order processing',
        description: 'One of my bulk orders took longer than expected to finish processing.',
        status: ComplaintStatus.RESPONDED,
      },
      {
        userId: agent.id,
        title: 'Receipt export issue',
        description: 'The receipt download for one order was unavailable on first click.',
        status: ComplaintStatus.OPEN,
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: agent.id,
        title: 'Wallet funded',
        body: 'Your wallet top-up was processed successfully.',
        type: 'WALLET',
      },
      {
        userId: agent.id,
        title: 'Order completed',
        body: 'MTN 2GB Bundle for 0249876543 is now successful.',
        type: 'ORDER',
      },
      {
        userId: agent.id,
        title: 'Refund processed',
        body: 'A failed Telecel order was refunded to your wallet.',
        type: 'REFUND',
      },
    ],
  });

  await prisma.payment.createMany({
    data: [
      {
        userId: agent.id,
        amount: money(500),
        method: PaymentMethod.PAYSTACK,
        status: PaymentStatus.SUCCESSFUL,
        reference: 'PAY-DEMO-001',
        providerRef: 'PST-DEMO-001',
      },
      {
        userId: agent.id,
        amount: money(1000),
        method: PaymentMethod.MTN_MOMO,
        status: PaymentStatus.SUCCESSFUL,
        reference: 'PAY-DEMO-002',
        providerRef: 'MOMO-DEMO-001',
      },
    ],
  });

  await prisma.providerTransaction.createMany({
    data: createdOrders.map((order, index) => ({
      providerId: activeProvider.id,
      orderId: order.id,
      requestPayload: { receiptNumber: order.receiptNumber, phoneNumber: order.phoneNumber },
      responsePayload: { providerReference: order.providerReference, status: order.status },
      status: order.status,
    })),
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        action: 'PRODUCT_SEED_CREATED',
        entity: 'Product',
        entityId: products[0].id,
        metadata: { productName: products[0].name },
      },
      {
        actorId: agent.id,
        action: 'WALLET_FUNDED',
        entity: 'WalletTransaction',
        entityId: walletFundingTx.id,
        metadata: { amount: 1500 },
      },
    ],
  });

  await prisma.session.createMany({
    data: [
      {
        userId: agent.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Chrome',
        deviceName: 'Desktop Browser',
      },
      {
        userId: admin.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Chrome',
        deviceName: 'Admin Desktop Browser',
      },
    ],
  });

  await prisma.wallet.update({
    where: { id: agentWallet.id },
    data: {
      availableBalance: money(runningBalance),
    },
  });

  await prisma.adminSettings.createMany({
    data: [
      { key: 'afaRegistrationFee', value: '20' },
      { key: 'momoNumber', value: '0240000000' },
      { key: 'momoName', value: 'DATAHUB Ghana' },
      { key: 'momoEnabled', value: 'true' },
      { key: 'whatsappNumber', value: '0240000000' },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

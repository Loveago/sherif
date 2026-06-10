import { PrismaClient, Prisma, UserRole, VerificationStatus, ProviderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

const prisma = new PrismaClient();
const money = (value: number) => new Prisma.Decimal(value.toFixed(2));

export async function ensureSeed() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('[startup-seed] Database already seeded, skipping.');
    return;
  }

  console.log('[startup-seed] Database empty, running seed...');

  await prisma.$transaction(async (tx) => {
    const [mtn, telecel, airtelTigo] = await Promise.all([
      tx.network.create({ data: { name: 'MTN Ghana', code: 'MTN', color: '#facc15' } }),
      tx.network.create({ data: { name: 'Telecel Ghana', code: 'TELECEL', color: '#ef4444' } }),
      tx.network.create({ data: { name: 'AirtelTigo Ghana', code: 'AIRTELTIGO', color: '#3b82f6' } }),
    ]);

    const adminHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
    const agentHash = await bcrypt.hash(env.DEMO_AGENT_PASSWORD, 12);

    await tx.user.create({
      data: {
        firstName: 'Ama',
        lastName: 'Asante',
        email: env.ADMIN_EMAIL,
        passwordHash: adminHash,
        phone: '0240000000',
        role: UserRole.ADMIN,
        companyName: 'DATAHUB Ghana HQ',
        verificationStatus: VerificationStatus.VERIFIED,
        emailVerifiedAt: new Date(),
        wallet: { create: { availableBalance: money(25000), pendingBalance: money(0) } },
        storefront: { create: { slug: 'datahub-admin', displayName: 'DATAHUB Official', tagline: 'Enterprise-grade data operations.', themeColor: '#8b5cf6', conversionRate: money(31.2) } },
      },
    });

    await tx.user.create({
      data: {
        firstName: 'Kofi',
        lastName: 'Mensah',
        email: env.DEMO_AGENT_EMAIL,
        passwordHash: agentHash,
        phone: '0551234567',
        role: UserRole.AGENT,
        companyName: 'DATAHUB Kofi Ventures',
        verificationStatus: VerificationStatus.VERIFIED,
        emailVerifiedAt: new Date(),
        wallet: { create: { availableBalance: money(1245.6), pendingBalance: money(0) } },
        storefront: {
          create: {
            slug: 'kwame-mensah',
            displayName: 'Kofi Data Shop',
            tagline: 'Fast. Reliable. Affordable data.',
            description: 'Premium data bundles for MTN, Telecel and AirtelTigo with instant delivery.',
            themeColor: '#7c3aed',
            contactEmail: 'kofi@datahubgh.com',
            contactPhone: '0551234567',
            visits: 1254,
            sales: 356,
            conversionRate: money(28.4),
          },
        },
      },
    });

    await tx.product.createMany({
      data: [
        { name: 'MTN 1GB Bundle', slug: 'mtn-1gb-bundle', description: 'Instant MTN 1GB bundle delivery.', dataSize: '1GB', sellingPrice: money(4.5), agentPrice: money(4.2), resellerPrice: money(4.0), buyingPrice: money(3.8), networkId: mtn.id, status: true },
        { name: 'MTN 2GB Bundle', slug: 'mtn-2gb-bundle', description: 'Instant MTN 2GB bundle delivery.', dataSize: '2GB', sellingPrice: money(7.0), agentPrice: money(6.7), resellerPrice: money(6.5), buyingPrice: money(6.1), networkId: mtn.id, status: true },
        { name: 'MTN 5GB Bundle', slug: 'mtn-5gb-bundle', description: 'Instant MTN 5GB bundle delivery.', dataSize: '5GB', sellingPrice: money(15.0), agentPrice: money(14.2), resellerPrice: money(13.8), buyingPrice: money(13.1), networkId: mtn.id, status: true },
        { name: 'MTN 10GB Bundle', slug: 'mtn-10gb-bundle', description: 'Instant MTN 10GB bundle delivery.', dataSize: '10GB', sellingPrice: money(28.0), agentPrice: money(27.2), resellerPrice: money(26.6), buyingPrice: money(25.4), networkId: mtn.id, status: true },
        { name: 'Telecel 1GB Bundle', slug: 'telecel-1gb-bundle', description: 'Instant Telecel 1GB bundle.', dataSize: '1GB', sellingPrice: money(4.9), agentPrice: money(4.6), resellerPrice: money(4.4), buyingPrice: money(4.1), networkId: telecel.id, status: true },
        { name: 'Telecel 2GB Bundle', slug: 'telecel-2gb-bundle', description: 'Instant Telecel 2GB bundle.', dataSize: '2GB', sellingPrice: money(7.9), agentPrice: money(7.4), resellerPrice: money(7.1), buyingPrice: money(6.8), networkId: telecel.id, status: true },
        { name: 'Telecel 5GB Bundle', slug: 'telecel-5gb-bundle', description: 'Instant Telecel 5GB bundle.', dataSize: '5GB', sellingPrice: money(16.5), agentPrice: money(15.9), resellerPrice: money(15.2), buyingPrice: money(14.7), networkId: telecel.id, status: true },
        { name: 'AirtelTigo 1GB Bundle', slug: 'airteltigo-1gb-bundle', description: 'Instant AirtelTigo 1GB bundle.', dataSize: '1GB', sellingPrice: money(4.7), agentPrice: money(4.4), resellerPrice: money(4.1), buyingPrice: money(3.9), networkId: airtelTigo.id, status: true },
        { name: 'AirtelTigo 2GB Bundle', slug: 'airteltigo-2gb-bundle', description: 'Instant AirtelTigo 2GB bundle.', dataSize: '2GB', sellingPrice: money(7.5), agentPrice: money(7.1), resellerPrice: money(6.8), buyingPrice: money(6.4), networkId: airtelTigo.id, status: true },
        { name: 'AirtelTigo 5GB Bundle', slug: 'airteltigo-5gb-bundle', description: 'Instant AirtelTigo 5GB bundle.', dataSize: '5GB', sellingPrice: money(15.8), agentPrice: money(15.1), resellerPrice: money(14.5), buyingPrice: money(13.9), networkId: airtelTigo.id, status: true },
      ],
    });

    await tx.provider.create({
      data: { name: 'Mock Provider Alpha', code: 'PROVIDER_ALPHA', status: ProviderStatus.ACTIVE, priority: 1, apiBaseUrl: 'https://mock-provider-alpha.local' },
    });

    await tx.webhook.create({
      data: { event: 'wallet.funded', url: 'https://webhook.site/mock-datahub', secret: 'whsec_demo', active: true },
    });

    console.log('[startup-seed] Seed complete. Admin and demo agent created.');
  });
}

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Password hashes
  const adminPassword = process.env.ADMIN_PASSWORD || "ChooseAStrongPassword123!";
  const adminEmail = process.env.ADMIN_EMAIL || "sherifbraimah1@gmail.com";
  const adminName = process.env.ADMIN_NAME || "Super Admin";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const userPasswordHash = await bcrypt.hash("UserPass123!", 10);
  const resellerPasswordHash = await bcrypt.hash("ResellerPass123!", 10);

  // 1. System Settings
  const defaultSettings: Record<string, string> = {
    order_processing_halted: "false",
    maintenance_mode_enabled: "false",
    allow_user_registration: "true",
    default_register_role: "RESELLER",
    signup_code_mode: "OPTIONAL",
    signup_fee_enabled: "false",
    signup_fee_amount: "10.00",
    login_otp_enabled: "false",
    secretary_login_without_otp: "true",
    secretary_allowed_pages: "/admin/orders,/admin/delivery-reports,/admin/mtn-verification",
    provider_routing_enabled: "true",
    provider_routing_auto_dispatch: "true",
    provider_routing_default: "PRIMARY_GATEWAY",
    provider_route_MTN: "MTN_DIRECT_API",
    provider_route_TELECEL: "TELECEL_EXPRESS",
    provider_route_AIRTELTIGO: "AT_ISHARE_GATEWAY",
    mtn_number_verification_enabled: "true",
    mtn_verification_instructions:
      "Please ensure your recipient MTN SIM is registered with a valid Ghana Card and is actively receiving network messages.",
    storefront_feature_enabled: "true",
    storefront_apply_enabled: "true",
    storefront_min_markup: "5",
    storefront_max_markup: "100",
    storefront_min_withdrawal: "20.00",
    storefront_max_withdrawal: "2000.00",
    paystack_topup_enabled: "true",
    paystack_min_topup: "5.00",
    paystack_max_topup: "5000.00",
    send_claim_enabled: "true",
    default_momo_number: "0240000000",
    reports_enabled: "true",
    report_not_received_window_hours: "24",
    site_name: "CleanDataPacks",
    site_announcement: "⚡ Welcome to CleanDataPacks! Instant automated telecom data dispatch across MTN, Telecel, and AirtelTigo.",
    support_whatsapp: "+233242075374",
    support_phone: "0242075374",
    support_email: "sherifbraimah1@gmail.com",
    support_telegram: "@cleandatapacks",
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  // 2. Pricing Profiles
  const retailProfile = await prisma.pricingProfile.upsert({
    where: { name: "Retail Standard" },
    update: {},
    create: {
      name: "Retail Standard",
      type: "RETAIL",
      active: true,
      isDefault: true,
    },
  });

  const resellerProfile = await prisma.pricingProfile.upsert({
    where: { name: "Reseller Preferred" },
    update: {},
    create: {
      name: "Reseller Preferred",
      type: "RESELLER",
      active: true,
      isDefault: false,
    },
  });

  // Tiers for profiles (price per GB)
  const tierMatrix = [
    { gb: 1, retail: 10.0, reseller: 8.5 },
    { gb: 2, retail: 20.0, reseller: 17.0 },
    { gb: 3, retail: 30.0, reseller: 25.5 },
    { gb: 5, retail: 50.0, reseller: 42.0 },
    { gb: 10, retail: 90.0, reseller: 80.0 },
    { gb: 20, retail: 180.0, reseller: 155.0 },
    { gb: 50, retail: 450.0, reseller: 385.0 },
    { gb: 100, retail: 880.0, reseller: 750.0 },
  ];

  for (const t of tierMatrix) {
    await prisma.priceTier.upsert({
      where: {
        profileId_gbAmount: {
          profileId: retailProfile.id,
          gbAmount: t.gb,
        },
      },
      update: { priceGHS: t.retail },
      create: {
        profileId: retailProfile.id,
        gbAmount: t.gb,
        priceGHS: t.retail,
      },
    });

    await prisma.priceTier.upsert({
      where: {
        profileId_gbAmount: {
          profileId: resellerProfile.id,
          gbAmount: t.gb,
        },
      },
      update: { priceGHS: t.reseller },
      create: {
        profileId: resellerProfile.id,
        gbAmount: t.gb,
        priceGHS: t.reseller,
      },
    });
  }

  // 3. Data Packages Catalog
  const packagesData = [
    // MTN
    { network: "MTN", name: "MTN 1GB Non-Expiry", gbAmount: 1, retailPriceGHS: 10.0, sortOrder: 1 },
    { network: "MTN", name: "MTN 2GB Non-Expiry", gbAmount: 2, retailPriceGHS: 20.0, sortOrder: 2 },
    { network: "MTN", name: "MTN 3GB Non-Expiry", gbAmount: 3, retailPriceGHS: 30.0, sortOrder: 3 },
    { network: "MTN", name: "MTN 5GB Non-Expiry", gbAmount: 5, retailPriceGHS: 50.0, sortOrder: 4 },
    { network: "MTN", name: "MTN 10GB Non-Expiry", gbAmount: 10, retailPriceGHS: 85.0, sortOrder: 5 },
    { network: "MTN", name: "MTN 20GB Non-Expiry", gbAmount: 20, retailPriceGHS: 165.0, sortOrder: 6 },
    { network: "MTN", name: "MTN 50GB Non-Expiry", gbAmount: 50, retailPriceGHS: 400.0, sortOrder: 7 },
    { network: "MTN", name: "MTN 100GB Non-Expiry", gbAmount: 100, retailPriceGHS: 780.0, sortOrder: 8 },

    // TELECEL
    { network: "TELECEL", name: "Telecel 1GB 30-Day", gbAmount: 1, retailPriceGHS: 9.5, sortOrder: 1 },
    { network: "TELECEL", name: "Telecel 2GB 30-Day", gbAmount: 2, retailPriceGHS: 18.5, sortOrder: 2 },
    { network: "TELECEL", name: "Telecel 5GB 30-Day", gbAmount: 5, retailPriceGHS: 45.0, sortOrder: 3 },
    { network: "TELECEL", name: "Telecel 10GB 30-Day", gbAmount: 10, retailPriceGHS: 80.0, sortOrder: 4 },
    { network: "TELECEL", name: "Telecel 20GB 30-Day", gbAmount: 20, retailPriceGHS: 155.0, sortOrder: 5 },

    // AIRTELTIGO
    { network: "AIRTELTIGO", name: "AirtelTigo 1GB iShare", gbAmount: 1, retailPriceGHS: 8.0, sortOrder: 1 },
    { network: "AIRTELTIGO", name: "AirtelTigo 2GB iShare", gbAmount: 2, retailPriceGHS: 16.0, sortOrder: 2 },
    { network: "AIRTELTIGO", name: "AirtelTigo 5GB iShare", gbAmount: 5, retailPriceGHS: 38.0, sortOrder: 3 },
    { network: "AIRTELTIGO", name: "AirtelTigo 10GB iShare", gbAmount: 10, retailPriceGHS: 72.0, sortOrder: 4 },
    { network: "AIRTELTIGO", name: "AirtelTigo 20GB iShare", gbAmount: 20, retailPriceGHS: 140.0, sortOrder: 5 },

    // AIRTELTIGO_BIGTIME
    { network: "AIRTELTIGO_BIGTIME", name: "AirtelTigo 10GB BigTime", gbAmount: 10, retailPriceGHS: 75.0, sortOrder: 1 },
    { network: "AIRTELTIGO_BIGTIME", name: "AirtelTigo 25GB BigTime", gbAmount: 25, retailPriceGHS: 175.0, sortOrder: 2 },
    { network: "AIRTELTIGO_BIGTIME", name: "AirtelTigo 50GB BigTime", gbAmount: 50, retailPriceGHS: 340.0, sortOrder: 3 },
  ];

  for (const pkg of packagesData) {
    await prisma.dataPackage.upsert({
      where: {
        network_gbAmount: {
          network: pkg.network,
          gbAmount: pkg.gbAmount,
        },
      },
      update: {
        name: pkg.name,
        retailPriceGHS: pkg.retailPriceGHS,
        sortOrder: pkg.sortOrder,
      },
      create: {
        network: pkg.network,
        name: pkg.name,
        gbAmount: pkg.gbAmount,
        retailPriceGHS: pkg.retailPriceGHS,
        sortOrder: pkg.sortOrder,
        providerProductId: `${pkg.network.toLowerCase()}_${pkg.gbAmount}gb`,
        active: true,
      },
    });
  }

  // 4. Users (Admin, Reseller, Retail User, Secretary)
  // Super Admin: balance 9,331.20 as in the reference screenshot!
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      email: adminEmail,
      name: adminName,
      passwordHash: adminPasswordHash,
      balance: 9331.20,
      role: "ADMIN",
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      status: "ACTIVE",
      balance: 9331.20,
      phone: "0240000000",
    },
  });

  // ── Cleanup: remove legacy @cleandatapacks.com demo accounts ──────────────────────
  // These are seed-only demo accounts with no real user data.
  // We do safe deletes — skip any that have FK-linked records (orders, etc.)
  const legacyDemoEmails = [
    "reseller@cleandatapacks.com",
    "secretary@cleandatapacks.com",
    "user@cleandatapacks.com",
  ];
  for (const legacyEmail of legacyDemoEmails) {
    try {
      await prisma.user.delete({ where: { email: legacyEmail } });
      console.log(`  Deleted legacy account: ${legacyEmail}`);
    } catch {
      // Has linked FK data or doesn't exist — skip silently
    }
  }

  // Migrate legacy admin@cleandatapacks.com → new email if no conflict exists
  const legacyAdmin = await prisma.user.findUnique({ where: { email: "admin@cleandatapacks.com" } });
  if (legacyAdmin) {
    const conflict = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!conflict) {
      // No conflict — just rename the old admin row
      await prisma.user.update({
        where: { email: "admin@cleandatapacks.com" },
        data: { email: adminEmail, name: adminName, passwordHash: adminPasswordHash, role: "ADMIN", status: "ACTIVE" },
      });
      console.log(`  Migrated admin: admin@cleandatapacks.com → ${adminEmail}`);
    } else {
      // New admin already exists — update its password and leave old row (has FK-linked orders)
      await prisma.user.update({
        where: { email: adminEmail },
        data: { passwordHash: adminPasswordHash, name: adminName, status: "ACTIVE" },
      });
      console.log(`  Updated existing admin: ${adminEmail}`);
    }
  }

  const reseller = await prisma.user.upsert({
    where: { email: "reseller@cleandatapacks.com" },
    update: {},
    create: {
      email: "reseller@cleandatapacks.com",
      name: "Kwame Reseller",
      passwordHash: resellerPasswordHash,
      role: "RESELLER",
      status: "ACTIVE",
      balance: 450.0,
      phone: "0241234567",
      pricingProfileId: resellerProfile.id,
    },
  });

  const secretary = await prisma.user.upsert({
    where: { email: "secretary@cleandatapacks.com" },
    update: {},
    create: {
      email: "secretary@cleandatapacks.com",
      name: "Ama Secretary",
      passwordHash: userPasswordHash,
      role: "SECRETARY",
      status: "ACTIVE",
      balance: 0.0,
      phone: "0501112233",
    },
  });

  const normalUser = await prisma.user.upsert({
    where: { email: "user@cleandatapacks.com" },
    update: {},
    create: {
      email: "user@cleandatapacks.com",
      name: "Kofi Mensah",
      passwordHash: userPasswordHash,
      role: "USER",
      status: "ACTIVE",
      balance: 65.0,
      phone: "0559876543",
      pricingProfileId: retailProfile.id,
    },
  });

  // 5. Send & Claim Settings
  await prisma.sendClaimSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      enabled: true,
      network: "MTN",
      momoNumber: "0244001122",
      accountName: "CleanDataPacks HQ",
      instructions: "Transfer to MTN MoMo 0244001122 (CleanDataPacks HQ), then enter your 10-12 digit Transaction ID below to claim your funds instantly.",
      minimumAmount: 1.0,
      maximumAmount: 5000.0,
      claimExpiryHours: 168,
    },
  });

  // 6. Whitelisted MTN Numbers
  const whitelist = [
    "0241234567",
    "0244556677",
    "0559876543",
    "0541122334",
    "0593344556",
    "0257788990",
  ];
  for (const num of whitelist) {
    await prisma.acceptedMtnNumber.upsert({
      where: { normalizedNumber: num },
      update: {},
      create: {
        number: num,
        normalizedNumber: num,
        source: "SEED",
        verifiedBy: admin.id,
      },
    });
  }

  // 7. Storefront for Reseller
  const storefront = await prisma.storefront.upsert({
    where: { slug: "loveagostore" },
    update: {},
    create: {
      userId: reseller.id,
      slug: "loveagostore",
      name: "LoveAgo Bundles & Telecom",
      description: "Fastest non-expiry data bundles in Accra and nationwide. Instant delivery within seconds!",
      phone: "0241234567",
      whatsapp: "+233241234567",
      whatsappGroupLink: "https://chat.whatsapp.com/samplegroup",
      payoutNetwork: "MTN",
      payoutNumber: "0241234567",
      payoutAccountName: "Kwame Reseller",
      status: "ENABLED",
      isActive: true,
      notice: "🎉 Weekend special discounts active! Orders dispatch automatically.",
      contactText: "Chat with Kwame on WhatsApp for custom bulk discounts.",
    },
  });

  // Storefront Wallet
  await prisma.storefrontWallet.upsert({
    where: { userId: reseller.id },
    update: {},
    create: {
      userId: reseller.id,
      balance: 14500, // 145.00 GHS in pesewas
      pendingBalance: 2500, // 25.00 GHS in pesewas
    },
  });

  // Storefront Products
  const mtn5gb = await prisma.dataPackage.findFirst({
    where: { network: "MTN", gbAmount: 5 },
  });
  const mtn10gb = await prisma.dataPackage.findFirst({
    where: { network: "MTN", gbAmount: 10 },
  });
  const tel5gb = await prisma.dataPackage.findFirst({
    where: { network: "TELECEL", gbAmount: 5 },
  });

  if (mtn5gb) {
    await prisma.storefrontProduct.upsert({
      where: {
        storefrontId_packageId: {
          storefrontId: storefront.id,
          packageId: mtn5gb.id,
        },
      },
      update: {},
      create: {
        storefrontId: storefront.id,
        packageId: mtn5gb.id,
        sellingPrice: 5500, // 55.00 GHS in pesewas
        isActive: true,
      },
    });
  }

  if (mtn10gb) {
    await prisma.storefrontProduct.upsert({
      where: {
        storefrontId_packageId: {
          storefrontId: storefront.id,
          packageId: mtn10gb.id,
        },
      },
      update: {},
      create: {
        storefrontId: storefront.id,
        packageId: mtn10gb.id,
        sellingPrice: 9500, // 95.00 GHS in pesewas
        isActive: true,
      },
    });
  }

  if (tel5gb) {
    await prisma.storefrontProduct.upsert({
      where: {
        storefrontId_packageId: {
          storefrontId: storefront.id,
          packageId: tel5gb.id,
        },
      },
      update: {},
      create: {
        storefrontId: storefront.id,
        packageId: tel5gb.id,
        sellingPrice: 5000,
        isActive: true,
      },
    });
  }

  // 8. Sample Single Orders with History
  const sampleOrders = [
    {
      phoneNumber: "0241234567",
      network: "MTN",
      gbAmount: 5,
      amount: 42.0,
      status: "SUCCESS",
      userId: reseller.id,
      completedAt: new Date(Date.now() - 3600000 * 3), // 3 hours ago
      provider: "MTN_DIRECT_API",
      providerReference: "MTN-TX-849201",
    },
    {
      phoneNumber: "0501112233",
      network: "TELECEL",
      gbAmount: 10,
      amount: 80.0,
      status: "SUCCESS",
      userId: reseller.id,
      completedAt: new Date(Date.now() - 3600000 * 8), // 8 hours ago
      provider: "TELECEL_EXPRESS",
      providerReference: "TEL-TX-109283",
    },
    {
      phoneNumber: "0559876543",
      network: "MTN",
      gbAmount: 2,
      amount: 17.0,
      status: "PROCESSING",
      userId: admin.id,
      provider: "MTN_DIRECT_API",
      providerReference: "MTN-TX-993812",
    },
    {
      phoneNumber: "0269988776",
      network: "AIRTELTIGO",
      gbAmount: 5,
      amount: 38.0,
      status: "PENDING",
      userId: normalUser.id,
    },
    {
      phoneNumber: "0245551122",
      network: "MTN",
      gbAmount: 1,
      amount: 10.0,
      status: "FAILED",
      userId: normalUser.id,
      failureReason: "Recipient SIM inactive or not registered",
    },
  ];

  for (const ord of sampleOrders) {
    const created = await prisma.order.create({
      data: {
        ...ord,
        source: "WEB",
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: created.id,
        status: ord.status,
        note: `Order initially placed and entered state ${ord.status}`,
        changedBy: "system",
      },
    });
  }

  // 9. Sample Delivery Report (Dispute)
  const firstCompletedOrder = await prisma.order.findFirst({
    where: { status: "SUCCESS" },
  });

  if (firstCompletedOrder) {
    const report = await prisma.deliveryReport.upsert({
      where: { seq: 1 },
      update: {},
      create: {
        seq: 1,
        orderId: firstCompletedOrder.id,
        userId: firstCompletedOrder.userId,
        reason: "Data not received",
        message: "Customer says they have not received bundle SMS or data credit after 2 hours.",
        status: "INVESTIGATING",
        adminNote: "Verifying with carrier logs.",
      },
    });

    await prisma.deliveryReportEvent.create({
      data: {
        reportId: report.id,
        type: "SUBMITTED",
        message: "Dispute opened by user",
        actorLabel: "user",
      },
    });

    await prisma.deliveryReportEvent.create({
      data: {
        reportId: report.id,
        type: "INVESTIGATION_STARTED",
        message: "Staff commenced telecom trace",
        actorLabel: "admin",
      },
    });
  }

  // 10. Sample Incoming MoMo SMS
  await prisma.incomingMomoTransaction.upsert({
    where: { transactionReference: "28491827401" },
    update: {},
    create: {
      transactionReference: "28491827401",
      network: "MTN",
      amount: 150.0,
      senderPhone: "0241234567",
      recipientPhone: "0244001122",
      rawSms: "Payment received for GHS 150.00 from 0241234567 - KWAME RESELLER. Current Balance: GHS 1,450.20. Reference: 28491827401. Financial Transaction Id: 28491827401.",
      status: "AVAILABLE",
    },
  });

  // 11. Sample Signup Code
  await prisma.signupCode.upsert({
    where: { code: "VIP2026" },
    update: {},
    create: {
      code: "VIP2026",
      status: "ACTIVE",
      maxUses: 100,
      usageCount: 1,
      notes: "Promo VIP onboarding code",
    },
  });

  console.log("Database successfully seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

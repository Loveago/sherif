import { prisma } from "@/lib/prisma";
import { resolveUserWholesalePrice } from "@/lib/orders";

/**
 * Generate a clean, attractive affiliate referral code.
 * e.g. "FELIX482" or "AGENT7192"
 */
export function generateAffiliateCode(name?: string): string {
  let prefix = "AGT";
  if (name) {
    const clean = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
    if (clean.length >= 3) {
      prefix = clean.slice(0, 5);
    }
  }
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomSuffix}`;
}

/**
 * Ensure a user has an affiliate code assigned.
 * If not, generates a unique code and persists it.
 */
export async function ensureUserAffiliateCode(
  userId: string,
  name?: string,
  client: any = prisma
): Promise<string> {
  const existing = await client.user.findUnique({
    where: { id: userId },
    select: { affiliateCode: true, name: true },
  });

  if (existing?.affiliateCode) {
    return existing.affiliateCode;
  }

  let code = generateAffiliateCode(name || existing?.name);
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    const check = await client.user.findUnique({
      where: { affiliateCode: code },
      select: { id: true },
    });
    if (!check) {
      isUnique = true;
    } else {
      code = generateAffiliateCode(name || existing?.name);
      attempts++;
    }
  }

  await client.user.update({
    where: { id: userId },
    data: { affiliateCode: code },
  });

  return code;
}

export interface DistributeCommissionInput {
  originOrderId: number;
  userId: string; // The user whose account placed or originated the order
  packageId?: string | null;
  gbAmount: number;
  network: string;
  amount: number; // Wholesale/settlement amount paid by this user
}

/**
 * Distribute cascading affiliate commissions up the referrer hierarchy.
 * Commissions are credited to the separate Affiliate Wallet (affiliateBalance),
 * keeping them isolated from the user's primary operating wallet.
 */
export async function distributeAffiliateCommissions(
  tx: any,
  input: DistributeCommissionInput
): Promise<Array<{ beneficiaryId: string; amount: number; tierLevel: number }>> {
  if (!input.userId || !input.amount || input.amount <= 0) {
    return [];
  }

  // 1. Resolve package
  let pkg: { id: string; gbAmount: number; network: string; retailPriceGHS?: number | null } | null = null;
  if (input.packageId) {
    pkg = await tx.dataPackage.findUnique({
      where: { id: input.packageId },
      select: { id: true, gbAmount: true, network: true, retailPriceGHS: true },
    });
  }
  if (!pkg && input.network && input.gbAmount) {
    pkg = await tx.dataPackage.findUnique({
      where: {
        network_gbAmount: {
          network: input.network.toUpperCase(),
          gbAmount: input.gbAmount,
        },
      },
      select: { id: true, gbAmount: true, network: true, retailPriceGHS: true },
    });
  }

  if (!pkg) {
    return [];
  }

  // 2. Fetch origin user to check parent referrer
  const originUser = await tx.user.findUnique({
    where: { id: input.userId },
    select: { id: true, referredById: true },
  });

  if (!originUser?.referredById) {
    return []; // No upline agent
  }

  // Direct parent referral only (cascading removed per policy)
  const parent = await tx.user.findUnique({
    where: { id: originUser.referredById },
    select: { id: true, name: true, email: true, balance: true, affiliateBalance: true },
  });

  if (!parent) return [];

  // What is parent agent's wholesale cost for this package?
  const parentCost = await resolveUserWholesalePrice(parent.id, pkg, 0, tx);

  // Parent's profit is the margin between what the sub-agent paid and parent's wholesale cost
  const profit = Math.round((input.amount - parentCost) * 100) / 100;

  if (profit > 0) {
    // 1. Credit parent's separate Affiliate Wallet (affiliateBalance)
    await tx.user.update({
      where: { id: parent.id },
      data: { affiliateBalance: { increment: profit } },
    });

    // 2. Record AffiliateCommission record
    await tx.affiliateCommission.create({
      data: {
        beneficiaryId: parent.id,
        sourceUserId: input.userId,
        originOrderId: input.originOrderId,
        packageId: pkg.id,
        amount: profit,
        subAgentCost: input.amount,
        agentCost: parentCost,
        tierLevel: 1,
        status: "PAID",
      },
    });

    return [{
      beneficiaryId: parent.id,
      amount: profit,
      tierLevel: 1,
    }];
  }

  return [];
}

/**
 * Reverse affiliate commissions when an order is cancelled or refunded.
 * Debits from the separate Affiliate Wallet (affiliateBalance).
 */
export async function reverseAffiliateCommissions(
  tx: any,
  originOrderId: number
): Promise<number> {
  const commissions = await tx.affiliateCommission.findMany({
    where: { originOrderId, status: "PAID" },
  });

  if (!commissions || commissions.length === 0) return 0;

  let totalReversed = 0;

  for (const c of commissions) {
    // Deduct the credited commission from beneficiary's affiliate wallet balance
    await tx.user.update({
      where: { id: c.beneficiaryId },
      data: { affiliateBalance: { decrement: c.amount } },
    });

    // Mark commission as REVERSED
    await tx.affiliateCommission.update({
      where: { id: c.id },
      data: { status: "REVERSED" },
    });

    totalReversed += c.amount;
  }

  return totalReversed;
}

/**
 * Fetch overview data for agent's affiliate dashboard.
 */
export async function getAgentAffiliateOverview(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, affiliateCode: true, balance: true, affiliateBalance: true },
  });

  if (!user) throw new Error("User not found");

  const affiliateCode = await ensureUserAffiliateCode(userId, user.name);

  // Direct sub-agents
  const subAgents = await prisma.user.findMany({
    where: { referredById: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      role: true,
      _count: {
        select: { orders: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Total commissions earned
  const commissionAgg = await prisma.affiliateCommission.aggregate({
    where: {
      beneficiaryId: userId,
      status: "PAID",
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  // Recent commission transactions
  const recentCommissions = await prisma.affiliateCommission.findMany({
    where: { beneficiaryId: userId },
    include: {
      sourceUser: {
        select: { name: true, email: true },
      },
      originOrder: {
        select: { id: true, network: true, gbAmount: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  // Withdrawals history
  const withdrawals = await prisma.affiliateWithdrawal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const approvedWithdrawalsAgg = await prisma.affiliateWithdrawal.aggregate({
    where: { userId, status: "APPROVED" },
    _sum: { amount: true },
  });

  const pendingWithdrawal = await prisma.affiliateWithdrawal.findFirst({
    where: { userId, status: "PENDING" },
  });

  return {
    affiliateCode,
    affiliateBalance: user.affiliateBalance ?? 0,
    mainBalance: user.balance ?? 0,
    directSubAgentsCount: subAgents.length,
    totalCommissionsEarned: commissionAgg._sum.amount ?? 0,
    totalCommissionsCount: commissionAgg._count.id ?? 0,
    totalWithdrawn: approvedWithdrawalsAgg._sum.amount ?? 0,
    hasPendingWithdrawal: Boolean(pendingWithdrawal),
    pendingWithdrawalAmount: pendingWithdrawal?.amount ?? 0,
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      amount: w.amount,
      fee: w.fee,
      netAmount: w.netAmount,
      payoutMethod: w.payoutMethod,
      network: w.network,
      momoNumber: w.momoNumber,
      accountName: w.accountName,
      status: w.status,
      reference: w.reference,
      note: w.note,
      adminNote: w.adminNote,
      createdAt: w.createdAt,
    })),
    subAgents: subAgents.map((sa) => ({
      id: sa.id,
      name: sa.name,
      email: sa.email,
      phone: sa.phone,
      joinedAt: sa.createdAt,
      orderCount: sa._count.orders,
    })),
    recentCommissions: recentCommissions.map((c) => ({
      id: c.id,
      amount: c.amount,
      subAgentCost: c.subAgentCost,
      agentCost: c.agentCost,
      tierLevel: c.tierLevel,
      status: c.status,
      createdAt: c.createdAt,
      sourceUserName: c.sourceUser?.name || "Sub-agent",
      orderId: c.originOrderId,
      network: c.originOrder?.network,
      gbAmount: c.originOrder?.gbAmount,
    })),
  };
}

export interface RequestWithdrawalInput {
  amount: number;
  payoutMethod: "MOMO" | "MAIN_WALLET";
  network?: string;
  momoNumber?: string;
  accountName?: string;
}

/**
 * Handle agent withdrawal request from their separate Affiliate Wallet.
 */
export async function requestAffiliateWithdrawal(
  userId: string,
  input: RequestWithdrawalInput
) {
  const amount = Math.round(input.amount * 100) / 100;
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Invalid withdrawal amount.");
  }

  const minWithdrawal = 5.0; // Minimum 5 GHS
  if (amount < minWithdrawal) {
    throw new Error(`Minimum withdrawal is GHS ${minWithdrawal.toFixed(2)}.`);
  }

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, balance: true, affiliateBalance: true, email: true },
    });

    if (!user) throw new Error("User not found.");

    if (user.affiliateBalance < amount) {
      throw new Error(
        `Insufficient affiliate balance. Available: GHS ${user.affiliateBalance.toFixed(2)}, Requested: GHS ${amount.toFixed(2)}.`
      );
    }

    if (input.payoutMethod === "MAIN_WALLET") {
      // 1. Instant transfer to main operating wallet:
      // Decrement affiliate balance
      await tx.user.update({
        where: { id: userId },
        data: {
          affiliateBalance: { decrement: amount },
          balance: { increment: amount },
        },
      });

      // 2. Create approved AffiliateWithdrawal record
      const withdrawal = await tx.affiliateWithdrawal.create({
        data: {
          userId,
          amount,
          fee: 0,
          netAmount: amount,
          payoutMethod: "MAIN_WALLET",
          status: "APPROVED",
          reference: `TRF-${Date.now().toString(36).toUpperCase()}`,
          note: "Instant transfer to main operating balance",
          processedBy: "system",
          processedAt: new Date(),
        },
      });

      // 3. Ledger record for the primary operating wallet
      await tx.walletTransaction.create({
        data: {
          userId,
          type: "TOPUP",
          amount,
          status: "APPROVED",
          reference: `affiliate_trf:${withdrawal.id}`,
          note: `Transfer from Affiliate Wallet (Ref #${withdrawal.reference})`,
        },
      });

      return withdrawal;
    } else {
      // Mobile Money payout request
      if (!input.network || !input.momoNumber || !input.accountName) {
        throw new Error("Network, Mobile Money number, and Account name are required for MoMo payouts.");
      }

      // Check if user has an active pending withdrawal
      const existingPending = await tx.affiliateWithdrawal.findFirst({
        where: { userId, status: "PENDING" },
      });

      if (existingPending) {
        throw new Error("You already have a pending withdrawal awaiting review.");
      }

      // Deduct immediately from affiliate balance into escrow
      await tx.user.update({
        where: { id: userId },
        data: { affiliateBalance: { decrement: amount } },
      });

      const withdrawal = await tx.affiliateWithdrawal.create({
        data: {
          userId,
          amount,
          fee: 0,
          netAmount: amount,
          payoutMethod: "MOMO",
          network: input.network.toUpperCase(),
          momoNumber: input.momoNumber.trim(),
          accountName: input.accountName.trim(),
          status: "PENDING",
          reference: `AFF-WD-${Date.now().toString(36).toUpperCase()}`,
          note: `MoMo withdrawal request to ${input.network} (${input.momoNumber})`,
        },
      });

      return withdrawal;
    }
  });
}

/**
 * Admin action: Approve MoMo affiliate withdrawal.
 */
export async function approveAffiliateWithdrawal(
  withdrawalId: string,
  adminLabel: string
) {
  const row = await prisma.affiliateWithdrawal.findUnique({
    where: { id: withdrawalId },
  });

  if (!row) throw new Error("Withdrawal request not found.");
  if (row.status !== "PENDING") throw new Error(`Withdrawal is already ${row.status}.`);

  return await prisma.affiliateWithdrawal.update({
    where: { id: withdrawalId },
    data: {
      status: "APPROVED",
      processedBy: adminLabel,
      processedAt: new Date(),
    },
  });
}

/**
 * Admin action: Reject MoMo affiliate withdrawal and refund back to affiliate wallet.
 */
export async function rejectAffiliateWithdrawal(
  withdrawalId: string,
  reason: string,
  adminLabel: string
) {
  return await prisma.$transaction(async (tx) => {
    const row = await tx.affiliateWithdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!row) throw new Error("Withdrawal request not found.");
    if (row.status !== "PENDING") throw new Error(`Withdrawal is already ${row.status}.`);

    // Refund amount back to affiliate balance
    await tx.user.update({
      where: { id: row.userId },
      data: { affiliateBalance: { increment: row.amount } },
    });

    return await tx.affiliateWithdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: "REJECTED",
        adminNote: reason || "Rejected by administrator",
        processedBy: adminLabel,
        processedAt: new Date(),
      },
    });
  });
}

/**
 * Fetch the agent's wholesale price sheet and configured sub-agent markup.
 */
export async function getAgentAffiliatePricingSheet(userId: string) {
  const packages = await prisma.dataPackage.findMany({
    where: { active: true },
    orderBy: [{ network: "asc" }, { gbAmount: "asc" }],
  });

  const customPrices = await prisma.affiliatePackagePrice.findMany({
    where: { agentId: userId },
  });

  const priceMap = new Map(customPrices.map((cp) => [cp.packageId, cp.priceGHS]));

  const pricingSheet = await Promise.all(
    packages.map(async (pkg) => {
      // What the agent themselves pays for this package
      const agentCost = await resolveUserWholesalePrice(userId, pkg);
      const configuredPrice = priceMap.get(pkg.id) ?? null;
      const subAgentWholesalePrice = configuredPrice ?? agentCost;
      const profitMargin = Math.round((subAgentWholesalePrice - agentCost) * 100) / 100;

      return {
        packageId: pkg.id,
        network: pkg.network,
        name: pkg.name,
        gbAmount: pkg.gbAmount,
        retailPriceGHS: pkg.retailPriceGHS,
        agentCost,
        subAgentWholesalePrice,
        profitMargin,
        isCustomized: configuredPrice !== null,
      };
    })
  );

  return pricingSheet;
}

/**
 * Save custom wholesale pricing for direct sub-agents.
 */
export async function saveAgentAffiliatePricingSheet(
  userId: string,
  prices: Array<{ packageId: string; priceGHS: number }>
) {
  const results: any[] = [];

  for (const item of prices) {
    if (typeof item.priceGHS !== "number" || isNaN(item.priceGHS)) continue;

    // Verify package exists
    const pkg = await prisma.dataPackage.findUnique({
      where: { id: item.packageId },
    });
    if (!pkg) continue;

    const agentCost = await resolveUserWholesalePrice(userId, pkg);

    // Ensure price is at least agent's wholesale cost to prevent selling at a loss
    const safePrice = Math.max(agentCost, Math.round(item.priceGHS * 100) / 100);

    const upserted = await prisma.affiliatePackagePrice.upsert({
      where: {
        agentId_packageId: {
          agentId: userId,
          packageId: item.packageId,
        },
      },
      update: {
        priceGHS: safePrice,
      },
      create: {
        agentId: userId,
        packageId: item.packageId,
        priceGHS: safePrice,
      },
    });

    results.push(upserted);
  }

  return results;
}

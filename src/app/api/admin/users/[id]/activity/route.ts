import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { handleRouteError, apiError } from "@/lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();
    const { id: userId } = await params;

    // 1. Fetch user base profile with relations
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        balance: true,
        affiliateBalance: true,
        affiliateCode: true,
        createdAt: true,
        lastLoginAt: true,
        pricingProfile: {
          select: { id: true, name: true, type: true },
        },
        parentAgent: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
        storefront: {
          select: { id: true, name: true, slug: true, status: true },
        },
        storefrontWallet: {
          select: { balance: true, pendingBalance: true },
        },
        _count: {
          select: {
            subAgents: true,
            orders: true,
            walletTransactions: true,
            affiliateCommissions: true,
          },
        },
      },
    });

    if (!user) {
      return apiError(404, "User not found");
    }

    // 2. Aggregate financial wallet ledger stats
    const [
      topupsAgg,
      refundsAgg,
      adjCreditAgg,
      adjDebitAgg,
      debitsAgg,
      commissionsAgg,
    ] = await Promise.all([
      prisma.walletTransaction.aggregate({
        where: { userId, type: "TOPUP", status: "APPROVED" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.walletTransaction.aggregate({
        where: { userId, type: "REFUND", status: "APPROVED" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.walletTransaction.aggregate({
        where: { userId, type: "ADJUSTMENT", status: "APPROVED", amount: { gt: 0 } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.walletTransaction.aggregate({
        where: { userId, type: "ADJUSTMENT", status: "APPROVED", amount: { lt: 0 } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.walletTransaction.aggregate({
        where: { userId, type: "DEBIT", status: "APPROVED" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.affiliateCommission.aggregate({
        where: { beneficiaryId: userId, status: "PAID" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const totalTopups = topupsAgg._sum.amount ?? 0;
    const totalRefunds = refundsAgg._sum.amount ?? 0;
    const totalAdjCredits = adjCreditAgg._sum.amount ?? 0;
    const totalAdjDebits = Math.abs(adjDebitAgg._sum.amount ?? 0);
    const totalDebits = debitsAgg._sum.amount ?? 0;

    const totalIn = Number((totalTopups + totalRefunds + totalAdjCredits).toFixed(2));
    const totalOut = Number((totalDebits + totalAdjDebits).toFixed(2));
    const netFlow = Number((totalIn - totalOut).toFixed(2));
    const isReconciled = Math.abs(user.balance - netFlow) < 0.05;

    // 3. Aggregate sales & orders stats
    const [
      totalOrdersCount,
      successOrdersCount,
      failedOrdersCount,
      processingOrdersCount,
      successSalesAgg,
      networkGroups,
      channelGroups,
    ] = await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.order.count({ where: { userId, status: "SUCCESS" } }),
      prisma.order.count({ where: { userId, status: "FAILED" } }),
      prisma.order.count({ where: { userId, status: { in: ["PENDING", "PROCESSING"] } } }),
      prisma.order.aggregate({
        where: { userId, status: "SUCCESS" },
        _sum: { amount: true, gbAmount: true },
      }),
      prisma.order.groupBy({
        by: ["network"],
        where: { userId },
        _count: { _all: true },
        _sum: { amount: true, gbAmount: true },
      }),
      prisma.order.groupBy({
        by: ["source"],
        where: { userId },
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);

    const totalSpend = successSalesAgg._sum.amount ?? 0;
    const totalGb = successSalesAgg._sum.gbAmount ?? 0;
    const successRate = totalOrdersCount > 0 ? Math.round((successOrdersCount / totalOrdersCount) * 100) : 0;

    // 4. Fetch recent wallet transactions (up to 50)
    const walletTransactions = await prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        sendClaim: {
          select: {
            id: true,
            transactionReference: true,
            senderPhone: true,
            status: true,
          },
        },
      },
    });

    // 5. Fetch recent orders (up to 50)
    const recentOrders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        phoneNumber: true,
        network: true,
        gbAmount: true,
        amount: true,
        status: true,
        source: true,
        externalReference: true,
        createdAt: true,
        dataPackage: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        balance: user.balance,
        affiliateBalance: user.affiliateBalance,
        affiliateCode: user.affiliateCode,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        pricingProfile: user.pricingProfile,
        parentAgent: user.parentAgent,
        subAgentsCount: user._count.subAgents,
        ordersCount: user._count.orders,
        storefront: user.storefront,
        storefrontWallet: user.storefrontWallet,
        totalCommissionsEarned: commissionsAgg._sum.amount ?? 0,
      },
      financialStats: {
        balance: user.balance,
        totalIn,
        totalOut,
        netFlow,
        isReconciled,
        totalTopups,
        topupsCount: topupsAgg._count._all ?? 0,
        totalDebits,
        debitsCount: debitsAgg._count._all ?? 0,
        totalRefunds,
        refundsCount: refundsAgg._count._all ?? 0,
        totalAdjCredits,
        totalAdjDebits,
      },
      salesStats: {
        totalOrdersCount,
        successOrdersCount,
        failedOrdersCount,
        processingOrdersCount,
        successRate,
        totalSpend,
        totalGb,
        networks: networkGroups.map((g) => ({
          network: g.network,
          count: g._count._all,
          amount: g._sum.amount ?? 0,
          gbAmount: g._sum.gbAmount ?? 0,
        })),
        channels: channelGroups.map((g) => ({
          source: g.source,
          count: g._count._all,
          amount: g._sum.amount ?? 0,
        })),
      },
      transactions: walletTransactions,
      orders: recentOrders,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

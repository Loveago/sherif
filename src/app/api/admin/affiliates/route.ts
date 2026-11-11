import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError, apiError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    // 1. Overall Affiliate Stats
    const [
      totalSubAgents,
      commissionsAgg,
      pendingWithdrawalsAgg,
      approvedWithdrawalsAgg,
    ] = await Promise.all([
      prisma.user.count({
        where: { referredById: { not: null } },
      }),
      prisma.affiliateCommission.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.affiliateWithdrawal.aggregate({
        where: { status: "PENDING" },
        _sum: { amount: true, netAmount: true },
        _count: { id: true },
      }),
      prisma.affiliateWithdrawal.aggregate({
        where: { status: "APPROVED" },
        _sum: { amount: true, netAmount: true },
        _count: { id: true },
      }),
    ]);

    // 2. Build where filter for Main Affiliates
    // Main affiliates are users who have an affiliateCode OR have referred at least 1 sub-agent
    const where: any = {
      OR: [
        { affiliateCode: { not: null } },
        { subAgents: { some: {} } },
      ],
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { affiliateCode: { contains: search, mode: "insensitive" } },
            {
              subAgents: {
                some: {
                  OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        },
      ];
    }

    const affiliates = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        affiliateCode: true,
        affiliateBalance: true,
        createdAt: true,
        _count: {
          select: {
            subAgents: true,
            affiliatePrices: true,
            affiliateCommissions: true,
          },
        },
        subAgents: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            balance: true,
            createdAt: true,
            _count: {
              select: {
                orders: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        affiliateCommissions: {
          where: { status: "PAID" },
          select: {
            amount: true,
          },
        },
      },
      orderBy: [
        { subAgents: { _count: "desc" } },
        { affiliateBalance: "desc" },
        { createdAt: "desc" },
      ],
      take: 100,
    });

    const totalMainAffiliates = await prisma.user.count({ where });

    // Format affiliates response with calculated totals
    const formattedAffiliates = affiliates.map((a) => {
      const totalEarned = a.affiliateCommissions.reduce((sum, c) => sum + c.amount, 0);
      return {
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        role: a.role,
        status: a.status,
        affiliateCode: a.affiliateCode,
        affiliateBalance: Math.round(a.affiliateBalance * 100) / 100,
        createdAt: a.createdAt.toISOString(),
        subAgentsCount: a._count.subAgents,
        customPricesCount: a._count.affiliatePrices,
        totalCommissionsEarned: Math.round(totalEarned * 100) / 100,
        subAgents: a.subAgents.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          role: s.role,
          status: s.status,
          balance: s.balance,
          ordersCount: s._count.orders,
          createdAt: s.createdAt.toISOString(),
        })),
      };
    });

    return NextResponse.json({
      stats: {
        totalMainAffiliates,
        totalSubAgents,
        totalCommissionsEarned: Math.round((commissionsAgg._sum.amount || 0) * 100) / 100,
        totalCommissionsCount: commissionsAgg._count.id || 0,
        pendingWithdrawalsCount: pendingWithdrawalsAgg._count.id || 0,
        pendingWithdrawalsAmount: Math.round((pendingWithdrawalsAgg._sum.amount || 0) * 100) / 100,
        approvedWithdrawalsAmount: Math.round((approvedWithdrawalsAgg._sum.amount || 0) * 100) / 100,
      },
      affiliates: formattedAffiliates,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

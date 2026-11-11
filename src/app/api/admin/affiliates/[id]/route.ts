import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError, apiError } from "@/lib/api-helpers";
import { resolveUserWholesalePrice } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const affiliate = await prisma.user.findUnique({
      where: { id },
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
              select: { orders: true },
            },
            orders: {
              where: { status: { in: ["SUCCESS", "PROCESSING", "PENDING"] } },
              select: { amount: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        affiliatePrices: {
          include: {
            package: {
              select: {
                id: true,
                name: true,
                network: true,
                gbAmount: true,
                retailPriceGHS: true,
              },
            },
          },
        },
        affiliateCommissions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            sourceUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        affiliateWithdrawals: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!affiliate) {
      return apiError(404, "Affiliate agent not found.");
    }

    // Resolve base wholesale costs for each package in the custom price sheet
    const pricingSheet = await Promise.all(
      affiliate.affiliatePrices.map(async (ap) => {
        const baseCost = await resolveUserWholesalePrice(affiliate.id, ap.package, 0);
        const margin = Math.round((ap.priceGHS - baseCost) * 100) / 100;
        return {
          packageId: ap.packageId,
          packageName: ap.package.name,
          network: ap.package.network,
          gbAmount: ap.package.gbAmount,
          retailPrice: ap.package.retailPriceGHS,
          agentBaseCost: baseCost,
          subAgentWholesalePrice: ap.priceGHS,
          agentProfitMargin: margin,
          updatedAt: ap.updatedAt.toISOString(),
        };
      })
    );

    const formattedSubAgents = affiliate.subAgents.map((s) => {
      const totalSpend = s.orders.reduce((sum, o) => sum + o.amount, 0);
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        role: s.role,
        status: s.status,
        balance: s.balance,
        ordersCount: s._count.orders,
        totalSpend: Math.round(totalSpend * 100) / 100,
        createdAt: s.createdAt.toISOString(),
      };
    });

    const totalCommissionsEarned = affiliate.affiliateCommissions.reduce(
      (sum, c) => sum + c.amount,
      0
    );

    return NextResponse.json({
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone,
        role: affiliate.role,
        status: affiliate.status,
        affiliateCode: affiliate.affiliateCode,
        affiliateBalance: Math.round(affiliate.affiliateBalance * 100) / 100,
        totalCommissionsEarned: Math.round(totalCommissionsEarned * 100) / 100,
        createdAt: affiliate.createdAt.toISOString(),
        subAgentsCount: formattedSubAgents.length,
        subAgents: formattedSubAgents,
        pricingSheet,
        commissions: affiliate.affiliateCommissions.map((c) => ({
          id: c.id,
          amount: c.amount,
          sourceUserName: c.sourceUser.name,
          sourceUserEmail: c.sourceUser.email,
          subAgentCost: c.subAgentCost,
          agentCost: c.agentCost,
          status: c.status,
          createdAt: c.createdAt.toISOString(),
        })),
        withdrawals: affiliate.affiliateWithdrawals.map((w) => ({
          id: w.id,
          amount: w.amount,
          netAmount: w.netAmount,
          status: w.status,
          reference: w.reference,
          payoutMethod: w.payoutMethod,
          network: w.network,
          momoNumber: w.momoNumber,
          createdAt: w.createdAt.toISOString(),
          processedAt: w.processedAt?.toISOString() || null,
        })),
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

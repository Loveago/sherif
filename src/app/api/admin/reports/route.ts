import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-helpers";
import { getSetting } from "@/lib/orders";

function parseDateParam(str: string | null, endOfDay = false): Date | null {
  if (!str) return null;
  const trimmed = str.trim();
  // YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    if (endOfDay) {
      return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    }
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(request: NextRequest) {
  try {
    await requireStaff();
    const { searchParams } = new URL(request.url);

    const specificDate = searchParams.get("date")?.trim();
    const network = searchParams.get("network")?.trim() || "ALL";
    const status = searchParams.get("status")?.trim() || "ALL";
    const source = searchParams.get("source")?.trim() || "ALL";
    const tzOffsetMinutes = parseInt(searchParams.get("tzOffset") || "0", 10);

    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (specificDate) {
      fromDate = parseDateParam(specificDate, false);
      toDate = parseDateParam(specificDate, true);
    } else {
      fromDate = parseDateParam(searchParams.get("from"), false);
      toDate = parseDateParam(searchParams.get("to"), true) || new Date();
    }

    const maxDays = parseInt(await getSetting("reports_max_date_range_days", "180"), 10);
    const maxMs = maxDays * 24 * 60 * 60 * 1000;

    if (!fromDate) {
      fromDate = new Date((toDate?.getTime() ?? Date.now()) - 90 * 24 * 60 * 60 * 1000);
    }

    if (toDate && fromDate && toDate.getTime() - fromDate.getTime() > maxMs + 172800000) {
      // Gracefully cap instead of failing
      fromDate = new Date(toDate.getTime() - maxMs);
    }

    // Live business orders: exclude developer test sandbox orders
    const where: Record<string, any> = {
      isSandbox: false,
    };

    const createdAtFilter: Record<string, Date> = {};
    if (fromDate) createdAtFilter.gte = fromDate;
    if (toDate) createdAtFilter.lte = toDate;
    if (Object.keys(createdAtFilter).length > 0) {
      where.createdAt = createdAtFilter;
    }

    if (network !== "ALL") where.network = network;
    if (status !== "ALL") where.status = status;
    if (source !== "ALL") where.source = source;

    // For statusCounts breakdown: include all statuses within the same date/network/source filter
    const statusCountsWhere = { ...where };
    delete statusCountsWhere.status;

    const [statusGroups, networkGroups, dailyOrders, byPackage, userGroups] = await Promise.all([
      // 1. Group by status for complete counts, spend, and data volume
      prisma.order.groupBy({
        by: ["status"],
        where: statusCountsWhere,
        _count: { _all: true },
        _sum: { amount: true, gbAmount: true },
      }),
      // 2. Network breakdown
      prisma.order.groupBy({
        by: ["network", "status"],
        where: statusCountsWhere,
        _count: { _all: true },
        _sum: { amount: true, gbAmount: true },
      }),
      // 3. Orders for timeline aggregation
      prisma.order.findMany({
        where,
        select: { createdAt: true, amount: true, gbAmount: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
      // 4. Package popularity breakdown (fulfilled packages when status is ALL)
      prisma.order.groupBy({
        by: ["network", "gbAmount"],
        where: {
          ...where,
          ...(status === "ALL" ? { status: "SUCCESS" } : {}),
        },
        _count: { _all: true },
        _sum: { amount: true },
        orderBy: [{ network: "asc" }, { gbAmount: "asc" }],
      }),
      // 5. Top customers by spend
      prisma.order.groupBy({
        by: ["userId"],
        where: {
          ...where,
          ...(status === "ALL" ? { status: "SUCCESS" } : {}),
        },
        _sum: { amount: true, gbAmount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 15,
      }),
    ]);

    // Aggregate status counts & financial metrics
    const statusCounts: Record<string, number> = {};
    const statusDetails: Record<string, { count: number; amount: number; gbAmount: number }> = {};
    let totalAllOrders = 0;
    let totalAllSpend = 0;
    let totalAllGb = 0;

    for (const sg of statusGroups) {
      const c = sg._count._all;
      const a = Number(sg._sum.amount || 0);
      const gb = Number(sg._sum.gbAmount || 0);
      statusCounts[sg.status] = c;
      statusDetails[sg.status] = { count: c, amount: a, gbAmount: gb };
      totalAllOrders += c;
      totalAllSpend += a;
      totalAllGb += gb;
    }

    const successfulOrders = statusCounts["SUCCESS"] || 0;
    const failedOrders = statusCounts["FAILED"] || 0;
    const processingOrders = statusCounts["PROCESSING"] || 0;
    const pendingOrders = statusCounts["PENDING"] || 0;
    const cancelledOrders = statusCounts["CANCELLED"] || 0;
    const refundedOrders = statusCounts["REFUNDED"] || 0;

    // Accurate total orders count matching current filter selection
    const totalOrders = status !== "ALL" ? (statusCounts[status] || 0) : totalAllOrders;

    // Completed revenue (settled revenue from SUCCESS orders, or selected status volume)
    const totalRevenue =
      status !== "ALL"
        ? (statusDetails[status]?.amount || 0)
        : (statusDetails["SUCCESS"]?.amount || 0);

    // In-flight pending funds awaiting provider response
    const pendingRevenue =
      (statusDetails["PROCESSING"]?.amount || 0) + (statusDetails["PENDING"]?.amount || 0);

    // Total delivered data volume (GB)
    const totalGb =
      status !== "ALL"
        ? (statusDetails[status]?.gbAmount || 0)
        : (statusDetails["SUCCESS"]?.gbAmount || 0);

    const successRate = totalOrders > 0 ? Math.round((successfulOrders / totalOrders) * 100) : 0;
    const aov = successfulOrders > 0 ? totalRevenue / successfulOrders : 0;

    // Network breakdown cards
    const networkMap = new Map<
      string,
      {
        network: string;
        totalOrders: number;
        successfulOrders: number;
        failedOrders: number;
        revenue: number;
        gbAmount: number;
      }
    >();

    for (const ng of networkGroups) {
      const net = ng.network;
      const entry = networkMap.get(net) || {
        network: net,
        totalOrders: 0,
        successfulOrders: 0,
        failedOrders: 0,
        revenue: 0,
        gbAmount: 0,
      };
      const c = ng._count._all;
      const a = Number(ng._sum.amount || 0);
      const gb = Number(ng._sum.gbAmount || 0);
      entry.totalOrders += c;
      if (ng.status === "SUCCESS") {
        entry.successfulOrders += c;
        entry.revenue += a;
        entry.gbAmount += gb;
      } else if (ng.status === "FAILED") {
        entry.failedOrders += c;
      }
      networkMap.set(net, entry);
    }

    const networks = Array.from(networkMap.values()).map((n) => ({
      ...n,
      revenue: Number(n.revenue.toFixed(2)),
      gbAmount: Number(n.gbAmount.toFixed(1)),
      successRate: n.totalOrders > 0 ? Math.round((n.successfulOrders / n.totalOrders) * 100) : 0,
    }));

    // Timeline Aggregation (hourly for single day, continuous daily for multi-day)
    const isSingleDay = Boolean(
      fromDate && toDate && toDate.getTime() - fromDate.getTime() <= 26 * 60 * 60 * 1000
    );

    const dailyMap = new Map<string, { count: number; successCount: number; amount: number; gbAmount: number }>();

    if (isSingleDay) {
      for (let h = 0; h < 24; h++) {
        const hh = String(h).padStart(2, "0") + ":00";
        dailyMap.set(hh, { count: 0, successCount: 0, amount: 0, gbAmount: 0 });
      }
      for (const o of dailyOrders) {
        const orderDate = new Date(o.createdAt);
        const localTime =
          tzOffsetMinutes !== 0
            ? new Date(orderDate.getTime() - tzOffsetMinutes * 60000)
            : orderDate;
        const hh = `${String(localTime.getUTCHours()).padStart(2, "0")}:00`;
        const entry = dailyMap.get(hh) ?? { count: 0, successCount: 0, amount: 0, gbAmount: 0 };
        entry.count += 1;
        const isCountedRevenue = status !== "ALL" || o.status === "SUCCESS";
        if (o.status === "SUCCESS") {
          entry.successCount += 1;
        }
        if (isCountedRevenue) {
          entry.amount += Number(o.amount || 0);
          entry.gbAmount += Number(o.gbAmount || 0);
        }
        dailyMap.set(hh, entry);
      }
    } else {
      // Pre-fill continuous calendar days to prevent gaps in charts
      if (fromDate && toDate) {
        const cur = new Date(fromDate.getTime());
        const end = new Date(toDate.getTime());
        while (cur <= end) {
          const dayStr = cur.toISOString().slice(0, 10);
          if (!dailyMap.has(dayStr)) {
            dailyMap.set(dayStr, { count: 0, successCount: 0, amount: 0, gbAmount: 0 });
          }
          cur.setUTCDate(cur.getUTCDate() + 1);
        }
      }

      for (const o of dailyOrders) {
        const orderDate = new Date(o.createdAt);
        const localTime =
          tzOffsetMinutes !== 0
            ? new Date(orderDate.getTime() - tzOffsetMinutes * 60000)
            : orderDate;
        const dayStr = localTime.toISOString().slice(0, 10);
        const entry = dailyMap.get(dayStr) ?? { count: 0, successCount: 0, amount: 0, gbAmount: 0 };
        entry.count += 1;
        const isCountedRevenue = status !== "ALL" || o.status === "SUCCESS";
        if (o.status === "SUCCESS") {
          entry.successCount += 1;
        }
        if (isCountedRevenue) {
          entry.amount += Number(o.amount || 0);
          entry.gbAmount += Number(o.gbAmount || 0);
        }
        dailyMap.set(dayStr, entry);
      }
    }

    const daily = Array.from(dailyMap.entries()).map(([day, val]) => ({
      day,
      count: val.count,
      successCount: val.successCount,
      amount: Number(val.amount.toFixed(2)),
      gbAmount: Number(val.gbAmount.toFixed(1)),
    }));

    // Top spenders details with live wallet balance & contact info
    const userIds = userGroups.map((g) => g.userId).filter(Boolean);
    const userProfiles =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              status: true,
              balance: true,
            },
          })
        : [];
    const userMap = new Map(userProfiles.map((u) => [u.id, u]));

    // Query total orders placed (across all statuses) by these users in the same range
    const userTotalGroups =
      userIds.length > 0
        ? await prisma.order.groupBy({
            by: ["userId"],
            where: {
              ...where,
              userId: { in: userIds },
            },
            _count: { _all: true },
          })
        : [];
    const totalOrdersMap = new Map(userTotalGroups.map((tg) => [tg.userId, tg._count._all]));

    const top = userGroups.map((g) => {
      const profile = userMap.get(g.userId);
      const completedOrders = g._count._all;
      const allOrders = totalOrdersMap.get(g.userId) ?? completedOrders;
      return {
        id: g.userId,
        name: profile?.name || "Unknown User",
        email: profile?.email || "",
        phone: profile?.phone || null,
        role: profile?.role || "USER",
        status: profile?.status || "ACTIVE",
        balance: Number(profile?.balance ?? 0),
        orders: completedOrders,
        totalOrders: allOrders,
        spend: Number(Number(g._sum.amount ?? 0).toFixed(2)),
        gbAmount: Number(Number(g._sum.gbAmount ?? 0).toFixed(1)),
      };
    });

    return NextResponse.json({
      statusCounts,
      statusDetails,
      totalOrders,
      successfulOrders,
      failedOrders,
      processingOrders,
      pendingOrders,
      cancelledOrders,
      refundedOrders,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      pendingRevenue: Number(pendingRevenue.toFixed(2)),
      totalGb: Number(totalGb.toFixed(1)),
      successRate,
      aov: Number(aov.toFixed(2)),
      networks,
      daily,
      byPackage: byPackage.map((b) => ({
        network: b.network,
        gbAmount: b.gbAmount,
        count: (b as any)._count?._all ?? 0,
        amount: Number(Number((b as any)._sum?.amount ?? 0).toFixed(2)),
      })),
      topUsers: top,
      filter: {
        from: fromDate?.toISOString(),
        to: toDate?.toISOString(),
        isSingleDay,
        network,
        status,
        source,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}



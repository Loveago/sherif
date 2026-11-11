import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { handleRouteError, apiError } from "@/lib/api-helpers";

interface HourlyBucket {
  key: string;
  label: string;
  amount: number;
  gbAmount: number;
  count: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function parseDateParam(str: string | null, endOfDay = false): Date | null {
  if (!str) return null;
  const trimmed = str.trim();
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();
    const { id: userId } = await context.params;

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
        createdAt: true,
        pricingProfile: {
          select: { id: true, name: true, type: true },
        },
        storefront: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
        storefrontWallet: {
          select: {
            balance: true,
            pendingBalance: true,
          },
        },
      },
    });

    if (!user) {
      return apiError(404, "User not found");
    }

    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get("mode") || "day").toLowerCase(); // "day" | "month" | "year" | "range"
    const dateParam = searchParams.get("date"); // YYYY-MM-DD
    const monthParam = searchParams.get("month"); // "10" or "2026-10"
    const yearParam = searchParams.get("year"); // "2026"
    const fromParam = searchParams.get("from"); // ISO string or YYYY-MM-DD
    const toParam = searchParams.get("to"); // ISO string or YYYY-MM-DD
    const tzOffsetMinutes = parseInt(searchParams.get("tzOffset") || "0", 10); // client timezone offset

    let fromDate: Date;
    let toDate: Date;
    let periodLabel = "";
    let timeline: HourlyBucket[] = [];

    const now = new Date();

    if (mode === "day") {
      let targetDate: Date;
      if (dateParam) {
        fromDate = parseDateParam(dateParam, false) || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        toDate = parseDateParam(dateParam, true) || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        targetDate = fromDate;
      } else if (fromParam && toParam) {
        fromDate = parseDateParam(fromParam, false) || new Date();
        toDate = parseDateParam(toParam, true) || new Date();
        targetDate = fromDate;
      } else {
        fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        targetDate = fromDate;
      }

      const isToday =
        targetDate.getFullYear() === now.getFullYear() &&
        targetDate.getMonth() === now.getMonth() &&
        targetDate.getDate() === now.getDate();

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday =
        targetDate.getFullYear() === yesterday.getFullYear() &&
        targetDate.getMonth() === yesterday.getMonth() &&
        targetDate.getDate() === yesterday.getDate();

      const dayStr = targetDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      periodLabel = isToday ? `Today (${dayStr})` : isYesterday ? `Yesterday (${dayStr})` : dayStr;

      // 24-hour timeline buckets
      for (let h = 0; h < 24; h++) {
        const hourStr = String(h).padStart(2, "0") + ":00";
        const ampm = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
        timeline.push({
          key: hourStr,
          label: ampm,
          amount: 0,
          gbAmount: 0,
          count: 0,
        });
      }
    } else if (mode === "month") {
      let targetYear = now.getFullYear();
      let targetMonth = now.getMonth(); // 0-indexed

      if (monthParam) {
        if (monthParam.includes("-")) {
          const parts = monthParam.split("-").map(Number);
          targetYear = parts[0];
          targetMonth = parts[1] - 1;
        } else {
          targetMonth = parseInt(monthParam, 10) - 1;
        }
      }
      if (yearParam && !monthParam?.includes("-")) {
        targetYear = parseInt(yearParam, 10);
      }

      if (fromParam && toParam) {
        fromDate = new Date(fromParam);
        toDate = new Date(toParam);
      } else {
        fromDate = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
        // last day of month
        toDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
      }

      periodLabel = `${MONTH_NAMES[targetMonth] || "Month"} ${targetYear}`;

      // Daily timeline buckets for each day of the month
      const daysInMonth = toDate.getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        timeline.push({
          key,
          label: `${MONTH_SHORT[targetMonth]} ${d}`,
          amount: 0,
          gbAmount: 0,
          count: 0,
        });
      }
    } else if (mode === "year") {
      const targetYear = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

      if (fromParam && toParam) {
        fromDate = new Date(fromParam);
        toDate = new Date(toParam);
      } else {
        fromDate = new Date(targetYear, 0, 1, 0, 0, 0, 0);
        toDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);
      }

      periodLabel = `Year ${targetYear}`;

      // 12 monthly timeline buckets
      for (let m = 0; m < 12; m++) {
        timeline.push({
          key: `${targetYear}-${String(m + 1).padStart(2, "0")}`,
          label: MONTH_SHORT[m],
          amount: 0,
          gbAmount: 0,
          count: 0,
        });
      }
    } else {
      // mode === "range"
      fromDate = parseDateParam(fromParam, false) || new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      toDate = parseDateParam(toParam, true) || new Date();

      const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
      const fromLabel = fromDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const toLabel = toDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      periodLabel = `${fromLabel} – ${toLabel}`;

      if (diffDays <= 35) {
        // Daily buckets
        const cur = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
        const end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
        while (cur <= end) {
          const y = cur.getFullYear();
          const m = cur.getMonth();
          const d = cur.getDate();
          const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          timeline.push({
            key,
            label: `${MONTH_SHORT[m]} ${d}`,
            amount: 0,
            gbAmount: 0,
            count: 0,
          });
          cur.setDate(cur.getDate() + 1);
        }
      } else {
        // Monthly buckets for longer ranges
        const cur = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
        const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
        while (cur <= end) {
          const y = cur.getFullYear();
          const m = cur.getMonth();
          const key = `${y}-${String(m + 1).padStart(2, "0")}`;
          timeline.push({
            key,
            label: `${MONTH_SHORT[m]} '${String(y).slice(2)}`,
            amount: 0,
            gbAmount: 0,
            count: 0,
          });
          cur.setMonth(cur.getMonth() + 1);
        }
      }
    }

    const networkParam = searchParams.get("network")?.trim() || "ALL";
    const statusParam = searchParams.get("status")?.trim() || "ALL";
    const sourceParam = searchParams.get("source")?.trim() || "ALL";

    // Build Prisma where clause
    const orderWhere: Prisma.OrderWhereInput = {
      userId,
      isSandbox: false,
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    };

    if (networkParam !== "ALL") {
      orderWhere.network = networkParam;
    }
    if (statusParam !== "ALL") {
      orderWhere.status = statusParam;
    }
    if (sourceParam !== "ALL") {
      orderWhere.source = sourceParam;
    }

    // For status breakdown: always group all statuses within this range/network/source
    const statusCountsWhere: Prisma.OrderWhereInput = { ...orderWhere };
    delete statusCountsWhere.status;

    // Execute queries concurrently
    const [
      statusGroups,
      networkGroups,
      sourceGroups,
      topPackages,
      timelineOrders,
      recentOrders,
      storefrontSales,
    ] = await Promise.all([
      // 1. Group by status
      prisma.order.groupBy({
        by: ["status"],
        where: statusCountsWhere,
        _count: { _all: true },
        _sum: { amount: true, gbAmount: true },
      }),
      // 2. Group by network for SUCCESS orders
      prisma.order.groupBy({
        by: ["network"],
        where: { ...orderWhere, status: "SUCCESS" },
        _count: { _all: true },
        _sum: { amount: true, gbAmount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      // 3. Group by source (WEB vs API) for SUCCESS orders
      prisma.order.groupBy({
        by: ["source"],
        where: { ...orderWhere, status: "SUCCESS" },
        _count: { _all: true },
        _sum: { amount: true, gbAmount: true },
      }),
      // 4. Top packages purchased
      prisma.order.groupBy({
        by: ["network", "gbAmount"],
        where: { ...orderWhere, status: "SUCCESS" },
        _count: { _all: true },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 8,
      }),
      // 5. Orders for timeline (SUCCESS only)
      prisma.order.findMany({
        where: { ...orderWhere, status: "SUCCESS" },
        select: {
          createdAt: true,
          amount: true,
          gbAmount: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      // 6. Recent orders sample in this period
      prisma.order.findMany({
        where: orderWhere,
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
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      // 7. Storefront sales if user has a storefront
      user.storefront
        ? prisma.storefrontOrder.aggregate({
            where: {
              storefrontId: user.storefront.id,
              createdAt: { gte: fromDate, lte: toDate },
              status: "COMPLETED",
            },
            _count: { _all: true },
            _sum: {
              sellingPrice: true,
              commission: true,
            },
          })
        : null,
    ]);

    // Aggregate summary numbers
    let totalRevenue = 0;
    let totalGb = 0;
    let successfulOrdersCount = 0;
    let totalOrdersCount = 0;

    const statusBreakdown: Record<string, { count: number; amount: number; gbAmount: number }> = {};
    for (const sg of statusGroups) {
      const count = sg._count._all;
      const amount = Number(sg._sum.amount || 0);
      const gb = Number(sg._sum.gbAmount || 0);
      statusBreakdown[sg.status] = { count, amount, gbAmount: gb };
      totalOrdersCount += count;

      if (sg.status === "SUCCESS") {
        totalRevenue = amount;
        totalGb = gb;
        successfulOrdersCount = count;
      }
    }

    if (statusParam !== "ALL") {
      totalOrdersCount = statusBreakdown[statusParam]?.count || 0;
      totalRevenue = statusBreakdown[statusParam]?.amount || 0;
      totalGb = statusBreakdown[statusParam]?.gbAmount || 0;
      successfulOrdersCount = statusParam === "SUCCESS" ? totalOrdersCount : 0;
    }

    const averageOrderValue = successfulOrdersCount > 0 ? totalRevenue / successfulOrdersCount : 0;
    const successRate = totalOrdersCount > 0 ? (successfulOrdersCount / totalOrdersCount) * 100 : 0;

    // Populate timeline buckets
    const bucketMap = new Map<string, HourlyBucket>();
    for (const b of timeline) {
      bucketMap.set(b.key, b);
    }

    for (const o of timelineOrders) {
      const orderDate = new Date(o.createdAt);
      // Adjust with client tzOffset if needed
      const localTime = tzOffsetMinutes !== 0
        ? new Date(orderDate.getTime() - tzOffsetMinutes * 60000)
        : orderDate;

      let key = "";
      if (mode === "day") {
        const hour = localTime.getHours();
        key = String(hour).padStart(2, "0") + ":00";
      } else if (mode === "month") {
        key = `${localTime.getFullYear()}-${String(localTime.getMonth() + 1).padStart(2, "0")}-${String(localTime.getDate()).padStart(2, "0")}`;
      } else if (mode === "year") {
        key = `${localTime.getFullYear()}-${String(localTime.getMonth() + 1).padStart(2, "0")}`;
      } else {
        // range
        if (timeline.length > 0 && timeline[0].key.length === 10) {
          key = `${localTime.getFullYear()}-${String(localTime.getMonth() + 1).padStart(2, "0")}-${String(localTime.getDate()).padStart(2, "0")}`;
        } else {
          key = `${localTime.getFullYear()}-${String(localTime.getMonth() + 1).padStart(2, "0")}`;
        }
      }

      const target = bucketMap.get(key);
      if (target) {
        target.amount += Number(o.amount);
        target.gbAmount += Number(o.gbAmount);
        target.count += 1;
      }
    }

    // Format networks
    const networks = networkGroups.map((ng) => {
      const amt = Number(ng._sum.amount || 0);
      return {
        network: ng.network,
        count: ng._count._all,
        amount: amt,
        gbAmount: Number(ng._sum.gbAmount || 0),
        percentage: totalRevenue > 0 ? Math.round((amt / totalRevenue) * 100) : 0,
      };
    });

    // Format channels/sources
    const channels = sourceGroups.map((sg) => ({
      source: sg.source,
      count: sg._count._all,
      amount: Number(sg._sum.amount || 0),
      gbAmount: Number(sg._sum.gbAmount || 0),
    }));

    // Format storefront details if present
    const storefront = user.storefront
      ? {
          id: user.storefront.id,
          name: user.storefront.name,
          slug: user.storefront.slug,
          status: user.storefront.status,
          completedOrders: storefrontSales?._count?._all ?? 0,
          salesGHS: Number(storefrontSales?._sum?.sellingPrice ?? 0) / 100,
          commissionGHS: Number(storefrontSales?._sum?.commission ?? 0) / 100,
        }
      : null;

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        balance: Number(user.balance || 0),
        pricingProfile: user.pricingProfile,
        createdAt: user.createdAt,
      },
      storefrontWallet: user.storefrontWallet
        ? {
            balance: Number(user.storefrontWallet.balance || 0) / 100,
            pendingBalance: Number(user.storefrontWallet.pendingBalance || 0) / 100,
          }
        : null,
      period: {
        mode,
        label: periodLabel,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      summary: {
        totalRevenue,
        totalGb,
        successfulOrdersCount,
        totalOrdersCount,
        successRate: Math.round(successRate * 10) / 10,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        statusBreakdown,
      },
      networks,
      channels,
      storefront,
      timeline,
      topPackages: topPackages.map((p) => ({
        network: p.network,
        gbAmount: p.gbAmount,
        count: p._count._all,
        amount: Number(p._sum.amount || 0),
      })),
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        phoneNumber: o.phoneNumber,
        network: o.network,
        gbAmount: o.gbAmount,
        amount: o.amount,
        status: o.status,
        source: o.source,
        externalReference: o.externalReference,
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

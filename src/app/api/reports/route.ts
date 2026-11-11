import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-helpers";

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
    const user = await requireUser();
    const { searchParams } = new URL(request.url);

    const specificDate = searchParams.get("date")?.trim();
    const network = searchParams.get("network")?.trim() || "ALL";
    const status = searchParams.get("status")?.trim() || "ALL";
    const source = searchParams.get("source")?.trim() || "ALL";

    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (specificDate) {
      fromDate = parseDateParam(specificDate, false);
      toDate = parseDateParam(specificDate, true);
    } else {
      fromDate = parseDateParam(searchParams.get("from"), false);
      toDate = parseDateParam(searchParams.get("to"), true) || new Date();
    }

    const where: Record<string, any> = { userId: user.id };
    const createdAtFilter: Record<string, Date> = {};
    if (fromDate) createdAtFilter.gte = fromDate;
    if (toDate) createdAtFilter.lte = toDate;
    if (Object.keys(createdAtFilter).length > 0) {
      where.createdAt = createdAtFilter;
    }

    if (network !== "ALL") where.network = network;
    if (status !== "ALL") where.status = status;
    if (source !== "ALL") where.source = source;

    // For status breakdown: keep all statuses within the same date/network/source filter
    const statusCountsWhere = { ...where };
    delete statusCountsWhere.status;

    const [statusCounts, spendAgg, dailyOrders, byPackage] = await Promise.all([
      prisma.order.groupBy({
        by: ["status"],
        where: statusCountsWhere,
        _count: { _all: true },
      }),
      prisma.order.aggregate({
        where: {
          ...where,
          status: status !== "ALL" ? status : { in: ["SUCCESS", "PROCESSING", "PENDING"] },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.order.findMany({
        where,
        select: { createdAt: true, amount: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.order.groupBy({
        by: ["network", "gbAmount"],
        where,
        _count: { _all: true },
        _sum: { amount: true },
        orderBy: [{ network: "asc" }, { gbAmount: "asc" }],
      }),
    ]);

    const counts: Record<string, number> = {};
    for (const s of statusCounts) counts[s.status] = s._count._all;

    const isSingleDay = Boolean(
      fromDate && toDate && toDate.getTime() - fromDate.getTime() <= 26 * 60 * 60 * 1000
    );

    const dailyMap = new Map<string, { count: number; amount: number }>();
    if (isSingleDay) {
      for (let h = 0; h < 24; h++) {
        const hh = String(h).padStart(2, "0") + ":00";
        dailyMap.set(hh, { count: 0, amount: 0 });
      }
      for (const o of dailyOrders) {
        const hh = `${String(o.createdAt.getUTCHours()).padStart(2, "0")}:00`;
        const entry = dailyMap.get(hh) ?? { count: 0, amount: 0 };
        entry.count += 1;
        entry.amount += o.amount;
        dailyMap.set(hh, entry);
      }
    } else {
      for (const o of dailyOrders) {
        const day = o.createdAt.toISOString().slice(0, 10);
        const entry = dailyMap.get(day) ?? { count: 0, amount: 0 };
        entry.count += 1;
        entry.amount += o.amount;
        dailyMap.set(day, entry);
      }
    }

    const daily = Array.from(dailyMap.entries()).map(([day, val]) => ({
      day,
      count: val.count,
      amount: val.amount,
    }));

    return NextResponse.json({
      statusCounts: counts,
      totalOrders: spendAgg._count._all,
      totalSpend: spendAgg._sum.amount ?? 0,
      daily,
      byPackage: byPackage.map((b) => ({
        network: b.network,
        gbAmount: b.gbAmount,
        count: b._count._all,
        amount: b._sum.amount ?? 0,
      })),
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


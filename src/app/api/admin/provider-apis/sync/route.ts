import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { syncTskconnectOrder, syncTskconnectDispute, syncBigwindataOrder, syncGhconnectOrder, syncBigwinTelecelOrder } from "@/lib/provider-apis/router";
import { handleRouteError } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireStaff();

    const inFlightOrders = await prisma.order.findMany({
      where: {
        status: { in: ["PENDING", "PROCESSING"] },
        OR: [
          { providerReference: { startsWith: "TSKCONNECT:" } },
          { providerReference: { startsWith: "BIGWIN:" } },
          { providerReference: { startsWith: "GHC:" } },
          { providerReference: { startsWith: "BWTEL:" } },
        ],
      },
      take: 100,
      orderBy: { updatedAt: "asc" },
    });

    let updated = 0;
    let checked = 0;
    const results: Array<{ orderId: number; status: string; changed: boolean }> = [];

    for (const order of inFlightOrders) {
      checked++;
      let res: { changed: boolean; newStatus?: string; error?: string };
      if (order.providerReference?.startsWith("TSKCONNECT:")) {
        res = await syncTskconnectOrder(order, `Manual sync by ${actor.email}`, { forceCheck: true });
      } else if (order.providerReference?.startsWith("BWTEL:")) {
        res = await syncBigwinTelecelOrder(order, `Manual sync by ${actor.email}`, { forceCheck: true });
      } else if (order.providerReference?.startsWith("GHC:")) {
        res = await syncGhconnectOrder(order, `Manual sync by ${actor.email}`, { forceCheck: true });
      } else if (order.providerReference?.startsWith("BIGWIN:")) {
        res = await syncBigwindataOrder(order, `Manual sync by ${actor.email}`, { forceCheck: true });
      } else {
        res = { changed: false };
      }
      if (res.changed) updated++;
      results.push({
        orderId: order.id,
        status: res.newStatus || (res.error ? `Error: ${res.error}` : order.status),
        changed: res.changed,
      });
    }

    // Sync active Not Received delivery reports with Tskconnect
    const activeReports = await prisma.deliveryReport.findMany({
      where: {
        status: { in: ["UNDER_REVIEW", "OPEN", "INVESTIGATING"] },
        order: { providerReference: { startsWith: "TSKCONNECT:" } },
      },
      include: {
        order: { select: { id: true, providerReference: true, externalReference: true } },
      },
      take: 20,
    });

    let reportsSynced = 0;
    for (const report of activeReports) {
      if (report.order) {
        const syncDisputeRes = await syncTskconnectDispute(report.order, report.id);
        if (syncDisputeRes.updated) reportsSynced++;
      }
    }

    return NextResponse.json({
      success: true,
      checked,
      updated,
      reportsChecked: activeReports.length,
      reportsSynced,
      results,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

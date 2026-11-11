import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleRouteError, apiError } from "@/lib/api-helpers";
import { storefrontTrackSchema } from "@/lib/validation";
import {
  getEnabledStorefrontBySlug,
  fromPesewas,
  storefrontOrderCode,
  verifyAndSettleStorefrontOrder,
} from "@/lib/storefront";
import { sanitizeCustomerRefundNote } from "@/lib/types";

interface TrackParams {
  query: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}

async function handleTracking(
  request: NextRequest,
  params: Promise<{ slug: string }>,
  input: TrackParams
) {
  try {
    const { slug } = await params;
    const storefront = await getEnabledStorefrontBySlug(slug);
    if (!storefront || storefront.status !== "ENABLED") {
      return apiError(404, "Store not found");
    }

    const q = (input.query || "").trim();
    if (!q) {
      return apiError(400, "Please enter a phone number or order reference to track.");
    }

    const digits = q.replace(/\D/g, "");
    const isPhone = !/[a-zA-Z]/.test(q) && digits.length >= 9;
    let where: Prisma.StorefrontOrderWhereInput;

    // Date range filter resolution
    let dateFilter: { gte?: Date; lte?: Date } | undefined;
    if (input.startDate && input.endDate) {
      dateFilter = {
        gte: new Date(`${input.startDate}T00:00:00.000Z`),
        lte: new Date(`${input.endDate}T23:59:59.999Z`),
      };
    } else if (input.date) {
      dateFilter = {
        gte: new Date(`${input.date}T00:00:00.000Z`),
        lte: new Date(`${input.date}T23:59:59.999Z`),
      };
    } else if (input.startDate) {
      dateFilter = {
        gte: new Date(`${input.startDate}T00:00:00.000Z`),
      };
    } else if (input.endDate) {
      dateFilter = {
        lte: new Date(`${input.endDate}T23:59:59.999Z`),
      };
    }

    if (isPhone) {
      const last9 = digits.slice(-9);
      const localPhone = "0" + last9;
      where = {
        storefrontId: storefront.id,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        OR: [
          { customerPhone: { contains: last9 } },
          { customerPhone: localPhone },
          { customerPhone: q },
          { underlyingOrder: { is: { phoneNumber: { contains: last9 } } } },
          { underlyingOrder: { is: { phoneNumber: localPhone } } },
        ],
      };
    } else if (/^(?:CT|CDI|CF|TSK)-ST-\d{1,6}$/i.test(q) || (/^\d{1,6}$/.test(q) && digits.length <= 6)) {
      const seq = Number(q.replace(/^(?:CT|CDI|CF|TSK)-ST-/i, "").replace(/^0+(?=\d)/, ""));
      where = {
        storefrontId: storefront.id,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        OR: [
          { seq },
          { paymentReference: { contains: q.toUpperCase() } },
        ],
      };
    } else if (q.includes("@")) {
      where = {
        storefrontId: storefront.id,
        customerEmail: { equals: q.trim().toLowerCase() },
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      };
    } else {
      where = {
        storefrontId: storefront.id,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        OR: [
          { paymentReference: { contains: q.toUpperCase() } },
          { paymentReference: q },
          { customerEmail: { contains: q } },
        ],
      };
    }

    const [reportsEnabledSetting, windowHoursSetting] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: "reports_enabled" } }),
      prisma.systemSetting.findUnique({ where: { key: "report_not_received_window_hours" } }),
    ]);
    const reportsEnabled = reportsEnabledSetting?.value !== "false";
    const windowHours = parseInt(windowHoursSetting?.value || "24", 10);

    const orders = await prisma.storefrontOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        product: { include: { dataPackage: true } },
        underlyingOrder: {
          select: {
            id: true,
            status: true,
            providerReference: true,
            updatedAt: true,
            completedAt: true,
            createdAt: true,
            deliveryReports: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                seq: true,
                status: true,
                reason: true,
                proofImageMime: true,
                adminNote: true,
                adminResponse: true,
                respondedAt: true,
                resolvedAt: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    // Self-healing: if any returned order is still unsettled, verify with Paystack
    const formattedOrders = await Promise.all(
      orders.map(async (o) => {
        let displayStatus = o.status;
        let hasUnderlying = Boolean(o.underlyingOrder);

        if (!hasUnderlying) {
          const autoSettle = await verifyAndSettleStorefrontOrder(o.paymentReference);
          if (autoSettle.settled) {
            displayStatus = "PENDING";
            hasUnderlying = true;
          }
        } else if (o.underlyingOrder) {
          if (
            (o.underlyingOrder.status === "PENDING" || o.underlyingOrder.status === "PROCESSING") &&
            o.underlyingOrder.providerReference?.startsWith("TSKCONNECT:") &&
            Date.now() - new Date(o.underlyingOrder.updatedAt).getTime() > 120000
          ) {
            try {
              const { syncTskconnectOrder } = await import("@/lib/provider-apis/router");
              const syncRes = await syncTskconnectOrder(o.underlyingOrder, "Storefront Track Sync");
              if (syncRes.changed && syncRes.newStatus) {
                o.underlyingOrder.status = syncRes.newStatus;
              }
            } catch (syncErr) {
              console.error("Storefront track sync error:", syncErr);
            }
          }
          displayStatus =
            o.underlyingOrder.status === "SUCCESS" ? "COMPLETED" : o.underlyingOrder.status;
        }

        const isCompleted = displayStatus === "COMPLETED" || displayStatus === "SUCCESS";
        const latestReport = o.underlyingOrder?.deliveryReports?.[0] ?? null;
        const activeReportStatuses = ["OPEN", "UNDER_REVIEW", "INVESTIGATING"];
        const hasActiveReport = latestReport ? activeReportStatuses.includes(latestReport.status) : false;

        const completedTime = o.completedAt ?? o.underlyingOrder?.completedAt ?? o.underlyingOrder?.updatedAt ?? o.updatedAt;
        const withinWindow =
          completedTime &&
          Date.now() - new Date(completedTime).getTime() <= windowHours * 3600 * 1000;
        const canReport = Boolean(reportsEnabled && isCompleted && !hasActiveReport && withinWindow);

        return {
          code: o.paymentReference || storefrontOrderCode(o.seq, o.paymentReference),
          reference: o.paymentReference,
          phone: o.customerPhone,
          phoneNumber: o.customerPhone,
          recipient: o.customerPhone,
          email: o.customerEmail,
          network: o.product.dataPackage.network,
          size: `${o.product.dataPackage.gbAmount}GB`,
          gbAmount: o.product.dataPackage.gbAmount,
          packageName: o.product.dataPackage.name,
          amount: fromPesewas(o.sellingPrice),
          price: fromPesewas(o.sellingPrice),
          status: displayStatus,
          createdAt: o.createdAt.toISOString(),
          canReport,
          deliveryReport: latestReport
            ? {
                id: latestReport.id,
                seq: latestReport.seq,
                code: `NR-${String(latestReport.seq).padStart(5, "0")}`,
                status: latestReport.status,
                reason: latestReport.reason,
                adminResponse: sanitizeCustomerRefundNote(latestReport.adminResponse, fromPesewas(o.sellingPrice)),
                hasProof: Boolean(latestReport.proofImageMime),
                createdAt: latestReport.createdAt.toISOString(),
              }
            : null,
        };
      })
    );

    return NextResponse.json({
      orders: formattedOrders,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const input = storefrontTrackSchema.parse(body);
    return await handleTracking(request, params, input);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || searchParams.get("query") || "";
  const date = searchParams.get("date") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  return await handleTracking(request, params, { query, date, startDate, endDate });
}

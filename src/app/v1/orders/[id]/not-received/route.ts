import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  validateApiAuth,
  formatApiSuccess,
  formatApiError,
  logApiRequestEntry,
  ApiError,
} from "@/lib/developer-api";
import { deriveCompletedAt } from "@/lib/orders";
import {
  ACTIVE_DELIVERY_REPORT_STATUSES,
  deliveryReportCode,
  isWithinReportWindow,
  sanitizeCustomerRefundNote,
  toExternalDisputeStatus,
} from "@/lib/types";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key, X-Request-ID",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * Helper to resolve an Order from an ID parameter (supports API-12345, 12345, or batch codes)
 */
async function resolveTargetOrder(id: string, userId: string, isSandbox: boolean, body?: any) {
  const upperId = id.trim().toUpperCase();
  const candidateBatchCode = upperId.replace(/^API-/, "").trim();

  // Check if ID matches an OrderBatch
  const batch = await prisma.orderBatch.findFirst({
    where: {
      OR: [
        { batchCode: candidateBatchCode },
        { id: id.trim() },
      ],
      userId,
    },
    include: {
      orders: {
        where: { isSandbox },
        orderBy: { id: "asc" },
      },
    },
  });

  if (batch && batch.orders.length > 0) {
    // If a specific entry or number was requested
    if (body?.entryId || body?.entryNumber || body?.recipient || body?.number) {
      const matchRecipient = String(body?.recipient || body?.number || "").trim();
      const matchEntryId = String(body?.entryId || body?.entryNumber || "").trim();

      const matched = batch.orders.find((o) => {
        if (matchRecipient && o.phoneNumber.includes(matchRecipient)) return true;
        if (matchEntryId && String(o.id) === matchEntryId) return true;
        return false;
      });
      if (matched) return matched;
    }

    // Default to the first completed order or first order
    const completedInBatch = batch.orders.find((o) => o.status === "SUCCESS");
    return completedInBatch || batch.orders[0];
  }

  // Parse single order ID (e.g. API-12345, TSK-12345, CLK-12345, 12345)
  const cleanId = upperId.replace(/^[A-Z0-9]+-/, "").trim();
  const numericId = parseInt(cleanId, 10);

  const order = await prisma.order.findFirst({
    where: {
      userId,
      isSandbox,
      OR: [
        ...(!isNaN(numericId) && numericId > 0 ? [{ id: numericId }] : []),
        { externalReference: id.trim() },
        { externalReference: upperId },
        { providerReference: { contains: id.trim() } },
      ],
    },
  });

  if (!order) {
    if (isNaN(numericId) || numericId <= 0) {
      throw new ApiError(
        "INVALID_REQUEST",
        "Invalid order ID format. Example: API-12345 or API-CF-BATCH-000185",
        400
      );
    }
    throw new ApiError("ORDER_NOT_FOUND", `Order ${id} not found`, 404);
  }

  return order;
}

/**
 * Submits a customer 'Not Received' dispute report for an order or batch entry within 24 hours of delivery.
 * POST /v1/orders/:id/not-received
 * Scope: orders:create
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  const { id } = await params;
  const endpoint = `/v1/orders/${id}/not-received`;
  let requestId = "req_initial";
  let authContext: any = null;

  try {
    authContext = await validateApiAuth(request, { requiredScope: "orders:create" });
    requestId = authContext.requestId;

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional; fallback to defaults
    }

    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "Data not received";
    const message =
      typeof body.message === "string" && body.message.trim()
        ? body.message.trim()
        : typeof body.note === "string" && body.note.trim()
        ? body.note.trim()
        : null;

    // Check system-wide reports enabled
    const reportsEnabledSetting = await prisma.systemSetting.findUnique({
      where: { key: "reports_enabled" },
    });
    if (reportsEnabledSetting?.value === "false") {
      throw new ApiError("ORDER_PROCESSING_UNAVAILABLE", "Report submission is currently disabled", 503);
    }

    const order = await resolveTargetOrder(id, authContext.userId, authContext.isSandbox, body);

    // Verify order is COMPLETED / SUCCESS
    if (order.status !== "SUCCESS") {
      throw new ApiError(
        "INVALID_REQUEST",
        "Not Received can only be reported for completed orders",
        409
      );
    }

    // Verify reporting window (default 24h)
    const windowHoursSetting = await prisma.systemSetting.findUnique({
      where: { key: "report_not_received_window_hours" },
    });
    const windowHours = parseInt(windowHoursSetting?.value || "24", 10);
    const completedAt = deriveCompletedAt(order);

    if (!isWithinReportWindow(completedAt, new Date(), windowHours)) {
      throw new ApiError(
        "INVALID_REQUEST",
        `The ${windowHours}-hour reporting window for this order has ended`,
        409
      );
    }

    // Check if an active report already exists
    const existing = await prisma.deliveryReport.findFirst({
      where: { orderId: order.id, status: { in: ACTIVE_DELIVERY_REPORT_STATUSES } },
      select: { id: true, seq: true, status: true },
    });
    if (existing) {
      throw new ApiError(
        "DUPLICATE_REQUEST",
        `A report for this order already exists (${deliveryReportCode(existing.seq)})`,
        409
      );
    }

    // Allocate sequential report code
    const max = await prisma.deliveryReport.aggregate({ _max: { seq: true } });
    const seq = (max._max.seq ?? 0) + 1;

    const report = await prisma.deliveryReport.create({
      data: {
        orderId: order.id,
        seq,
        userId: authContext.userId,
        status: "UNDER_REVIEW",
        reason,
        message,
        events: {
          create: {
            type: "SUBMITTED",
            message: `Dispute reported via Developer API — ${reason}`,
            actorLabel: `API (${authContext.environment})`,
          },
        },
      },
    });

    // If order was dispatched via Tskconnect, forward dispute to provider
    if (order.providerReference?.startsWith("TSKCONNECT:")) {
      try {
        const { forwardNotReceivedToProvider } = await import("@/lib/provider-apis/router");
        forwardNotReceivedToProvider(order.id, {
          reason,
          note: message || undefined,
        }).catch((err) => {
          console.warn("[DevApiNotReceived] Provider forward error:", err);
        });
      } catch (err) {
        console.warn("[DevApiNotReceived] Provider forward exception:", err);
      }
    }

    const reportCode = deliveryReportCode(report.seq);
    const externalStatus = toExternalDisputeStatus(report.status);

    // Dispatch webhook notification
    dispatchWebhookEvent(
      authContext.userId,
      "report.not_received.submitted",
      {
        reportId: reportCode,
        orderId: `API-${order.id}`,
        reference: order.externalReference || null,
        recipient: order.phoneNumber,
        network: order.network,
        status: externalStatus,
        internalStatus: report.status,
        reason: report.reason,
        message: report.message,
        createdAt: report.createdAt.toISOString(),
      },
      order.id
    ).catch(() => {});

    await logApiRequestEntry({
      userId: authContext.userId,
      credentialId: authContext.credentialId,
      endpoint,
      method: "POST",
      status: 201,
      success: true,
      ip: authContext.clientIp,
      userAgent: authContext.userAgent,
      environment: authContext.environment,
      responseTimeMs: Date.now() - start,
      requestId,
    });

    const responseData = {
      reportId: reportCode,
      id: report.id,
      orderId: `API-${order.id}`,
      reference: order.externalReference || null,
      recipient: order.phoneNumber,
      network: order.network,
      gbAmount: order.gbAmount,
      status: externalStatus,
      internalStatus: report.status,
      reason: report.reason,
      message: report.message,
      evidence: null,
      evidenceUrl: null,
      createdAt: report.createdAt.toISOString(),
    };

    return formatApiSuccess(responseData, requestId, 201, authContext.rateLimit);
  } catch (err: any) {
    const status = err instanceof ApiError ? err.status : 500;
    const code = err instanceof ApiError ? err.code : "SERVER_ERROR";
    const message = err.message || "An unexpected error occurred";

    await logApiRequestEntry({
      userId: authContext?.userId,
      credentialId: authContext?.credentialId,
      endpoint,
      method: "POST",
      status,
      success: false,
      ip: authContext?.clientIp,
      userAgent: authContext?.userAgent,
      environment: authContext?.environment,
      errorCode: code,
      responseTimeMs: Date.now() - start,
      requestId,
    });

    return formatApiError(code, message, status, requestId, err.rateLimitInfo);
  }
}

/**
 * Retrieves dispute report status (pending_resolution, confirmed_sent, resolved, refunded) and evidence.
 * GET /v1/orders/:id/not-received
 * Scope: orders:read
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  const { id } = await params;
  const endpoint = `/v1/orders/${id}/not-received`;
  let requestId = "req_initial";
  let authContext: any = null;

  try {
    authContext = await validateApiAuth(request, { requiredScope: "orders:read" });
    requestId = authContext.requestId;

    const order = await resolveTargetOrder(id, authContext.userId, authContext.isSandbox);

    // If order was fulfilled via Tskconnect and has an active report, optionally sync with provider
    if (order.providerReference?.startsWith("TSKCONNECT:")) {
      try {
        const { syncTskconnectDispute } = await import("@/lib/provider-apis/router");
        await syncTskconnectDispute(order.id);
      } catch (syncErr) {
        console.warn("[DevApiNotReceived] Provider sync warning:", syncErr);
      }
    }

    const report = await prisma.deliveryReport.findFirst({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
      include: {
        events: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            type: true,
            message: true,
            actorLabel: true,
            createdAt: true,
          },
        },
      },
    });

    if (!report) {
      throw new ApiError(
        "ORDER_NOT_FOUND",
        `No Not Received dispute report found for order ${id}`,
        404
      );
    }

    const externalStatus = toExternalDisputeStatus(report.status);

    const evidenceUrl = report.proofImage
      ? report.proofImage.startsWith("http")
        ? report.proofImage
        : `/api/reports/not-received/${report.id}/proof`
      : null;

    const evidence = report.proofImage
      ? {
          url: evidenceUrl,
          mimeType: report.proofImageMime || "image/png",
          uploadedAt: report.proofImageUploadedAt?.toISOString() || null,
          note: report.adminResponse || null,
        }
      : null;

    const responseData = {
      reportId: deliveryReportCode(report.seq),
      id: report.id,
      orderId: `API-${order.id}`,
      reference: order.externalReference || null,
      recipient: order.phoneNumber,
      network: order.network,
      gbAmount: order.gbAmount,
      status: externalStatus,
      internalStatus: report.status,
      reason: report.reason,
      message: report.message,
      adminResponse: sanitizeCustomerRefundNote(report.adminResponse, order.amount),
      adminNote: report.adminNote || null,
      evidence,
      evidenceUrl,
      createdAt: report.createdAt.toISOString(),
      resolvedAt: report.resolvedAt?.toISOString() || null,
      events: report.events.map((e) => ({
        id: e.id,
        type: e.type,
        message: e.message,
        actor: e.actorLabel,
        createdAt: e.createdAt.toISOString(),
      })),
    };

    await logApiRequestEntry({
      userId: authContext.userId,
      credentialId: authContext.credentialId,
      endpoint,
      method: "GET",
      status: 200,
      success: true,
      ip: authContext.clientIp,
      userAgent: authContext.userAgent,
      environment: authContext.environment,
      responseTimeMs: Date.now() - start,
      requestId,
    });

    return formatApiSuccess(responseData, requestId, 200, authContext.rateLimit);
  } catch (err: any) {
    const status = err instanceof ApiError ? err.status : 500;
    const code = err instanceof ApiError ? err.code : "SERVER_ERROR";
    const message = err.message || "An unexpected error occurred";

    await logApiRequestEntry({
      userId: authContext?.userId,
      credentialId: authContext?.credentialId,
      endpoint,
      method: "GET",
      status,
      success: false,
      ip: authContext?.clientIp,
      userAgent: authContext?.userAgent,
      environment: authContext?.environment,
      errorCode: code,
      responseTimeMs: Date.now() - start,
      requestId,
    });

    return formatApiError(code, message, status, requestId, err.rateLimitInfo);
  }
}

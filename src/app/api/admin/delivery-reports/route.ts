import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { deliveryReportActionSchema } from "@/lib/validation";
import { changeOrderStatus } from "@/lib/orders";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, apiError } from "@/lib/api-helpers";
import { deliveryReportCode, toExternalDisputeStatus } from "@/lib/types";
import { parseOrderCode } from "@/lib/utils";
import { dispatchWebhookEvent } from "@/lib/webhooks";

/** Timeline event types mirrored by the report UI (§13). */
const EVENT_FOR_ACTION: Record<string, string> = {
  START_INVESTIGATION: "INVESTIGATION_STARTED",
  KEEP_INVESTIGATING: "KEEP_INVESTIGATING",
  MARK_DELIVERED: "MARKED_DELIVERED",
  ADD_RESPONSE: "RESPONSE_ADDED",
  REJECT: "REJECTED",
  RESOLVE: "RESOLVED",
  RESOLVE_RESEND: "RESEND",
  RESOLVE_REFUND: "REFUND",
  MARK_UNDER_REVIEW: "MARKED_UNDER_REVIEW",
  RESOLVE_REFUNDED: "REFUNDED",
  RESOLVE_CONFIRM_SENT: "CONFIRM_SENT",
};

/** Admin "Not Received" reports queue (§33/§34). */
export async function GET(request: NextRequest) {
  try {
    await requireStaff();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 15)));
    const status = searchParams.get("status");
    const network = searchParams.get("network");
    const q = searchParams.get("q");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.gte = new Date(from);
      if (to) createdAt.lte = new Date(to);
      where.createdAt = createdAt;
    }
    if (status) {
      if (status === "CONFIRM_SENT" || status === "DELIVERED") {
        where.status = { in: ["CONFIRM_SENT", "DELIVERED"] };
      } else if (status === "UNDER_REVIEW" || status === "OPEN") {
        where.status = { in: ["UNDER_REVIEW", "OPEN", "INVESTIGATING"] };
      } else {
        where.status = status;
      }
    }
    if (network) where.order = { is: { network } };
    if (q) {
      const orderId = parseOrderCode(q);
      where.OR = [
        { order: { is: { phoneNumber: { contains: q } } } },
        { user: { is: { OR: [{ name: { contains: q } }, { email: { contains: q } }] } } },
        ...(orderId && orderId > 0 ? [{ orderId }] : []),
      ];
    }

    // Auto-sync active Tskconnect disputes for staff view
    try {
      const activeTskDisputes = await prisma.deliveryReport.findMany({
        where: {
          status: { in: ["OPEN", "UNDER_REVIEW", "INVESTIGATING"] },
          order: { providerReference: { startsWith: "TSKCONNECT:" } },
        },
        include: {
          order: { select: { id: true, providerReference: true, externalReference: true } },
        },
        take: 5,
      });
      if (activeTskDisputes.length > 0) {
        const { syncTskconnectDispute } = await import("@/lib/provider-apis/router");
        await Promise.allSettled(
          activeTskDisputes.map((r) => syncTskconnectDispute(r.order, r.id))
        );
      }
    } catch (syncErr) {
      console.warn("[AdminDeliveryReports] Auto-sync warning:", syncErr);
    }

    const [data, total, byStatus] = await Promise.all([
      prisma.deliveryReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          seq: true,
          reason: true,
          message: true,
          status: true,
          adminNote: true,
          adminResponse: true,
          respondedAt: true,
          proofImageMime: true,
          proofImageUploadedAt: true,
          resolvedAt: true,
          createdAt: true,
          order: {
            select: {
              id: true,
              batchId: true,
              batch: { select: { batchCode: true } },
              phoneNumber: true,
              network: true,
              gbAmount: true,
              amount: true,
              status: true,
              createdAt: true,
              completedAt: true,
              failureReason: true,
              providerReference: true,
            },
          },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.deliveryReport.count({ where }),
      prisma.deliveryReport.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    const stats: Record<string, number> = {};
    for (const row of byStatus) stats[row.status] = row._count._all;
    const confirmSentCombined = (stats["CONFIRM_SENT"] ?? 0) + (stats["DELIVERED"] ?? 0);
    stats["CONFIRM_SENT"] = confirmSentCombined;
    stats["DELIVERED"] = confirmSentCombined;

    return NextResponse.json({
      data: data.map((r) => ({ ...r, code: deliveryReportCode(r.seq) })),
      stats,
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * Admin report workflow (§9/§16/§20):
 *  - START_INVESTIGATION  → report OPEN → INVESTIGATING
 *  - KEEP_INVESTIGATING   → stays INVESTIGATING, adds a timeline event
 *  - MARK_DELIVERED       → report → DELIVERED (order stays SUCCESS — §17)
 *  - ADD_RESPONSE         → saves the administrative response visible to the user (§12)
 *  - RESOLVE              → report → RESOLVED
 *  - REJECT               → report → REJECTED, order untouched
 *  - RESOLVE_RESEND       → order FAILED → PROCESSING so it re-enters the export flow
 *  - RESOLVE_REFUND       → order FAILED → REFUNDED (override transition, forced)
 * Every action writes a report timeline event (§13) and an audit log entry (§20).
 */
export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireStaff();
    const input = deliveryReportActionSchema.parse(await request.json());

    const report = await prisma.deliveryReport.findUnique({
      where: { id: input.reportId },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            phoneNumber: true,
            network: true,
            externalReference: true,
            userId: true,
          },
        },
      },
    });
    if (!report) return apiError(404, "Report not found");

    const isClosed =
      report.status === "RESOLVED" ||
      report.status === "REJECTED" ||
      report.status === "REFUNDED" ||
      report.status === "CONFIRM_SENT";
    if (isClosed && input.action !== "ADD_RESPONSE") {
      return apiError(409, "This report has already been closed");
    }

    const actorLabel = { id: actor.id, label: actor.email };
    let orderUpdated: string | null = null;
    const data: Record<string, unknown> = {};

    if (input.action === "START_INVESTIGATION") {
      if (report.status !== "OPEN" && report.status !== "UNDER_REVIEW") {
        return apiError(409, "Only open or under-review reports can move to investigating");
      }
      data.status = "INVESTIGATING";
    } else if (input.action === "MARK_UNDER_REVIEW") {
      data.status = "UNDER_REVIEW";
      if (input.resolutionNote) data.adminNote = input.resolutionNote;
    } else if (input.action === "MARK_DELIVERED") {
      if (report.status === "DELIVERED") {
        return apiError(409, "This report is already marked as delivered");
      }
      data.status = "DELIVERED";
    } else if (input.action === "ADD_RESPONSE") {
      if (!input.adminResponse?.trim()) {
        return apiError(400, "Response text is required");
      }
      data.adminResponse = input.adminResponse.trim();
      data.respondedAt = new Date();
      data.respondedBy = actor.email;
      // A response on a closed report does not reopen it
    } else if (input.action === "RESOLVE") {
      data.status = "RESOLVED";
      data.resolvedAt = new Date();
      data.resolvedBy = actor.email;
      if (input.resolutionNote) data.adminNote = input.resolutionNote;
    } else if (input.action === "REJECT") {
      data.status = "REJECTED";
      data.resolvedAt = new Date();
      data.resolvedBy = actor.email;
      if (input.resolutionNote) data.adminNote = input.resolutionNote;
    } else if (input.action === "RESOLVE_RESEND") {
      if (report.order.status === "FAILED") {
        await changeOrderStatus(
          report.orderId,
          "PROCESSING",
          `Report resolved: resend${input.resolutionNote ? ` — ${input.resolutionNote}` : ""}`,
          actorLabel
        );
        orderUpdated = "PROCESSING";
      }
      data.status = "RESOLVED";
      data.resolvedAt = new Date();
      data.resolvedBy = actor.email;
      if (input.resolutionNote) data.adminNote = input.resolutionNote;
    } else if (input.action === "RESOLVE_REFUND") {
      await changeOrderStatus(
        report.orderId,
        "FAILED",
        `Report resolved: refund${input.resolutionNote ? ` — ${input.resolutionNote}` : ""}`,
        actorLabel,
        { force: true }
      );
      orderUpdated = "FAILED";
      data.status = "RESOLVED";
      data.resolvedAt = new Date();
      data.resolvedBy = actor.email;
      if (input.resolutionNote) data.adminNote = input.resolutionNote;
    } else if (input.action === "RESOLVE_REFUNDED") {
      // Close report as REFUNDED and mark order FAILED (refunds wallet for dashboard orders)
      await changeOrderStatus(
        report.orderId,
        "FAILED",
        `Report closed as refunded${input.resolutionNote ? ` — ${input.resolutionNote}` : ""}`,
        actorLabel,
        { force: true }
      );
      orderUpdated = "FAILED";
      data.status = "REFUNDED";
      data.resolvedAt = new Date();
      data.resolvedBy = actor.email;
      if (input.resolutionNote) data.adminNote = input.resolutionNote;
    } else if (input.action === "RESOLVE_CONFIRM_SENT") {
      // Close report confirming data was sent successfully
      data.status = "CONFIRM_SENT";
      data.resolvedAt = new Date();
      data.resolvedBy = actor.email;
      if (input.resolutionNote) data.adminNote = input.resolutionNote;
    }
    // KEEP_INVESTIGATING changes nothing structurally — only the timeline event below

    if (input.adminResponse?.trim() && input.action !== "ADD_RESPONSE") {
      data.adminResponse = input.adminResponse.trim();
      data.respondedAt = new Date();
      data.respondedBy = actor.email;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.deliveryReport.update({
        where: { id: report.id },
        data,
      });
      await tx.deliveryReportEvent.create({
        data: {
          reportId: report.id,
          type: EVENT_FOR_ACTION[input.action] ?? input.action,
          message:
            input.action === "ADD_RESPONSE"
              ? "Administrative response added"
              : input.resolutionNote || null,
          actorLabel: actor.email,
        },
      });
      return row;
    });

    await recordAudit({
      userId: actor.id,
      actorLabel: actor.email,
      action: `delivery_report.${input.action.toLowerCase()}`,
      target: `delivery_report:${report.id} (order:${report.orderId})`,
      previousValue: JSON.stringify({ status: report.status }),
      newValue: JSON.stringify({
        status: updated.status,
        orderUpdated,
        responseAdded: input.action === "ADD_RESPONSE" || undefined,
      }),
    });

    // Dispatch webhook notifications if dispute status changed
    const webhookEvent =
      updated.status === "CONFIRM_SENT" || updated.status === "DELIVERED"
        ? "report.not_received.confirmed_sent"
        : updated.status === "RESOLVED" || updated.status === "REFUNDED"
        ? "report.not_received.resolved"
        : null;

    if (webhookEvent && report.order?.userId) {
      dispatchWebhookEvent(
        report.order.userId,
        webhookEvent,
        {
          reportId: deliveryReportCode(updated.seq),
          orderId: `API-${report.orderId}`,
          reference: report.order.externalReference || null,
          recipient: report.order.phoneNumber,
          network: report.order.network,
          status: toExternalDisputeStatus(updated.status),
          internalStatus: updated.status,
          adminResponse: updated.adminResponse || null,
          evidence: updated.proofImage ? `/api/reports/not-received/${updated.id}/proof` : null,
          resolvedAt: updated.resolvedAt?.toISOString() || null,
        },
        report.orderId
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true, report: updated, orderUpdated });
  } catch (err) {
    return handleRouteError(err);
  }
}
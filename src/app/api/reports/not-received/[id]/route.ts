import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { deliveryReportCode, sanitizeCustomerRefundNote, sanitizeCustomerFacingText } from "@/lib/types";
import { handleRouteError, apiError } from "@/lib/api-helpers";

/**
 * User report detail (§15): report information, order information, admin
 * response, evidence metadata and the report timeline. Ownership is enforced —
 * a user can only ever open their own reports.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    let report = await prisma.deliveryReport.findUnique({
      where: { id },
      select: {
        id: true,
        seq: true,
        userId: true,
        status: true,
        reason: true,
        message: true,
        adminNote: true,
        adminResponse: true,
        respondedAt: true,
        respondedBy: true,
        proofImage: true,
        proofImageMime: true,
        proofImageUploadedAt: true,
        resolvedAt: true,
        resolvedBy: true,
        createdAt: true,
        updatedAt: true,
        events: { orderBy: { createdAt: "asc" }, select: { id: true, type: true, message: true, actorLabel: true, createdAt: true } },
        order: {
          select: {
            id: true,
            phoneNumber: true,
            network: true,
            gbAmount: true,
            amount: true,
            status: true,
            providerReference: true,
            externalReference: true,
            createdAt: true,
            completedAt: true,
            batch: { select: { batchCode: true } },
          },
        },
      },
    });

    if (!report) return apiError(404, "Report not found");

    // If report is still active and order was dispatched to Tskconnect, check live status from provider
    if (
      ["UNDER_REVIEW", "OPEN", "INVESTIGATING"].includes(report.status) &&
      report.order?.providerReference?.startsWith("TSKCONNECT:")
    ) {
      try {
        const { syncTskconnectDispute } = await import("@/lib/provider-apis/router");
        const syncRes = await syncTskconnectDispute(report.order, report.id);
        if (syncRes.updated) {
          const refreshed = await prisma.deliveryReport.findUnique({
            where: { id },
            select: {
              id: true,
              seq: true,
              userId: true,
              status: true,
              reason: true,
              message: true,
              adminNote: true,
              adminResponse: true,
              respondedAt: true,
              respondedBy: true,
              proofImage: true,
              proofImageMime: true,
              proofImageUploadedAt: true,
              resolvedAt: true,
              resolvedBy: true,
              createdAt: true,
              updatedAt: true,
              events: { orderBy: { createdAt: "asc" }, select: { id: true, type: true, message: true, actorLabel: true, createdAt: true } },
              order: {
                select: {
                  id: true,
                  phoneNumber: true,
                  network: true,
                  gbAmount: true,
                  amount: true,
                  status: true,
                  providerReference: true,
                  externalReference: true,
                  createdAt: true,
                  completedAt: true,
                  batch: { select: { batchCode: true } },
                },
              },
            },
          });
          if (refreshed) report = refreshed;
        }
      } catch (syncErr) {
        console.warn("[NotReceivedDetail] Live provider sync warning:", syncErr);
      }
    }

    const isStaff = user.role === "ADMIN" || user.role === "MANAGER";
    if (!isStaff && report.userId !== user.id) return apiError(403, "Not allowed");
    const { userId: _ownerId, proofImage, ...safeReport } = report;

    const sanitizeActor = (label: string | null | undefined) => {
      if (!label) return null;
      return sanitizeCustomerFacingText(label) || "Support Team";
    };

    return NextResponse.json({
      report: {
        ...safeReport,
        hasProofImage: Boolean(proofImage || safeReport.proofImageMime),
        code: deliveryReportCode(safeReport.seq),
        reason: isStaff ? safeReport.reason : sanitizeCustomerFacingText(safeReport.reason),
        message: isStaff ? safeReport.message : sanitizeCustomerFacingText(safeReport.message),
        adminNote: isStaff ? safeReport.adminNote : null,
        adminResponse: sanitizeCustomerRefundNote(safeReport.adminResponse, safeReport.order?.amount),
        respondedBy: isStaff ? safeReport.respondedBy : sanitizeActor(safeReport.respondedBy),
        resolvedBy: isStaff ? safeReport.resolvedBy : sanitizeActor(safeReport.resolvedBy),
        events: safeReport.events.map((e) => ({
          ...e,
          message: isStaff ? e.message : sanitizeCustomerFacingText(e.message),
          actorLabel: isStaff
            ? e.actorLabel
            : (sanitizeCustomerFacingText(e.actorLabel) || "System"),
        })),
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

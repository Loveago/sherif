import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { changeOrderStatus } from "@/lib/orders";
import { recordOrderApiLog } from "@/lib/order-api-logs";
import { getProviderRoutingConfig, normalizePhoneLast9 } from "@/lib/provider-apis/router";
import { TskconnectClient, mapTskconnectStatus, mapTskconnectDisputeStatus } from "@/lib/provider-apis/tskconnect";
import { parseOrderCode } from "@/lib/utils";
import { deliveryReportCode, toExternalDisputeStatus } from "@/lib/types";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const rawBody = await request.text();
    let payload: any;
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const config = await getProviderRoutingConfig();
    const signatureHeader =
      request.headers.get("x-tskconnect-signature") ||
      request.headers.get("x-signature") ||
      request.headers.get("signature") ||
      "";
    const timestampHeader =
      request.headers.get("x-tskconnect-timestamp") ||
      request.headers.get("x-timestamp") ||
      "";

    const secret = (config.tskconnect.webhookSecret || process.env.TSKCONNECT_WEBHOOK_SECRET || "").trim();

    // Verify HMAC-SHA256 signature if secret is configured
    if (secret && signatureHeader) {
      const client = new TskconnectClient(config.tskconnect);
      const isValid = client.verifyWebhookSignature(rawBody, signatureHeader, timestampHeader, secret);
      if (!isValid) {
        console.warn(`[TskconnectWebhook] Signature verification failed for payload (sig: ${signatureHeader.slice(0, 16)}...)`);
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    }

    const event = (payload?.event || request.headers.get("x-tskconnect-event") || "").toLowerCase();
    const data = payload?.data || payload;

    const orderId = data?.orderId || payload?.orderId;
    const reference = data?.reference || payload?.reference || data?.externalReference;
    const batchCode = data?.batchCode || payload?.batchCode;
    const phoneNumber = data?.phoneNumber || data?.recipient || data?.number;
    const rawStatus = data?.status || event;
    const failureReason = data?.failureReason || data?.error?.message || data?.error;

    // Search for the matching Order in our database
    let orders: any[] = [];
    const searchKeys = [orderId, reference, batchCode].filter(Boolean).map(String);
    const expandedKeys = new Set<string>();
    for (const k of searchKeys) {
      expandedKeys.add(k);
      const stripped = k.replace(/^[A-Z0-9]+-/, "").trim();
      if (stripped) expandedKeys.add(stripped);
    }

    // Direct report ID lookup if provided in payload
    const reportKey = String(data?.reportId || payload?.reportId || "").trim();
    if (reportKey) {
      const repSeq = parseInt(reportKey.replace(/^NR-0*/i, ""), 10);
      const directReport = await prisma.deliveryReport.findFirst({
        where: {
          OR: [
            { id: reportKey },
            ...(!isNaN(repSeq) && repSeq > 0 ? [{ seq: repSeq }] : []),
          ],
        },
        include: { order: true },
      });
      if (directReport?.order) {
        orders.push(directReport.order);
      }
    }

    if (expandedKeys.size > 0 && orders.length === 0) {
      const keyList = Array.from(expandedKeys);
      orders = await prisma.order.findMany({
        where: {
          OR: [
            ...keyList.map((k) => ({ providerReference: `TSKCONNECT:${k}` })),
            ...keyList.map((k) => ({ providerReference: { startsWith: `TSKCONNECT:${k}` } })),
            ...keyList.map((k) => ({ providerReference: { contains: k } })),
            ...keyList.map((k) => ({ externalReference: k })),
            ...keyList
              .map((k) => parseOrderCode(k))
              .filter((id): id is number => typeof id === "number" && id > 0)
              .map((id) => ({ id })),
          ],
        },
      });
    }

    // Fallback: match by phone number if in PENDING/PROCESSING status
    if (orders.length === 0 && phoneNumber) {
      const last9 = normalizePhoneLast9(String(phoneNumber));
      if (last9) {
        orders = await prisma.order.findMany({
          where: {
            phoneNumber: { contains: last9 },
            status: { in: ["PENDING", "PROCESSING"] },
            providerReference: { startsWith: "TSKCONNECT" },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        });
      }
    }

    const normalizedRawStatus = String(rawStatus || "").toLowerCase().replace(/[\s_-]+/g, "_");
    const normalizedEvent = String(event || "").toLowerCase().replace(/[\s_-]+/g, "_");
    const isReportEvent =
      normalizedEvent.includes("report") ||
      normalizedEvent.includes("not_received") ||
      normalizedEvent.includes("dispute") ||
      [
        "pending_resolution",
        "under_review",
        "confirm_sent",
        "confirmed_sent",
        "delivered",
        "resolved",
        "refunded",
      ].includes(normalizedRawStatus);

    let updatedCount = 0;

    if (isReportEvent) {
      // Process Not Received dispute event (§5/§6)
      const disputeStatus = mapTskconnectDisputeStatus(rawStatus || event);
      const evidenceRaw = data?.evidence || data?.proof || data?.evidenceUrl || data?.proofUrl || data?.carrierReceipt;
      let evidenceUrl: string | null = null;
      if (typeof evidenceRaw === "string") {
        evidenceUrl = evidenceRaw;
      } else if (evidenceRaw && typeof evidenceRaw === "object") {
        evidenceUrl = evidenceRaw.url || evidenceRaw.proofImage || null;
      }

      if (evidenceUrl && typeof evidenceUrl === "string" && evidenceUrl.startsWith("/")) {
        const base = (config.tskconnect.baseUrl || "https://tsk05.net").replace(/\/v1\/?$/, "");
        evidenceUrl = `${base}${evidenceUrl}`;
      }

      const carrierNote = data?.adminResponse || data?.carrierNote || data?.note || data?.message;

      for (const ord of orders) {
        let report = await prisma.deliveryReport.findFirst({
          where: { orderId: ord.id },
          orderBy: { createdAt: "desc" },
        });

        if (!report) {
          const max = await prisma.deliveryReport.aggregate({ _max: { seq: true } });
          const seq = (max._max.seq ?? 0) + 1;
          report = await prisma.deliveryReport.create({
            data: {
              orderId: ord.id,
              seq,
              userId: ord.userId,
              status: disputeStatus,
              reason: data?.reason || "Data not received (Dispute reported via provider)",
              message: carrierNote || null,
              events: {
                create: {
                  type: "SUBMITTED",
                  message: `Dispute report filed via Tskconnect webhook (${event})`,
                  actorLabel: "Tskconnect Webhook",
                },
              },
            },
          });
        }

        const updateData: any = {};
        const eventsToCreate: any[] = [];

        if (disputeStatus && disputeStatus !== report.status) {
          updateData.status = disputeStatus;
          if (disputeStatus === "CONFIRM_SENT" || disputeStatus === "RESOLVED" || disputeStatus === "REFUNDED") {
            updateData.resolvedAt = data?.resolvedAt ? new Date(data.resolvedAt) : new Date();
            updateData.resolvedBy = "Tskconnect Webhook";
          }
          eventsToCreate.push({
            reportId: report.id,
            type: disputeStatus === "CONFIRM_SENT" ? "CONFIRM_SENT" : disputeStatus,
            message: `Provider status updated via webhook: ${disputeStatus}`,
            actorLabel: "Tskconnect Webhook",
          });
        }

        if (carrierNote && !report.adminResponse) {
          updateData.adminResponse = carrierNote;
          updateData.respondedAt = new Date();
          updateData.respondedBy = "Tskconnect Carrier";
          eventsToCreate.push({
            reportId: report.id,
            type: "RESPONSE_ADDED",
            message: `Carrier response added: ${carrierNote}`,
            actorLabel: "Tskconnect Webhook",
          });
        }

        if (evidenceUrl && !report.proofImage) {
          updateData.proofImage = evidenceUrl;
          updateData.proofImageMime = evidenceUrl.endsWith(".png") ? "image/png" : "image/jpeg";
          updateData.proofImageUploadedAt = new Date();
          updateData.proofImageUploadedBy = "Tskconnect Carrier Evidence";
          eventsToCreate.push({
            reportId: report.id,
            type: "EVIDENCE_UPLOADED",
            message: `Carrier delivery evidence attached: ${data?.carrierReference || "Delivery confirmed"}`,
            actorLabel: "Tskconnect Webhook",
          });
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.$transaction(async (tx) => {
            await tx.deliveryReport.update({
              where: { id: report!.id },
              data: updateData,
            });
            for (const ev of eventsToCreate) {
              await tx.deliveryReportEvent.create({ data: ev });
            }
          });
          updatedCount++;
        }

        // If dispute resolved as REFUNDED, mark order as FAILED with refund
        if (disputeStatus === "REFUNDED" && ord.status !== "FAILED" && ord.status !== "REFUNDED") {
          await changeOrderStatus(
            ord.id,
            "FAILED",
            `Tskconnect dispute closed with refund: ${carrierNote || "Dispute resolved by provider refund"}`,
            { id: "system", label: "Tskconnect Webhook" },
            { force: true }
          );
        }

        // Dispatch outbound webhook to merchant
        const outboundEvent =
          event === "report.not_received.confirmed_sent" || disputeStatus === "CONFIRM_SENT"
            ? "report.not_received.confirmed_sent"
            : event === "report.not_received.resolved" || disputeStatus === "RESOLVED" || disputeStatus === "REFUNDED"
            ? "report.not_received.resolved"
            : "report.not_received.submitted";

        await dispatchWebhookEvent(
          ord.userId,
          outboundEvent,
          {
            reportId: deliveryReportCode(report.seq),
            orderId: `API-${ord.id}`,
            reference: ord.externalReference || null,
            recipient: ord.phoneNumber,
            network: ord.network,
            status: toExternalDisputeStatus(disputeStatus),
            internalStatus: disputeStatus,
            evidence: evidenceUrl,
            adminResponse: carrierNote || report.adminResponse || null,
            updatedAt: new Date().toISOString(),
          },
          ord.id
        );

        // Record Order API Log
        await recordOrderApiLog({
          orderId: ord.id,
          provider: "TSKCONNECT",
          action: `WEBHOOK_${(event || "REPORT_NOT_RECEIVED").toUpperCase().replace(/\./g, "_")}`,
          endpoint: "/api/webhooks/providers/tskconnect",
          method: "POST",
          requestPayload: payload,
          responsePayload: { success: true, disputeStatus, event },
          statusCode: 200,
          success: true,
          providerReference: ord.providerReference || (orderId ? `TSKCONNECT:${orderId}` : null),
          durationMs: Date.now() - startTime,
        });
      }

      return NextResponse.json({
        success: true,
        event,
        type: "dispute_report",
        matchedOrders: orders.length,
        updatedReports: updatedCount,
        disputeStatus,
      });
    }

    const targetStatus = mapTskconnectStatus(rawStatus);

    for (const ord of orders) {
      if (ord.status !== targetStatus && ["SUCCESS", "FAILED", "PROCESSING", "CANCELLED"].includes(targetStatus)) {
        const reason =
          targetStatus === "FAILED"
            ? failureReason || `Tskconnect marked order as failed (${rawStatus})`
            : `Tskconnect webhook: ${event || rawStatus}`;

        await changeOrderStatus(
          ord.id,
          targetStatus,
          reason,
          { id: "system", label: "Tskconnect Webhook" },
          { force: true }
        );
        updatedCount++;
      }

      // Record Order API Log
      await recordOrderApiLog({
        orderId: ord.id,
        provider: "TSKCONNECT",
        action: `WEBHOOK_${(event || "EVENT").toUpperCase().replace(/\./g, "_")}`,
        endpoint: "/api/webhooks/providers/tskconnect",
        method: "POST",
        requestPayload: payload,
        responsePayload: { success: true, targetStatus, event },
        statusCode: 200,
        success: true,
        providerReference: ord.providerReference || (orderId ? `TSKCONNECT:${orderId}` : null),
        durationMs: Date.now() - startTime,
      });
    }

    return NextResponse.json({
      success: true,
      event,
      matchedOrders: orders.length,
      updatedOrders: updatedCount,
      targetStatus,
    });
  } catch (err: any) {
    console.error("[TskconnectWebhook] Error handling webhook:", err);
    return NextResponse.json(
      { error: err?.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}

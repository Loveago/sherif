import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { changeOrderStatus } from "@/lib/orders";
import { recordOrderApiLog } from "@/lib/order-api-logs";
import { getProviderRoutingConfig, normalizePhoneLast9 } from "@/lib/provider-apis/router";
import { BundlePortalClient, mapBundlePortalStatus } from "@/lib/provider-apis/bundle-portal";
import { sanitizeCustomerFacingText } from "@/lib/types";

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
      request.headers.get("x-bundleportal-signature") ||
      request.headers.get("x-signature") ||
      "";

    const secret = (
      config.bundleportal.webhookSecret ||
      process.env.BUNDLE_PORTAL_WEBHOOK_SECRET ||
      ""
    ).trim();

    if (secret && signatureHeader) {
      const client = new BundlePortalClient(config.bundleportal);
      const isValid = client.verifyWebhookSignature(rawBody, signatureHeader, secret);
      if (!isValid) {
        console.warn("[BundlePortalWebhook] Signature verification failed");
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    }

    const event = String(payload?.event || "").toLowerCase();
    const reference = payload?.reference ? String(payload.reference).trim() : "";
    const orderIdRef = payload?.order_id ? String(payload.order_id).trim() : "";
    const recipient = payload?.recipient ? String(payload.recipient).trim() : "";
    const rawStatus = String(payload?.status || event || "").trim();
    const failureReason = payload?.failure_reason || payload?.error || null;

    let orders: any[] = [];
    const lookupOrs: any[] = [];
    if (reference) {
      lookupOrs.push({ providerReference: `BUNDLEPORTAL:${reference}` });
      lookupOrs.push({ providerReference: reference });
    }
    if (orderIdRef) {
      lookupOrs.push({ externalReference: orderIdRef });
      lookupOrs.push({ providerReference: `BUNDLEPORTAL:${orderIdRef}` });
    }

    if (lookupOrs.length > 0) {
      orders = await prisma.order.findMany({
        where: { OR: lookupOrs },
      });
    }

    if (orders.length === 0 && recipient) {
      const last9 = normalizePhoneLast9(recipient);
      if (last9) {
        orders = await prisma.order.findMany({
          where: {
            phoneNumber: { contains: last9 },
            status: { in: ["PENDING", "PROCESSING"] },
            providerReference: { startsWith: "BUNDLEPORTAL:" },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        });
      }
    }

    if (orders.length === 0) {
      return NextResponse.json({ received: true, matched: 0 });
    }

    const targetStatus = mapBundlePortalStatus(rawStatus);
    const cleanFailure =
      targetStatus === "FAILED"
        ? sanitizeCustomerFacingText(String(failureReason || "Bundle Portal delivery failed")) ||
          "Delivery failed"
        : null;

    let updatedCount = 0;
    for (const order of orders) {
      await recordOrderApiLog({
        orderId: order.id,
        provider: "BUNDLEPORTAL",
        action: "WEBHOOK",
        endpoint: "/api/webhooks/providers/bundleportal",
        method: "POST",
        requestPayload: payload,
        responsePayload: { matched: true, targetStatus },
        statusCode: 200,
        success: true,
        providerReference: order.providerReference,
        durationMs: Date.now() - startTime,
      });

      if (targetStatus !== order.status && ["PROCESSING", "SUCCESS", "FAILED"].includes(targetStatus)) {
        if (cleanFailure) {
          await prisma.order.update({
            where: { id: order.id },
            data: { failureReason: cleanFailure },
          });
        }
        await changeOrderStatus(
          order.id,
          targetStatus,
          `Bundle Portal webhook (${event || rawStatus}${reference ? `, Ref: ${reference}` : ""})`,
          { id: "system", label: "Bundle Portal Webhook" },
          { force: true }
        );
        updatedCount++;
      }
    }

    return NextResponse.json({ received: true, matched: orders.length, updated: updatedCount });
  } catch (err: any) {
    console.error("[BundlePortalWebhook] Error:", err);
    return NextResponse.json({ error: err?.message || "Webhook processing failed" }, { status: 500 });
  }
}

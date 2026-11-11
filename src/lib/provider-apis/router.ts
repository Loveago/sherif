import { prisma } from "../prisma";
import { changeOrderStatus } from "../orders";
import { sanitizeCustomerFacingText } from "../types";
import { normalizeGhanaPhoneNumber } from "@/lib/phone-utils";
import { recordOrderApiLog } from "../order-api-logs";
import {
  TskconnectClient,
  DEFAULT_TSKCONNECT_BASE_URL,
  normalizeTskconnectNetwork,
  resolveTskconnectPackageId,
  generateTskconnectReference,
  mapTskconnectStatus,
  mapTskconnectDisputeStatus,
} from "./tskconnect";
import type { ProviderRoutingConfig, ProviderType, ProviderDispatchResult, TskconnectConfig } from "./types";

/**
 * Helper to get an instantiated Tskconnect client with current settings
 */
export async function getTskconnectClient(): Promise<TskconnectClient> {
  const config = await getProviderRoutingConfig();
  return new TskconnectClient(config.tskconnect);
}

/**
 * Standard Ghanaian network keys supported in routing
 */
export const SUPPORTED_ROUTING_NETWORKS = [
  "MTN",
  "MTN_XPRESS",
  "TELECEL",
  "AIRTELTIGO_ISHARE",
  "AIRTELTIGO_BIGTIME",
] as const;

/**
 * Reads provider routing configuration from system settings
 */
export async function getProviderRoutingConfig(): Promise<ProviderRoutingConfig> {
  const settings = await prisma.systemSetting.findMany();
  const map = new Map<string, string>();
  for (const s of settings) map.set(s.key, s.value);

  const getVal = (key: string, fallback = "") => map.get(key) ?? fallback;

  const networkRoutes: Record<string, ProviderType> = {};
  for (const net of SUPPORTED_ROUTING_NETWORKS) {
    const rawVal = getVal(`provider_route_${net}`, "TSKCONNECT");
    if (rawVal === "MANUAL") {
      networkRoutes[net] = "MANUAL";
    } else {
      networkRoutes[net] = "TSKCONNECT";
    }
  }

  // Also include any dynamically saved routes for custom categories
  for (const [key, val] of map.entries()) {
    if (key.startsWith("provider_route_")) {
      const net = key.replace("provider_route_", "").toUpperCase();
      if (!networkRoutes[net]) {
        networkRoutes[net] = val === "MANUAL" ? "MANUAL" : "TSKCONNECT";
      }
    }
  }

  const rawDefault = getVal("provider_routing_default", "TSKCONNECT") as ProviderType;
  const defaultProvider = rawDefault === "MANUAL" ? "MANUAL" : "TSKCONNECT";

  return {
    enabled: getVal("provider_routing_enabled", "true") === "true",
    defaultProvider,
    autoDispatch: getVal("provider_routing_auto_dispatch", "true") === "true",
    networkRoutes,
    tskconnect: {
      enabled: getVal("tskconnect_enabled", "true") === "true",
      apiKey: getVal("tskconnect_api_key", process.env.TSKCONNECT_API_KEY || ""),
      baseUrl: getVal("tskconnect_base_url", DEFAULT_TSKCONNECT_BASE_URL),
      webhookSecret: getVal("tskconnect_webhook_secret", process.env.TSKCONNECT_WEBHOOK_SECRET || ""),
      numberVerificationEnabled: getVal("tskconnect_number_verification_enabled", "true") === "true",
    },
  };
}

/**
 * Check if Tskconnect integration is configured with an active API key
 */
export function isTskconnectActive(tskconnect: TskconnectConfig): boolean {
  return tskconnect.enabled && Boolean(tskconnect.apiKey && tskconnect.apiKey.trim().length > 0);
}

/**
 * Determines whether auto-dispatch should trigger on order creation.
 * If provider routing master switch is disabled, returns false.
 */
export function shouldAutoDispatch(config: ProviderRoutingConfig): boolean {
  if (!config.enabled) {
    return false;
  }
  if (isTskconnectActive(config.tskconnect)) {
    return true;
  }
  return config.autoDispatch;
}

/**
 * Determine which provider serves a given network
 */
export async function getProviderForNetwork(
  network: string,
  packageNameOrType?: string | null
): Promise<ProviderType> {
  const config = await getProviderRoutingConfig();

  // If general provider routing is disabled, all orders remain strictly MANUAL
  if (!config.enabled) {
    return "MANUAL";
  }

  const net = (network || "").trim().toUpperCase();
  const sub = (packageNameOrType || "").trim().toUpperCase();

  // 1. Check for specific subtype matching
  if (net === "MTN" && (sub.includes("XPRESS") || net.includes("XPRESS"))) {
    if (config.networkRoutes["MTN_XPRESS"]) return config.networkRoutes["MTN_XPRESS"];
  }

  if (
    net === "AIRTELTIGO_BIGTIME" ||
    net === "AT_BIGTIME" ||
    net.includes("BIGTIME") ||
    sub.includes("BIGTIME") ||
    sub.includes("BIG TIME")
  ) {
    if (config.networkRoutes["AIRTELTIGO_BIGTIME"]) {
      return config.networkRoutes["AIRTELTIGO_BIGTIME"];
    }
  }

  if (
    net === "AIRTELTIGO_ISHARE" ||
    net === "AT_ISHARE" ||
    net.includes("ISHARE") ||
    sub.includes("ISHARE") ||
    sub.includes("I-SHARE")
  ) {
    if (config.networkRoutes["AIRTELTIGO_ISHARE"]) {
      return config.networkRoutes["AIRTELTIGO_ISHARE"];
    }
  }

  if (net === "AIRTELTIGO" || net === "AT") {
    if (config.networkRoutes["AIRTELTIGO"]) return config.networkRoutes["AIRTELTIGO"];
    if (config.networkRoutes["AIRTELTIGO_ISHARE"]) return config.networkRoutes["AIRTELTIGO_ISHARE"];
    if (config.networkRoutes["AIRTELTIGO_BIGTIME"]) return config.networkRoutes["AIRTELTIGO_BIGTIME"];
  }

  // 2. Direct network key match
  if (config.networkRoutes[net]) {
    return config.networkRoutes[net];
  }

  // 3. Normalized prefix fallback
  for (const base of ["MTN", "TELECEL"]) {
    if (net.startsWith(base) && config.networkRoutes[base]) {
      return config.networkRoutes[base];
    }
  }

  // 4. Configured default provider fallback
  if (config.defaultProvider && config.defaultProvider !== "MANUAL") {
    return config.defaultProvider;
  }

  // 5. Fallback: If Tskconnect is active, return TSKCONNECT; else MANUAL
  if (isTskconnectActive(config.tskconnect)) {
    return "TSKCONNECT";
  }

  return "MANUAL";
}

/**
 * Dispatch an individual order to its assigned API provider
 */
export async function dispatchOrder(
  orderId: number,
  options: { force?: boolean } = {}
): Promise<ProviderDispatchResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { dataPackage: true },
  });

  if (!order) {
    return { success: false, provider: "MANUAL", error: "Order not found" };
  }

  if (order.status !== "PENDING" && !options.force) {
    return {
      success: true,
      provider: "MANUAL",
      status: order.status,
      error: `Order is already in ${order.status} status`,
    };
  }

  // Sandbox test orders must NEVER be sent to live network providers
  if (order.isSandbox && !options.force) {
    return {
      success: true,
      provider: "MANUAL",
      status: order.status,
      error: "Sandbox test order is isolated from live provider routing.",
    };
  }

  if (order.providerReference && !options.force) {
    return {
      success: true,
      provider: order.providerReference.startsWith("TSKCONNECT:") ? "TSKCONNECT" : "MANUAL",
      status: order.status,
      error: `Order already dispatched to provider (${order.providerReference})`,
    };
  }

  const config = await getProviderRoutingConfig();

  // If master routing switch is disabled, enforce strict manual export mode
  if (!config.enabled) {
    return {
      success: true,
      provider: "MANUAL",
      error: "Provider routing is currently disabled. Order remains in PENDING for manual export.",
    };
  }

  const provider = await getProviderForNetwork(
    order.network,
    order.dataPackage?.name || order.dataPackage?.description
  );

  if (provider === "MANUAL") {
    return {
      success: true,
      provider: "MANUAL",
      status: "PENDING",
    };
  }

  // -------------------------------------------------------------------------
  // Dispatched to TSKCONNECT
  // -------------------------------------------------------------------------
  if (provider === "TSKCONNECT") {
    if (!config.tskconnect.enabled || !config.tskconnect.apiKey) {
      return {
        success: false,
        provider: "TSKCONNECT",
        error: "Tskconnect integration is disabled or missing API key in settings.",
      };
    }

    const client = new TskconnectClient(config.tskconnect);
    const tskStartTime = Date.now();
    const carrier = normalizeTskconnectNetwork(order.network);
    const packageId = resolveTskconnectPackageId(
      order.network,
      order.gbAmount,
      order.dataPackage?.providerProductId
    );
    const reference = order.externalReference || generateTskconnectReference(order.id);
    const idempotencyKey = reference;

    let cleanRecipient = order.phoneNumber.trim();
    if (cleanRecipient.startsWith("+233")) cleanRecipient = "0" + cleanRecipient.slice(4);
    else if (cleanRecipient.startsWith("233")) cleanRecipient = "0" + cleanRecipient.slice(3);

    const submitPayload = {
      network: carrier,
      packageId,
      recipient: cleanRecipient,
      reference,
      idempotencyKey,
    };

    try {
      const submitRes = await client.submitOrder(submitPayload);
      const durationMs = Date.now() - tskStartTime;

      const tskOrderId = submitRes.data?.orderId || reference;
      const providerRef = `TSKCONNECT:${tskOrderId}`;
      const rawStatus = submitRes.data?.status || "PENDING";
      const mappedStatus = mapTskconnectStatus(rawStatus);

      await prisma.order.update({
        where: { id: order.id },
        data: {
          provider: "TSKCONNECT",
          providerReference: providerRef,
          externalReference: submitRes.data?.reference || reference,
          failureReason: null,
        },
      });

      // Record Order API Log
      await recordOrderApiLog({
        orderId: order.id,
        provider: "TSKCONNECT",
        action: "SUBMIT_ORDER",
        endpoint: `${config.tskconnect.baseUrl || DEFAULT_TSKCONNECT_BASE_URL}/orders`,
        method: "POST",
        requestPayload: submitPayload,
        responsePayload: submitRes,
        statusCode: 201,
        success: true,
        providerReference: providerRef,
        durationMs,
      });

      const targetStatus: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "CANCELLED" =
        ["SUCCESS", "FAILED", "CANCELLED"].includes(mappedStatus)
          ? mappedStatus
          : "PROCESSING";

      if (targetStatus !== order.status) {
        await changeOrderStatus(
          order.id,
          targetStatus,
          `Dispatched to Tskconnect (${carrier} ${packageId}, Order ID: ${tskOrderId})`,
          { id: "system", label: "Tskconnect Gateway" },
          { force: true }
        );
      } else {
        await prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: order.status,
            previousStatus: order.status,
            note: `Dispatched to Tskconnect (${carrier} ${packageId}, Order ID: ${tskOrderId})`,
            changedBy: "Tskconnect Gateway",
          },
        });
      }

      return {
        success: true,
        provider: "TSKCONNECT",
        providerReference: providerRef,
        status: targetStatus,
        raw: submitRes,
      };
    } catch (err: any) {
      const durationMs = Date.now() - tskStartTime;
      const rawErrMsg = err?.message || "Failed to dispatch order to Tskconnect";
      const isUnverified =
        err?.code === "UNVERIFIED_NUMBER" ||
        (typeof rawErrMsg === "string" && rawErrMsg.toLowerCase().includes("unverified"));
      const errMsg = isUnverified
        ? `Unverified number: ${rawErrMsg}`
        : sanitizeCustomerFacingText(rawErrMsg) || "Delivery processing failed";

      if (isUnverified && carrier === "MTN") {
        try {
          const { recordUnverifiedMtnNumber } = await import("../mtn-verification");
          await recordUnverifiedMtnNumber({ number: order.phoneNumber });
          const canonical = normalizeGhanaPhoneNumber(order.phoneNumber);
          await prisma.blockedMtnNumber.updateMany({
            where: { normalizedNumber: canonical },
            data: { status: "REJECTED" },
          });
          await prisma.acceptedMtnNumber.deleteMany({
            where: { normalizedNumber: canonical },
          });
        } catch {}
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          failureReason: errMsg,
          ...(isUnverified ? { status: "FAILED" } : {}),
        },
      });

      await recordOrderApiLog({
        orderId: order.id,
        provider: "TSKCONNECT",
        action: "SUBMIT_ORDER",
        endpoint: `${config.tskconnect.baseUrl || DEFAULT_TSKCONNECT_BASE_URL}/orders`,
        method: "POST",
        requestPayload: submitPayload,
        responsePayload: err?.rawResponse || { error: errMsg, code: err?.code },
        statusCode: err?.status || 500,
        success: false,
        errorMessage: errMsg,
        providerReference: `TSKCONNECT:${reference}`,
        durationMs,
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: isUnverified ? "FAILED" : order.status,
          previousStatus: order.status,
          note: `Dispatch failed: ${errMsg}`,
          changedBy: "Tskconnect Gateway",
        },
      });

      return {
        success: false,
        provider: "TSKCONNECT",
        error: errMsg,
      };
    }
  }

  return { success: false, provider, error: `Unsupported or unconfigured provider: ${provider}` };
}

/**
 * Normalizes a Ghanaian phone number to its last 9 digits for robust matching across formats
 */
export function normalizePhoneLast9(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

/**
 * Synchronizes an order dispatched to Tskconnect by polling its status endpoint.
 */
export async function syncTskconnectOrder(
  orderIdOrRecord: number | {
    id: number;
    status: string;
    providerReference: string | null;
    updatedAt: Date;
    externalReference?: string | null;
  },
  actorLabel = "Automatic Status Poller",
  options: { forceCheck?: boolean } = {}
): Promise<{ changed: boolean; previousStatus?: string; newStatus?: string; error?: string }> {
  const orderId = typeof orderIdOrRecord === "number" ? orderIdOrRecord : orderIdOrRecord.id;

  const order = typeof orderIdOrRecord === "number"
    ? await prisma.order.findUnique({ where: { id: orderId } })
    : orderIdOrRecord;

  if (!order) {
    return { changed: false, error: "Order not found" };
  }

  const config = await getProviderRoutingConfig();
  if (!config.tskconnect.enabled || !config.tskconnect.apiKey) {
    return { changed: false, error: "Tskconnect integration is not enabled or missing API key." };
  }

  const rawRef = order.providerReference?.replace(/^TSKCONNECT:/, "").trim();
  const queryKey = rawRef || order.externalReference;
  if (!queryKey) {
    return { changed: false, error: "No providerReference or externalReference on order." };
  }

  const client = new TskconnectClient(config.tskconnect);
  const startTime = Date.now();

  try {
    let orderRes: any = null;
    try {
      if (rawRef) {
        orderRes = await client.getOrderById(rawRef);
      } else if (order.externalReference) {
        orderRes = await client.getOrderByReference(order.externalReference);
      }
    } catch (e: any) {
      if (order.externalReference && rawRef) {
        try {
          orderRes = await client.getOrderByReference(order.externalReference);
        } catch {}
      }
      if (!orderRes) throw e;
    }

    const durationMs = Date.now() - startTime;
    const orderData = orderRes?.data || orderRes;
    const rawStatus = orderData?.status;
    const mapped = mapTskconnectStatus(rawStatus);

    await recordOrderApiLog({
      orderId: order.id,
      provider: "TSKCONNECT",
      action: "SYNC_ORDER",
      endpoint: `${config.tskconnect.baseUrl || DEFAULT_TSKCONNECT_BASE_URL}/orders/${queryKey}`,
      method: "GET",
      responsePayload: orderRes,
      statusCode: 200,
      success: true,
      providerReference: order.providerReference || `TSKCONNECT:${queryKey}`,
      durationMs,
    });

    if (mapped !== order.status && ["SUCCESS", "FAILED", "PROCESSING", "CANCELLED"].includes(mapped)) {
      const reason =
        mapped === "FAILED"
          ? orderData?.failureReason || `Order failed upstream on Tskconnect (${rawStatus})`
          : `Status updated to ${mapped} from Tskconnect`;

      await changeOrderStatus(
        order.id,
        mapped,
        reason,
        { id: "system", label: actorLabel },
        { force: true }
      );
      return { changed: true, previousStatus: order.status, newStatus: mapped };
    }

    return { changed: false, previousStatus: order.status, newStatus: order.status };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    await recordOrderApiLog({
      orderId: order.id,
      provider: "TSKCONNECT",
      action: "SYNC_ORDER",
      endpoint: `${config.tskconnect.baseUrl || DEFAULT_TSKCONNECT_BASE_URL}/orders/${queryKey}`,
      method: "GET",
      responsePayload: err?.rawResponse || { error: err?.message },
      statusCode: err?.status || 500,
      success: false,
      errorMessage: err?.message,
      providerReference: order.providerReference || `TSKCONNECT:${queryKey}`,
      durationMs,
    });
    return { changed: false, error: err?.message || "Sync failed" };
  }
}

/**
 * Forwards a Not Received dispute report to Tskconnect for an order fulfilled via Tskconnect.
 * Calls POST /v1/orders/:id/not-received on Tskconnect.
 */
export async function forwardNotReceivedToProvider(
  orderId: number,
  params: { reason?: string; note?: string; entryId?: string | number } = {}
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, error: "Order not found" };

    const config = await getProviderRoutingConfig();
    if (!config.tskconnect.enabled || !config.tskconnect.apiKey) {
      return { success: false, error: "Tskconnect integration disabled" };
    }

    const rawRef = order.providerReference?.replace(/^TSKCONNECT:/, "").trim();
    const queryKey = rawRef || order.externalReference;
    if (!queryKey) {
      return { success: false, error: "No providerReference or externalReference on order" };
    }

    const client = new TskconnectClient(config.tskconnect);
    const startTime = Date.now();
    try {
      const res = await client.submitNotReceived(queryKey, {
        reason: params.reason,
        note: params.note,
        message: params.note,
        entryId: params.entryId,
      });

      await recordOrderApiLog({
        orderId: order.id,
        provider: "TSKCONNECT",
        action: "NOT_RECEIVED",
        endpoint: `${config.tskconnect.baseUrl || DEFAULT_TSKCONNECT_BASE_URL}/orders/${encodeURIComponent(queryKey)}/not-received`,
        method: "POST",
        requestPayload: { orderId: queryKey, ...params },
        responsePayload: res,
        statusCode: 200,
        success: true,
        providerReference: order.providerReference || `TSKCONNECT:${queryKey}`,
        durationMs: Date.now() - startTime,
      });

      return { success: true, data: res.data };
    } catch (err: any) {
      await recordOrderApiLog({
        orderId: order.id,
        provider: "TSKCONNECT",
        action: "NOT_RECEIVED",
        endpoint: `${config.tskconnect.baseUrl || DEFAULT_TSKCONNECT_BASE_URL}/orders/${encodeURIComponent(queryKey)}/not-received`,
        method: "POST",
        requestPayload: { orderId: queryKey, ...params },
        responsePayload: err?.rawResponse || { error: err?.message },
        statusCode: err?.status || 500,
        success: false,
        errorMessage: err?.message,
        providerReference: order.providerReference || `TSKCONNECT:${queryKey}`,
        durationMs: Date.now() - startTime,
      });

      return { success: false, error: err?.message || "Failed to submit dispute to provider" };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Unexpected error forwarding dispute" };
  }
}

/**
 * Syncs the dispute status and evidence from Tskconnect for an order.
 * Calls GET /v1/orders/:id/not-received on Tskconnect.
 */
export async function syncTskconnectDispute(
  orderIdOrRecord: number | { id: number; providerReference: string | null; externalReference?: string | null },
  reportId?: string
): Promise<{ updated: boolean; status?: string; evidence?: any; error?: string }> {
  try {
    const orderId = typeof orderIdOrRecord === "number" ? orderIdOrRecord : orderIdOrRecord.id;
    const order = typeof orderIdOrRecord === "number"
      ? await prisma.order.findUnique({ where: { id: orderId } })
      : orderIdOrRecord;

    if (!order) return { updated: false, error: "Order not found" };

    const config = await getProviderRoutingConfig();
    if (!config.tskconnect.enabled || !config.tskconnect.apiKey) {
      return { updated: false, error: "Tskconnect integration disabled" };
    }

    const rawRef = order.providerReference?.replace(/^TSKCONNECT:/, "").trim();
    const queryKey = rawRef || order.externalReference;
    if (!queryKey) {
      return { updated: false, error: "No providerReference or externalReference on order" };
    }

    const client = new TskconnectClient(config.tskconnect);
    const startTime = Date.now();
    try {
      let res: any;
      try {
        res = await client.getNotReceived(queryKey);
      } catch (firstErr: any) {
        // If queryKey had a prefix like TSK-238228, retry with pure numeric ID e.g. 238228
        const stripped = queryKey.replace(/^[A-Z0-9]+-/, "").trim();
        if (stripped && stripped !== queryKey) {
          res = await client.getNotReceived(stripped);
        } else {
          throw firstErr;
        }
      }

      const dispute = res?.data;
      if (!dispute) return { updated: false };

      const report = reportId
        ? await prisma.deliveryReport.findUnique({ where: { id: reportId } })
        : await prisma.deliveryReport.findFirst({
            where: { orderId: order.id },
            orderBy: { createdAt: "desc" },
          });

      if (!report) return { updated: false, error: "Report not found" };

      const rawStatus = dispute.internalStatus || dispute.status;
      const targetStatus = mapTskconnectDisputeStatus(rawStatus);
      const updateData: any = {};
      const eventsToCreate: any[] = [];

      if (targetStatus && targetStatus !== report.status) {
        updateData.status = targetStatus;
        if (targetStatus === "RESOLVED" || targetStatus === "CONFIRM_SENT" || targetStatus === "REFUNDED") {
          updateData.resolvedAt = dispute.resolvedAt ? new Date(dispute.resolvedAt) : new Date();
          updateData.resolvedBy = "TSK05";
        }
        eventsToCreate.push({
          reportId: report.id,
          type: targetStatus === "CONFIRM_SENT" ? "CONFIRM_SENT" : targetStatus,
          message: `Provider status updated to ${targetStatus}`,
          actorLabel: "TSK05",
        });
      }

      const carrierResponse = dispute.adminResponse || dispute.carrierNote || dispute.note || dispute.message;
      if (carrierResponse && !report.adminResponse) {
        updateData.adminResponse = carrierResponse;
        updateData.respondedAt = dispute.respondedAt ? new Date(dispute.respondedAt) : new Date();
        updateData.respondedBy = "TSK05";
      }

      // Evidence handling
      let evidenceUrl: string | null = null;
      if (typeof dispute.evidence === "string") {
        evidenceUrl = dispute.evidence;
      } else if (dispute.evidence && typeof dispute.evidence === "object") {
        evidenceUrl = dispute.evidence.url || dispute.evidence.proofImage || null;
      }
      if (!evidenceUrl && dispute.evidenceUrl) {
        evidenceUrl = dispute.evidenceUrl;
      }

      if (evidenceUrl && typeof evidenceUrl === "string" && evidenceUrl.startsWith("/")) {
        const base = (config.tskconnect.baseUrl || DEFAULT_TSKCONNECT_BASE_URL).replace(/\/v1\/?$/, "");
        evidenceUrl = `${base}${evidenceUrl}`;
      }

      if (evidenceUrl && (!report.proofImage || report.proofImage !== evidenceUrl)) {
        updateData.proofImage = evidenceUrl;
        updateData.proofImageMime = evidenceUrl.endsWith(".png") ? "image/png" : "image/jpeg";
        updateData.proofImageUploadedAt = dispute.proofImageUploadedAt ? new Date(dispute.proofImageUploadedAt) : new Date();
        updateData.proofImageUploadedBy = "TSK05";
        eventsToCreate.push({
          reportId: report.id,
          type: "EVIDENCE_UPLOADED",
          message: "Carrier delivery evidence provided",
          actorLabel: "TSK05",
        });
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.$transaction(async (tx) => {
          await tx.deliveryReport.update({
            where: { id: report.id },
            data: updateData,
          });
          for (const ev of eventsToCreate) {
            await tx.deliveryReportEvent.create({ data: ev });
          }
        });

        await recordOrderApiLog({
          orderId: order.id,
          provider: "TSKCONNECT",
          action: "SYNC_ORDER",
          endpoint: `${config.tskconnect.baseUrl || DEFAULT_TSKCONNECT_BASE_URL}/orders/${encodeURIComponent(queryKey)}/not-received`,
          method: "GET",
          responsePayload: res,
          statusCode: 200,
          success: true,
          providerReference: order.providerReference || `TSKCONNECT:${queryKey}`,
          durationMs: Date.now() - startTime,
        });

        return { updated: true, status: targetStatus, evidence: evidenceUrl };
      }

      return { updated: false, status: targetStatus };
    } catch (err: any) {
      await recordOrderApiLog({
        orderId: order.id,
        provider: "TSKCONNECT",
        action: "SYNC_ORDER",
        endpoint: `${config.tskconnect.baseUrl || DEFAULT_TSKCONNECT_BASE_URL}/orders/${encodeURIComponent(queryKey)}/not-received`,
        method: "GET",
        responsePayload: err?.rawResponse || { error: err?.message },
        statusCode: err?.status || 500,
        success: false,
        errorMessage: err?.message,
        providerReference: order.providerReference || `TSKCONNECT:${queryKey}`,
        durationMs: Date.now() - startTime,
      });

      return { updated: false, error: err?.message || "Failed to query dispute status" };
    }
  } catch (err: any) {
    return { updated: false, error: err?.message || "Unexpected error syncing dispute" };
  }
}

/**
 * Reconciles OrderBatch records, ensuring recipient counts, total GB, total amount,
 * and batch status are strictly accurate based on child orders.
 */
export async function splitMultiDispatchBatches(): Promise<void> {
  try {
    const activeBatches = await prisma.orderBatch.findMany({
      where: {
        status: { in: ["PENDING", "PROCESSING"] },
      },
      include: {
        _count: { select: { orders: true } },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    for (const b of activeBatches) {
      const actualCount = b._count.orders;
      if (actualCount === 0) {
        await prisma.orderBatch.delete({ where: { id: b.id } }).catch(() => {});
      } else {
        const aggregates = await prisma.order.aggregate({
          where: { batchId: b.id },
          _sum: { gbAmount: true, amount: true },
        });
        const currentGb = aggregates._sum.gbAmount || 0;
        const currentAmt = aggregates._sum.amount || 0;

        if (actualCount !== b.totalRecipients || currentGb !== b.totalGb || currentAmt !== b.totalAmount) {
          await prisma.orderBatch.update({
            where: { id: b.id },
            data: {
              totalRecipients: actualCount,
              totalGb: currentGb,
              totalAmount: currentAmt,
            },
          });
        }
        const { recomputeBatchStatus } = await import("../orders");
        await recomputeBatchStatus(b.id);
      }
    }
  } catch (err) {
    console.error("[splitMultiDispatchBatches] Error:", err);
  }
}

/**
 * Bulk dispatch a list of order IDs according to network routing
 */
export async function dispatchOrdersBatch(orderIds: number[]): Promise<{
  total: number;
  dispatched: number;
  failed: number;
  skippedManual: number;
  results: Array<{ orderId: number; result: ProviderDispatchResult }>;
}> {
  let dispatched = 0;
  let failed = 0;
  let skippedManual = 0;
  const results: Array<{ orderId: number; result: ProviderDispatchResult }> = [];

  for (const id of orderIds) {
    try {
      const result = await dispatchOrder(id);
      results.push({ orderId: id, result });
      if (result.provider === "MANUAL") {
        skippedManual += 1;
      } else if (result.success) {
        dispatched += 1;
      } else {
        failed += 1;
      }
    } catch (err: any) {
      failed += 1;
      results.push({
        orderId: id,
        result: { success: false, provider: "MANUAL", error: err?.message || "Internal error" },
      });
    }
  }

  return {
    total: orderIds.length,
    dispatched,
    failed,
    skippedManual,
    results,
  };
}

/**
 * Backward compatibility stubs for legacy sync calls (no-op)
 */
export async function syncBigwindataOrder(
  _orderIdOrRecord: any,
  _actorLabel = "Legacy Sync",
  _options: any = {}
): Promise<{ changed: boolean; error?: string }> {
  return { changed: false };
}

export async function syncGhconnectOrder(
  _orderIdOrRecord: any,
  _actorLabel = "Legacy Sync",
  _options: any = {}
): Promise<{ changed: boolean; error?: string }> {
  return { changed: false };
}

export async function syncBigwinTelecelOrder(
  _orderIdOrRecord: any,
  _actorLabel = "Legacy Sync",
  _options: any = {}
): Promise<{ changed: boolean; error?: string }> {
  return { changed: false };
}

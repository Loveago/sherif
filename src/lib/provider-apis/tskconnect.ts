import crypto from "crypto";
import type {
  TskconnectConfig,
  TskconnectPackage,
  NumberVerificationResult,
  TskconnectDisputeStatus,
  TskconnectNotReceivedParams,
  TskconnectDisputeData,
  TskconnectEvidenceData,
} from "./types";
import { normalizeGhanaPhoneNumber } from "@/lib/phone-utils";

export type {
  TskconnectDisputeStatus,
  TskconnectNotReceivedParams,
  TskconnectDisputeData,
  TskconnectEvidenceData,
};

export const DEFAULT_TSKCONNECT_BASE_URL = "https://tsk05.net/v1";

export interface TskconnectSingleOrderParams {
  network: string; // "MTN" | "TELECEL" | "AIRTELTIGO"
  packageId: string; // e.g. "mtn-1gb", "telecel-10gb"
  recipient: string; // Ghanaian 10-digit number (e.g. 0241234567 or +233241234567)
  reference?: string; // external reference
  idempotencyKey?: string;
}

export interface TskconnectBatchOrderParams {
  network: string; // "MTN" | "TELECEL" | "AIRTELTIGO"
  externalReference: string;
  entries: Array<{ number: string; allocationGB: number }>;
  idempotencyKey?: string;
}

export interface TskconnectOrderData {
  orderId: string;
  reference?: string;
  network: string;
  package?: string;
  recipient?: string;
  amount?: number;
  status: string;
  createdAt?: string;
  failureReason?: string | null;
  completedAt?: string | null;
}

export interface TskconnectBatchOrderData {
  orderId: string;
  batchCode?: string;
  externalReference: string;
  status: string;
  cost?: number;
  totalCount: number;
  processedCount: number;
  entries: Array<{
    id: number | string;
    number: string;
    allocationGB: number;
    status: string;
  }>;
  filteredOutEntries?: Array<{
    number: string;
    allocationGB: number;
    reason?: string;
  }>;
}

/**
 * Normalizes internal carrier or network identifiers to Tskconnect carrier codes:
 * Carrier code must be: "MTN", "TELECEL", or "AIRTELTIGO"
 */
export function normalizeTskconnectNetwork(net: string): "MTN" | "TELECEL" | "AIRTELTIGO" {
  const upper = (net || "").trim().toUpperCase();
  if (upper.startsWith("MTN")) return "MTN";
  if (upper.startsWith("TELECEL") || upper.includes("VODAFONE")) return "TELECEL";
  if (upper.startsWith("AIRTELTIGO") || upper.startsWith("AT")) return "AIRTELTIGO";
  return "MTN";
}

/**
 * Derives a valid packageId identifier conforming to Tskconnect naming:
 * e.g. "mtn-1gb", "telecel-10gb", "airteltigo-5gb"
 */
export function resolveTskconnectPackageId(
  network: string,
  gbAmount: number,
  providerProductId?: string | null
): string {
  if (providerProductId) {
    const clean = providerProductId.trim().toLowerCase().replace(/_/g, "-");
    if (clean.includes("-") && clean.endsWith("gb")) {
      return clean;
    }
  }

  const carrier = normalizeTskconnectNetwork(network).toLowerCase();
  const gb = Number.isInteger(gbAmount) ? String(gbAmount) : String(gbAmount).replace(".", "_");
  return `${carrier}-${gb}gb`;
}

/**
 * Generates an idempotent order reference string for Tskconnect orders
 */
export function generateTskconnectReference(orderId: number | string): string {
  return `CT-TSK-${orderId}`;
}

/**
 * Maps Tskconnect order statuses to internal CleanDataPacks statuses:
 * - PENDING, pending, order.accepted -> "PENDING"
 * - PROCESSING, processing, order.processing -> "PROCESSING"
 * - COMPLETED, completed, success, order.completed -> "SUCCESS"
 * - FAILED, failed, rejected, error, order.failed -> "FAILED"
 * - CANCELLED, cancelled -> "CANCELLED"
 */
export function mapTskconnectStatus(
  rawStatus?: string | null
): "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "CANCELLED" {
  const s = (rawStatus || "").trim().toLowerCase();
  if (["completed", "delivered", "sent", "processed", "success", "order.completed"].includes(s)) {
    return "SUCCESS";
  }
  if (["failed", "rejected", "error", "unsuccessful", "order.failed"].includes(s)) {
    return "FAILED";
  }
  if (["cancelled", "canceled", "order.cancelled"].includes(s)) {
    return "CANCELLED";
  }
  if (["processing", "in_progress", "sending", "order.processing"].includes(s)) {
    return "PROCESSING";
  }
  return "PENDING";
}

/**
 * Maps Tskconnect dispute status to internal DeliveryReport status:
 * - "pending_resolution" -> "UNDER_REVIEW"
 * - "confirmed_sent"     -> "CONFIRM_SENT"
 * - "resolved"           -> "RESOLVED"
 * - "refunded"           -> "REFUNDED"
 */
export function mapTskconnectDisputeStatus(
  disputeStatus?: string | null
): "UNDER_REVIEW" | "CONFIRM_SENT" | "RESOLVED" | "REFUNDED" {
  const s = (disputeStatus || "").trim().toLowerCase().replace(/[\s_-]+/g, "_");
  if (
    [
      "confirmed_sent",
      "confirm_sent",
      "delivered",
      "report_not_received_confirmed_sent",
      "report_confirmed_sent",
      "confirmed",
    ].includes(s)
  ) {
    return "CONFIRM_SENT";
  }
  if (["refunded", "refund", "report_not_received_refunded"].includes(s)) {
    return "REFUNDED";
  }
  if (
    [
      "resolved",
      "rejected",
      "closed",
      "report_not_received_resolved",
      "resolve",
    ].includes(s)
  ) {
    return "RESOLVED";
  }
  return "UNDER_REVIEW";
}

/**
 * Maps internal DeliveryReport status to Tskconnect dispute status string:
 * - CONFIRM_SENT / DELIVERED -> "confirmed_sent"
 * - REFUNDED                 -> "refunded"
 * - RESOLVED / REJECTED      -> "resolved"
 * - other                    -> "pending_resolution"
 */
export function mapInternalToTskconnectDisputeStatus(
  internalStatus?: string | null
): TskconnectDisputeStatus {
  const s = (internalStatus || "").trim().toUpperCase();
  if (s === "CONFIRM_SENT" || s === "DELIVERED") return "confirmed_sent";
  if (s === "REFUNDED") return "refunded";
  if (s === "RESOLVED" || s === "REJECTED") return "resolved";
  return "pending_resolution";
}

/**
 * Client for interacting with the Tskconnect Developer API (https://tsk05.net/v1)
 */
export class TskconnectClient {
  private apiKey: string;
  private baseUrl: string;
  private webhookSecret: string;

  constructor(config?: Partial<TskconnectConfig>) {
    this.apiKey = config?.apiKey || process.env.TSKCONNECT_API_KEY || "";
    this.baseUrl = (
      config?.baseUrl ||
      process.env.TSKCONNECT_BASE_URL ||
      DEFAULT_TSKCONNECT_BASE_URL
    ).replace(/\/+$/, "");
    this.webhookSecret =
      config?.webhookSecret || process.env.TSKCONNECT_WEBHOOK_SECRET || "";
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    customHeaders: Record<string, string> = {}
  ): Promise<T> {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    // Tskconnect base URL is https://tsk05.net/v1
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...customHeaders,
      ...((options.headers as Record<string, string>) || {}),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        const parseErr = new Error(
          `Tskconnect HTTP ${res.status}: Invalid JSON response: ${text.slice(0, 150)}`
        ) as Error & { status?: number; rawText?: string; endpoint?: string; url?: string };
        parseErr.status = res.status;
        parseErr.rawText = text;
        parseErr.endpoint = cleanEndpoint;
        parseErr.url = url;
        throw parseErr;
      }

      if (!res.ok) {
        const errorCode = json?.error?.code || json?.errorCode || `HTTP_${res.status}`;
        const errorMsg =
          json?.error?.message ||
          json?.message ||
          json?.error ||
          `Tskconnect request failed with HTTP ${res.status}`;
        const requestId = json?.requestId;

        const err = new Error(errorMsg) as Error & {
          status?: number;
          code?: string;
          requestId?: string;
          rawResponse?: any;
          rawText?: string;
          endpoint?: string;
          url?: string;
        };
        err.status = res.status;
        err.code = errorCode;
        err.requestId = requestId;
        err.rawResponse = json;
        err.rawText = text;
        err.endpoint = cleanEndpoint;
        err.url = url;
        throw err;
      }

      return json as T;
    } catch (err: any) {
      if (err.name === "AbortError") {
        const timeoutErr = new Error("Tskconnect request timed out after 25 seconds") as Error & {
          status?: number;
          endpoint?: string;
          url?: string;
        };
        timeoutErr.status = 504;
        timeoutErr.endpoint = cleanEndpoint;
        timeoutErr.url = url;
        throw timeoutErr;
      }
      if (!err.endpoint) err.endpoint = cleanEndpoint;
      if (!err.url) err.url = url;
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Phone Number Verification (POST /v1/numbers/verify)
   * Pre-screens Ghanaian phone numbers (up to 100 per call, chunks automatically if >100)
   */
  async verifyNumbers(numbers: string[]): Promise<
    NumberVerificationResult & {
      unverifiedNumbers: string[];
      results?: Array<{
        number: string;
        network: string;
        valid: boolean;
        verified: boolean;
        canOrder: boolean;
        note?: string;
      }>;
      summary?: {
        total: number;
        verified: number;
        unverified: number;
        invalid: number;
      };
      raw?: any;
    }
  > {
    if (!numbers.length) {
      return {
        validNumbers: [],
        invalidNumbers: [],
        unverifiedNumbers: [],
        results: [],
        summary: { total: 0, verified: 0, unverified: 0, invalid: 0 },
      };
    }

    const cleanNumbers = numbers.map((n) => {
      let s = n.trim();
      if (s.startsWith("+233")) s = "0" + s.slice(4);
      else if (s.startsWith("233")) s = "0" + s.slice(3);
      return s;
    });

    const chunkSize = 100;
    const chunks: string[][] = [];
    for (let i = 0; i < cleanNumbers.length; i += chunkSize) {
      chunks.push(cleanNumbers.slice(i, i + chunkSize));
    }

    const allVerified: string[] = [];
    const allUnverified: string[] = [];
    const allInvalid: string[] = [];
    const allResults: any[] = [];
    let lastRaw: any = null;

    for (const chunk of chunks) {
      const res = await this.request<any>("/numbers/verify", {
        method: "POST",
        body: JSON.stringify({ numbers: chunk }),
      });
      lastRaw = res;

      const data = res?.data || res;
      const verifiedList = Array.isArray(data?.verified) ? data.verified : [];
      const unverifiedList = Array.isArray(data?.unverified) ? data.unverified : [];
      const invalidList = Array.isArray(data?.invalid) ? data.invalid : [];
      const resultsList = Array.isArray(data?.results) ? data.results : [];

      for (const num of verifiedList) {
        const canonical = normalizeGhanaPhoneNumber(String(num));
        if (canonical && !allVerified.includes(canonical)) allVerified.push(canonical);
      }
      for (const num of unverifiedList) {
        const canonical = normalizeGhanaPhoneNumber(String(num));
        if (canonical && !allUnverified.includes(canonical)) allUnverified.push(canonical);
      }
      for (const num of invalidList) {
        allInvalid.push(String(num));
      }
      for (const r of resultsList) {
        allResults.push(r);
        const canon = normalizeGhanaPhoneNumber(String(r.number || ""));
        if (r.verified === true && canon && !allVerified.includes(canon)) {
          allVerified.push(canon);
        } else if (r.verified === false && r.valid === true && canon && !allUnverified.includes(canon)) {
          allUnverified.push(canon);
        } else if (r.valid === false && !allInvalid.includes(String(r.number))) {
          allInvalid.push(String(r.number));
        }
      }
    }

    return {
      validNumbers: allVerified,
      invalidNumbers: allInvalid,
      unverifiedNumbers: allUnverified,
      results: allResults,
      summary: {
        total: numbers.length,
        verified: allVerified.length,
        unverified: allUnverified.length,
        invalid: allInvalid.length,
      },
      raw: lastRaw,
    };
  }

  /**
   * Retrieves data bundle packages (GET /v1/packages?network={network})
   */
  async getPackages(network?: string): Promise<{ success: boolean; data: TskconnectPackage[] }> {
    const query = network ? `?network=${encodeURIComponent(normalizeTskconnectNetwork(network))}` : "";
    return this.request<{ success: boolean; data: TskconnectPackage[] }>(`/packages${query}`);
  }

  /**
   * Lists available carrier networks (GET /v1/networks)
   */
  async getNetworks(): Promise<{ success: boolean; data: any[] }> {
    return this.request<{ success: boolean; data: any[] }>("/networks");
  }

  /**
   * Account Wallet Balance (GET /v1/balance)
   */
  async getBalance(): Promise<{
    success: boolean;
    data: { balance: number; currency: string; environment: string };
    requestId: string;
  }> {
    return this.request<{
      success: boolean;
      data: { balance: number; currency: string; environment: string };
      requestId: string;
    }>("/balance");
  }

  /**
   * Dispatches a single mobile data order immediately (POST /v1/orders)
   */
  async submitOrder(params: TskconnectSingleOrderParams): Promise<{
    success: boolean;
    data: TskconnectOrderData;
    requestId: string;
  }> {
    const carrier = normalizeTskconnectNetwork(params.network);
    let recipient = params.recipient.trim();
    if (recipient.startsWith("+233")) recipient = "0" + recipient.slice(4);
    else if (recipient.startsWith("233")) recipient = "0" + recipient.slice(3);

    const idempotencyKey = params.idempotencyKey || params.reference || `CT-TXN-${Date.now()}`;

    const body: Record<string, string> = {
      network: carrier,
      packageId: params.packageId,
      recipient,
    };
    if (params.reference) {
      body.reference = params.reference;
    }

    return this.request<{
      success: boolean;
      data: TskconnectOrderData;
      requestId: string;
    }>(
      "/orders",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      {
        "Idempotency-Key": idempotencyKey,
      }
    );
  }

  /**
   * Submits a multi-recipient batch order (POST /v1/orders/batch)
   */
  async submitBatchOrder(params: TskconnectBatchOrderParams): Promise<{
    success: boolean;
    data: TskconnectBatchOrderData;
    requestId: string;
  }> {
    const carrier = normalizeTskconnectNetwork(params.network);
    const idempotencyKey = params.idempotencyKey || params.externalReference || `BATCH-${Date.now()}`;

    const cleanEntries = params.entries.map((e) => {
      let num = e.number.trim();
      if (num.startsWith("+233")) num = "0" + num.slice(4);
      else if (num.startsWith("233")) num = "0" + num.slice(3);
      return {
        number: num,
        allocationGB: e.allocationGB,
      };
    });

    return this.request<{
      success: boolean;
      data: TskconnectBatchOrderData;
      requestId: string;
    }>(
      "/orders/batch",
      {
        method: "POST",
        body: JSON.stringify({
          externalReference: params.externalReference,
          network: carrier,
          entries: cleanEntries,
        }),
      },
      {
        "Idempotency-Key": idempotencyKey,
      }
    );
  }

  /**
   * Fetches order status by orderId or batchCode (GET /v1/orders/:id)
   */
  async getOrderById(orderId: string): Promise<{
    success: boolean;
    data: TskconnectOrderData;
    requestId: string;
  }> {
    return this.request<{
      success: boolean;
      data: TskconnectOrderData;
      requestId: string;
    }>(`/orders/${encodeURIComponent(orderId)}`);
  }

  /**
   * Fetches order status using externalReference (GET /v1/orders/reference/:reference)
   */
  async getOrderByReference(reference: string): Promise<{
    success: boolean;
    data: TskconnectOrderData;
    requestId: string;
  }> {
    return this.request<{
      success: boolean;
      data: TskconnectOrderData;
      requestId: string;
    }>(`/orders/reference/${encodeURIComponent(reference)}`);
  }

  /**
   * Bulk checks status of up to 100 orders (POST /v1/orders/status)
   */
  async getOrdersBulkStatus(orderIds: string[]): Promise<{
    success: boolean;
    data: Array<TskconnectOrderData>;
    requestId: string;
  }> {
    return this.request<{
      success: boolean;
      data: Array<TskconnectOrderData>;
      requestId: string;
    }>("/orders/status", {
      method: "POST",
      body: JSON.stringify({ orderIds: orderIds.slice(0, 100) }),
    });
  }

  /**
   * Submits a customer 'Not Received' dispute report for an order or batch entry within 24 hours of delivery.
   * POST /v1/orders/:id/not-received
   */
  async submitNotReceived(
    orderId: string,
    params: TskconnectNotReceivedParams = {}
  ): Promise<{
    success: boolean;
    data: TskconnectDisputeData;
    requestId: string;
  }> {
    return this.request<{
      success: boolean;
      data: TskconnectDisputeData;
      requestId: string;
    }>(`/orders/${encodeURIComponent(orderId)}/not-received`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  /**
   * Retrieves dispute report status (pending_resolution, confirmed_sent, resolved, refunded) and evidence.
   * GET /v1/orders/:id/not-received
   */
  async getNotReceived(orderId: string): Promise<{
    success: boolean;
    data: TskconnectDisputeData;
    requestId: string;
  }> {
    return this.request<{
      success: boolean;
      data: TskconnectDisputeData;
      requestId: string;
    }>(`/orders/${encodeURIComponent(orderId)}/not-received`);
  }

  /**
   * Verifies incoming webhook HMAC-SHA256 signature
   * Formula: HMAC_SHA256(`${timestamp}.${rawBody}`, secret)
   */
  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string,
    timestampHeader: string,
    secretOverride?: string
  ): boolean {
    const secret = (secretOverride || this.webhookSecret || "").trim();
    if (!secret || !signatureHeader) return false;

    try {
      const payloadToSign = `${timestampHeader}.${rawBody}`;
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payloadToSign)
        .digest("hex");

      const cleanHeader = signatureHeader.replace(/^sha256=/i, "").trim();

      if (expectedSignature.length !== cleanHeader.length) {
        return false;
      }

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "utf-8"),
        Buffer.from(cleanHeader, "utf-8")
      );
    } catch {
      return false;
    }
  }
}

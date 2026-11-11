import { createHmac, timingSafeEqual } from "crypto";
import type { BundlePortalConfig } from "./types";

export const DEFAULT_BUNDLE_PORTAL_BASE_URL = "https://api.bundleportal.com/v2";

export type BundlePortalNetwork =
  | "mtn"
  | "mtn_2"
  | "mtn_3"
  | "telecel"
  | "airteltigo"
  | "ishare"
  | "bigtime";

export interface BundlePortalOrderResponse {
  success: boolean;
  message?: string;
  duplicate?: boolean;
  error?: string;
  code?: string;
  data?: {
    order_id?: string;
    reference?: string;
    network?: string;
    recipient?: string;
    bundle?: string;
    amount?: number;
    status?: string;
    new_balance?: number;
  };
}

export interface BundlePortalVerifyResponse {
  success: boolean;
  data?: {
    network: string;
    recipient: string;
    allowed: boolean;
    can_order: boolean;
    allowlist_message?: string | null;
    pending_order?: unknown;
  };
}

export interface BundlePortalBundleItem {
  id: number | string;
  network: string;
  size: string;
  size_gb: number;
  price: number;
  validity?: string;
}

export class BundlePortalError extends Error {
  statusCode: number;
  code?: string;
  raw?: unknown;

  constructor(message: string, statusCode = 500, code?: string, raw?: unknown) {
    super(message);
    this.name = "BundlePortalError";
    this.statusCode = statusCode;
    this.code = code;
    this.raw = raw;
  }
}

export function normalizeBundlePortalNetwork(
  network: string,
  mtnRoute: "mtn" | "mtn_2" | "mtn_3" = "mtn",
  packageNameOrDesc?: string | null
): BundlePortalNetwork {
  const n = (network || "").trim().toUpperCase();
  const sub = (packageNameOrDesc || "").trim().toUpperCase();

  if (n.includes("MTN")) {
    return mtnRoute === "mtn_2" || mtnRoute === "mtn_3" ? mtnRoute : "mtn";
  }
  if (n.includes("TELECEL") || n.includes("VODAFONE")) {
    return "telecel";
  }
  if (
    n === "AIRTELTIGO_BIGTIME" ||
    n === "AT_BIGTIME" ||
    n.includes("BIGTIME") ||
    sub.includes("BIGTIME") ||
    sub.includes("BIG TIME")
  ) {
    return "bigtime";
  }
  if (n.includes("AIRTEL") || n.includes("TIGO") || n === "AT") {
    return "airteltigo";
  }
  return "mtn";
}

export function mapBundlePortalStatus(
  status?: string | null
): "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "CANCELLED" {
  const s = (status || "").trim().toLowerCase();
  if (s === "completed" || s === "delivered" || s === "success" || s === "order.completed") {
    return "SUCCESS";
  }
  if (s === "failed" || s === "error" || s === "rejected" || s === "order.failed") {
    return "FAILED";
  }
  if (s === "cancelled" || s === "canceled" || s === "refunded" || s === "order.cancelled" || s === "order.refunded") {
    return "FAILED";
  }
  if (s === "processing" || s === "cached" || s === "queued" || s === "in_progress") {
    return "PROCESSING";
  }
  return "PENDING";
}

export function generateBundlePortalReference(orderId: number | string): string {
  return `CDP-BP-${orderId}-${Date.now().toString(36).toUpperCase()}`;
}

export function normalizeGhanaRecipient0(phone: string): string {
  let clean = (phone || "").trim().replace(/\s+/g, "");
  if (clean.startsWith("+233")) clean = "0" + clean.slice(4);
  else if (clean.startsWith("233") && clean.length >= 12) clean = "0" + clean.slice(3);
  return clean;
}

export class BundlePortalClient {
  private apiKey: string;
  private baseUrl: string;
  private webhookSecret: string;

  constructor(config: Partial<BundlePortalConfig>) {
    this.apiKey = (config.apiKey || "").trim();
    this.baseUrl = (config.baseUrl || DEFAULT_BUNDLE_PORTAL_BASE_URL).trim().replace(/\/+$/, "");
    this.webhookSecret = (config.webhookSecret || "").trim();
  }

  private async request<T = any>(payload: Record<string, unknown>): Promise<T> {
    if (!this.apiKey) {
      throw new BundlePortalError("Bundle Portal API key is not configured", 400, "missing_api_key");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (!res.ok || data?.success === false) {
        const msg =
          data?.message ||
          data?.error ||
          `Bundle Portal request failed with HTTP ${res.status}`;
        throw new BundlePortalError(msg, res.status, data?.code, data);
      }

      return data as T;
    } catch (err: any) {
      if (err instanceof BundlePortalError) throw err;
      if (err?.name === "AbortError") {
        throw new BundlePortalError("Bundle Portal request timed out after 30s", 504, "timeout");
      }
      throw new BundlePortalError(err?.message || "Bundle Portal network error", 502, "network_error");
    } finally {
      clearTimeout(timeout);
    }
  }

  async checkBalance(): Promise<{
    success: boolean;
    data?: { wallet_balance: number; currency: string; user?: { name?: string; email?: string } };
  }> {
    return this.request({ action: "check_balance" });
  }

  async verifyNumber(network: BundlePortalNetwork | string, recipient: string): Promise<BundlePortalVerifyResponse> {
    return this.request({
      action: "verify_number",
      network,
      recipient: normalizeGhanaRecipient0(recipient),
    });
  }

  async getBundles(network?: string): Promise<{
    success: boolean;
    data?: { bundles: BundlePortalBundleItem[]; count: number };
  }> {
    const payload: Record<string, unknown> = { action: "get_bundles" };
    if (network) payload.network = network;
    return this.request(payload);
  }

  async placeOrder(params: {
    network: BundlePortalNetwork | string;
    recipient: string;
    package_size: number;
    order_id?: string;
  }): Promise<BundlePortalOrderResponse> {
    return this.request({
      action: "place_order",
      network: params.network,
      recipient: normalizeGhanaRecipient0(params.recipient),
      package_size: params.package_size,
      ...(params.order_id ? { order_id: params.order_id } : {}),
    });
  }

  async setWebhook(webhookUrl: string): Promise<{
    success: boolean;
    data?: { webhook_url: string; webhook_secret?: string; events?: string[] };
  }> {
    return this.request({
      action: "set_webhook",
      webhook_url: webhookUrl,
    });
  }

  async getWebhook(): Promise<{
    success: boolean;
    data?: { webhook_url?: string | null; events?: string[] };
  }> {
    return this.request({ action: "get_webhook" });
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string, secretOverride?: string): boolean {
    const secret = (secretOverride || this.webhookSecret || "").trim();
    if (!secret || !signatureHeader) return false;
    const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
    try {
      const a = Buffer.from(expected, "utf8");
      const b = Buffer.from(signatureHeader.trim(), "utf8");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}

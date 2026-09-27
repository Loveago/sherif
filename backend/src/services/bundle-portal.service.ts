import axios, { AxiosError } from 'axios';
import { getProviderCredentials } from './provider-credentials.service.js';

export type BundlePortalNetwork = 'telecel' | 'airteltigo' | 'mtn' | 'mtn_2' | 'mtn_3' | 'ishare';

export interface BundlePortalResponse<T = Record<string, unknown>> {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  data?: T;
}

export interface BundlePortalOrderData {
  order_id?: string;
  reference?: string;
  network?: string;
  recipient?: string;
  bundle?: string;
  amount?: number;
  status?: string;
  new_balance?: number;
  failure_reason?: string | null;
  [key: string]: unknown;
}

export interface BundlePortalTransaction {
  order_id: string;
  type: string;
  network: string;
  bundle: string;
  amount: number;
  phone_number: string;
  status: string;
  created_at: string;
  [key: string]: unknown;
}

export interface BundlePortalBundleItem {
  id: number;
  network: string;
  size: string;
  size_gb: number;
  price: number;
  validity: string;
  pricing_source?: string;
  has_custom_price?: boolean;
  has_role_price?: boolean;
}

/**
 * Error codes the Bundle Portal docs mark as retry-later rather than permanent:
 *  409 pending_order / network_locked, 403 channel_locked / paused / unavailable,
 *  503 order_capacity_busy / feature_disabled.
 *
 * not_allowlisted and role_locked are NOT included — no order is created for them
 * and retrying does not help, so they should fail cleanly instead of being deferred.
 */
const RETRYABLE_ERROR_CODES = new Set([
  'pending_order',
  'network_locked',
  'channel_locked',
  'paused',
  'unavailable',
  'order_capacity_busy',
  'feature_disabled',
]);

/** HTTP statuses the docs treat as retry-later, not permanent. */
const RETRYABLE_HTTP_STATUSES = new Set([402, 409, 429, 500, 503]);

export class BundlePortalError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'BundlePortalError';
  }
}

export const isRetryableBundlePortalError = (error: unknown): boolean => {
  if (error instanceof BundlePortalError) {
    if (error.code && RETRYABLE_ERROR_CODES.has(error.code)) return true;
    if (error.status && RETRYABLE_HTTP_STATUSES.has(error.status)) return true;
  }
  return false;
};

const readRetryAfterSeconds = (
  headers: Record<string, unknown>,
  body: Record<string, unknown> | undefined,
): number | undefined => {
  const headerValue = headers['retry-after'];
  const bodyValue = body?.retry_after;
  const seconds = Number(headerValue ?? bodyValue);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
};

class BundlePortalClient {
  private async request<T>(payload: Record<string, unknown>): Promise<BundlePortalResponse<T>> {
    const credentials = await getProviderCredentials('bundleportal');
    if (!credentials.apiKey) throw new Error('Bundle Portal API key is not configured');

    try {
      const { data, status, headers } = await axios.post<BundlePortalResponse<T>>(credentials.baseUrl, payload, {
        headers: {
          'x-api-key': credentials.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
      });

      if (!data?.success) {
        const retryAfterSeconds = readRetryAfterSeconds(headers as Record<string, unknown>, { ...data });
        throw new BundlePortalError(
          data?.message || data?.error || 'Bundle Portal request failed',
          data?.code,
          status,
          retryAfterSeconds,
        );
      }
      return data;
    } catch (error) {
      if (error instanceof BundlePortalError) throw error;

      if (error instanceof AxiosError && error.response) {
        const body = error.response.data as Record<string, unknown> | undefined;
        const retryAfterSeconds = readRetryAfterSeconds(
          error.response.headers as Record<string, unknown>,
          body,
        );
        throw new BundlePortalError(
          String(body?.message || body?.error || `Bundle Portal HTTP ${error.response.status}`),
          typeof body?.code === 'string' ? body.code : undefined,
          error.response.status,
          retryAfterSeconds,
        );
      }

      throw error;
    }
  }

  async isConfigured(): Promise<boolean> {
    const credentials = await getProviderCredentials('bundleportal');
    return Boolean(credentials.apiKey);
  }

  async verifyNumber(network: BundlePortalNetwork, recipient: string) {
    return this.request<{
      allowed?: boolean;
      can_order?: boolean;
      allowlist_message?: string | null;
      pending_order?: unknown;
    }>({
      action: 'verify_number',
      network,
      recipient,
    });
  }

  async placeOrder(
    network: BundlePortalNetwork,
    recipient: string,
    packageSizeGb: number,
    orderId: string,
  ) {
    return this.request<BundlePortalOrderData>({
      action: 'place_order',
      network,
      recipient,
      package_size: packageSizeGb,
      order_id: orderId,
    });
  }

  async checkBalance() {
    return this.request<{
      wallet_balance: number;
      currency: string;
      user?: { name: string; email: string };
    }>({
      action: 'check_balance',
    });
  }

  async getBundles(network?: string) {
    return this.request<{
      bundles: BundlePortalBundleItem[];
      count: number;
    }>({
      action: 'get_bundles',
      ...(network ? { network } : {}),
    });
  }

  async getTransactions(limit = 20, offset = 0) {
    return this.request<{
      transactions: BundlePortalTransaction[];
      count: number;
      limit: number;
      offset: number;
    }>({
      action: 'get_transactions',
      limit,
      offset,
    });
  }

  async setWebhook(webhookUrl: string) {
    return this.request<{
      webhook_url: string;
      webhook_secret: string;
      events: string[];
    }>({
      action: 'set_webhook',
      webhook_url: webhookUrl,
    });
  }

  async getWebhook() {
    return this.request<{
      webhook_url: string;
    }>({
      action: 'get_webhook',
    });
  }

  async deleteWebhook() {
    return this.request<Record<string, unknown>>({
      action: 'delete_webhook',
    });
  }

  async getAirtimeConfig() {
    return this.request<{
      enabled: boolean;
      minAmount: number;
      maxAmount: number;
      networks: string[];
      payRatio: number;
      balance: number;
    }>({
      action: 'get_airtime_config',
    });
  }

  async placeAirtime(network: string, recipient: string, amount: number) {
    return this.request<{
      order_id: string;
      status: string;
      amount: number;
      face_value: number;
      phone_number: string;
      balance: number;
    }>({
      action: 'place_airtime',
      network,
      recipient,
      amount,
    });
  }

  async getDataBundles() {
    return this.request<{
      enabled: boolean;
      balance: number;
      flexiPayRatio: number;
      packages: Array<{
        id: number;
        display_name: string;
        group_label: string;
        network: string;
        data_amount: string;
        sell_price: number;
        is_flexi: boolean;
        min_amount?: number | null;
        max_amount?: number | null;
      }>;
    }>({
      action: 'get_data_bundles',
    });
  }

  async placeDataOrder(packageId: number, recipient: string, amount?: number) {
    return this.request<{
      order_id: string;
      status: string;
      amount: number;
      phone_number: string;
      balance: number;
    }>({
      action: 'place_data_order',
      package_id: packageId,
      recipient,
      ...(amount !== undefined ? { amount } : {}),
    });
  }

  async getResultCheckers() {
    return this.request<{
      result_checkers: Array<{
        type: string;
        name: string;
        price: number;
        available: number;
        in_stock: boolean;
      }>;
    }>({
      action: 'get_result_checkers',
    });
  }

  async buyResultChecker(productType: string) {
    return this.request<{
      success: boolean;
      name: string;
      serial: string;
      pin: string;
      amount: number;
      wallet_balance: number;
      transaction_id: number;
    }>({
      action: 'buy_result_checker',
      product_type: productType,
    });
  }

  async getSpecialOffers() {
    return this.request<{
      special_offers: Array<{
        id: number;
        title: string;
        description: string;
        price: number;
      }>;
    }>({
      action: 'get_special_offers',
    });
  }

  async buySpecialOffer(offerId: number, recipient: string) {
    return this.request<{
      order_id: string;
      transaction_id: number;
      offer: string;
      recipient: string;
      amount: number;
      status: string;
      new_balance: number;
    }>({
      action: 'buy_special_offer',
      offer_id: offerId,
      recipient,
    });
  }

  async getIShareBalance() {
    return this.request<{
      network: string;
      balance: number;
      unit: string;
      enabled: boolean;
    }>({
      action: 'get_ishare_balance',
    });
  }

  async shareIShare(recipient: string, mb: number, orderId?: string) {
    return this.request<{
      order_id: string;
      network: string;
      recipient: string;
      amount: number;
      unit: string;
      status: string;
      balance_remaining: number;
      timestamp: string;
    }>({
      action: 'share_ishare',
      recipient,
      mb,
      ...(orderId ? { order_id: orderId } : {}),
    });
  }

  async getTelecelBalance() {
    return this.request<{
      network: string;
      balance: number;
      unit: string;
      enabled: boolean;
    }>({
      action: 'get_telecel_balance',
    });
  }

  async shareTelecel(recipient: string, gb: number, orderId?: string) {
    return this.request<{
      order_id: string;
      network: string;
      recipient: string;
      amount: number;
      unit: string;
      status: string;
      balance_remaining: number;
      timestamp: string;
    }>({
      action: 'share_telecel',
      recipient,
      gb,
      ...(orderId ? { order_id: orderId } : {}),
    });
  }

  /**
   * Note: In API v2, check_status is refused with HTTP 410 (polling_disabled).
   * Status updates are delivered via webhook or retrieved via getTransactions().
   */
  async checkStatus(orderReference: string) {
    return this.request<BundlePortalOrderData>({
      action: 'check_status',
      order_reference: orderReference,
    });
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof BundlePortalError) {
      const suffix = error.code
        ? ` (${error.code})`
        : error.status
          ? ` (HTTP ${error.status})`
          : '';
      return `Bundle Portal${suffix}: ${error.message}`;
    }
    if (error instanceof AxiosError && error.response?.data) {
      const body = error.response.data as Record<string, unknown>;
      const code = body.code ? ` (${body.code})` : '';
      const message = body.message || body.error;
      if (message) return `Bundle Portal${code}: ${String(message)}`;
      return `Bundle Portal HTTP ${error.response.status}`;
    }
    return error instanceof Error ? error.message : 'Unknown Bundle Portal error';
  }
}

export const bundlePortalClient = new BundlePortalClient();

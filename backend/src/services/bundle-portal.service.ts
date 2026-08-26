import axios, { AxiosError } from 'axios';
import { getProviderCredentials } from './provider-credentials.service.js';

export type BundlePortalNetwork = 'telecel' | 'airteltigo' | 'mtn';

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
  failure_reason?: string | null;
  [key: string]: unknown;
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

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import { getProviderCredentials } from './provider-credentials.service.js';

export type TskconnectNetwork = 'MTN' | 'TELECEL' | 'AIRTELTIGO';

export interface TskconnectApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  message?: string;
  requestId?: string;
}

export interface TskconnectNetworkItem {
  id: string;
  name: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | string;
}

export interface TskconnectPackage {
  id: string;
  packageId?: string;
  network: TskconnectNetwork | string;
  name: string;
  dataGb: number;
  price: number;
  currency: string;
  available: boolean;
}

export interface TskconnectOrder {
  orderId: string;
  reference?: string;
  network: string;
  package: string;
  recipient: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TEST_COMPLETED' | string;
  createdAt: string;
  completedAt?: string | null;
  [key: string]: unknown;
}

export interface TskconnectBatchEntry {
  id?: number;
  number: string;
  allocationGB: number;
  status?: string;
}

export interface TskconnectFilteredOutEntry {
  number: string;
  allocationGB: number;
  reason: string;
  type: string;
}

export interface TskconnectBatchResponse {
  orderId: string;
  batchCode: string;
  externalReference?: string;
  status: 'pending' | 'processing' | 'processed' | 'failed' | string;
  cost: number;
  estimatedCost: number;
  totalCount: number;
  processedCount: number;
  reused: boolean;
  message: string;
  entries: TskconnectBatchEntry[];
  filteredOutEntries?: TskconnectFilteredOutEntry[];
  order?: {
    orderId: string;
    externalReference?: string;
    status: string;
    totalCount: number;
    processedCount: number;
    createdAt?: string;
    updatedAt?: string;
    entries?: unknown[];
  };
}

export interface TskconnectNumberVerifyItem {
  number: string;
  network?: TskconnectNetwork | null;
  valid: boolean;
  verified: boolean;
  canOrder: boolean;
  isPorted?: boolean;
  originalNetwork?: string | null;
  note?: string | null;
}

export interface TskconnectNumberVerifyResult {
  verified: string[];
  unverified: string[];
  invalid: string[];
  results: TskconnectNumberVerifyItem[];
  summary: {
    total: number;
    verified: number;
    unverified: number;
    invalid: number;
  };
}

export interface TskconnectBalance {
  balance: number;
  currency: string;
  environment?: string;
}

export interface TskconnectWebhookConfig {
  url: string;
  events?: string[];
  active?: boolean;
  secret?: string;
  [key: string]: unknown;
}

export class TskconnectError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
    public readonly requestId?: string,
    public readonly rawResponse?: unknown,
  ) {
    super(message);
    this.name = 'TskconnectError';
  }
}

const RETRYABLE_ERROR_CODES = new Set([
  'RATE_LIMIT_EXCEEDED',
  'ORDER_PROCESSING_UNAVAILABLE',
]);

const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export const isRetryableTskconnectError = (error: unknown): boolean => {
  if (error instanceof TskconnectError) {
    if (error.code && RETRYABLE_ERROR_CODES.has(error.code)) return true;
    if (error.status && RETRYABLE_HTTP_STATUSES.has(error.status)) return true;
  }
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      return true;
    }
    const status = error.response?.status;
    if (status && RETRYABLE_HTTP_STATUSES.has(status)) return true;
  }
  return false;
};

export const verifyTskconnectWebhook = (
  rawBody: string | Buffer,
  signatureHeader: string,
  timestampHeader: string,
  secret: string,
): boolean => {
  if (!rawBody || !signatureHeader || !timestampHeader || !secret) {
    return false;
  }

  try {
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const payloadToSign = `${timestampHeader}.${bodyStr}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadToSign)
      .digest('hex');

    const cleanHeader = signatureHeader.replace(/^sha256=/, '').trim();
    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const cleanBuf = Buffer.from(cleanHeader, 'hex');

    if (expectedBuf.length !== cleanBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, cleanBuf);
  } catch (err) {
    console.error('[Tskconnect] Error during webhook signature verification:', err);
    return false;
  }
};

class TskconnectClient {
  private packageCache: { data: TskconnectPackage[]; timestamp: number } | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  async isConfigured(): Promise<boolean> {
    const creds = await getProviderCredentials('tskconnect');
    return Boolean(creds.apiKey);
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof TskconnectError) {
      return error.code ? `[${error.code}] ${error.message}` : error.message;
    }
    if (axios.isAxiosError(error)) {
      const resp = error.response?.data as TskconnectApiResponse | undefined;
      if (resp?.error?.message) {
        return resp.error.code ? `[${resp.error.code}] ${resp.error.message}` : resp.error.message;
      }
      if (resp?.message) return resp.message;
      return error.message;
    }
    if (error instanceof Error) return error.message;
    return String(error);
  }

  private async getClient() {
    const credentials = await getProviderCredentials('tskconnect');
    if (!credentials.apiKey) {
      throw new TskconnectError('Tskconnect API key is not configured', 'UNAUTHORIZED', 401);
    }

    const cleanBaseUrl = credentials.baseUrl.trim().replace(/\/$/, '');

    const instance = axios.create({
      baseURL: cleanBaseUrl,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    return { instance, baseUrl: cleanBaseUrl };
  }

  private async request<T>(config: AxiosRequestConfig): Promise<TskconnectApiResponse<T>> {
    const { instance } = await this.getClient();

    try {
      const response = await instance.request<TskconnectApiResponse<T>>(config);
      const data = response.data;

      if (data && data.success === false) {
        throw new TskconnectError(
          data.error?.message || data.message || 'Tskconnect request returned failure',
          data.error?.code,
          response.status,
          data.requestId,
          data,
        );
      }

      return data;
    } catch (err: unknown) {
      if (err instanceof TskconnectError) throw err;

      if (axios.isAxiosError(err)) {
        const errorData = err.response?.data as TskconnectApiResponse | undefined;
        const statusCode = err.response?.status;
        const code = errorData?.error?.code || (statusCode ? `HTTP_${statusCode}` : 'NETWORK_ERROR');
        const message =
          errorData?.error?.message ||
          errorData?.message ||
          err.message ||
          'Tskconnect request failed';

        throw new TskconnectError(
          message,
          code,
          statusCode,
          errorData?.requestId,
          errorData,
        );
      }

      throw err;
    }
  }

  /**
   * Public health status of Tskconnect API platform and carrier networks.
   * Does not require authentication.
   */
  async getSystemStatus(): Promise<Record<string, unknown>> {
    try {
      const credentials = await getProviderCredentials('tskconnect');
      const cleanBaseUrl = (credentials.baseUrl || 'https://tsk05.net/v1').trim().replace(/\/$/, '');
      const response = await axios.get<TskconnectApiResponse<Record<string, unknown>>>(
        `${cleanBaseUrl}/status`,
        { timeout: 10000 },
      );
      return response.data?.data || {};
    } catch (err) {
      throw new TskconnectError(
        this.getErrorMessage(err),
        'STATUS_CHECK_FAILED',
      );
    }
  }

  /**
   * Check wallet balance in GHS.
   */
  async checkBalance(): Promise<TskconnectBalance> {
    const res = await this.request<TskconnectBalance>({
      method: 'GET',
      url: '/balance',
    });
    return res.data || { balance: 0, currency: 'GHS' };
  }

  /**
   * Retrieve list of supported mobile data networks.
   */
  async getNetworks(): Promise<TskconnectNetworkItem[]> {
    const res = await this.request<TskconnectNetworkItem[]>({
      method: 'GET',
      url: '/networks',
    });
    return res.data || [];
  }

  /**
   * Retrieve real-time operational status for each network.
   */
  async getNetworkStatus(): Promise<Record<string, unknown>> {
    const res = await this.request<Record<string, unknown>>({
      method: 'GET',
      url: '/networks/status',
    });
    return res.data || {};
  }

  /**
   * Retrieve available data bundle packages.
   */
  async getPackages(network?: string, available = true): Promise<TskconnectPackage[]> {
    const now = Date.now();
    if (!network && this.packageCache && now - this.packageCache.timestamp < this.CACHE_TTL_MS) {
      return this.packageCache.data;
    }

    const params: Record<string, unknown> = {};
    if (network) params.network = network.toLowerCase();
    if (typeof available === 'boolean') params.available = available;

    const res = await this.request<TskconnectPackage[] | { packages: TskconnectPackage[] }>({
      method: 'GET',
      url: '/packages',
      params,
    });

    let packages: TskconnectPackage[] = [];
    if (Array.isArray(res.data)) {
      packages = res.data;
    } else if (res.data && Array.isArray((res.data as any).packages)) {
      packages = (res.data as any).packages;
    }

    if (!network && packages.length > 0) {
      this.packageCache = { data: packages, timestamp: now };
    }

    return packages;
  }

  /**
   * Resolve appropriate packageId for a given network and size in GB.
   * Matches against live catalog or falls back to canonical slug e.g. "mtn-1gb".
   */
  async resolvePackageId(network: string, packageSizeGb: number): Promise<string> {
    const netUpper = network.toUpperCase();
    const netLower = network.toLowerCase();

    try {
      const packages = await this.getPackages(netLower);
      if (packages.length > 0) {
        // Try exact match on dataGb
        const exactMatch = packages.find(
          (p) =>
            p.network.toUpperCase() === netUpper &&
            Math.abs(Number(p.dataGb) - packageSizeGb) < 0.001,
        );
        if (exactMatch) {
          return exactMatch.packageId || exactMatch.id;
        }

        // Try match by id or name containing the size
        const sizeRegex = new RegExp(`(^|[^0-9])${packageSizeGb}gb($|[^0-9])`, 'i');
        const regexMatch = packages.find(
          (p) =>
            p.network.toUpperCase() === netUpper &&
            (sizeRegex.test(p.id) || sizeRegex.test(p.name) || (p.packageId && sizeRegex.test(p.packageId))),
        );
        if (regexMatch) {
          return regexMatch.packageId || regexMatch.id;
        }
      }
    } catch (err) {
      console.warn('[Tskconnect] Failed to fetch packages catalog for packageId resolution:', this.getErrorMessage(err));
    }

    // Canonical slug fallback: e.g. "mtn-1gb", "telecel-2gb", "airteltigo-5gb"
    const formattedSize = packageSizeGb < 1 ? `${Math.round(packageSizeGb * 1000)}mb` : `${packageSizeGb}gb`;
    return `${netLower}-${formattedSize}`;
  }

  /**
   * Create a single mobile data order.
   * Supports Idempotency-Key header for duplicate protection.
   */
  async placeOrder(
    network: TskconnectNetwork | string,
    packageId: string,
    recipient: string,
    reference: string,
    idempotencyKey?: string,
  ): Promise<TskconnectOrder> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const res = await this.request<TskconnectOrder>({
      method: 'POST',
      url: '/orders',
      headers,
      data: {
        network: network.toUpperCase(),
        packageId,
        recipient,
        reference,
      },
    });

    if (!res.data) {
      throw new TskconnectError('Tskconnect did not return order data in response');
    }

    return res.data;
  }

  /**
   * Submit a batch order for multiple recipients.
   * Blocked / duplicate numbers are segregated into filteredOutEntries.
   */
  async placeBatchOrder(
    network: TskconnectNetwork | string,
    entries: { number: string; allocationGB: number }[],
    externalReference: string,
    idempotencyKey?: string,
  ): Promise<TskconnectBatchResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const res = await this.request<TskconnectBatchResponse>({
      method: 'POST',
      url: '/orders/batch',
      headers,
      data: {
        externalReference,
        network: network.toUpperCase(),
        entries,
      },
    });

    if (!res.data) {
      throw new TskconnectError('Tskconnect did not return batch order data');
    }

    return res.data;
  }

  /**
   * Retrieve order or batch details by orderId.
   */
  async getOrder(orderId: string): Promise<TskconnectOrder> {
    const res = await this.request<TskconnectOrder>({
      method: 'GET',
      url: `/orders/${encodeURIComponent(orderId)}`,
    });
    if (!res.data) {
      throw new TskconnectError(`Order ${orderId} not found`, 'ORDER_NOT_FOUND', 404);
    }
    return res.data;
  }

  /**
   * Retrieve order details by external reference.
   */
  async getOrderByReference(reference: string): Promise<TskconnectOrder> {
    const res = await this.request<TskconnectOrder>({
      method: 'GET',
      url: `/orders/reference/${encodeURIComponent(reference)}`,
    });
    if (!res.data) {
      throw new TskconnectError(`Order with reference ${reference} not found`, 'ORDER_NOT_FOUND', 404);
    }
    return res.data;
  }

  /**
   * Bulk check up to 100 order IDs in a single request.
   */
  async getBulkOrderStatus(orderIds: string[]): Promise<TskconnectOrder[]> {
    if (orderIds.length === 0) return [];

    const res = await this.request<TskconnectOrder[] | { orders: TskconnectOrder[] }>({
      method: 'POST',
      url: '/orders/status',
      data: { orderIds },
    });

    if (Array.isArray(res.data)) {
      return res.data;
    }
    if (res.data && Array.isArray((res.data as any).orders)) {
      return (res.data as any).orders;
    }
    return [];
  }

  /**
   * Paginated order history.
   */
  async listOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    network?: string;
    reference?: string;
    recipient?: string;
  }): Promise<{ orders: TskconnectOrder[]; total?: number }> {
    const res = await this.request<TskconnectOrder[] | { orders: TskconnectOrder[]; total?: number }>({
      method: 'GET',
      url: '/orders',
      params,
    });

    if (Array.isArray(res.data)) {
      return { orders: res.data };
    }
    if (res.data && Array.isArray((res.data as any).orders)) {
      return res.data as { orders: TskconnectOrder[]; total?: number };
    }
    return { orders: [] };
  }

  /**
   * Pre-check phone numbers against verified database before placing orders.
   * Can check up to 100 numbers at once.
   */
  async verifyNumbers(
    numbers: string[],
    network?: TskconnectNetwork | string,
  ): Promise<TskconnectNumberVerifyResult> {
    const res = await this.request<TskconnectNumberVerifyResult>({
      method: 'POST',
      url: '/numbers/verify',
      data: {
        numbers,
        ...(network ? { network: network.toUpperCase() } : {}),
      },
    });

    return (
      res.data || {
        verified: [],
        unverified: [],
        invalid: [],
        results: [],
        summary: { total: 0, verified: 0, unverified: 0, invalid: 0 },
      }
    );
  }

  /**
   * Get current webhook configuration & delivery history.
   */
  async getWebhook(): Promise<TskconnectApiResponse<TskconnectWebhookConfig>> {
    return this.request<TskconnectWebhookConfig>({
      method: 'GET',
      url: '/webhooks',
    });
  }

  /**
   * Configure or update webhook endpoint and subscriptions.
   * Returns generated secret.
   */
  async setWebhook(
    url: string,
    events = ['order.created', 'order.completed', 'order.failed'],
    rotateSecret = false,
  ): Promise<TskconnectApiResponse<TskconnectWebhookConfig>> {
    return this.request<TskconnectWebhookConfig>({
      method: 'POST',
      url: '/webhooks',
      data: {
        url,
        events,
        active: true,
        rotateSecret,
      },
    });
  }

  /**
   * Trigger test webhook delivery to verify endpoint.
   */
  async testWebhook(): Promise<TskconnectApiResponse<Record<string, unknown>>> {
    return this.request<Record<string, unknown>>({
      method: 'POST',
      url: '/webhooks/test',
    });
  }
}

export const tskconnectClient = new TskconnectClient();

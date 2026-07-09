import axios, { AxiosInstance, AxiosError } from 'axios';
import { env } from '../config/env.js';

export interface CodecraftOrderCreateResponse {
  status: number | string;
  message: string;
  reference_id?: string;
  referenceId?: string;
  data?: unknown;
}

export interface CodecraftOrderStatusData {
  beneficiary?: string;
  gig?: string;
  network?: string;
  order_date?: string;
  order_time?: string;
  price?: number | string;
  order_status?: string;
  orderStatus?: string;
  status?: string | number;
  delivery_status?: string;
  [key: string]: unknown;
}

export interface CodecraftOrderStatusResponse {
  status?: number | string;
  success?: boolean | string;
  message?: string;
  data?: CodecraftOrderStatusData | CodecraftOrderStatusData[] | string | null;
  order_status?: string;
  [key: string]: unknown;
}

class CodecraftClient {
  private client: AxiosInstance | null = null;

  private getClient(): AxiosInstance {
    if (!this.client) {
      if (!env.CODECRAFT_API_KEY) {
        throw new Error('CODECRAFT_API_KEY is not configured');
      }

      this.client = axios.create({
        baseURL: env.CODECRAFT_API_BASE_URL,
        headers: {
          'x-api-key': env.CODECRAFT_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
        // Some PHP endpoints may return text/html content-type with JSON body
        transformResponse: [
          (rawData: string) => {
            if (rawData == null || rawData === '') return rawData;
            if (typeof rawData !== 'string') return rawData;
            const trimmed = rawData.trim();
            try {
              return JSON.parse(trimmed);
            } catch {
              // Attempt to extract JSON object/array from surrounding HTML/text
              const startObj = trimmed.indexOf('{');
              const startArr = trimmed.indexOf('[');
              let start = -1;
              if (startObj >= 0 && startArr >= 0) start = Math.min(startObj, startArr);
              else start = Math.max(startObj, startArr);
              if (start >= 0) {
                const candidate = trimmed.slice(start);
                try {
                  return JSON.parse(candidate);
                } catch {
                  return rawData;
                }
              }
              return rawData;
            }
          },
        ],
      });
    }
    return this.client;
  }

  isConfigured(): boolean {
    return !!env.CODECRAFT_API_KEY?.trim();
  }

  private normalizeCreateResponse(data: CodecraftOrderCreateResponse): CodecraftOrderCreateResponse {
    const nested =
      data.data && typeof data.data === 'object' && !Array.isArray(data.data)
        ? (data.data as Record<string, unknown>)
        : null;

    const referenceId =
      data.reference_id ||
      data.referenceId ||
      (nested
        ? String(nested.reference_id || nested.referenceId || nested.reference || '').trim() || undefined
        : undefined);

    const rawStatus = data.status ?? (nested?.status as number | string | undefined);
    const normalizedStatus =
      typeof rawStatus === 'string' ? Number(rawStatus) || rawStatus : rawStatus;

    return {
      ...data,
      reference_id: referenceId || data.reference_id,
      status: normalizedStatus as number | string,
      message: data.message || (nested?.message as string | undefined) || data.message,
    };
  }

  private assertCreateAccepted(
    data: CodecraftOrderCreateResponse,
    endpoint: string,
  ): CodecraftOrderCreateResponse {
    const normalized = this.normalizeCreateResponse(data);
    const statusCode = Number(normalized.status);
    const failCodes = new Set([100, 101, 102, 103, 500, 555]);

    if (failCodes.has(statusCode)) {
      throw new Error(
        `CodeCraft ${endpoint} rejected order (status=${normalized.status}): ${normalized.message || 'unknown error'}`,
      );
    }

    if (!normalized.reference_id && !normalized.referenceId) {
      // Some failures return HTTP 200 with only a message
      const msg = (normalized.message || '').toLowerCase();
      if (msg && !msg.includes('success') && !msg.includes('recorded')) {
        throw new Error(`CodeCraft ${endpoint} did not accept order: ${normalized.message}`);
      }
    }

    return normalized;
  }

  async createRegularOrder(
    recipientNumber: string,
    gig: string,
    network: 'MTN' | 'AT' | 'TELECEL',
  ): Promise<CodecraftOrderCreateResponse> {
    const client = this.getClient();
    const payload = {
      recipient_number: recipientNumber,
      gig: String(gig),
      network,
    };
    console.log('[Codecraft] POST /initiate.php', payload);
    const { data } = await client.post<CodecraftOrderCreateResponse>('/initiate.php', payload);
    return this.assertCreateAccepted(data, '/initiate.php');
  }

  async createBigTimeOrder(
    recipientNumber: string,
    gig: string,
    network: 'MTN' | 'AT',
  ): Promise<CodecraftOrderCreateResponse> {
    const client = this.getClient();
    const payload = {
      recipient_number: recipientNumber,
      gig: String(gig),
      network,
    };
    console.log('[Codecraft] POST /special.php', payload);
    const { data } = await client.post<CodecraftOrderCreateResponse>('/special.php', payload);
    return this.assertCreateAccepted(data, '/special.php');
  }

  async getRegularOrderStatus(referenceId: string): Promise<CodecraftOrderStatusResponse> {
    const client = this.getClient();
    const { data } = await client.get<CodecraftOrderStatusResponse>(
      '/response_regular.php',
      {
        params: { reference_id: referenceId },
      },
    );
    return typeof data === 'string' ? { message: data } : data;
  }

  async getBigTimeOrderStatus(referenceId: string): Promise<CodecraftOrderStatusResponse> {
    const client = this.getClient();
    const { data } = await client.get<CodecraftOrderStatusResponse>(
      '/response_big_time.php',
      {
        params: { reference_id: referenceId },
      },
    );
    return typeof data === 'string' ? { message: data } : data;
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof AxiosError && error.response?.data) {
      try {
        const anyData = error.response.data as any;
        if (typeof anyData === 'string') return anyData;
        return anyData?.message || anyData?.error || error.message;
      } catch {
        return error.message;
      }
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }
}

export const codecraftClient = new CodecraftClient();

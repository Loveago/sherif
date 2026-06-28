import axios, { AxiosInstance, AxiosError } from 'axios';
import { env } from '../config/env.js';

export interface CodecraftOrderCreateResponse {
  status: number;
  message: string;
  reference_id: string;
}

export interface CodecraftOrderStatusData {
  beneficiary: string;
  gig: string;
  network: string;
  order_date: string;
  order_time: string;
  price: number;
  order_status: string;
}

export interface CodecraftOrderStatusResponse {
  status: number;
  success: boolean;
  message: string;
  data?: CodecraftOrderStatusData | CodecraftOrderStatusData[];
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
      });
    }
    return this.client;
  }

  isConfigured(): boolean {
    return !!env.CODECRAFT_API_KEY;
  }

  async createRegularOrder(
    recipientNumber: string,
    gig: string,
    network: 'MTN' | 'AT' | 'TELECEL',
  ): Promise<CodecraftOrderCreateResponse> {
    const client = this.getClient();
    const { data } = await client.post<CodecraftOrderCreateResponse>(
      '/initiate.php',
      {
        recipient_number: recipientNumber,
        gig,
        network,
      },
    );
    return data;
  }

  async createBigTimeOrder(
    recipientNumber: string,
    gig: string,
    network: 'MTN' | 'AT',
  ): Promise<CodecraftOrderCreateResponse> {
    const client = this.getClient();
    const { data } = await client.post<CodecraftOrderCreateResponse>(
      '/special.php',
      {
        recipient_number: recipientNumber,
        gig,
        network,
      },
    );
    return data;
  }

  async getRegularOrderStatus(referenceId: string): Promise<CodecraftOrderStatusResponse> {
    const client = this.getClient();
    const { data } = await client.get<CodecraftOrderStatusResponse>(
      '/response_regular.php',
      {
        params: { reference_id: referenceId },
      },
    );
    return data;
  }

  async getBigTimeOrderStatus(referenceId: string): Promise<CodecraftOrderStatusResponse> {
    const client = this.getClient();
    const { data } = await client.get<CodecraftOrderStatusResponse>(
      '/response_big_time.php',
      {
        params: { reference_id: referenceId },
      },
    );
    return data;
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof AxiosError && error.response?.data) {
      try {
        const anyData = error.response.data as any;
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

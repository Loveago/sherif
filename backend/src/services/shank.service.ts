import axios, { AxiosInstance, AxiosError } from 'axios';
import { env } from '../config/env.js';

export interface ShankNetwork {
  id: number;
  name: string;
  description: string;
}

export interface ShankDataPackage {
  id: number;
  name: string | null;
  description: string | null;
  network_id: number;
  volume: string;
  console_price: string;
  status: string;
  network: string;
}

export interface ShankOrderItem {
  msisdn: string;
  volume_mb: number;
  order_code: string;
  status: string;
  price: number;
  reason: string;
}

export interface ShankOrderResponse {
  success: boolean;
  reference: string;
  status: string;
  accepted: number;
  rejected: number;
  total_cost: number;
  balance_after: number;
  orders: ShankOrderItem[];
}

export interface ShankOrderStatusItem {
  id: number;
  beneficiary_number: string;
  order_reference: string;
  status: number;
  api_status: string;
  api_source: string;
  volume: string;
  network: string;
  price: number;
  created_at: string;
}

export interface ShankOrderStatusResponse {
  reference: string;
  items: ShankOrderStatusItem[];
}

export interface ShankErrorResponse {
  error: string;
  message: string;
}

class ShankClient {
  private client: AxiosInstance | null = null;

  private getClient(): AxiosInstance {
    if (!this.client) {
      if (!env.SHANK_API_KEY) {
        throw new Error('SHANK_API_KEY is not configured');
      }

      this.client = axios.create({
        baseURL: env.SHANK_API_BASE_URL,
        headers: {
          'x-api-key': env.SHANK_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
    }
    return this.client;
  }

  isConfigured(): boolean {
    return !!env.SHANK_API_KEY;
  }

  async fetchNetworks(): Promise<ShankNetwork[]> {
    const client = this.getClient();
    const { data } = await client.get<ShankNetwork[]>('/fetch-networks');
    return data;
  }

  async fetchDataPackages(): Promise<ShankDataPackage[]> {
    const client = this.getClient();
    const { data } = await client.get<ShankDataPackage[]>('/fetch-data-packages');
    return data;
  }

  async submitOrder(networkId: number, msisdn: string, volumeMb: number): Promise<ShankOrderResponse> {
    const client = this.getClient();
    const { data } = await client.post<ShankOrderResponse>('/orders', {
      network_id: networkId,
      msisdn,
      volume_mb: volumeMb,
    });
    return data;
  }

  async submitBulkOrder(networkId: number, recipients: Array<{ msisdn: string; volume_mb: number }>): Promise<ShankOrderResponse> {
    const client = this.getClient();
    const { data } = await client.post<ShankOrderResponse>('/orders/bulk', {
      network_id: networkId,
      recipients,
    });
    return data;
  }

  async getOrderStatus(reference: string): Promise<ShankOrderStatusResponse> {
    const client = this.getClient();
    const { data } = await client.get<ShankOrderStatusResponse>(`/orders/${encodeURIComponent(reference)}`);
    return data;
  }

  async fetchTransactions(): Promise<unknown[]> {
    const client = this.getClient();
    const { data } = await client.get<unknown[]>('/fetch-transactions');
    return data;
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof AxiosError && error.response?.data) {
      const shankError = error.response.data as ShankErrorResponse;
      return shankError.message || shankError.error || error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }
}

export const shankClient = new ShankClient();

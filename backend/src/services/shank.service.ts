import axios, { AxiosInstance, AxiosError } from 'axios';
import { getProviderCredentials } from './provider-credentials.service.js';

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
  status: number | string;
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
  private async getClient(): Promise<AxiosInstance> {
    const credentials = await getProviderCredentials('shank');
    if (!credentials.apiKey) {
      throw new Error('Shank API key is not configured');
    }

    return axios.create({
      baseURL: credentials.baseUrl,
      headers: {
        'x-api-key': credentials.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async isConfigured(): Promise<boolean> {
    const credentials = await getProviderCredentials('shank');
    return Boolean(credentials.apiKey);
  }

  async fetchNetworks(): Promise<ShankNetwork[]> {
    const client = await this.getClient();
    const { data } = await client.get<ShankNetwork[]>('/fetch-networks');
    return data;
  }

  async fetchDataPackages(): Promise<ShankDataPackage[]> {
    const client = await this.getClient();
    const { data } = await client.get<ShankDataPackage[]>('/fetch-data-packages');
    return data;
  }

  async submitOrder(
    networkId: number,
    msisdn: string,
    volumeMb: number,
    idempotencyKey?: string,
  ): Promise<ShankOrderResponse> {
    const client = await this.getClient();
    const { data } = await client.post<ShankOrderResponse>(
      '/orders',
      {
        network_id: networkId,
        msisdn,
        volume_mb: volumeMb,
      },
      {
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      },
    );
    return data;
  }

  async submitBulkOrder(
    networkId: number,
    recipients: Array<{ msisdn: string; volume_mb: number }>,
    idempotencyKey?: string,
  ): Promise<ShankOrderResponse> {
    const client = await this.getClient();
    const { data } = await client.post<ShankOrderResponse>(
      '/orders/bulk',
      {
        network_id: networkId,
        recipients,
      },
      {
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      },
    );
    return data;
  }

  async getOrderStatus(reference: string): Promise<ShankOrderStatusResponse> {
    const client = await this.getClient();
    const { data } = await client.get<any>(`/orders/${encodeURIComponent(reference)}`);

    // Normalize inconsistent provider envelopes so the worker always sees items[]
    if (data && typeof data === 'object') {
      const items =
        Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.data)
            ? data.data
            : Array.isArray(data.orders)
              ? data.orders
              : Array.isArray(data)
                ? data
                : null;

      if (items) {
        return {
          reference: String(data.reference || reference),
          items: items.map((item: any) => ({
            id: Number(item?.id) || 0,
            beneficiary_number: String(
              item?.beneficiary_number || item?.msisdn || item?.phone || item?.beneficiary || '',
            ),
            order_reference: String(
              item?.order_reference || item?.order_code || item?.reference || '',
            ),
            status: item?.status ?? item?.order_status ?? 0,
            api_status: String(item?.api_status || item?.delivery_status || item?.status_text || ''),
            api_source: String(item?.api_source || ''),
            volume: String(item?.volume || item?.volume_mb || ''),
            network: String(item?.network || ''),
            price: Number(item?.price) || 0,
            created_at: String(item?.created_at || ''),
          })),
        };
      }
    }

    return {
      reference: String((data as any)?.reference || reference),
      items: [],
    };
  }

  async fetchTransactions(): Promise<unknown[]> {
    const client = await this.getClient();
    const { data } = await client.get<unknown[]>('/fetch-transactions');
    return data;
  }

  async fetchOtherNetworkTransaction(transactionId: string): Promise<unknown> {
    const client = await this.getClient();
    const { data } = await client.post<unknown>('/fetch-other-network-transaction', {
      transaction_id: transactionId,
    });
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

import axios from 'axios';
import { prisma } from '../lib/prisma.js';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

async function getPaystackSecretKey(): Promise<string> {
  const setting = await prisma.adminSettings.findUnique({ where: { key: 'paystackSecretKey' } });
  return setting?.value || process.env.PAYSTACK_SECRET_KEY || '';
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    reference: string;
    amount: number;
    status: string;
    metadata?: Record<string, unknown>;
    customer: {
      id: number;
      email: string;
    };
  };
}

export async function initializePaystackPayment(
  email: string,
  amount: number,
  reference: string,
  callback_url?: string,
  metadata?: Record<string, any>
): Promise<PaystackInitializeResponse> {
  try {
    const secretKey = await getPaystackSecretKey();
    const payload: any = {
      email,
      amount: Math.round(amount * 100),
      reference,
      metadata,
    };
    if (callback_url) {
      payload.callback_url = callback_url;
    }
    const response = await axios.post<PaystackInitializeResponse>(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Paystack initialization error:', error?.response?.data || error?.message || error);
    const paystackMessage = error?.response?.data?.message;
    throw new Error(paystackMessage ? `Paystack: ${paystackMessage}` : 'Failed to initialize Paystack payment');
  }
}

export async function verifyPaystackPayment(reference: string): Promise<PaystackVerifyResponse> {
  try {
    const secretKey = await getPaystackSecretKey();
    const response = await axios.get<PaystackVerifyResponse>(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Paystack verification error:', error);
    throw new Error('Failed to verify Paystack payment');
  }
}

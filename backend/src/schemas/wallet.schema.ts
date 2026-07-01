import { z } from 'zod';

export const fundWalletSchema = z.object({
  body: z.object({
    amount: z.coerce.number().positive(),
    method: z.enum(['PAYSTACK', 'MTN_MOMO']),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const withdrawSchema = z.object({
  body: z.object({
    amount: z.coerce.number().positive(),
    method: z.enum(['MTN Mobile Money', 'Bank Transfer']),
    accountName: z.string().min(2),
    accountNumber: z.string().min(5),
    bankName: z.string().optional(),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const storefrontWithdrawSchema = z.object({
  body: z.object({
    amount: z.coerce.number().positive(),
    method: z.enum(['MTN_MOMO', 'TELECEL_CASH']),
    accountName: z.string().min(2),
    accountNumber: z.string().min(5),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    phoneNumber: z.string().min(10),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const refundRequestSchema = z.object({
  body: z.object({
    orderId: z.string().min(1),
    reason: z.string().min(5),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

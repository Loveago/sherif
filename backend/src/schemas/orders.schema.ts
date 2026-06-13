import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    phoneNumber: z.string().min(10),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const initializeStorefrontCheckoutSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    phoneNumber: z.string().min(10).max(20),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({ slug: z.string().min(1) }),
});

export const verifyStorefrontCheckoutSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({ reference: z.string().min(1) }),
  params: z.object({ slug: z.string().min(1) }),
});

export const refundRequestSchema = z.object({
  body: z.object({
    orderId: z.string().min(1),
    reason: z.string().min(5),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const batchOrderSchema = z.object({
  body: z.object({
    orders: z.array(
      z.object({
        productId: z.string().min(1),
        phoneNumber: z.string().min(10).max(20),
      })
    ).min(1),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const pastePreviewSchema = z.object({
  body: z.object({
    networkId: z.string().min(1),
    rawText: z.string().min(1),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

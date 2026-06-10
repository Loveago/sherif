import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().min(10),
    dataSize: z.string().min(2),
    sellingPrice: z.coerce.number().positive(),
    agentPrice: z.coerce.number().positive(),
    resellerPrice: z.coerce.number().positive(),
    buyingPrice: z.coerce.number().positive(),
    networkId: z.string().min(1),
    status: z.boolean().default(true),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const creditWalletSchema = z.object({
  body: z.object({
    userId: z.string().min(1),
    amount: z.coerce.number().positive(),
    description: z.string().min(3),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const announcementSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    content: z.string().min(10),
    pinned: z.boolean().default(false),
    targetRole: z.enum(['AGENT', 'ADMIN']).optional(),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    dataSize: z.string().min(1),
    sellingPrice: z.coerce.number().positive(),
    agentPrice: z.coerce.number().positive(),
    resellerPrice: z.coerce.number().positive(),
    buyingPrice: z.coerce.number().positive(),
    promoPrice: z.coerce.number().positive().optional().nullable(),
    networkId: z.string().min(1),
    status: z.boolean().default(true),
    showInShop: z.boolean().default(true),
    showForAgents: z.boolean().default(true),
    rolePrices: z.record(z.coerce.number()).optional(),
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

import { z } from 'zod';

const booleanFromString = z.union([z.boolean(), z.string()]).transform((val) => {
  if (typeof val === 'boolean') return val;
  return val === 'true' || val === '1';
});

const safeNumber = z.preprocess(
  (val) => {
    if (val === '' || val === null || val === undefined || Number.isNaN(val)) return 0;
    return Number(val);
  },
  z.number()
);

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).describe('Network name (e.g., MTN, TELECEL, AirtelTigo)'),
    description: z.string().min(1).describe('Bundle size (e.g., 1GB, 500MB)'),
    sellingPrice: safeNumber.refine((v) => v > 0, { message: 'Selling price must be greater than 0' }),
    agentPrice: safeNumber.optional().default(0),
    resellerPrice: safeNumber.optional().default(0),
    buyingPrice: safeNumber.optional().default(0),
    promoPrice: z.preprocess(
      (val) => (val === '' || val === null || val === undefined || Number.isNaN(val) ? null : Number(val)),
      z.number().positive().nullable()
    ).optional(),
    networkId: z.string().min(1),
    status: booleanFromString.default(true),
    showInShop: booleanFromString.default(true),
    showForAgents: booleanFromString.default(true),
    rolePrices: z.record(safeNumber).optional(),
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

export const updateSettingsSchema = z.object({
  body: z.record(z.string()),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const updateProviderCredentialsSchema = z.object({
  body: z.object({
    apiKey: z.string().trim().optional(),
    baseUrl: z.string().trim().url(),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({
    provider: z.enum(['shank', 'codecraft']),
  }),
});

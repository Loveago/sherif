import { z } from 'zod';

export const updateStorefrontSchema = z.object({
  body: z.object({
    displayName: z.string().min(2),
    tagline: z.string().min(2),
    description: z.string().min(10),
    themeColor: z.string().min(4),
    contactEmail: z.string().email().optional().or(z.literal('')),
    contactPhone: z.string().optional(),
    instagramUrl: z.string().optional(),
    twitterUrl: z.string().optional(),
    whatsappUrl: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

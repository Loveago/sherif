import { z } from 'zod';

export const slugSchema = z
  .string()
  .min(3, 'Storefront URL must be at least 3 characters')
  .max(30, 'Storefront URL must be at most 30 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Storefront URL can only contain lowercase letters, numbers, and hyphens');

export const RESERVED_SLUGS = [
  'admin', 'api', 'auth', 'login', 'register', 'settings', 'storefront',
  'dashboard', 'wallet', 'orders', 'profile', 'store', 'payment-callback',
  'track', 'checkout', 'cart', 'api-keys', 'chat', 'notifications',
];

export const updateStorefrontSchema = z.object({
  body: z.object({
    slug: slugSchema.optional(),
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

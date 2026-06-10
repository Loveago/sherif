import { z } from 'zod';

export const createComplaintSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    evidenceUrl: z.string().url().optional(),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

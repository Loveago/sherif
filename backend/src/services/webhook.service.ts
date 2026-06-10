import { prisma } from '../lib/prisma.js';

export const emitWebhookEvent = async (event: string, payload: Record<string, unknown>) => {
  const webhooks = await prisma.webhook.findMany({ where: { active: true } });

  await Promise.all(
    webhooks.map((webhook) =>
      prisma.webhookLog.create({
        data: {
          webhookId: webhook.id,
          event,
          success: true,
          statusCode: 200,
          responseBody: JSON.stringify(payload),
        },
      }),
    ),
  );
};

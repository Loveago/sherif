import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const createAuditLog = async (
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) => {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entity,
      entityId,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });
};

import { prisma } from '../lib/prisma.js';

export const createNotification = async (
  userId: string,
  title: string,
  body: string,
  type: string,
) => {
  return prisma.notification.create({
    data: {
      userId,
      title,
      body,
      type,
    },
  });
};

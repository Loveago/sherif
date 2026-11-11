import { prisma } from "@/lib/prisma";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "DANGER" | "SYSTEM";

export interface CreateNotificationParams {
  userId?: string | null;
  targetRole?: string | null;
  type?: NotificationType;
  title: string;
  message: string;
  link?: string | null;
}

/**
 * Creates a notification. If userId is null, it's considered a system/broadcast notification.
 */
export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId ?? null,
      targetRole: params.targetRole ?? null,
      type: params.type ?? "INFO",
      title: params.title,
      message: params.message,
      link: params.link ?? null,
      read: false,
    },
  });
}

/**
 * Retrieves notifications visible to a specific user (their direct notifications plus relevant broadcasts).
 */
export async function getUserNotifications(
  userId: string,
  userRole?: string,
  limit: number = 30
) {
  const whereClauses: Array<{
    userId?: string | null;
    targetRole?: { in: string[] } | null;
  }> = [{ userId }];

  // Broadcasts with no targetRole or matching user's role
  const roles = ["ALL"];
  if (userRole) roles.push(userRole);

  whereClauses.push({
    userId: null,
    targetRole: null,
  });

  if (userRole) {
    whereClauses.push({
      userId: null,
      targetRole: { in: roles },
    });
  }

  return prisma.notification.findMany({
    where: {
      OR: whereClauses,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Returns count of unread notifications for a user.
 */
export async function getUnreadNotificationCount(userId: string, userRole?: string) {
  const roles = ["ALL"];
  if (userRole) roles.push(userRole);

  return prisma.notification.count({
    where: {
      read: false,
      OR: [
        { userId },
        { userId: null, targetRole: null },
        ...(userRole ? [{ userId: null, targetRole: { in: roles } }] : []),
      ],
    },
  });
}

/**
 * Marks a single notification as read by id.
 */
export async function markNotificationRead(id: string, userId: string) {
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif) return null;

  // If it's a direct user notification
  if (notif.userId === userId) {
    return prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
  }

  // If it's a broadcast notification, we mark it read
  if (!notif.userId) {
    return prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
  }

  return null;
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllNotificationsRead(userId: string, userRole?: string) {
  const roles = ["ALL"];
  if (userRole) roles.push(userRole);

  return prisma.notification.updateMany({
    where: {
      read: false,
      OR: [
        { userId },
        { userId: null, targetRole: null },
        ...(userRole ? [{ userId: null, targetRole: { in: roles } }] : []),
      ],
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });
}

/**
 * Deletes or dismisses a notification.
 */
export async function deleteNotification(id: string, userId: string) {
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif) return false;

  // Only the recipient or admin can delete
  if (notif.userId === userId || !notif.userId) {
    await prisma.notification.delete({ where: { id } });
    return true;
  }
  return false;
}

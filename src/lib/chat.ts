import { prisma } from "@/lib/prisma";

export interface ChatMessage {
  id: string;
  userId: string;
  sender: "USER" | "ADMIN" | "SYSTEM";
  adminId?: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ChatConversation {
  userId: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export async function getUserChatMessages(userId: string): Promise<ChatMessage[]> {
  try {
    // Mark admin messages as read when user opens the chat
    await prisma.supportChatMessage.updateMany({
      where: {
        userId,
        sender: "ADMIN",
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    const messages = await prisma.supportChatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return messages.map((m) => ({
      id: m.id,
      userId: m.userId,
      sender: m.sender as any,
      message: m.message,
      read: m.isRead,
      createdAt: m.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("Error fetching user chat messages:", err);
    return [];
  }
}

export async function sendUserChatMessage(
  userId: string,
  message: string
): Promise<ChatMessage | null> {
  try {
    const trimmed = message.trim();
    if (!trimmed) return null;

    const record = await prisma.supportChatMessage.create({
      data: {
        userId,
        sender: "USER",
        message: trimmed,
        isRead: false,
      },
    });

    return {
      id: record.id,
      userId: record.userId,
      sender: record.sender as any,
      message: record.message,
      read: record.isRead,
      createdAt: record.createdAt.toISOString(),
    };
  } catch (err) {
    console.error("Error sending user chat message:", err);
    return null;
  }
}

export async function sendAdminChatMessage(
  userId: string,
  adminId: string,
  message: string
): Promise<ChatMessage | null> {
  try {
    const trimmed = message.trim();
    if (!trimmed) return null;

    const record = await prisma.supportChatMessage.create({
      data: {
        userId,
        sender: "ADMIN",
        message: trimmed,
        isRead: false,
      },
    });

    return {
      id: record.id,
      userId: record.userId,
      sender: record.sender as any,
      message: record.message,
      read: record.isRead,
      createdAt: record.createdAt.toISOString(),
    };
  } catch (err) {
    console.error("Error sending admin chat message:", err);
    return null;
  }
}

export async function getAdminChatMessages(userId: string): Promise<ChatMessage[]> {
  try {
    // Mark user messages as read when admin views the thread
    await prisma.supportChatMessage.updateMany({
      where: {
        userId,
        sender: "USER",
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    const messages = await prisma.supportChatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return messages.map((m) => ({
      id: m.id,
      userId: m.userId,
      sender: m.sender as any,
      message: m.message,
      read: m.isRead,
      createdAt: m.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("Error fetching admin chat messages:", err);
    return [];
  }
}

export async function getAdminChatConversations(search?: string): Promise<ChatConversation[]> {
  try {
    const usersWithMessages = await prisma.user.findMany({
      where: {
        ...(search?.trim()
          ? {
              OR: [
                { name: { contains: search.trim() } },
                { email: { contains: search.trim() } },
              ],
            }
          : {}),
        supportChatMessages: {
          some: {},
        },
      },
      include: {
        supportChatMessages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      take: 100,
    });

    const conversations: ChatConversation[] = [];

    for (const u of usersWithMessages) {
      const lastMsg = u.supportChatMessages[0];
      if (!lastMsg) continue;

      const unreadCount = await prisma.supportChatMessage.count({
        where: {
          userId: u.id,
          sender: "USER",
          isRead: false,
        },
      });

      conversations.push({
        userId: u.id,
        userName: u.name,
        userEmail: u.email,
        lastMessage: lastMsg.message,
        lastMessageAt: lastMsg.createdAt.toISOString(),
        unreadCount,
      });
    }

    // Sort by most recent message
    conversations.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    return conversations;
  } catch (err) {
    console.error("Error fetching admin chat conversations:", err);
    return [];
  }
}

export async function getUnreadChatCount(userId: string): Promise<number> {
  try {
    return await prisma.supportChatMessage.count({
      where: {
        userId,
        sender: "ADMIN",
        isRead: false,
      },
    });
  } catch {
    return 0;
  }
}

export const getAdminUserChatMessages = getAdminChatMessages;

export async function markChatAsRead(
  userId: string,
  senderToMark: "USER" | "ADMIN" = "USER"
): Promise<boolean> {
  try {
    await prisma.supportChatMessage.updateMany({
      where: {
        userId,
        sender: senderToMark,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteChatMessage(messageId: string): Promise<boolean> {
  try {
    await prisma.supportChatMessage.delete({
      where: { id: messageId },
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteUserChatThread(userId: string): Promise<boolean> {
  try {
    await prisma.supportChatMessage.deleteMany({
      where: { userId },
    });
    return true;
  } catch {
    return false;
  }
}


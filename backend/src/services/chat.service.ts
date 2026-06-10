import { prisma } from "../lib/prisma.js";
import { ChatType, MessageStatus } from "@prisma/client";
import crypto from "crypto";

export class ChatService {
  private encryptionKey = process.env.ENCRYPTION_KEY || "default-key-change-in-production";

  async getOrCreateChat(participant1Id: string, participant2Id: string, type: ChatType) {
    const [id1, id2] = [participant1Id, participant2Id].sort();

    let chat = await prisma.chat.findUnique({
      where: {
        participant1Id_participant2Id: {
          participant1Id: id1,
          participant2Id: id2,
        },
      },
      include: { messages: true },
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          type,
          participant1Id: id1,
          participant2Id: id2,
        },
        include: { messages: true },
      });
    }

    return chat;
  }

  async sendMessage(data: {
    chatId: string;
    senderId: string;
    receiverId: string;
    content: string;
    replyToId?: string;
  }) {
    const { iv, encrypted } = this.encryptMessage(data.content);

    return prisma.message.create({
      data: {
        chatId: data.chatId,
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        encryptedContent: encrypted,
        iv,
        status: MessageStatus.SENT,
        replyToId: data.replyToId,
      },
      include: {
        sender: true,
        receiver: true,
        replyTo: true,
      },
    });
  }

  async getMessages(chatId: string, limit = 50, offset = 0) {
    return prisma.message.findMany({
      where: { chatId },
      include: {
        sender: true,
        receiver: true,
        replyTo: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async markMessageAsRead(messageId: string) {
    return prisma.message.update({
      where: { id: messageId },
      data: {
        status: MessageStatus.DELIVERED,
        readAt: new Date(),
      },
      include: {
        sender: true,
        receiver: true,
      },
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new Error("Message not found");
    if (message.senderId !== userId) throw new Error("Unauthorized");

    return prisma.message.update({
      where: { id: messageId },
      data: { deletedBy: userId },
    });
  }

  async getUserChats(userId: string) {
    const chats = await prisma.chat.findMany({
      where: {
        OR: [
          { participant1Id: userId },
          { participant2Id: userId },
        ],
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        participant1: true,
        participant2: true,
      },
      orderBy: { lastMessageAt: "desc" },
    });

    return chats;
  }

  async getUnreadCount(userId: string) {
    return prisma.message.count({
      where: {
        receiverId: userId,
        status: MessageStatus.SENT,
      },
    });
  }

  private encryptMessage(content: string): { iv: string; encrypted: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(this.encryptionKey.padEnd(32, "0").slice(0, 32)),
      iv
    );

    let encrypted = cipher.update(content, "utf8", "hex");
    encrypted += cipher.final("hex");

    return {
      iv: iv.toString("hex"),
      encrypted,
    };
  }

  decryptMessage(encrypted: string, iv: string): string {
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(this.encryptionKey.padEnd(32, "0").slice(0, 32)),
      Buffer.from(iv, "hex")
    );

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}

export const chatService = new ChatService();

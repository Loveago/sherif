import { prisma } from "../lib/prisma.js";
import { UserRole } from "@prisma/client";

export class AnnouncementService {
  async createAnnouncement(data: {
    title: string;
    content: string;
    targetRole?: UserRole;
    displayLocation?: string;
    priority?: string;
    pinned?: boolean;
    active?: boolean;
    scheduledFor?: Date;
  }) {
    return prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        targetRole: data.targetRole,
        displayLocation: data.displayLocation || "all",
        priority: data.priority || "normal",
        pinned: data.pinned || false,
        active: data.active !== false,
        scheduledFor: data.scheduledFor,
      },
    });
  }

  async getAnnouncementById(announcementId: string) {
    return prisma.announcement.findUnique({
      where: { id: announcementId },
    });
  }

  async getAllAnnouncements(filters?: {
    active?: boolean;
    targetRole?: UserRole;
    displayLocation?: string;
  }) {
    return prisma.announcement.findMany({
      where: {
        ...(filters?.active !== undefined && { active: filters.active }),
        ...(filters?.targetRole && { targetRole: filters.targetRole }),
        ...(filters?.displayLocation && { displayLocation: filters.displayLocation }),
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });
  }

  async getAnnouncementsForUser(userRole: UserRole) {
    return prisma.announcement.findMany({
      where: {
        active: true,
        OR: [
          { targetRole: null },
          { targetRole: userRole },
        ],
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });
  }

  async updateAnnouncement(announcementId: string, data: Partial<{
    title: string;
    content: string;
    targetRole: UserRole | null;
    displayLocation: string;
    priority: string;
    pinned: boolean;
    active: boolean;
    scheduledFor: Date | null;
  }>) {
    return prisma.announcement.update({
      where: { id: announcementId },
      data,
    });
  }

  async deleteAnnouncement(announcementId: string) {
    return prisma.announcement.delete({
      where: { id: announcementId },
    });
  }

  async toggleAnnouncementStatus(announcementId: string) {
    const announcement = await this.getAnnouncementById(announcementId);
    if (!announcement) throw new Error("Announcement not found");

    return this.updateAnnouncement(announcementId, {
      active: !announcement.active,
    });
  }

  async pinAnnouncement(announcementId: string) {
    return this.updateAnnouncement(announcementId, { pinned: true });
  }

  async unpinAnnouncement(announcementId: string) {
    return this.updateAnnouncement(announcementId, { pinned: false });
  }
}

export const announcementService = new AnnouncementService();

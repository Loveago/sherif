import { prisma } from "../lib/prisma.js";
import { ComplaintStatus } from "@prisma/client";

export class ComplaintService {
  async createComplaint(data: {
    userId: string;
    title: string;
    description: string;
    evidenceUrl?: string;
  }) {
    return prisma.complaint.create({
      data,
      include: {
        user: true,
        assignedTo: true,
      },
    });
  }

  async getComplaintById(complaintId: string) {
    return prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        user: true,
        assignedTo: true,
      },
    });
  }

  async getUserComplaints(userId: string) {
    return prisma.complaint.findMany({
      where: { userId },
      include: {
        user: true,
        assignedTo: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getAllComplaints(filters?: {
    status?: ComplaintStatus;
    userId?: string;
    assignedToId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    return prisma.complaint.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.assignedToId && { assignedToId: filters.assignedToId }),
        ...(filters?.startDate && {
          createdAt: { gte: filters.startDate },
        }),
        ...(filters?.endDate && {
          createdAt: { lte: filters.endDate },
        }),
      },
      include: {
        user: true,
        assignedTo: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateComplaintStatus(complaintId: string, status: ComplaintStatus) {
    return prisma.complaint.update({
      where: { id: complaintId },
      data: { status },
      include: {
        user: true,
        assignedTo: true,
      },
    });
  }

  async assignComplaint(complaintId: string, assignedToId: string) {
    return prisma.complaint.update({
      where: { id: complaintId },
      data: {
        assignedToId,
        status: ComplaintStatus.ASSIGNED,
      },
      include: {
        user: true,
        assignedTo: true,
      },
    });
  }

  async resolveComplaint(complaintId: string) {
    return this.updateComplaintStatus(complaintId, ComplaintStatus.RESOLVED);
  }

  async getComplaintStats() {
    const [total, open, assigned, responded, resolved, escalated] = await Promise.all([
      prisma.complaint.count(),
      prisma.complaint.count({ where: { status: ComplaintStatus.OPEN } }),
      prisma.complaint.count({ where: { status: ComplaintStatus.ASSIGNED } }),
      prisma.complaint.count({ where: { status: ComplaintStatus.RESPONDED } }),
      prisma.complaint.count({ where: { status: ComplaintStatus.RESOLVED } }),
      prisma.complaint.count({ where: { status: ComplaintStatus.ESCALATED } }),
    ]);

    return {
      total,
      open,
      assigned,
      responded,
      resolved,
      escalated,
    };
  }
}

export const complaintService = new ComplaintService();

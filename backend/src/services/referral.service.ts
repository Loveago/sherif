import { prisma } from "../lib/prisma.js";
import { ReferralCodeStatus } from "@prisma/client";
import { nanoid } from "nanoid";

export class ReferralService {
  async generateReferralCode(data: {
    createdById: string;
    maxUses?: number;
    expiresAt?: Date;
  }) {
    const code = nanoid(8).toUpperCase();

    return prisma.referralCode.create({
      data: {
        code,
        createdById: data.createdById,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt,
        status: ReferralCodeStatus.ACTIVE,
      },
      include: {
        createdBy: true,
        usedBy: true,
      },
    });
  }

  async getReferralCodeByCode(code: string) {
    return prisma.referralCode.findUnique({
      where: { code },
      include: {
        createdBy: true,
        usedBy: true,
      },
    });
  }

  async getReferralCodeById(codeId: string) {
    return prisma.referralCode.findUnique({
      where: { id: codeId },
      include: {
        createdBy: true,
        usedBy: true,
      },
    });
  }

  async getAllReferralCodes(filters?: {
    createdById?: string;
    status?: ReferralCodeStatus;
  }) {
    return prisma.referralCode.findMany({
      where: {
        ...(filters?.createdById && { createdById: filters.createdById }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        createdBy: true,
        usedBy: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async validateReferralCode(code: string): Promise<{ valid: boolean; message: string }> {
    const referralCode = await this.getReferralCodeByCode(code);

    if (!referralCode) {
      return { valid: false, message: "Referral code not found" };
    }

    if (referralCode.status !== ReferralCodeStatus.ACTIVE) {
      return { valid: false, message: "Referral code is not active" };
    }

    if (referralCode.expiresAt && new Date() > referralCode.expiresAt) {
      return { valid: false, message: "Referral code has expired" };
    }

    if (referralCode.maxUses && referralCode.currentUses >= referralCode.maxUses) {
      return { valid: false, message: "Referral code has reached maximum uses" };
    }

    return { valid: true, message: "Valid" };
  }

  async useReferralCode(code: string, userId: string) {
    const referralCode = await this.getReferralCodeByCode(code);
    if (!referralCode) throw new Error("Referral code not found");

    const validation = await this.validateReferralCode(code);
    if (!validation.valid) throw new Error(validation.message);

    return prisma.referralCode.update({
      where: { code },
      data: {
        currentUses: referralCode.currentUses + 1,
        usedById: userId,
      },
      include: {
        createdBy: true,
        usedBy: true,
      },
    });
  }

  async updateReferralCode(codeId: string, data: Partial<{
    maxUses: number | null;
    expiresAt: Date | null;
    status: ReferralCodeStatus;
  }>) {
    return prisma.referralCode.update({
      where: { id: codeId },
      data,
      include: {
        createdBy: true,
        usedBy: true,
      },
    });
  }

  async deactivateReferralCode(codeId: string) {
    return this.updateReferralCode(codeId, {
      status: ReferralCodeStatus.INACTIVE,
    });
  }

  async getReferralStats(createdById: string) {
    const codes = await this.getAllReferralCodes({ createdById });
    const totalCodes = codes.length;
    const activeCodes = codes.filter(c => c.status === ReferralCodeStatus.ACTIVE).length;
    const totalUses = codes.reduce((sum, c) => sum + c.currentUses, 0);

    return {
      totalCodes,
      activeCodes,
      totalUses,
    };
  }
}

export const referralService = new ReferralService();

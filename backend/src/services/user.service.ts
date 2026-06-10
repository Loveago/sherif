import { prisma } from "../lib/prisma.js";
import { UserRole, VerificationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

export class UserService {
  async getAllUsers(filters?: {
    role?: UserRole;
    verificationStatus?: VerificationStatus;
    search?: string;
  }) {
    return prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(filters?.role && { role: filters.role }),
        ...(filters?.verificationStatus && { verificationStatus: filters.verificationStatus }),
        ...(filters?.search && {
          OR: [
            { firstName: { contains: filters.search, mode: "insensitive" } },
            { lastName: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        wallet: true,
        storefront: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        storefront: true,
        orders: true,
        withdrawals: true,
        commissions: true,
      },
    });
  }

  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role?: UserRole;
  }) {
    const passwordHash = await bcrypt.hash(data.password, 10);

    return prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: data.role || UserRole.AGENT,
        verificationStatus: VerificationStatus.PENDING,
      },
      include: {
        wallet: true,
      },
    });
  }

  async updateUser(userId: string, data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: UserRole;
    avatarUrl: string;
    companyName: string;
  }>) {
    return prisma.user.update({
      where: { id: userId },
      data,
      include: {
        wallet: true,
        storefront: true,
      },
    });
  }

  async updateUserPassword(userId: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async changeUserRole(userId: string, newRole: UserRole) {
    return prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      include: {
        wallet: true,
        storefront: true,
      },
    });
  }

  async suspendUser(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: VerificationStatus.SUSPENDED },
    });
  }

  async unsuspendUser(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: VerificationStatus.VERIFIED },
    });
  }

  async deleteUser(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  }

  async getUserStats() {
    const [total, active, suspended, agents, admins] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, verificationStatus: VerificationStatus.VERIFIED } }),
      prisma.user.count({ where: { deletedAt: null, verificationStatus: VerificationStatus.SUSPENDED } }),
      prisma.user.count({ where: { deletedAt: null, role: UserRole.AGENT } }),
      prisma.user.count({ where: { deletedAt: null, role: UserRole.ADMIN } }),
    ]);

    return {
      total,
      active,
      suspended,
      agents,
      admins,
    };
  }
}

export const userService = new UserService();

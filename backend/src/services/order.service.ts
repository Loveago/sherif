import { prisma } from "../lib/prisma.js";
import { OrderStatus } from "@prisma/client";
import { nanoid } from "nanoid";

export class OrderService {
  async createOrder(data: {
    userId: string;
    productId: string;
    phoneNumber: string;
    amount: number;
    batchId?: string;
  }) {
    const receiptNumber = `ORD-${nanoid(10).toUpperCase()}`;

    return prisma.order.create({
      data: {
        ...data,
        receiptNumber,
        amount: BigInt(Math.round(data.amount * 100)) / 100n,
        status: OrderStatus.PENDING,
      },
      include: {
        product: {
          include: { network: true },
        },
        user: true,
      },
    });
  }

  async getOrderById(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: {
          include: { network: true },
        },
        user: true,
        commission: true,
        refund: true,
      },
    });
  }

  async getUserOrders(userId: string, filters?: {
    status?: OrderStatus;
    startDate?: Date;
    endDate?: Date;
    productId?: string;
  }) {
    return prisma.order.findMany({
      where: {
        userId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.productId && { productId: filters.productId }),
        ...(filters?.startDate && {
          createdAt: { gte: filters.startDate },
        }),
        ...(filters?.endDate && {
          createdAt: { lte: filters.endDate },
        }),
      },
      include: {
        product: {
          include: { network: true },
        },
        commission: true,
        refund: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getAllOrders(filters?: {
    status?: OrderStatus;
    userId?: string;
    productId?: string;
    networkId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    return prisma.order.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.productId && { productId: filters.productId }),
        ...(filters?.startDate && {
          createdAt: { gte: filters.startDate },
        }),
        ...(filters?.endDate && {
          createdAt: { lte: filters.endDate },
        }),
      },
      include: {
        product: {
          include: { network: true },
        },
        user: true,
        commission: true,
        refund: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    return prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        product: {
          include: { network: true },
        },
        user: true,
      },
    });
  }

  async cancelOrder(orderId: string) {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error("Order not found");

    if (order.status === OrderStatus.SUCCESSFUL) {
      throw new Error("Cannot cancel completed orders");
    }

    return this.updateOrderStatus(orderId, OrderStatus.FAILED);
  }

  async getOrdersByBatch(batchId: string) {
    return prisma.order.findMany({
      where: { batchId },
      include: {
        product: {
          include: { network: true },
        },
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOrderStats(userId?: string) {
    const where = userId ? { userId } : {};

    const [total, pending, processing, successful, failed, refunded] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: OrderStatus.PENDING } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.PROCESSING } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.SUCCESSFUL } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.FAILED } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.REFUNDED } }),
    ]);

    return {
      total,
      pending,
      processing,
      successful,
      failed,
      refunded,
    };
  }
}

export const orderService = new OrderService();

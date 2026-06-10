import { prisma } from "../lib/prisma.js";
import { Prisma, UserRole } from "@prisma/client";

export class ProductService {
  async getAllProducts(filters?: {
    networkId?: string;
    showInShop?: boolean;
    showForAgents?: boolean;
    status?: boolean;
  }) {
    return prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(filters?.networkId && { networkId: filters.networkId }),
        ...(filters?.showInShop !== undefined && { showInShop: filters.showInShop }),
        ...(filters?.showForAgents !== undefined && { showForAgents: filters.showForAgents }),
        ...(filters?.status !== undefined && { status: filters.status }),
      },
      include: {
        network: true,
        rolePrices: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getProductById(productId: string) {
    return prisma.product.findUnique({
      where: { id: productId },
      include: {
        network: true,
        rolePrices: true,
      },
    });
  }

  async createProduct(data: {
    name: string;
    description: string;
    dataSize: string;
    sellingPrice: number;
    agentPrice: number;
    resellerPrice: number;
    buyingPrice: number;
    promoPrice?: number;
    stock?: number;
    networkId: string;
    showInShop?: boolean;
    showForAgents?: boolean;
  }) {
    const slug = data.name.toLowerCase().replace(/\s+/g, "-");
    return prisma.product.create({
      data: {
        ...data,
        slug,
        sellingPrice: new Prisma.Decimal(data.sellingPrice),
        agentPrice: new Prisma.Decimal(data.agentPrice),
        resellerPrice: new Prisma.Decimal(data.resellerPrice),
        buyingPrice: new Prisma.Decimal(data.buyingPrice),
        promoPrice: data.promoPrice ? new Prisma.Decimal(data.promoPrice) : null,
      },
      include: {
        network: true,
        rolePrices: true,
      },
    });
  }

  async updateProduct(productId: string, data: Partial<{
    name: string;
    description: string;
    dataSize: string;
    sellingPrice: number;
    agentPrice: number;
    resellerPrice: number;
    buyingPrice: number;
    promoPrice?: number;
    stock: number;
    showInShop: boolean;
    showForAgents: boolean;
    status: boolean;
  }>) {
    return prisma.product.update({
      where: { id: productId },
      data,
      include: {
        network: true,
        rolePrices: true,
      },
    });
  }

  async deleteProduct(productId: string) {
    return prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    });
  }

  async getPriceForRole(productId: string, role: UserRole): Promise<number> {
    const rolePrice = await prisma.rolePrice.findUnique({
      where: {
        productId_role: {
          productId,
          role,
        },
      },
    });

    if (rolePrice) {
      return Number(rolePrice.price);
    }

    const product = await this.getProductById(productId);
    if (!product) throw new Error("Product not found");

    if (product.promoPrice) {
      return Number(product.promoPrice);
    }

    return Number(product.sellingPrice);
  }

  async setRolePrice(productId: string, role: UserRole, price: number) {
    return prisma.rolePrice.upsert({
      where: {
        productId_role: {
          productId,
          role,
        },
      },
      update: { price },
      create: {
        productId,
        role,
        price,
        userId: "", // Will be set by caller if needed
      },
    });
  }

  async updateStock(productId: string, quantity: number, operation: "add" | "subtract") {
    const product = await this.getProductById(productId);
    if (!product) throw new Error("Product not found");

    const newStock = operation === "add" 
      ? product.stock + quantity 
      : Math.max(0, product.stock - quantity);

    return this.updateProduct(productId, { stock: newStock });
  }
}

export const productService = new ProductService();

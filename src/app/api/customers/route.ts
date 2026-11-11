import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const search = (searchParams.get("search") || "").trim();
    const network = (searchParams.get("network") || "ALL").toUpperCase();

    // Super Admin can view all or self
    const isAdmin = user.role === "ADMIN" || user.role === "MANAGER";
    const viewAll = isAdmin && searchParams.get("view") === "all";

    const orders = await prisma.order.findMany({
      where: {
        ...(viewAll ? {} : { userId: user.id }),
        ...(network !== "ALL" ? { network } : {}),
        ...(search ? { phoneNumber: { contains: search } } : {}),
      },
      select: {
        id: true,
        phoneNumber: true,
        network: true,
        gbAmount: true,
        amount: true,
        status: true,
        createdAt: true,
        dataPackage: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 2000,
    });

    // Aggregate by phone number
    const customerMap = new Map<
      string,
      {
        phoneNumber: string;
        network: string;
        totalOrders: number;
        successfulOrders: number;
        totalSpend: number;
        totalVolumeGb: number;
        lastOrderDate: string;
        lastBundle: string;
      }
    >();

    for (const order of orders) {
      const existing = customerMap.get(order.phoneNumber);
      const isSuccess =
        order.status === "SUCCESS" ||
        order.status === "COMPLETED" ||
        order.status === "DELIVERED";
      const spend = Number(order.amount) || 0;
      const vol = Number(order.gbAmount) || 0;
      const bundleName = order.dataPackage?.name || `${order.gbAmount} GB ${order.network}`;

      if (!existing) {
        customerMap.set(order.phoneNumber, {
          phoneNumber: order.phoneNumber,
          network: order.network,
          totalOrders: 1,
          successfulOrders: isSuccess ? 1 : 0,
          totalSpend: spend,
          totalVolumeGb: vol,
          lastOrderDate: order.createdAt.toISOString(),
          lastBundle: bundleName,
        });
      } else {
        existing.totalOrders += 1;
        if (isSuccess) existing.successfulOrders += 1;
        existing.totalSpend += spend;
        existing.totalVolumeGb += vol;
      }
    }

    const customers = Array.from(customerMap.values()).sort(
      (a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()
    );

    const totalCustomers = customers.length;
    const repeatCustomers = customers.filter((c) => c.totalOrders > 1).length;
    const totalOrdersCount = orders.length;
    const totalDispatchedSpend = customers.reduce((acc, c) => acc + c.totalSpend, 0);

    return NextResponse.json({
      customers,
      stats: {
        totalCustomers,
        repeatCustomers,
        totalOrders: totalOrdersCount,
        totalSpend: totalDispatchedSpend,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

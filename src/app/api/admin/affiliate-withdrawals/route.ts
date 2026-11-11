import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError, apiError } from "@/lib/api-helpers";
import {
  approveAffiliateWithdrawal,
  rejectAffiliateWithdrawal,
} from "@/lib/affiliate";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const withdrawals = await prisma.affiliateWithdrawal.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, balance: true, affiliateBalance: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ withdrawals });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { id, action, adminNote } = body;

    if (!id || !action) {
      return apiError(400, "id and action are required.");
    }

    if (action === "APPROVE") {
      const result = await approveAffiliateWithdrawal(id, admin.email || "admin");
      return NextResponse.json({ success: true, result });
    } else if (action === "REJECT") {
      const result = await rejectAffiliateWithdrawal(id, adminNote || "Rejected", admin.email || "admin");
      return NextResponse.json({ success: true, result });
    } else {
      return apiError(400, "Invalid action. Must be APPROVE or REJECT.");
    }
  } catch (err) {
    return handleRouteError(err);
  }
}

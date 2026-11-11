import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError, apiError } from "@/lib/api-helpers";
import { requireStorefront } from "@/lib/storefront";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const storefront = await requireStorefront(user.id);

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");

    const where: any = {
      storefrontId: storefront.id,
    };
    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam;
    }

    const [reviews, totalCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.storefrontReview.findMany({
        where,
        orderBy: { createdAt: "desc" },
      }),
      prisma.storefrontReview.count({ where: { storefrontId: storefront.id } }),
      prisma.storefrontReview.count({ where: { storefrontId: storefront.id, status: "PENDING" } }),
      prisma.storefrontReview.count({ where: { storefrontId: storefront.id, status: "APPROVED" } }),
      prisma.storefrontReview.count({ where: { storefrontId: storefront.id, status: "REJECTED" } }),
    ]);

    return NextResponse.json({
      reviews,
      counts: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

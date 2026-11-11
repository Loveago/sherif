import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, apiError } from "@/lib/api-helpers";
import { getEnabledStorefrontBySlug } from "@/lib/storefront";
import { storefrontReviewSubmitSchema } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const storefront = await getEnabledStorefrontBySlug(slug);
    if (!storefront) {
      return apiError(404, "Store not found");
    }

    const reviews = await prisma.storefrontReview.findMany({
      where: {
        storefrontId: storefront.id,
        status: "APPROVED",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        customerName: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });

    const aggregate = await prisma.storefrontReview.aggregate({
      where: {
        storefrontId: storefront.id,
        status: "APPROVED",
      },
      _avg: { rating: true },
      _count: { id: true },
    });

    return NextResponse.json({
      reviews,
      stats: {
        averageRating: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : 5.0,
        totalCount: aggregate._count.id ?? 0,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const storefront = await getEnabledStorefrontBySlug(slug);
    if (!storefront) {
      return apiError(404, "Store not found");
    }

    if (storefront.reviewsEnabled === false) {
      return apiError(403, "Reviews are currently disabled for this storefront.");
    }

    const body = await request.json();
    const input = storefrontReviewSubmitSchema.parse(body);

    const review = await prisma.storefrontReview.create({
      data: {
        storefrontId: storefront.id,
        customerName: input.customerName,
        rating: input.rating,
        comment: input.comment,
        status: "PENDING", // Must be approved by the agent before being shown
      },
    });

    return NextResponse.json({
      success: true,
      message: "Thank you for your review! It has been submitted and will appear once approved by the store owner.",
      reviewId: review.id,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

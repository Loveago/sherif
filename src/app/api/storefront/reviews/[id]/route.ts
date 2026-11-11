import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError, apiError } from "@/lib/api-helpers";
import { requireStorefront } from "@/lib/storefront";
import { storefrontReviewActionSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const storefront = await requireStorefront(user.id);
    const { id } = await params;

    const review = await prisma.storefrontReview.findUnique({
      where: { id },
    });

    if (!review || review.storefrontId !== storefront.id) {
      return apiError(404, "Review not found on your storefront.");
    }

    const body = await request.json();
    const { action } = storefrontReviewActionSchema.parse(body);

    const updated = await prisma.storefrontReview.update({
      where: { id },
      data: {
        status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        approvedAt: action === "APPROVE" ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      review: updated,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const storefront = await requireStorefront(user.id);
    const { id } = await params;

    const review = await prisma.storefrontReview.findUnique({
      where: { id },
    });

    if (!review || review.storefrontId !== storefront.id) {
      return apiError(404, "Review not found on your storefront.");
    }

    await prisma.storefrontReview.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Review deleted successfully.",
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

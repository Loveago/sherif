import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError, apiError } from "@/lib/api-helpers";
import { getAgentAffiliateOverview, ensureUserAffiliateCode } from "@/lib/affiliate";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.referredById) {
      return apiError(403, "Sub-agents do not have access to the affiliate network.");
    }
    const overview = await getAgentAffiliateOverview(user.id);
    return NextResponse.json(overview);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    if (user.referredById) {
      return apiError(403, "Sub-agents do not have access to the affiliate network.");
    }
    const body = await request.json();
    const rawCode = body.affiliateCode?.trim()?.toUpperCase();

    if (!rawCode || rawCode.length < 3 || rawCode.length > 20) {
      return apiError(400, "Affiliate code must be between 3 and 20 alphanumeric characters.");
    }

    if (!/^[A-Z0-9_-]+$/.test(rawCode)) {
      return apiError(400, "Affiliate code can only contain letters, numbers, hyphens, and underscores.");
    }

    // Check if code is already taken by someone else
    const existing = await prisma.user.findFirst({
      where: {
        affiliateCode: rawCode,
        NOT: { id: user.id },
      },
      select: { id: true },
    });

    if (existing) {
      return apiError(409, "This affiliate code is already taken. Please choose another.");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { affiliateCode: rawCode },
      select: { id: true, affiliateCode: true },
    });

    return NextResponse.json({
      success: true,
      affiliateCode: updated.affiliateCode,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

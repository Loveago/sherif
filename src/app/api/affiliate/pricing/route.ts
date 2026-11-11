import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRouteError, apiError } from "@/lib/api-helpers";
import {
  getAgentAffiliatePricingSheet,
  saveAgentAffiliatePricingSheet,
} from "@/lib/affiliate";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.referredById) {
      return apiError(403, "Sub-agents do not have access to affiliate pricing.");
    }
    const sheet = await getAgentAffiliatePricingSheet(user.id);
    return NextResponse.json({ sheet });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (user.referredById) {
      return apiError(403, "Sub-agents cannot set affiliate prices.");
    }
    const body = await request.json();

    if (!Array.isArray(body.prices)) {
      return apiError(400, "prices array is required.");
    }

    const saved = await saveAgentAffiliatePricingSheet(user.id, body.prices);

    return NextResponse.json({
      success: true,
      count: saved.length,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

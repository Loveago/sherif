import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getClientIp } from "@/lib/auth";
import { setBalanceSchema } from "@/lib/validation";
import { adminSetUserBalance } from "@/lib/send-claim";
import { handleRouteError } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const body = await request.json();
    const input = setBalanceSchema.parse(body);
    const ip = await getClientIp();

    const result = await adminSetUserBalance({
      adminId: actor.id,
      adminEmail: actor.email,
      userId: input.userId,
      targetBalance: input.targetBalance,
      reason: input.reason,
      reference: input.reference || undefined,
      ip,
    });

    return NextResponse.json({
      ok: true,
      message: `Updated balance to GHS ${result.newBalance.toFixed(2)}`,
      data: result,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

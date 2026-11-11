import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-helpers";

export async function POST() {
  try {
    await requireStaff();
    return NextResponse.json({
      success: true,
      checked: 0,
      updated: 0,
      results: [],
      message: "Partner sync is deprecated. TSKCONNECT is currently the active provider.",
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

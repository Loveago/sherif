import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET() {
  try {
    await requireRole(["ADMIN", "MANAGER", "SECRETARY"]);

    const [requests, totalAccepted, totalRequests] = await Promise.all([
      prisma.mtnVerificationRequest.findMany({
        orderBy: { submittedAt: "desc" },
        take: 100,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      }),
      prisma.acceptedMtnNumber.count(),
      prisma.mtnVerificationRequest.count(),
    ]);

    return NextResponse.json({
      requests,
      stats: {
        totalAccepted,
        totalRequests,
        pendingCount: requests.filter((r) => r.status === "SUBMITTED" || r.status === "PROCESSING").length,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error querying verification queue";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

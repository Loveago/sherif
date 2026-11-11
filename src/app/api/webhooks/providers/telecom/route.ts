import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference, providerReference, status, failureReason } = body;

    const ref = providerReference || reference;
    if (!ref) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ providerReference: ref }, { externalReference: ref }],
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const mappedStatus =
      status === "DELIVERED" || status === "SUCCESS"
        ? "SUCCESS"
        : status === "FAILED"
        ? "FAILED"
        : "PROCESSING";

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: mappedStatus,
        failureReason: failureReason || order.failureReason,
        completedAt: mappedStatus === "SUCCESS" ? new Date() : undefined,
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: mappedStatus,
        note: `Carrier webhook callback received: status ${status}`,
        changedBy: "carrier-webhook",
      },
    });

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Carrier webhook error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

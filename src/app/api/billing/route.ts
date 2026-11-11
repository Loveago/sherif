import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-helpers";
import { verifyAndSettlePaystackTopup } from "@/lib/paystack";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));

    // Self-healing: automatically check and approve any pending Paystack top-ups for this user
    try {
      const pendingPaystack = await prisma.walletTransaction.findMany({
        where: {
          userId: user.id,
          type: "TOPUP",
          status: "PENDING",
          reference: { startsWith: "PSK-" },
          createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      });

      if (pendingPaystack.length > 0) {
        await Promise.allSettled(
          pendingPaystack.map((tx) => verifyAndSettlePaystackTopup(tx.id))
        );
      }
    } catch (reconcileErr) {
      console.error("Auto-reconcile error in billing GET:", reconcileErr);
    }

    // Self-heal: ensure user's historical orders have ledger debit records
    const { reconcileUserWalletLedger } = await import("@/lib/orders");
    await reconcileUserWalletLedger(user.id).catch(() => {});

    const where = { userId: user.id };
    const [data, total, allApprovedTxs, freshUser] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.walletTransaction.count({ where }),
      prisma.walletTransaction.findMany({
        where: { userId: user.id, status: "APPROVED" },
        select: { type: true, amount: true },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { balance: true },
      }),
    ]);

    let topups = 0;
    let spend = 0;
    for (const tx of allApprovedTxs) {
      if (tx.type === "TOPUP" || tx.type === "REFUND" || (tx.type === "ADJUSTMENT" && tx.amount > 0)) {
        topups += Math.abs(tx.amount);
      } else if (tx.type === "DEBIT" || (tx.type === "ADJUSTMENT" && tx.amount < 0)) {
        spend += Math.abs(tx.amount);
      }
    }

    const sendClaimSetting = await prisma.systemSetting.findUnique({
      where: { key: "send_claim_enabled" },
    });
    const sendClaimEnabled = sendClaimSetting?.value !== "false";

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
      balance: freshUser?.balance ?? user.balance,
      summary: { topups, spend },
      sendClaimEnabled,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-helpers";
import { reconcileUserWalletLedger } from "@/lib/orders";

/**
 * Compute the signed balance delta for a wallet transaction.
 * - TOPUP / REFUND / positive ADJUSTMENT → adds to balance
 * - DEBIT / negative ADJUSTMENT → subtracts from balance
 * - SIGNUP_FEE → paid directly via external gateway (Paystack), not debited from wallet
 * Only APPROVED transactions change the balance.
 */
function delta(type: string, amount: number, status: string): number {
  if (status !== "APPROVED") return 0;
  switch (type) {
    case "TOPUP":
    case "REFUND":
      return Math.abs(amount);
    case "DEBIT":
      return -Math.abs(amount);
    case "SIGNUP_FEE":
      // Account registration fee is paid directly by customer to Paystack
      // and does not debit prepaid wallet balance.
      return 0;
    case "ADJUSTMENT":
      // Adjustments can be positive (credit) or negative (debit).
      return amount;
    default:
      return 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireUser();
    const { searchParams } = new URL(request.url);

    const isStaff = actor.role === "ADMIN" || actor.role === "MANAGER" || actor.role === "SECRETARY";
    const requestedUserId = searchParams.get("userId")?.trim();
    const targetUserId = isStaff && requestedUserId ? requestedUserId : actor.id;

    // Self-heal: ensure user's historical orders, refunds, and opening balance have ledger records
    await reconcileUserWalletLedger(targetUserId);

    // Fetch target user & fresh balance
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, balance: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentBalance = targetUser.balance;

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));
    const filterType = searchParams.get("type") || null; // "CREDIT" | "DEBIT" | null

    // -------------------------------------------------------------------
    // 1. Fetch ALL transactions ordered oldest-first with tie-breaker
    // -------------------------------------------------------------------
    const allTxs = await prisma.walletTransaction.findMany({
      where: { userId: targetUser.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    // -------------------------------------------------------------------
    // 2. Compute anchor balance so the final running balance exactly matches
    //    the user's live wallet balance, while preserving every delta step.
    // -------------------------------------------------------------------
    let totalDeltas = 0;
    for (const tx of allTxs) {
      totalDeltas += delta(tx.type, tx.amount, tx.status);
    }
    const anchor = Number((currentBalance - totalDeltas).toFixed(2));

    let running = anchor;
    const enriched = allTxs.map((tx) => {
      const balanceBefore = running;
      running += delta(tx.type, tx.amount, tx.status);
      const balanceAfter = running;
      return { ...tx, balanceBefore, balanceAfter };
    });

    // Reverse to newest-first for display
    const newestFirst = [...enriched].reverse();

    // -------------------------------------------------------------------
    // 3. Apply optional type filter
    //    "CREDIT" = TOPUP | REFUND | positive ADJUSTMENT
    //    "DEBIT"  = DEBIT | negative ADJUSTMENT
    // -------------------------------------------------------------------
    const filtered =
      filterType === "CREDIT"
        ? newestFirst.filter(
            (tx) =>
              tx.type === "TOPUP" ||
              tx.type === "REFUND" ||
              (tx.type === "ADJUSTMENT" && tx.amount > 0)
          )
        : filterType === "DEBIT"
        ? newestFirst.filter(
            (tx) =>
              tx.type === "DEBIT" ||
              (tx.type === "ADJUSTMENT" && tx.amount < 0)
          )
        : newestFirst;

    // -------------------------------------------------------------------
    // 4. Paginate
    // -------------------------------------------------------------------
    const total = filtered.length;
    const pages = Math.ceil(total / pageSize);
    const data = filtered.slice((page - 1) * pageSize, page * pageSize);

    // -------------------------------------------------------------------
    // 5. Summary stats from all APPROVED transactions
    // -------------------------------------------------------------------
    let totalCredits = 0;
    let totalDebits = 0;
    for (const tx of allTxs) {
      if (tx.status !== "APPROVED") continue;
      const d = delta(tx.type, tx.amount, tx.status);
      if (d > 0) totalCredits += d;
      else if (d < 0) totalDebits += Math.abs(d);
    }

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      pages,
      balance: currentBalance,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
      },
      summary: {
        totalCredits,
        totalDebits,
        netFlow: totalCredits - totalDebits,
        transactionCount: allTxs.length,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}


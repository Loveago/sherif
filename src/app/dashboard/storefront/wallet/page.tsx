import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireActiveStorefront, ensureWallet, fromPesewas } from "@/lib/storefront";
import { WithdrawalForm } from "./withdrawal-form";
import { WalletWithdrawalsView } from "@/components/storefront/wallet-withdrawals-view";
import { WalletLedgerView } from "@/components/storefront/wallet-ledger-view";
import { Wallet, History, ArrowDownToLine, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StorefrontWalletPage({
  searchParams,
}: {
  searchParams?: Promise<{ wdPage?: string; txPage?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const wdPage = Math.max(1, parseInt(resolvedParams.wdPage || "1", 10));
  const txPage = Math.max(1, parseInt(resolvedParams.txPage || "1", 10));
  const wdPageSize = 10;
  const txPageSize = 15;

  const user = await requireUser();
  const storefront = await requireActiveStorefront(user.id);
  const wallet = await ensureWallet(user.id);

  const [
    transactions,
    totalTransactions,
    withdrawals,
    totalWithdrawals,
    approvedSum,
    pending,
  ] = await Promise.all([
    prisma.storefrontWalletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      skip: (txPage - 1) * txPageSize,
      take: txPageSize,
    }),
    prisma.storefrontWalletTransaction.count({
      where: { walletId: wallet.id },
    }),
    prisma.storefrontWithdrawal.findMany({
      where: { userId: user.id },
      orderBy: { requestedAt: "desc" },
      skip: (wdPage - 1) * wdPageSize,
      take: wdPageSize,
    }),
    prisma.storefrontWithdrawal.count({
      where: { userId: user.id },
    }),
    prisma.storefrontWithdrawal.aggregate({
      where: { userId: user.id, status: "APPROVED" },
      _sum: { amount: true },
    }),
    prisma.storefrontWithdrawal.findFirst({ where: { userId: user.id, status: "PENDING" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00df82]/30 bg-[#00df82]/10 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-[#00df82]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00df82] animate-pulse" />
                Reseller Treasury &amp; Settlements
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">· MoMo Direct Clearing</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Commissions &amp; Payout Wallet
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Track real-time earnings from public storefront sales, monitor pending margin clearance, and disburse instant withdrawals directly to your Mobile Money account.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Withdrawable Funds" value={wallet.balance} accent="text-[#00df82]" />
        <StatCard label="Pending Clearing" value={wallet.pendingBalance} accent="text-amber-500 dark:text-amber-400" />
        <StatCard label="Total Payouts Disbursed" value={approvedSum._sum.amount ?? 0} accent="text-cyan-600 dark:text-cyan-400" />
        <StatCard label="Cumulative Profit" value={wallet.balance + wallet.pendingBalance + (approvedSum._sum.amount ?? 0)} accent="text-slate-900 dark:text-white" />
      </div>

      <WithdrawalForm
        available={wallet.balance}
        pending={!!pending}
        pendingDetails={
          pending
            ? {
                amountGHS: fromPesewas(pending.amount),
                feeGHS: fromPesewas(pending.fee ?? 100),
                netAmountGHS: fromPesewas(pending.netAmount ?? pending.amount - (pending.fee ?? 100)),
                network: pending.network,
                momoNumber: pending.momoNumber,
                accountName: pending.accountName,
                reference: pending.reference ?? `BP-WD-${String(pending.seq).padStart(5, "0")}`,
                requestedAt: pending.requestedAt.toISOString(),
              }
            : null
        }
        disabled={storefront.status !== "ENABLED"}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Disbursement Payouts Log ({totalWithdrawals})
          </h2>
        </div>
        <WalletWithdrawalsView
          withdrawals={withdrawals.map((w) => ({
            id: w.id,
            seq: w.seq,
            reference: w.reference ?? `BP-WD-${String(w.seq).padStart(5, "0")}`,
            amount: w.amount,
            fee: w.fee ?? 100,
            netAmount: w.netAmount ?? Math.max(0, w.amount - (w.fee ?? 100)),
            network: w.network,
            momoNumber: w.momoNumber,
            accountName: w.accountName,
            status: w.status,
            adminNote: w.adminNote,
            requestedAt: w.requestedAt.toISOString(),
          }))}
          total={totalWithdrawals}
          page={wdPage}
          pageSize={wdPageSize}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Commission Clearance Ledger ({totalTransactions})
          </h2>
        </div>
        <WalletLedgerView
          transactions={transactions.map((t) => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            balanceBefore: t.balanceBefore,
            balanceAfter: t.balanceAfter,
            pendingBefore: t.pendingBefore,
            pendingAfter: t.pendingAfter,
            reference: t.reference,
            description: t.description,
            createdAt: t.createdAt.toISOString(),
          }))}
          total={totalTransactions}
          page={txPage}
          pageSize={txPageSize}
        />
      </section>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 shadow-xl flex flex-col justify-between">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-3 font-mono text-2xl font-black tabular-nums tracking-tight ${accent}`}>
        GHS {fromPesewas(value).toFixed(2)}
      </p>
    </div>
  );
}

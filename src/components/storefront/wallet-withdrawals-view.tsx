"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Copy, Check, ArrowDownToLine } from "lucide-react";
import { fromPesewas } from "@/lib/storefront-utils";

export interface ResellerWithdrawalItem {
  id: string;
  seq: number;
  reference: string;
  amount: number;
  fee: number;
  netAmount: number;
  network: string;
  momoNumber: string;
  accountName: string;
  status: string;
  adminNote: string | null;
  requestedAt: string;
}

export function WalletWithdrawalsView({
  withdrawals,
  total,
  page,
  pageSize = 10,
}: {
  withdrawals: ResellerWithdrawalItem[];
  total: number;
  page: number;
  pageSize?: number;
}) {
  const router = useRouter();
  const totalPages = Math.ceil(total / pageSize) || 1;
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function goToPage(p: number) {
    const next = Math.max(1, Math.min(totalPages, p));
    const url = new URL(window.location.href);
    url.searchParams.set("wdPage", String(next));
    router.push(url.pathname + url.search);
  }

  if (total === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-12 text-center text-xs text-slate-500 shadow-xl">
        <ArrowDownToLine className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-600 mb-2" />
        No withdrawal payouts requested yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] shadow-xl">
      {/* Mobile Card View (sm:hidden) */}
      <div className="divide-y divide-slate-100 dark:divide-[#162740]/60 sm:hidden">
        {withdrawals.map((w) => {
          const isPending = w.status === "PENDING";
          const isApproved = w.status === "APPROVED";
          const isRejected = w.status === "REJECTED";

          return (
            <div key={w.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono text-xs font-black text-cyan-600 dark:text-cyan-400">
                  <span>{w.reference}</span>
                  <button
                    type="button"
                    onClick={() => copy(w.reference, w.id)}
                    className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    {copiedId === w.id ? <Check className="h-3 w-3 text-[#00df82]" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    isApproved
                      ? "border border-[#00df82]/30 bg-[#00df82]/10 text-[#00df82]"
                      : isRejected
                      ? "border border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400"
                      : "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {isPending && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />}
                  {w.status}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] p-3 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Gross Requested:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">GHS {fromPesewas(w.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Settlement Fee:</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">−GHS {fromPesewas(w.fee).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 dark:border-[#162740]/60 pt-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Net MoMo Disbursed:</span>
                  <span className="font-mono font-black text-[#00df82]">GHS {fromPesewas(w.netAmount).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-xs space-y-0.5 font-mono">
                <p className="text-slate-900 dark:text-white font-bold">{w.network} · {w.momoNumber}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">{w.accountName}</p>
                {w.adminNote && (
                  <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300 font-sans border-l-2 border-amber-400 pl-2">
                    Note: {w.adminNote}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18]/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="px-5 py-3.5">Reference Code</th>
              <th className="px-5 py-3.5">Gross Amount</th>
              <th className="px-5 py-3.5">Fee</th>
              <th className="px-5 py-3.5">Net Payout</th>
              <th className="px-5 py-3.5">Destination MoMo</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Requested At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#162740]/60 font-mono">
            {withdrawals.map((w) => {
              const isPending = w.status === "PENDING";
              const isApproved = w.status === "APPROVED";
              const isRejected = w.status === "REJECTED";

              return (
                <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-[#0e192d]/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 font-black text-cyan-600 dark:text-cyan-400">
                      <span>{w.reference}</span>
                      <button
                        type="button"
                        onClick={() => copy(w.reference, w.id)}
                        className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      >
                        {copiedId === w.id ? <Check className="h-3 w-3 text-[#00df82]" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-900 dark:text-white font-bold">
                    GHS {fromPesewas(w.amount).toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                    GHS {fromPesewas(w.fee).toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-[#00df82] font-black text-sm">
                    GHS {fromPesewas(w.netAmount).toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-slate-900 dark:text-white">{w.network} · {w.momoNumber}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">{w.accountName}</p>
                  </td>
                  <td className="px-5 py-3.5 font-sans">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        isApproved
                          ? "border border-[#00df82]/30 bg-[#00df82]/10 text-[#00df82]"
                          : isRejected
                          ? "border border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400"
                          : "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {isPending && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />}
                      {w.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-sans text-slate-500 dark:text-slate-400 text-[11px]">
                    {new Date(w.requestedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-[#162740] p-4 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Page <strong className="text-slate-900 dark:text-white">{page}</strong> of <strong className="text-slate-900 dark:text-white">{totalPages}</strong> ({total} payout logs)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-3.5 py-1.5 font-bold text-slate-700 dark:text-slate-300 hover:border-[#00df82]/40 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-3.5 py-1.5 font-bold text-slate-700 dark:text-slate-300 hover:border-[#00df82]/40 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 transition cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

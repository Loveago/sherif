"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { fromPesewas } from "@/lib/storefront-utils";

export interface ResellerTransactionItem {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  pendingBefore: number | null;
  pendingAfter: number | null;
  reference: string | null;
  description: string | null;
  createdAt: string;
}

const TYPE_STYLES: Record<string, { cls: string; dot: string }> = {
  COMMISSION: {
    cls: "border border-amber-500/30 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
  },
  COMMISSION_RELEASE: {
    cls: "border border-[#00df82]/30 bg-[#00df82]/10 text-[#00df82]",
    dot: "bg-[#00df82]",
  },
  COMMISSION_REVERSAL: {
    cls: "border border-red-500/30 bg-red-500/10 text-red-400",
    dot: "bg-red-400",
  },
  WITHDRAWAL: {
    cls: "border border-rose-500/30 bg-rose-500/10 text-rose-300",
    dot: "bg-rose-400",
  },
  WITHDRAWAL_REVERSAL: {
    cls: "border border-sky-500/30 bg-sky-500/10 text-sky-300",
    dot: "bg-sky-400",
  },
  ADJUSTMENT: {
    cls: "border border-purple-500/30 bg-purple-500/10 text-purple-300",
    dot: "bg-purple-400",
  },
};

export function WalletLedgerView({
  transactions,
  total,
  page,
  pageSize = 15,
}: {
  transactions: ResellerTransactionItem[];
  total: number;
  page: number;
  pageSize?: number;
}) {
  const router = useRouter();
  const totalPages = Math.ceil(total / pageSize) || 1;

  function goToPage(p: number) {
    const next = Math.max(1, Math.min(totalPages, p));
    const url = new URL(window.location.href);
    url.searchParams.set("txPage", String(next));
    router.push(url.pathname + url.search);
  }

  if (total === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-12 text-center text-xs text-slate-500 shadow-xl">
        <History className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-600 mb-2" />
        No settlement transactions recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] shadow-xl">
      {/* Mobile Cards (sm:hidden) */}
      <div className="divide-y divide-slate-100 dark:divide-[#162740]/60 sm:hidden">
        {transactions.map((t) => {
          const isPositive = t.amount >= 0;
          const style = TYPE_STYLES[t.type] || {
            cls: "border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
            dot: "bg-slate-400",
          };

          return (
            <div key={t.id} className="p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${style.cls}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                  {t.type}
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {new Date(t.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <p
                    className={`font-mono text-base font-black ${
                      isPositive ? "text-[#00df82]" : "text-rose-500 dark:text-rose-400"
                    }`}
                  >
                    {isPositive ? "+" : "−"}GHS {fromPesewas(Math.abs(t.amount)).toFixed(2)}
                  </p>
                  {t.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{t.description}</p>
                  )}
                  {t.reference && (
                    <p className="font-mono text-[10px] text-slate-500">Ref: {t.reference}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Wallet Balance</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    GHS {fromPesewas(t.balanceAfter).toFixed(2)}
                  </span>
                </div>
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
              <th className="px-5 py-3.5">Type &amp; Description</th>
              <th className="px-5 py-3.5">Transaction Amount</th>
              <th className="px-5 py-3.5">Reference ID</th>
              <th className="px-5 py-3.5">Settled Balance</th>
              <th className="px-5 py-3.5 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#162740]/60 font-mono">
            {transactions.map((t) => {
              const isPositive = t.amount >= 0;
              const style = TYPE_STYLES[t.type] || {
                cls: "border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                dot: "bg-slate-400",
              };

              return (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-[#0e192d]/50 transition-colors">
                  <td className="px-5 py-3.5 font-sans">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${style.cls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {t.type}
                    </span>
                    {t.description && (
                      <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 font-medium">{t.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`font-black text-sm ${
                        isPositive ? "text-[#00df82]" : "text-rose-500 dark:text-rose-400"
                      }`}
                    >
                      {isPositive ? "+" : "−"}GHS {fromPesewas(Math.abs(t.amount)).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-cyan-600 dark:text-cyan-400 font-semibold">
                    {t.reference || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-slate-900 dark:text-white font-bold">
                    GHS {fromPesewas(t.balanceAfter).toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-sans text-slate-500 dark:text-slate-400 text-[11px]">
                    {new Date(t.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
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
            Page <strong className="text-slate-900 dark:text-white">{page}</strong> of <strong className="text-slate-900 dark:text-white">{totalPages}</strong> ({total} entries)
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

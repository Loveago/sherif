"use client";

import * as React from "react";
import Link from "next/link";
import { formatGHS } from "@/lib/types";
import { isMtnPrefix } from "@/lib/phone-utils";
import {
  Check,
  Copy,
  Send,
  ShoppingBag,
  Trash2,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  Search,
  ArrowUpRight,
  Loader2,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Line {
  phoneNumber: string;
  network: string;
  gbAmount: number;
  price: number | null;
}

export function QueueList({
  lines,
  unavailableIndices,
  onRemoveUnavailable,
  onRemove,
  onClear,
}: {
  lines: Line[];
  unavailableIndices?: Set<number>;
  onRemoveUnavailable?: () => void;
  onRemove: (i: number) => void;
  onClear: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const [filterQuery, setFilterQuery] = React.useState("");

  const copyAll = async () => {
    if (!lines.length) return;
    const text = lines.map((l) => `${l.phoneNumber} ${l.gbAmount}gb`).join("\n");
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const filteredLines = React.useMemo(() => {
    if (!filterQuery.trim()) return lines.map((line, originalIndex) => ({ line, originalIndex }));
    const q = filterQuery.toLowerCase().trim();
    return lines
      .map((line, originalIndex) => ({ line, originalIndex }))
      .filter(({ line }) => line.phoneNumber.includes(q) || line.network.toLowerCase().includes(q));
  }, [lines, filterQuery]);

  const totalGb = lines.reduce((acc, l) => acc + l.gbAmount, 0);
  const hasUnavailable = (unavailableIndices?.size ?? 0) > 0;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#0c1424]/90 transition-all">
      {/* Queue Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Dispatch Queue Ledger
              </h3>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                {lines.length} {lines.length === 1 ? "order" : "orders"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {lines.length > 0
                ? `${totalGb} GB total volume queued for switch dispatch`
                : "Recipients waiting to be submitted"}
            </p>
          </div>
        </div>

        {lines.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={copyAll}
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-emerald-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-emerald-400 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  <span>Copy lines</span>
                </>
              )}
            </button>
            <button
              onClick={onClear}
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-xl border border-rose-200/60 bg-rose-50/60 px-2.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          </div>
        )}
      </div>

      {/* Disabled / Inactive Network Banner */}
      {hasUnavailable && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200 bg-rose-50/90 px-5 py-3 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="leading-relaxed">
              <strong>{unavailableIndices?.size} order(s)</strong> belong to disabled carrier networks or unavailable packages (e.g. AirtelTigo) and cannot be dispatched.
            </span>
          </div>
          {onRemoveUnavailable && (
            <button
              type="button"
              onClick={onRemoveUnavailable}
              className="shrink-0 rounded-xl bg-rose-600 px-3 py-1.5 font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition cursor-pointer"
            >
              Remove Disabled ({unavailableIndices?.size})
            </button>
          )}
        </div>
      )}

      {/* Filter bar if many items */}
      {lines.length > 6 && (
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-2.5 dark:border-white/5 dark:bg-white/[0.02]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search phone number in queue..."
              className="h-8 w-full rounded-xl border border-slate-200/80 bg-white pl-9 pr-3 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* Queue Body */}
      {lines.length === 0 ? (
        <div className="py-14 text-center px-4 space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
            <ShoppingBag className="h-6 w-6 stroke-[1.5]" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Your dispatch queue is empty
            </p>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              Choose your network carrier above and enter recipient numbers to populate this terminal.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[520px] overflow-y-auto no-scrollbar">
          {filteredLines.map(({ line: l, originalIndex }) => {
            const isMtn = l.network === "MTN";
            const isTelecel = l.network === "TELECEL";
            const isBigTime = l.network === "AIRTELTIGO_BIGTIME";
            const isPorted = isMtn && !isMtnPrefix(l.phoneNumber);
            const isUnavailable = unavailableIndices?.has(originalIndex);

            return (
              <div
                key={`${l.phoneNumber}-${originalIndex}`}
                className={cn(
                  "group flex items-center gap-3 px-5 py-3 text-xs transition-colors",
                  isUnavailable
                    ? "bg-rose-50/50 hover:bg-rose-50/80 dark:bg-rose-950/20 dark:hover:bg-rose-950/30"
                    : "hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                )}
              >
                {/* Index Pill */}
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-mono text-[10px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">
                  {originalIndex + 1}
                </span>

                {/* Number & Ported / Inactive Indicator */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm tracking-wide">
                      {l.phoneNumber}
                    </span>
                    {isUnavailable && (
                      <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-[10px] font-black text-rose-700 dark:text-rose-300 border border-rose-500/30">
                        Network / Package Disabled
                      </span>
                    )}
                    {isPorted && !isUnavailable && (
                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        Ported to MTN
                      </span>
                    )}
                  </div>
                </div>

                {/* Carrier Badge */}
                <span
                  className={cn(
                    "hidden sm:inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
                    isMtn
                      ? "bg-amber-100 text-amber-900 border border-amber-300/60 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                      : isTelecel
                      ? "bg-red-100 text-red-900 border border-red-300/60 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30"
                      : isBigTime
                      ? "bg-sky-100 text-sky-900 border border-sky-300/60 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30"
                      : "bg-blue-100 text-blue-900 border border-blue-300/60 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30"
                  )}
                >
                  {isBigTime ? "AT Big Time" : l.network === "AIRTELTIGO" ? "AT iShare" : l.network}
                </span>

                {/* Data Volume */}
                <span className="inline-flex items-center rounded-xl bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  {l.gbAmount} GB
                </span>

                {/* Price */}
                <span className="w-20 text-right font-black text-slate-900 dark:text-white tabular-nums">
                  {formatGHS(l.price ?? 0)}
                </span>

                {/* Remove Line */}
                <button
                  onClick={() => onRemove(originalIndex)}
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition cursor-pointer"
                  title="Remove from queue"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SendSummary({
  count,
  total,
  totalGb,
  userBalance,
  submitting,
  submissionEnabled = true,
  unavailableCount = 0,
  onSubmit,
}: {
  count: number;
  total: number;
  totalGb?: number;
  userBalance?: number | null;
  submitting: boolean;
  submissionEnabled?: boolean;
  unavailableCount?: number;
  onSubmit: () => void;
}) {
  const hasInsufficientBalance =
    userBalance !== null && userBalance !== undefined && userBalance < total && total > 0;
  const deficit = hasInsufficientBalance ? total - (userBalance ?? 0) : 0;
  const hasUnavailable = unavailableCount > 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0b1322] p-6 text-white shadow-2xl transition-all">
      {/* High-tech top ambient glow */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-8 -bottom-8 h-36 w-36 rounded-full bg-teal-500/15 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

      {/* Terminal Title */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
            <Zap className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-black tracking-tight text-white">
              Dispatch Terminal
            </h3>
            <span className="text-[11px] text-slate-400">Direct Telecom Gateway</span>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Switch Live
        </span>
      </div>

      {/* Metrics Console */}
      <div className="my-5 grid grid-cols-3 gap-2.5 text-center">
        <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-3 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Orders
          </span>
          <span className="text-xl sm:text-2xl font-black text-white">{count}</span>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-3 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Data Volume
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-400">
            {totalGb ?? 0} <span className="text-xs font-bold text-slate-400">GB</span>
          </span>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-3 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Cost
          </span>
          <span className="text-xl sm:text-2xl font-black text-white">
            {formatGHS(total)}
          </span>
        </div>
      </div>

      {/* Wallet Balance Telemetry */}
      {userBalance !== null && userBalance !== undefined && (
        <div className="mb-5 rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-400 font-medium">
              <Wallet className="h-3.5 w-3.5 text-emerald-400" />
              Wallet Balance
            </span>
            <span className="font-mono font-black text-white">
              {formatGHS(userBalance)}
            </span>
          </div>

          {hasUnavailable ? (
            <div className="flex items-center justify-between rounded-xl bg-rose-500/15 border border-rose-500/30 p-2 text-[11px] text-rose-200">
              <span className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                {unavailableCount} order(s) for disabled network in queue
              </span>
            </div>
          ) : hasInsufficientBalance ? (
            <div className="flex items-center justify-between rounded-xl bg-amber-500/15 border border-amber-500/30 p-2 text-[11px] text-amber-200">
              <span className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                Shortfall: {formatGHS(deficit)}
              </span>
              <Link
                href="/dashboard/billing"
                className="font-black text-amber-300 underline hover:text-white inline-flex items-center gap-0.5"
              >
                Top up
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          ) : count > 0 ? (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Sufficient balance for this batch</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Dispatch Action Button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || count === 0 || !submissionEnabled || hasUnavailable}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-2xl py-4 px-6 font-black text-sm shadow-xl transition-all cursor-pointer",
          hasUnavailable
            ? "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/25"
            : hasInsufficientBalance
            ? "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/25"
            : "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/25 active:scale-[0.98]",
          (submitting || count === 0 || !submissionEnabled || hasUnavailable) &&
            "opacity-60 cursor-not-allowed pointer-events-none"
        )}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
            <span>Processing Gateway Dispatch…</span>
          </>
        ) : hasUnavailable ? (
          <>
            <AlertTriangle className="h-4 w-4" />
            <span>Remove {unavailableCount} Disabled Order{unavailableCount === 1 ? "" : "s"} First</span>
          </>
        ) : (
          <>
            <Send className="h-4 w-4 stroke-[2.5]" />
            <span>
              {count === 0
                ? "Queue Empty — Add Orders"
                : `Dispatch ${count} Order${count === 1 ? "" : "s"} Now`}
            </span>
          </>
        )}
      </button>

      {/* Safety Notice */}
      <p className="mt-3.5 text-center text-[10px] text-slate-500">
        Automated Telecom Batch Router · Zero Commission Fees
      </p>
    </div>
  );
}

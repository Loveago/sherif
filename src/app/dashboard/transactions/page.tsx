"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Receipt,
  RotateCcw,
  Sliders,
  ShieldAlert,
  ArrowLeft,
  Search,
  Download,
  Copy,
  Check,
  Zap,
  Activity,
  Layers,
} from "lucide-react";
import { formatGHS, formatDateTime } from "@/lib/types";
import { Spinner } from "@/components/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  reference: string | null;
  note: string | null;
  createdAt: string;
  balanceBefore: number;
  balanceAfter: number;
}

interface Summary {
  totalCredits: number;
  totalDebits: number;
  netFlow?: number;
  transactionCount: number;
}

type FilterType = "ALL" | "CREDIT" | "DEBIT";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTypeConfig(
  type: string,
  amount: number,
  note?: string | null,
  reference?: string | null
) {
  switch (type) {
    case "TOPUP":
      return {
        label: "Wallet Top-up",
        category: "Treasury Inflow",
        icon: ArrowUpRight,
        colorClass: "text-[#00df82]",
        bgClass: "bg-[#00df82]/10 border border-[#00df82]/25",
        isCredit: true,
      };
    case "REFUND":
      return {
        label: "Order Refund",
        category: "Reversal Credit",
        icon: RotateCcw,
        colorClass: "text-sky-400",
        bgClass: "bg-sky-500/10 border border-sky-500/25",
        isCredit: true,
      };
    case "DEBIT":
      return {
        label: "Bundle Dispatch Debit",
        category: "Order Deduction",
        icon: ArrowDownLeft,
        colorClass: "text-rose-400",
        bgClass: "bg-rose-500/10 border border-rose-500/25",
        isCredit: false,
      };
    case "SIGNUP_FEE":
      return {
        label: "Account Registration Fee",
        category: "One-Time Gateway Fee",
        icon: Receipt,
        colorClass: "text-slate-400",
        bgClass: "bg-slate-500/10 border border-slate-500/25",
        isCredit: false,
        isNeutral: true,
      };
    case "ADJUSTMENT": {
      const isOpening =
        reference === "INITIAL-BALANCE" ||
        note?.toLowerCase().includes("opening") ||
        note?.toLowerCase().includes("initial");
      if (isOpening) {
        return {
          label: "Opening Balance Ledger",
          category: "Initial Deposit",
          icon: Wallet,
          colorClass: "text-[#00df82]",
          bgClass: "bg-[#00df82]/10 border border-[#00df82]/25",
          isCredit: true,
          isNeutral: false,
        };
      }
      return amount >= 0
        ? {
            label: "Credit Ledger Adjustment",
            category: "Manual Credit",
            icon: TrendingUp,
            colorClass: "text-purple-400",
            bgClass: "bg-purple-500/10 border border-purple-500/25",
            isCredit: true,
            isNeutral: false,
          }
        : {
            label: "Debit Ledger Adjustment",
            category: "Manual Debit",
            icon: TrendingDown,
            colorClass: "text-amber-400",
            bgClass: "bg-amber-500/10 border border-amber-500/25",
            isCredit: false,
            isNeutral: false,
          };
    }
    default:
      return {
        label: type,
        category: "System Transaction",
        icon: Layers,
        colorClass: "text-slate-300",
        bgClass: "bg-slate-500/10 border border-slate-500/25",
        isCredit: false,
        isNeutral: false,
      };
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00df82]/10 border border-[#00df82]/30 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-[#00df82]">
        <CheckCircle2 className="h-3 w-3 text-[#00df82]" />
        SETTLED
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-amber-400">
        <Clock className="h-3 w-3 text-amber-400 animate-spin" />
        CLEARING
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-rose-400">
        <XCircle className="h-3 w-3 text-rose-400" />
        DECLINED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 border border-slate-500/20 px-2.5 py-0.5 text-[10px] font-bold text-slate-400">
      <AlertCircle className="h-3 w-3" />
      {status}
    </span>
  );
}

// ─── Settlement Node Card ───────────────────────────────────────────────────

function SettlementNodeCard({ tx }: { tx: Transaction }) {
  const cfg = getTypeConfig(tx.type, tx.amount, tx.note, tx.reference);
  const Icon = cfg.icon;
  const isApproved = tx.status === "APPROVED";
  const displayAmount = Math.abs(tx.amount);
  const [copied, setCopied] = React.useState(false);

  const copyRef = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4 sm:p-5 transition-all duration-200 hover:border-[#00df82]/40 hover:bg-slate-50 dark:hover:bg-[#0d182b] hover:shadow-xl hover:shadow-[#00df82]/5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Origin & Type */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${cfg.bgClass} shadow-md`}>
            <Icon className={`h-5 w-5 ${cfg.colorClass}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#00df82] transition-colors">
                {cfg.label}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#070d18] border border-slate-200 dark:border-[#162740]">
                {cfg.category}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              {tx.reference && (
                <button
                  type="button"
                  onClick={() => copyRef(tx.reference!)}
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 dark:text-slate-300 hover:text-[#00df82] transition-colors cursor-pointer"
                  title="Click to copy reference"
                >
                  <span>Ref: {tx.reference}</span>
                  {copied ? <Check className="h-3 w-3 text-[#00df82]" /> : <Copy className="h-3 w-3 opacity-60" />}
                </button>
              )}
              {tx.note && <span className="text-slate-500 dark:text-slate-400 truncate max-w-xs">{tx.note}</span>}
            </div>
          </div>
        </div>

        {/* Right: Amount & Balance Transition */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t border-slate-100 dark:border-[#162740] sm:border-t-0 pt-3 sm:pt-0 shrink-0">
          <div className="text-left sm:text-right">
            <p
              className={`font-mono text-lg sm:text-xl font-black tabular-nums tracking-tight ${
                cfg.isNeutral
                  ? "text-slate-400"
                  : cfg.isCredit
                  ? "text-[#00df82]"
                  : "text-rose-500 dark:text-rose-400"
              }`}
            >
              {cfg.isNeutral ? "" : cfg.isCredit ? "+" : "−"}
              {formatGHS(displayAmount)}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={tx.status} />
            <time className="text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {formatDateTime(tx.createdAt)}
            </time>
          </div>
        </div>
      </div>

      {/* Balance transition bar */}
      {isApproved && !cfg.isNeutral && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#162740]/80 flex flex-wrap items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Balance Delta:</span>
            <span className="text-slate-700 dark:text-slate-300">{formatGHS(tx.balanceBefore)}</span>
            <span className="text-[#00df82]">→</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatGHS(tx.balanceAfter)}</span>
          </div>

          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
            {cfg.isCredit ? "Wallet Inflow Settled" : "Auto-cleared via USSD Gateway"}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Page Content ────────────────────────────────────────────────────────

function TransactionsContent() {
  const searchParams = useSearchParams();
  const userIdParam = searchParams?.get("userId") || null;

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [summary, setSummary] = React.useState<Summary>({
    totalCredits: 0,
    totalDebits: 0,
    transactionCount: 0,
  });
  const [balance, setBalance] = React.useState(0);
  const [targetUser, setTargetUser] = React.useState<{ id: string; name: string; email: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<FilterType>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const pageSize = 20;

  const fetchData = React.useCallback(
    async (f: FilterType, p: number) => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
      if (f !== "ALL") params.set("type", f);
      if (userIdParam) params.set("userId", userIdParam);
      try {
        const res = await fetch(`/api/transactions?${params}`);
        const json = await res.json();
        setTransactions(json.data ?? []);
        setSummary(json.summary ?? { totalCredits: 0, totalDebits: 0, transactionCount: 0 });
        setBalance(json.balance ?? 0);
        setTargetUser(json.user ?? null);
        setTotalPages(json.pages ?? 1);
        setTotal(json.total ?? 0);
      } catch (err) {
        console.error("Error loading transactions:", err);
      } finally {
        setLoading(false);
      }
    },
    [userIdParam]
  );

  React.useEffect(() => {
    fetchData(filter, page);
  }, [filter, page, fetchData]);

  const handleFilter = (f: FilterType) => {
    setFilter(f);
    setPage(1);
  };

  // Filter client-side by search query if user types in search box
  const filteredTransactions = React.useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase().trim();
    return transactions.filter(
      (tx) =>
        tx.reference?.toLowerCase().includes(q) ||
        tx.note?.toLowerCase().includes(q) ||
        tx.type.toLowerCase().includes(q)
    );
  }, [transactions, searchQuery]);

  const netChange = summary.totalCredits - summary.totalDebits;

  // CSV Export utility
  const exportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ["ID", "Type", "Amount (GHS)", "Status", "Reference", "Note", "Balance Before", "Balance After", "Date"];
    const rows = transactions.map((t) => [
      t.id,
      t.type,
      t.amount.toFixed(2),
      t.status,
      t.reference || "",
      `"${(t.note || "").replace(/"/g, '""')}"`,
      t.balanceBefore.toFixed(2),
      t.balanceAfter.toFixed(2),
      t.createdAt,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bundle_portal_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Admin Audit Banner when viewing a specific user */}
      {targetUser && userIdParam && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
            <span>
              Admin Audit View: Inspecting financial ledger and accurate balances for{" "}
              <strong>{targetUser.name}</strong> ({targetUser.email})
            </span>
          </div>
          <Link
            href={`/admin/wallets?userId=${targetUser.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-white dark:bg-[#070d18] px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 shadow-sm hover:bg-slate-100 dark:hover:bg-[#0b1322]"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Return to Admin Wallets</span>
          </Link>
        </div>
      )}

      {/* Cyber Settlement HUD Deck */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#00df82]/15 blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00df82]/30 bg-[#00df82]/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#00df82]">
                <Activity className="h-3.5 w-3.5 text-[#00df82] animate-pulse" />
                TELECOM TREASURY &amp; SETTLEMENT LEDGER
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">· Real-Time Clearing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {targetUser && userIdParam ? `${targetUser.name}'s Ledger` : "Transactions Desk"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              Cryptographically verified audit trail of all Mobile Money deposits, bundle dispatch debits, instant refunds, and automated ledger settlements.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => fetchData(filter, page)}
              disabled={loading}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-4 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-200 dark:hover:bg-[#111e33] hover:text-slate-900 dark:hover:text-white disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#00df82] ${loading ? "animate-spin" : ""}`} />
              <span>Sync Ledger</span>
            </button>
            <button
              onClick={exportCSV}
              disabled={transactions.length === 0}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-4 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-200 dark:hover:bg-[#111e33] hover:text-slate-900 dark:hover:text-white disabled:opacity-40 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
              <span>Export CSV</span>
            </button>
            <Link
              href="/dashboard/billing"
              className="flex h-10 items-center gap-2 rounded-xl bg-[#00df82] px-4 text-xs font-black text-[#041d14] shadow-[0_0_20px_rgba(0,223,130,0.3)] transition hover:bg-[#00c572] cursor-pointer"
            >
              <Wallet className="h-3.5 w-3.5 fill-[#041d14]" />
              <span>Deposit Funds</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Holographic Financial Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Available Balance */}
        <div className="rounded-3xl border border-[#00df82]/30 bg-gradient-to-br from-emerald-500/10 via-white to-slate-50 dark:from-[#0b1322] dark:via-[#091a27] dark:to-[#05131b] p-5 shadow-xl shadow-[#00df82]/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Available Balance</span>
            <div className="h-8 w-8 rounded-xl bg-[#00df82]/15 border border-[#00df82]/30 flex items-center justify-center text-[#00df82]">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-mono text-2xl sm:text-3xl font-black text-[#00df82] tabular-nums tracking-tight">
              {formatGHS(balance)}
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Ready for single bundle dispatches
            </p>
          </div>
        </div>

        {/* Total Inflow */}
        <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gross Inflow</span>
            <div className="h-8 w-8 rounded-xl bg-[#00df82]/10 border border-[#00df82]/20 flex items-center justify-center text-[#00df82]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-mono text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              +{formatGHS(summary.totalCredits)}
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Deposits, refunds &amp; adjustments
            </p>
          </div>
        </div>

        {/* Total Outflow */}
        <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dispatched Outflow</span>
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-mono text-2xl sm:text-3xl font-black text-rose-500 dark:text-rose-400 tabular-nums tracking-tight">
              −{formatGHS(summary.totalDebits)}
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Live automated data fulfillment
            </p>
          </div>
        </div>

        {/* Total Operations */}
        <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ledger Count</span>
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 dark:text-cyan-400">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-mono text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {total.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {netChange >= 0 ? "+ Positive Net Flow" : "− Deducted Flow"}
            </p>
          </div>
        </div>
      </div>

      {/* Cyber Filtering & Search Command Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-3 shadow-sm">
        {/* Filter Type Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-1 px-1 sm:mx-0 sm:px-0">
          <Sliders className="h-4 w-4 text-slate-400 mx-1 shrink-0 hidden sm:block" />
          {(["ALL", "CREDIT", "DEBIT"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              className={`rounded-xl px-3 sm:px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                filter === f
                  ? "bg-[#00df82] text-[#041d14] font-black shadow-[0_0_15px_rgba(0,223,130,0.3)]"
                  : "bg-slate-100 dark:bg-[#070d18] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#162740] hover:bg-slate-200 dark:hover:bg-[#111e33]"
              }`}
            >
              {f === "ALL" ? "All Operations" : f === "CREDIT" ? "Credits (+)" : "Debits (−)"}
            </button>
          ))}
        </div>

        {/* Live Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search reference, note or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] pl-9 pr-4 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#00df82] focus:outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {/* ── Transaction List ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Spinner className="h-8 w-8 text-[#00df82]" />
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 tracking-wider">SYNCING TELECOM LEDGER...</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-8 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00df82]/10 border border-[#00df82]/20 text-[#00df82]">
            <Receipt className="h-8 w-8" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900 dark:text-white">No transactions found</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              {searchQuery
                ? `No recorded transactions match "${searchQuery}".`
                : filter !== "ALL"
                ? "There are no transactions matching the selected filter."
                : "Your transaction history will be recorded here automatically when you top-up or dispatch bundles."}
            </p>
          </div>
          {(filter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                handleFilter("ALL");
                setSearchQuery("");
              }}
              className="mt-2 rounded-xl bg-[#00df82]/15 border border-[#00df82]/30 px-4 py-2 text-xs font-bold text-[#00df82] hover:bg-[#00df82] hover:text-[#041d14] transition cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => (
            <SettlementNodeCard key={tx.id} tx={tx} />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4 shadow-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-[#111e33] hover:text-slate-900 dark:hover:text-white disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Page <span className="font-bold text-[#00df82]">{page}</span> of{" "}
            <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
          </p>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-[#111e33] hover:text-slate-900 dark:hover:text-white disabled:opacity-40 cursor-pointer"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8 text-[#00df82]" />
        </div>
      }
    >
      <TransactionsContent />
    </React.Suspense>
  );
}

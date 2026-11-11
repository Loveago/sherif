"use client";

import * as React from "react";
import { PageHeader, EmptyState, Spinner } from "@/components/shared";
import { SendClaimCard } from "@/components/billing/send-claim-card";
import { ClaimHistory } from "@/components/billing/claim-history";
import { useToast } from "@/components/toast";
import { formatGHS, formatDateTime } from "@/lib/types";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Smartphone,
  History,
  CreditCard,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Plus,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Tx {
  id: string;
  type: string;
  amount: number;
  status: string;
  reference: string | null;
  note: string | null;
  createdAt: string;
}

function txBadge(status: string) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-400/10 text-amber-400 border border-amber-400/20",
    APPROVED: "bg-[#00df82]/10 text-[#00df82] border border-[#00df82]/30",
    REJECTED: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider",
        styles[status] ?? "bg-slate-500/10 text-slate-400"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

type Tab = "overview" | "send-claim" | "claim-history";

export default function BillingPage() {
  const { toast } = useToast();
  const [tab, setTab] = React.useState<Tab>("overview");
  const [data, setData] = React.useState<Tx[]>([]);
  const [balance, setBalance] = React.useState(0);
  const [summary, setSummary] = React.useState({ topups: 0, spend: 0 });
  const [sendClaimEnabled, setSendClaimEnabled] = React.useState(true);
  const [loading, setLoading] = React.useState(true);

  // Quick reload state
  const [amount, setAmount] = React.useState("50");
  const [submittingTopup, setSubmittingTopup] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/billing?pageSize=25");
    const json = await res.json();
    setData(json.data ?? []);
    setBalance(json.balance ?? 0);
    setSummary(json.summary ?? { topups: 0, spend: 0 });
    if (json.sendClaimEnabled !== undefined) {
      setSendClaimEnabled(json.sendClaimEnabled);
      if (!json.sendClaimEnabled && (tab === "send-claim" || tab === "claim-history")) {
        setTab("overview");
      }
    }
    setLoading(false);
  }, [tab]);

  React.useEffect(() => {
    load();
  }, [load]);

  // URL tab query param synchronization
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "send-claim" && sendClaimEnabled) setTab("send-claim");
    else if ((tabParam === "history" || tabParam === "claims") && sendClaimEnabled) setTab("claim-history");
  }, [sendClaimEnabled]);

  const [verifyingId, setVerifyingId] = React.useState<string | null>(null);

  const verifyPaystackTx = async (reference: string, id: string) => {
    setVerifyingId(id);
    try {
      const res = await fetch("/api/billing/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, transactionId: id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast(json.error ?? "Verification check failed", "error");
        return;
      }
      if (json.settled) {
        toast("Top-up confirmed! Your wallet balance has been credited.", "success");
        load();
      } else {
        toast(json.reason ?? `Status on Paystack: ${json.status}`, "info");
      }
    } catch {
      toast("Failed to check status", "error");
    } finally {
      setVerifyingId(null);
    }
  };

  // Paystack redirect-back result
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paystack = params.get("paystack");
    if (!paystack) return;
    if (paystack === "success") {
      toast("Paystack payment successful — your wallet has been credited", "success");
      load();
    } else if (paystack === "pending") {
      toast("Paystack payment is processing. Your balance will update automatically.", "info");
      load();
    } else {
      toast("Paystack payment was not completed. If you were debited, click Verify on the transaction.", "error");
      load();
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, [toast, load]);

  // Handle instant top-up submit
  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast("Enter a valid deposit amount", "error");

    setSubmittingTopup(true);
    try {
      const res = await fetch("/api/billing/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });
      const json = await res.json();
      if (!res.ok) return toast(json.error ?? "Failed to initialize Paystack MoMo", "error");
      toast("Redirecting to Paystack MoMo checkout…", "success");
      window.location.href = json.authorizationUrl;
    } finally {
      setSubmittingTopup(false);
    }
  };

  const numAmount = Number(amount) || 0;
  const fee = numAmount > 0 ? Math.round(numAmount * 0.02 * 100) / 100 : 0;
  const totalDue = numAmount > 0 ? Math.round((numAmount + fee) * 100) / 100 : 0;

  return (
    <div className="space-y-6">
      {/* ── HIGH-TECH CONSOLE HEADER ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 p-5 sm:p-6 shadow-sm backdrop-blur-xl dark:border-[#162740] dark:bg-[#0b1322]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00df82]/30 bg-[#00df82]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#00df82]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00df82] animate-pulse" />
                Treasury &amp; Clearing Node
              </span>
              <span className="text-[10px] font-bold text-slate-400">· Instant Automated Settlement</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Wallet &amp; Financial Ledger
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Load funds via Mobile Money or debit card, review instant clearing settlement records, and track automated order debits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => load()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-[#162740] dark:bg-[#070d18] dark:text-slate-200 dark:hover:bg-[#111e33] transition cursor-pointer"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-slate-400", loading && "animate-spin")} />
              Sync Ledger
            </button>
          </div>
        </div>
      </div>

      {/* ── BESPOKE CYBER TREASURY CARD & FAST RELOAD DOCK ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT: HOLOGRAPHIC CYBER VIRTUAL CARD (5 COLS) */}
        <div className="lg:col-span-5 relative overflow-hidden rounded-3xl border border-[#162740] bg-gradient-to-br from-[#0c182c] via-[#081220] to-[#040913] p-6 sm:p-7 shadow-2xl flex flex-col justify-between text-white group">
          {/* Neon ambient glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#00df82]/15 blur-3xl group-hover:bg-[#00df82]/25 transition-all" />

          {/* Card Top: Chip & Contactless */}
          <div className="flex items-center justify-between pb-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-11 rounded-lg bg-gradient-to-tr from-amber-400/80 to-amber-200/90 border border-amber-300 shadow-sm relative overflow-hidden">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-amber-700/60" />
                <div className="absolute inset-y-0 left-1/3 w-[1px] bg-amber-700/60" />
                <div className="absolute inset-y-0 right-1/3 w-[1px] bg-amber-700/60" />
              </div>
              <span className="text-[10px] font-mono tracking-widest text-slate-400">BP-NODE-01</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#00df82]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>ACTIVE CLEARING</span>
            </div>
          </div>

          {/* Card Middle: Available Funds in Massive Neon Font */}
          <div className="my-6 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              AVAILABLE BALANCE (GHS)
            </span>
            <p className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_15px_rgba(0,223,130,0.3)]">
              {formatGHS(balance)}
            </p>
            <p className="text-[11px] text-[#00df82] font-semibold flex items-center gap-1 pt-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Ready for instant wholesale bundle provisioning
            </p>
          </div>

          {/* Card Bottom: Summary Stats Strip */}
          <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Inflow</span>
              <span className="font-mono font-bold text-white text-sm">{formatGHS(summary.topups)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Outflow</span>
              <span className="font-mono font-bold text-rose-400 text-sm">{formatGHS(summary.spend)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT: FAST TOP-UP COMMAND STATION (7 COLS) */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200/90 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl flex flex-col justify-between">
          <form onSubmit={handleTopupSubmit} className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#162740]">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#00df82]" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Fast Wallet Reload
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">MoMo / Card · Instant Credit</span>
            </div>

            {/* Quick Amount Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Choose Top-up Denomination (GHS)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[20, 50, 100, 200, 500].map((preset) => {
                  const active = amount === String(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      className={cn(
                        "rounded-xl py-2.5 text-xs font-black font-mono transition cursor-pointer",
                        active
                          ? "bg-[#00df82] text-[#041d14] shadow-[0_0_15px_rgba(0,223,130,0.3)]"
                          : "border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] text-slate-700 dark:text-slate-300 hover:border-[#00df82]/40"
                      )}
                    >
                      ₵{preset}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Or Custom Deposit Amount (GHS)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  GHS
                </span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 75.00"
                  required
                  className="w-full h-11 rounded-xl bg-slate-50 dark:bg-[#070d18] border border-slate-200 dark:border-[#162740] pl-12 pr-4 text-sm font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-500 outline-none focus:border-[#00df82] transition"
                />
              </div>
            </div>

            {/* Fee & Calculation Preview */}
            <div className="rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-3 text-xs space-y-1 font-mono">
              <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                <span>Wallet Credit Amount:</span>
                <span className="font-bold text-slate-900 dark:text-white">₵{numAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                <span>Gateway MoMo Processing (2%):</span>
                <span>+₵{fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-white/5">
                <span>Total Due on Paystack:</span>
                <span className="text-[#00df82]">₵{totalDue.toFixed(2)}</span>
              </div>
            </div>

            {/* Top-up Button */}
            <button
              type="submit"
              disabled={submittingTopup || numAmount <= 0}
              className="w-full h-12 rounded-2xl bg-[#00df82] hover:bg-[#00c572] active:scale-[0.98] text-[#041d14] font-black text-xs shadow-[0_0_20px_rgba(0,223,130,0.3)] flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer uppercase tracking-wider"
            >
              {submittingTopup ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>Connecting to Paystack...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-[#041d14]" />
                  <span>Pay ₵{totalDue.toFixed(2)} via MoMo / Card (Credit ₵{numAmount.toFixed(2)})</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── SUBNAV SWITCHER (OVERVIEW | SEND & CLAIM | HISTORY) ──────────────── */}
      <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 text-xs font-bold dark:border-[#162740] dark:bg-[#070d18] w-fit max-w-full overflow-x-auto">
        <button
          type="button"
          onClick={() => setTab("overview")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 transition-all",
            tab === "overview"
              ? "bg-[#00df82] text-[#041d14] font-black shadow-[0_0_12px_rgba(0,223,130,0.3)]"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          )}
        >
          <Receipt className="h-4 w-4" />
          <span>Settlement Ledger</span>
        </button>

        {sendClaimEnabled && (
          <>
            <button
              type="button"
              onClick={() => setTab("send-claim")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 transition-all",
                tab === "send-claim"
                  ? "bg-[#00df82] text-[#041d14] font-black shadow-[0_0_12px_rgba(0,223,130,0.3)]"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              <Smartphone className="h-4 w-4" />
              <span>Send &amp; Claim Direct</span>
            </button>

            <button
              type="button"
              onClick={() => setTab("claim-history")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 transition-all",
                tab === "claim-history"
                  ? "bg-[#00df82] text-[#041d14] font-black shadow-[0_0_12px_rgba(0,223,130,0.3)]"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              <History className="h-4 w-4" />
              <span>Claims Archive</span>
            </button>
          </>
        )}
      </div>

      {/* ── TAB CONTENT ─────────────────────────────────────────────────────── */}
      {tab === "overview" ? (
        <div className="rounded-3xl border border-slate-200/90 dark:border-[#162740] bg-white dark:bg-[#0b1322] shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-[#162740] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Real-Time Settlement Ledger
              </h3>
              <p className="text-xs text-slate-400">
                Audited timeline of wallet top-ups, automated order fulfillment debits, and reversals.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              {data.length} transactions
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-[#162740]">
            {loading ? (
              <div className="py-12 flex justify-center">
                <Spinner className="h-6 w-6 text-[#00df82]" />
              </div>
            ) : data.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#070d18] text-slate-400">
                  <Receipt className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                  No transactions recorded yet
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Your deposits and bundle debits will automatically populate here.
                </p>
              </div>
            ) : (
              data.map((tx) => {
                const isCredit = tx.type === "CREDIT" || tx.type === "TOPUP" || tx.amount > 0;
                const isDebit = tx.type === "DEBIT" || tx.type === "ORDER" || tx.amount < 0;

                return (
                  <div
                    key={tx.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-[#111e33]/40 transition"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                          isCredit
                            ? "bg-[#00df82]/15 text-[#00df82]"
                            : "bg-rose-500/15 text-rose-400"
                        )}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="h-5 w-5" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {tx.note || (isCredit ? "Wallet Deposit" : "Bundle Fulfillment")}
                          </span>
                          {txBadge(tx.status)}
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {tx.reference ? `Ref: ${tx.reference} · ` : ""}
                          {formatDateTime(tx.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                      <span
                        className={cn(
                          "text-base font-black font-mono",
                          isCredit ? "text-[#00df82]" : "text-rose-400"
                        )}
                      >
                        {isCredit ? "+" : "-"}
                        {formatGHS(Math.abs(tx.amount))}
                      </span>

                      {tx.status === "PENDING" && tx.reference?.startsWith("PSK-") && (
                        <button
                          onClick={() => verifyPaystackTx(tx.reference!, tx.id)}
                          disabled={verifyingId === tx.id}
                          className="rounded-lg border border-[#00df82]/30 bg-[#00df82]/10 px-2.5 py-1 text-xs font-bold text-[#00df82] hover:bg-[#00df82] hover:text-[#041d14] transition cursor-pointer"
                        >
                          {verifyingId === tx.id ? "Checking…" : "Verify"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : tab === "send-claim" ? (
        <SendClaimCard onSuccess={() => setTab("claim-history")} />
      ) : (
        <ClaimHistory />
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowDownToLine, Loader2, AlertCircle, ShieldCheck } from "lucide-react";

export interface PendingWithdrawalInfo {
  amountGHS: number;
  feeGHS: number;
  netAmountGHS: number;
  network: string;
  momoNumber: string;
  accountName: string;
  reference: string;
  requestedAt: string;
}

export function WithdrawalForm({
  available,
  pending,
  pendingDetails,
  disabled,
}: {
  available: number; // pesewas
  pending: boolean;
  pendingDetails?: PendingWithdrawalInfo | null;
  disabled: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = React.useState("");
  const [network, setNetwork] = React.useState("MTN");
  const [momoNumber, setMomoNumber] = React.useState("");
  const [accountName, setAccountName] = React.useState("");
  const [msg, setMsg] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/storefront/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount || "0"), network, momoNumber, accountName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Withdrawal request failed");
      setMsg({ kind: "ok", text: "Withdrawal requested successfully — queued for administrative MoMo settlement." });
      setAmount("");
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Withdrawal request failed" });
    } finally {
      setBusy(false);
    }
  }

  const isFormLocked = pending || disabled;

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#162740] pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-[#00df82]/30 bg-[#00df82]/10 p-2 text-[#00df82]">
            <ArrowDownToLine className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Request MoMo Payout</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Withdraw cleared reseller margins directly to your registered Mobile Money wallet.</p>
          </div>
        </div>
        {pending && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
            <Lock className="h-3 w-3" /> Payout Pending
          </span>
        )}
      </div>

      {msg && (
        <div
          className={`rounded-2xl border p-4 text-xs font-bold ${
            msg.kind === "ok"
              ? "border-[#00df82]/30 bg-[#00df82]/10 text-[#00df82]"
              : "border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400"
          }`}
        >
          {msg.text}
        </div>
      )}

      {pending && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
              <Lock className="h-4 w-4" />
            </span>
            <div className="space-y-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-200">
                Payout Pipeline Locked — Active Request In Progress
              </h3>
              <p className="text-xs text-amber-900/90 dark:text-amber-300/90 leading-relaxed font-sans">
                You currently have an active withdrawal awaiting administrative review and automated carrier disbursement
                {pendingDetails ? (
                  <>
                    : <strong className="text-slate-900 dark:text-white font-mono">GHS {pendingDetails.amountGHS.toFixed(2)}</strong> (Net payout: <strong className="text-[#00df82] font-mono">GHS {pendingDetails.netAmountGHS.toFixed(2)}</strong>) to {pendingDetails.network} {pendingDetails.momoNumber} ({pendingDetails.reference}).
                  </>
                ) : (
                  "."
                )}
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400/80 font-mono">
                Subsequent requests remain locked until the current settlement queue clears.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Amount (GHS)
          </label>
          <input
            type="number"
            step="0.01"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="50.00"
            disabled={isFormLocked}
            required
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3 font-mono text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[#00df82] focus:outline-none disabled:opacity-40"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Carrier Network
          </label>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            disabled={isFormLocked}
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3 text-xs font-bold text-slate-900 dark:text-white focus:border-[#00df82] focus:outline-none disabled:opacity-40 [&>option]:bg-white dark:[&>option]:bg-[#070d18] [&>option]:text-slate-900 dark:[&>option]:text-white"
          >
            <option value="MTN">MTN MoMo</option>
            <option value="TELECEL">Telecel Cash</option>
            <option value="AIRTELTIGO">AirtelTigo Money</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            MoMo Phone Number
          </label>
          <input
            type="tel"
            inputMode="tel"
            value={momoNumber}
            onChange={(e) => setMomoNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="0241234567"
            maxLength={10}
            disabled={isFormLocked}
            required
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3 font-mono text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[#00df82] focus:outline-none disabled:opacity-40"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Subscriber Account Name
          </label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Official MoMo Name"
            disabled={isFormLocked}
            required
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[#00df82] focus:outline-none disabled:opacity-40"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <p className="text-[11px] font-mono text-slate-500">
          Flat processing fee: GHS 1.00 per disbursement. Funds transfer directly to your MoMo balance.
        </p>

        <button
          type="submit"
          disabled={isFormLocked || busy}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00df82] px-6 text-xs font-black text-[#060b13] shadow-md shadow-[#00df82]/20 hover:bg-[#00df82]/90 disabled:opacity-40 transition cursor-pointer"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>Submit Payout Order</span>
        </button>
      </div>
    </form>
  );
}

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/shared";
import { CreditCard } from "lucide-react";

export function TopupForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [amount, setAmount] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast("Enter a valid amount", "error");

    setSubmitting(true);
    try {
      const res = await fetch("/api/billing/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });
      const json = await res.json();
      if (!res.ok) return toast(json.error ?? "Failed to start Paystack payment", "error");
      toast("Redirecting to secure Paystack checkout…", "success");
      window.location.href = json.authorizationUrl;
      return;
    } finally {
      setSubmitting(false);
    }
  };

  const numAmount = Number(amount) || 0;
  const fee = numAmount > 0 ? Math.round(numAmount * 0.02 * 100) / 100 : 0;
  const total = numAmount > 0 ? Math.round((numAmount + fee) * 100) / 100 : 0;

  const quickPresets = [20, 50, 100, 200, 500];

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3.5 text-left transition dark:border-emerald-500/20 dark:bg-emerald-500/[0.08]">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">Paystack Instant Checkout</p>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
          Deposit via MTN MoMo, Telecel Cash, AT Money or debit/credit card with automatic wallet settlement. (2% gateway fee).
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="amount" className="text-xs font-bold text-slate-700 dark:text-slate-300">Amount to Deposit (GHS)</Label>
          <span className="text-[10px] font-semibold text-slate-400">Min ₵1.00</span>
        </div>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₵</span>
          <Input
            id="amount"
            type="number"
            min="1"
            step="0.01"
            placeholder="50.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-8 font-mono font-bold text-base h-11 rounded-xl border-slate-200 dark:border-white/10 dark:bg-white/[0.03] focus:border-emerald-500 focus:ring-emerald-500/20"
          />
        </div>
        {/* Quick Amount Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {quickPresets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                Number(amount) === preset
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              }`}
            >
              ₵{preset}
            </button>
          ))}
        </div>
      </div>

      {numAmount > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs space-y-2 dark:border-white/5 dark:bg-white/[0.03]">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Credited to Wallet:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">GHS {numAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Paystack Fee (2%):</span>
            <span className="font-mono font-medium text-amber-600 dark:text-amber-400">+GHS {fee.toFixed(2)}</span>
          </div>
          <div className="border-t border-slate-200/80 pt-2 flex justify-between font-bold text-slate-900 dark:text-white dark:border-white/10">
            <span>Total Payable:</span>
            <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">GHS {total.toFixed(2)}</span>
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-11 rounded-xl bg-gradient-to-r from-[#00df82] to-[#00b568] font-black text-slate-950 shadow-md shadow-[#00df82]/20 hover:from-[#00f58f] hover:to-[#00c873] active:scale-[0.99] transition cursor-pointer"
        disabled={submitting || numAmount <= 0}
      >
        {submitting && <Spinner className="mr-2 h-4 w-4" />}
        {numAmount > 0 ? `Pay GHS ${total.toFixed(2)} with Paystack` : "Pay with Paystack"}
      </Button>
      <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
        Protected with 256-bit SSL encryption. Instant automated wallet crediting.
      </p>
    </form>
  );
}

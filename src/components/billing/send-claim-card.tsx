"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/shared";
import { formatGHS } from "@/lib/types";
import { Copy, Check, Smartphone, CheckCircle2, AlertCircle, ArrowRight, Hash } from "lucide-react";

interface SendClaimSettings {
  enabled: boolean;
  network: string;
  momoNumber: string;
  accountName: string;
  instructions: string | null;
  minimumAmount: number;
  maximumAmount: number;
}

interface ClaimResult {
  amount: number;
  network: string;
  transactionReference: string;
  newBalance: number;
  creditedAt: string;
}

export function SendClaimCard({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [settings, setSettings] = React.useState<SendClaimSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = React.useState(true);
  const [copied, setCopied] = React.useState(false);

  // Form state: only Transaction ID is needed
  const [reference, setReference] = React.useState("");
  const [claiming, setClaiming] = React.useState(false);
  const [claimStatusText, setClaimStatusText] = React.useState<string | null>(null);
  const [claimResult, setClaimResult] = React.useState<ClaimResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/wallet/send-claim/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setSettings(d.settings);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSettings(false));
  }, []);

  const copyNumber = () => {
    if (!settings?.momoNumber) return;
    navigator.clipboard.writeText(settings.momoNumber);
    setCopied(true);
    toast("MoMo number copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setClaimResult(null);

    const cleanRef = reference.trim();
    if (!cleanRef) {
      setErrorMessage("Please enter the Transaction ID from your MoMo SMS");
      return;
    }

    setClaiming(true);
    setClaimStatusText("Verifying Transaction ID... Crediting wallet...");

    try {
      const res = await fetch("/api/wallet/send-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionReference: cleanRef,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(
          json.error ??
            "We couldn't find a matching Mobile Money transaction with this Transaction ID. Please verify the ID from your confirmation SMS."
        );
        return;
      }

      setClaimResult(json.claim);
      toast("Payment verified and credited to wallet!", "success");
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("balance-update", { detail: { balance: json.claim?.newBalance } })
        );
      }
      onSuccess();
    } catch {
      setErrorMessage("An unexpected error occurred while claiming. Please try again.");
    } finally {
      setClaiming(false);
      setClaimStatusText(null);
    }
  };

  if (loadingSettings) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-brand-600" />
      </div>
    );
  }

  if (settings && !settings.enabled) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-500/20 dark:bg-amber-500/10">
        <AlertCircle className="mx-auto h-8 w-8 text-amber-600 dark:text-amber-400" />
        <h3 className="mt-2 text-base font-semibold text-amber-900 dark:text-amber-200">
          Send &amp; Claim is currently unavailable
        </h3>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
          Mobile Money Send &amp; Claim is temporarily disabled by the administrator. Please use Paystack or contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions and Admin MoMo Details Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 p-5 sm:p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1322]/90">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Direct MoMo Clearing
              </span>
            </div>
            <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white tracking-tight">Manual Send &amp; Instant Claim</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {settings?.instructions ||
                "Transfer funds directly to the designated Mobile Money wallet below, then submit your SMS Transaction ID for automated clearing."}
            </p>
          </div>
        </div>

        {/* Display MoMo Account details */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 backdrop-blur dark:border-white/5 dark:bg-white/[0.03]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Network
            </span>
            <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
              {settings?.network ?? "MTN"} Mobile Money
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 backdrop-blur dark:border-white/5 dark:bg-white/[0.03]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Account Name
            </span>
            <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
              {settings?.accountName ?? "CleanDataPacks"}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 backdrop-blur dark:border-emerald-500/20 dark:bg-emerald-500/[0.08]">
            <div>
              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                MoMo Number
              </span>
              <p className="font-mono text-base font-black text-emerald-950 dark:text-emerald-100 mt-0.5">
                {settings?.momoNumber ?? "024XXXXXXX"}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={copyNumber}
              className="border-emerald-500/40 bg-white hover:bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        {settings && (
          <p className="mt-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Minimum: {formatGHS(settings.minimumAmount)} · Maximum: {formatGHS(settings.maximumAmount)}
          </p>
        )}
      </div>

      {/* Verified Success Result Card */}
      {claimResult && (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 sm:p-6 dark:border-emerald-500/20 dark:bg-emerald-500/[0.08]">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-emerald-950 dark:text-emerald-100">
                Payment Verified &amp; Wallet Credited
              </h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                {formatGHS(claimResult.amount)} has been added to your CleanDataPacks available balance.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-emerald-500/20 pt-4 text-xs sm:grid-cols-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Amount Credited:</span>
              <p className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{formatGHS(claimResult.amount)}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Network:</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{claimResult.network}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Transaction ID:</span>
              <p className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{claimResult.transactionReference}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">New Balance:</span>
              <p className="font-mono text-sm font-black text-slate-900 dark:text-white mt-0.5">{formatGHS(claimResult.newBalance)}</p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-5 border-emerald-500/40 text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-200 font-bold"
            onClick={() => {
              setClaimResult(null);
              setReference("");
            }}
          >
            Claim Another Payment <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* Claim Form: ONLY Transaction ID */}
      {!claimResult && (
        <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-5 sm:p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1322]/90">
          <div className="flex items-center gap-2 mb-1.5">
            <Hash className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Claim Payment with Transaction ID
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            From your Mobile Money SMS receipt, copy the <strong>Transaction ID</strong> (e.g. <code>87441563372</code>) and paste it below. The system performs instant reconciliation.
          </p>

          {errorMessage && (
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs font-medium text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleClaim} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="txRef" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Transaction ID *
              </Label>
              <div className="relative">
                <Input
                  id="txRef"
                  placeholder="e.g. 87441563372"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="font-mono text-base tracking-wider uppercase h-11 pr-4 rounded-xl border-slate-200 dark:border-white/10 dark:bg-white/[0.03] focus:border-emerald-500 focus:ring-emerald-500/20"
                  required
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Paste the transaction reference ID received in your MoMo confirmation SMS.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full sm:w-auto px-8 h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] transition"
              disabled={claiming || !reference.trim()}
            >
              {claiming ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> {claimStatusText || "Reconciling payment..."}
                </>
              ) : (
                "Claim Payment Now"
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

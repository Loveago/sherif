"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Power, CheckCircle2, PauseCircle, Loader2, Radio } from "lucide-react";

interface StoreStatusToggleProps {
  initialActive: boolean;
  storeStatus: string; // ENABLED | SUSPENDED | etc.
  variant?: "compact" | "card";
}

export function StoreStatusToggle({
  initialActive,
  storeStatus,
  variant = "compact",
}: StoreStatusToggleProps) {
  const router = useRouter();
  const [isActive, setIsActive] = React.useState(initialActive);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsActive(initialActive);
  }, [initialActive]);

  const isSuspended = storeStatus === "SUSPENDED";
  const canToggle = storeStatus === "ENABLED" && !isSuspended;

  async function handleToggle() {
    if (!canToggle || busy) return;
    const nextState = !isActive;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/storefront/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextState }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update store status");
      }

      setIsActive(nextState);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (variant === "compact") {
    return (
      <div className="flex flex-col items-start sm:items-end gap-1">
        <button
          type="button"
          onClick={handleToggle}
          disabled={!canToggle || busy}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
            isActive
              ? "border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              : "bg-[#00df82] text-[#060b13] hover:bg-[#00df82]/90 shadow-md shadow-[#00df82]/20"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          title={
            !canToggle
              ? "Store is suspended by administration"
              : isActive
              ? "Click to temporarily pause storefront orders"
              : "Click to resume live storefront orders"
          }
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isActive ? (
            <PauseCircle className="h-3.5 w-3.5 text-amber-400" />
          ) : (
            <Power className="h-3.5 w-3.5" />
          )}
          <span>{isActive ? "Pause Storefront" : "Resume Storefront"}</span>
        </button>
        {error && <span className="text-[11px] text-red-400 font-mono">{error}</span>}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] p-3">
            <Radio className={`h-6 w-6 ${isActive ? "text-[#00df82]" : "text-amber-500 dark:text-amber-400"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  isSuspended
                    ? "border border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400"
                    : isActive
                    ? "border border-[#00df82]/30 bg-[#00df82]/10 text-[#00df82]"
                    : "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[#00df82] animate-pulse" : "bg-amber-400"}`} />
                {isSuspended ? "ADMIN SUSPENDED" : isActive ? "ACCEPTING ORDERS" : "TEMPORARILY PAUSED"}
              </span>
            </div>
            <h2 className="mt-1 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Storefront Availability Radar</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isActive
                ? "Your public storefront is live. Customers can browse packages and check out via MoMo."
                : "Your storefront is paused. Visitors see an informative maintenance notice."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          disabled={!canToggle || busy}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider transition ${
            isActive
              ? "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
              : "bg-[#00df82] text-[#060b13] hover:bg-[#00df82]/90 shadow-md shadow-[#00df82]/20"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isActive ? (
            <PauseCircle className="h-4 w-4" />
          ) : (
            <Power className="h-4 w-4" />
          )}
          <span>{isActive ? "Pause Storefront" : "Go Live Now"}</span>
        </button>
      </div>
      {error && <p className="mt-3 text-xs text-red-400 font-mono">{error}</p>}
    </div>
  );
}

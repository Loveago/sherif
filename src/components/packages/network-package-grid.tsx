"use client";

import * as React from "react";
import Link from "next/link";
import {
  Signal,
  Zap,
  ArrowRight,
  ShieldCheck,
  Flame,
  Percent,
  Calculator,
  Check,
  Clock,
  Sparkles,
} from "lucide-react";
import { PriceMask } from "@/components/price-mask";
import { cn } from "@/lib/utils";
import { formatGHS } from "@/lib/types";

export interface Pkg {
  id: string;
  name: string;
  gbAmount: number;
  price: number | null;
}

export interface PackageGroup {
  network: string;
  packages: Pkg[];
}

const CARRIERS = [
  {
    id: "ALL",
    name: "All Networks",
    subtitle: "Complete Catalog",
    dot: "bg-[#00df82]",
    color: "#00df82",
  },
  {
    id: "MTN",
    name: "MTN Ghana",
    subtitle: "Non-Expiry Bundles",
    dot: "bg-amber-400",
    color: "#f59e0b",
  },
  {
    id: "TELECEL",
    name: "Telecel",
    subtitle: "Fast Express",
    dot: "bg-rose-500",
    color: "#f43f5e",
  },
  {
    id: "AIRTELTIGO",
    name: "AirtelTigo",
    subtitle: "AT iShare & Big Time",
    dot: "bg-sky-400",
    color: "#38bdf8",
  },
];

export function NetworkPackageGrid({ groups }: { groups: PackageGroup[] }) {
  const [activeNetwork, setActiveNetwork] = React.useState<string>("ALL");
  const [sizeFilter, setSizeFilter] = React.useState<"ALL" | "MICRO" | "STANDARD" | "HEAVY">("ALL");

  // Interactive Reseller Markup Simulator
  const [showSimulator, setShowSimulator] = React.useState(false);
  const [markupPercent, setMarkupPercent] = React.useState<number>(20);

  const allPackages = React.useMemo(() => {
    return groups.flatMap((g) =>
      g.packages.map((p) => ({
        ...p,
        network: g.network,
      }))
    );
  }, [groups]);

  const filteredPackages = React.useMemo(() => {
    let list = allPackages;
    if (activeNetwork !== "ALL") {
      if (activeNetwork === "AIRTELTIGO") {
        list = list.filter((p) => p.network === "AIRTELTIGO" || p.network === "AIRTELTIGO_BIGTIME");
      } else {
        list = list.filter((p) => p.network === activeNetwork);
      }
    }
    if (sizeFilter === "MICRO") {
      list = list.filter((p) => p.gbAmount <= 2);
    } else if (sizeFilter === "STANDARD") {
      list = list.filter((p) => p.gbAmount > 2 && p.gbAmount <= 10);
    } else if (sizeFilter === "HEAVY") {
      list = list.filter((p) => p.gbAmount > 10);
    }
    return list.sort((a, b) => a.gbAmount - b.gbAmount);
  }, [allPackages, activeNetwork, sizeFilter]);

  const getNetworkColor = (network: string) => {
    if (network.includes("MTN")) return "#f59e0b";
    if (network.includes("TELECEL")) return "#f43f5e";
    return "#38bdf8";
  };

  return (
    <div className="space-y-6">
      {/* ── CARRIER GATEWAY BAR ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        {CARRIERS.map((c) => {
          const active = activeNetwork === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveNetwork(c.id)}
              className={cn(
                "rounded-2xl border p-3 sm:p-4 text-left transition-all cursor-pointer relative overflow-hidden",
                active
                  ? "border-[#00df82] bg-[#00df82]/10 ring-1 ring-[#00df82]/40 shadow-[0_0_15px_rgba(0,223,130,0.15)]"
                  : "border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] hover:border-slate-300 dark:hover:border-[#1e3555]"
              )}
            >
              {active && (
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: c.color }}
                />
              )}
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", c.dot)} />
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                  {c.name}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 pl-4 truncate">{c.subtitle}</p>
            </button>
          );
        })}
      </div>

      {/* ── CONTROLS TOOLBAR: CAPACITY PILLS + RESELLER MARGIN CALCULATOR TOGGLE ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Capacity Sorter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-1 px-1 sm:mx-0 sm:px-0">
          {[
            { id: "ALL", label: `All Sizes (${allPackages.length})` },
            { id: "MICRO", label: "Micro (≤ 2GB)" },
            { id: "STANDARD", label: "Standard (3GB–10GB)" },
            { id: "HEAVY", label: "Heavy (15GB+)" },
          ].map((f) => {
            const active = sizeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSizeFilter(f.id as any)}
                className={cn(
                  "rounded-xl px-3 sm:px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0",
                  active
                    ? "bg-[#00df82] text-[#041d14] font-black shadow-[0_0_12px_rgba(0,223,130,0.3)]"
                    : "border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#111e33]"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Reseller Markup Calculator Pill Toggle */}
        <button
          onClick={() => setShowSimulator((v) => !v)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-3 sm:px-3.5 py-2 sm:py-1.5 text-xs font-bold transition cursor-pointer self-stretch sm:self-auto justify-center sm:justify-start",
            showSimulator
              ? "border-[#00df82] bg-[#00df82]/15 text-[#00df82]"
              : "border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] text-slate-700 dark:text-slate-300 hover:border-[#00df82]/40"
          )}
        >
          <Calculator className="h-3.5 w-3.5 text-[#00df82]" />
          <span>Reseller Profit Estimator</span>
          <span className="text-[10px] font-mono text-[#00df82]">
            {showSimulator ? `Active (+${markupPercent}%)` : "Off"}
          </span>
        </button>
      </div>

      {/* ── EXPANDABLE RESELLER MARGIN CONTROLS ──────────────────────────────── */}
      {showSimulator && (
        <div className="rounded-2xl border border-[#00df82]/30 bg-[#00df82]/[0.06] p-3.5 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Percent className="h-4 w-4 text-[#00df82]" />
                Simulate Your Storefront Retail Margin
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Adjust the profit slider to preview your expected buyer pricing and retail profit per bundle.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {[10, 15, 20, 25, 30].map((p) => (
                <button
                  key={p}
                  onClick={() => setMarkupPercent(p)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition cursor-pointer",
                    markupPercent === p
                      ? "bg-[#00df82] text-[#041d14]"
                      : "bg-white dark:bg-[#0b1322] border border-slate-200 dark:border-[#162740] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  +{p}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── WHOLESALE PACKAGES GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredPackages.map((pkg) => {
          const color = getNetworkColor(pkg.network);
          const price = pkg.price;
          const estimatedRetail = price != null ? price * (1 + markupPercent / 100) : null;
          const estimatedProfit =
            price != null && estimatedRetail != null ? estimatedRetail - price : null;

          return (
            <div
              key={`${pkg.network}-${pkg.id}`}
              className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 sm:p-6 shadow-sm hover:border-[#00df82]/40 hover:shadow-lg transition flex flex-col justify-between gap-5 group"
            >
              {/* Card Top: GB Badge + Carrier Pill */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-12 w-12 rounded-2xl font-black text-sm flex items-center justify-center shadow-sm shrink-0"
                    style={{
                      backgroundColor: color,
                      color: pkg.network.includes("MTN") ? "#0f172a" : "#ffffff",
                    }}
                  >
                    {pkg.gbAmount}G
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-[#00df82] transition-colors">
                      {pkg.name || `${pkg.network} ${pkg.gbAmount}GB`}
                    </h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 text-[#00df82]" /> Instant USSD Dispatch
                    </p>
                  </div>
                </div>

                <span
                  className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full shrink-0"
                  style={{
                    backgroundColor: `${color}20`,
                    color: color,
                  }}
                >
                  {pkg.network.replace("_BIGTIME", " BIG TIME")}
                </span>
              </div>

              {/* Middle: Non-expiry confirmation */}
              <div className="rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-3 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#00df82]" />
                    Validity:
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Never Expires</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Routing Switch:</span>
                  <span className="font-mono text-[#00df82]">Automated Daemon</span>
                </div>
              </div>

              {/* Bottom: Pricing & Reseller Margin Simulator Output */}
              <div className="pt-3 border-t border-slate-100 dark:border-[#162740] space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Wholesale Price
                    </span>
                    <span className="text-xl font-black text-[#00df82] font-mono">
                      {price != null ? formatGHS(price) : "Login to view"}
                    </span>
                  </div>

                  {showSimulator && estimatedRetail != null && estimatedProfit != null && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Est. Profit ({markupPercent}%)
                      </span>
                      <span className="text-sm font-black text-white font-mono">
                        +{formatGHS(estimatedProfit)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Dispatch Button */}
                <Link
                  href={`/dashboard/buy-now?packageId=${pkg.id}&network=${pkg.network}`}
                  className="w-full h-11 rounded-xl bg-slate-100 hover:bg-[#00df82] hover:text-[#041d14] dark:bg-[#070d18] dark:border dark:border-[#162740] dark:hover:border-[#00df82] dark:hover:bg-[#00df82] text-slate-900 dark:text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Dispatch Bundle</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Zap,
  Phone,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  CreditCard,
  Package as PackageIcon,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Signal,
  Flame,
  Clock,
  Sparkles,
  Smartphone,
  Check,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { formatGHS } from "@/lib/types";
import { cn } from "@/lib/utils";

type Network = "MTN" | "TELECEL" | "AIRTELTIGO";

interface DataPackage {
  id: string;
  network: string;
  name: string;
  gbAmount: number;
  description: string | null;
  price: number | null;
  retailPriceGHS: number | null;
}

const CARRIER_CONFIG = {
  MTN: {
    label: "MTN Ghana",
    sub: "4G / 5G High Speed",
    latency: "~1.1s",
    signal: 4,
    color: "#f59e0b",
    badgeBg: "bg-amber-400 text-slate-950",
    borderActive: "border-amber-400 ring-2 ring-amber-400/30 bg-amber-400/[0.08]",
    tag: "MOST POPULAR",
  },
  TELECEL: {
    label: "Telecel (Vodafone)",
    sub: "Super4G Express",
    latency: "~1.4s",
    signal: 4,
    color: "#e60000",
    badgeBg: "bg-red-600 text-white",
    borderActive: "border-red-500 ring-2 ring-red-500/30 bg-red-500/[0.08]",
    tag: "FAST DISPATCH",
  },
  AIRTELTIGO: {
    label: "AirtelTigo",
    sub: "iShare & BigTime",
    latency: "~0.9s",
    signal: 4,
    color: "#005fb8",
    badgeBg: "bg-blue-600 text-white",
    borderActive: "border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/[0.08]",
    tag: "BEST VALUE",
  },
};

export default function BuyNowPage() {
  const { toast } = useToast();
  const [packages, setPackages] = useState<DataPackage[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionEnabled, setSubmissionEnabled] = useState(true);

  const [selectedNetwork, setSelectedNetwork] = useState<Network>("MTN");
  const [filter, setFilter] = useState<"ALL" | "MICRO" | "STANDARD" | "HEAVY">("ALL");
  const [selectedPackage, setSelectedPackage] = useState<DataPackage | null>(null);
  const [phone, setPhone] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch package catalog & balance
  const loadPackages = async () => {
    try {
      const res = await fetch("/api/packages", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const pkgs: DataPackage[] = data.packages || [];
        setPackages(pkgs);
        setBalance(typeof data.userBalance === "number" ? data.userBalance : 0);
        if (data.submissionEnabled === false) setSubmissionEnabled(false);

        // Pre-select first MTN package
        const firstMtn = pkgs.find((p) => p.network === "MTN");
        if (firstMtn && !selectedPackage) setSelectedPackage(firstMtn);
      }
    } catch {
      toast("Failed to load bundle catalog", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  // Recipient phone carrier auto-detection
  const detectedCarrier = useMemo(() => {
    const clean = phone.trim().replace(/\D/g, "");
    if (clean.length < 3) return null;
    let prefix = clean;
    if (prefix.startsWith("233")) prefix = "0" + prefix.slice(3);
    const sub = prefix.slice(0, 3);

    // MTN Prefixes: 024, 054, 055, 059, 053
    if (["024", "054", "055", "059", "053"].includes(sub)) return "MTN";
    // Telecel: 020, 050
    if (["020", "050"].includes(sub)) return "TELECEL";
    // AT: 027, 057, 026, 056
    if (["027", "057", "026", "056"].includes(sub)) return "AIRTELTIGO";
    return null;
  }, [phone]);

  // Note: We do NOT automatically switch selectedNetwork when detectedCarrier differs,
  // because numbers may be ported between networks (e.g. Telecel 050/020 ported to MTN).

  // Filter packages for selected network
  const filteredPackages = useMemo(() => {
    return packages
      .filter((p) => p.network === selectedNetwork)
      .filter((p) => {
        if (filter === "MICRO") return p.gbAmount <= 2;
        if (filter === "STANDARD") return p.gbAmount > 2 && p.gbAmount <= 10;
        if (filter === "HEAVY") return p.gbAmount > 10;
        return true;
      })
      .sort((a, b) => a.gbAmount - b.gbAmount);
  }, [packages, selectedNetwork, filter]);

  // Auto-select first package when changing network
  useEffect(() => {
    if (filteredPackages.length > 0) {
      const currentStillValid = filteredPackages.find((p) => p.id === selectedPackage?.id);
      if (!currentStillValid) {
        setSelectedPackage(filteredPackages[0]);
      }
    }
  }, [selectedNetwork, filteredPackages]);

  const handleBuyNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) {
      return toast("Please select a data bundle first", "error");
    }

    const cleanPhone = phone.trim().replace(/\D/g, "").slice(0, 10);
    if (!cleanPhone || cleanPhone.length !== 10 || !cleanPhone.startsWith("0")) {
      return toast("Please enter a valid 10-digit Ghanaian phone number (e.g. 0241234567)", "error");
    }

    const cost = selectedPackage.price ?? selectedPackage.retailPriceGHS ?? 0;
    if (balance < cost) {
      return toast(
        `Insufficient balance. Requires ${formatGHS(cost)}, you have ${formatGHS(balance)}`,
        "error"
      );
    }

    setSubmitting(true);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orders: [
            {
              phoneNumber: cleanPhone,
              network: selectedPackage.network,
              gbAmount: selectedPackage.gbAmount,
              packageId: selectedPackage.id,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return toast(data.error || "Order dispatch failed", "error");
      }

      toast(`Order placed successfully for ${cleanPhone}!`, "success");
      setSuccessMessage(
        `Bundle Dispatched! ${selectedPackage.gbAmount} GB crediting to ${cleanPhone}.`
      );
      setPhone("");
      loadPackages();
    } catch {
      toast("Network connection error. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const currentPrice = selectedPackage
    ? selectedPackage.price ?? selectedPackage.retailPriceGHS ?? 0
    : 0;

  const remainingBalance = Math.max(0, balance - currentPrice);

  return (
    <div className="space-y-6">
      {/* ── HIGH-TECH CONSOLE HEADER ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 sm:p-6 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00df82]/30 bg-[#00df82]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#00df82]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00df82] animate-pulse" />
                Telecom Dispatch Console
              </span>
              <span className="text-[10px] font-bold text-slate-400">· USSD Switching Node v2.0</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Instant Bundle Dispatch
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Select your telecom network, pick your desired non-expiry package, and provision recipient SIMs with real-time USSD delivery confirmation.
            </p>
          </div>

          {/* Quick Balance Status HUD */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-4 py-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00df82]/15 text-[#00df82]">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Available Balance</p>
              <p className="text-sm font-black text-slate-900 dark:text-white font-mono">{formatGHS(balance)}</p>
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-2xl border border-[#00df82]/40 bg-[#00df82]/10 p-4 text-xs font-bold text-[#00df82] flex items-center justify-between shadow-[0_0_20px_rgba(0,223,130,0.2)]">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-[10px] uppercase font-mono tracking-wider hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {!submissionEnabled && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-semibold text-amber-300 flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-amber-400" />
          <span>Order submissions are temporarily paused by administrator.</span>
        </div>
      )}

      {/* ── CARRIER SWITCHBOARD RIBBON (3 CONSOLE DECK BUTTONS) ─────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400">
          <span>Active Carrier Gateways</span>
          <span className="text-[#00df82] font-mono flex items-center gap-1">
            <Signal className="h-3 w-3" /> All Gateways Switched Online
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {(["MTN", "TELECEL", "AIRTELTIGO"] as Network[]).map((net) => {
            const conf = CARRIER_CONFIG[net];
            const active = selectedNetwork === net;

            return (
              <button
                key={net}
                type="button"
                onClick={() => setSelectedNetwork(net)}
                className={cn(
                  "relative rounded-2xl border p-2.5 sm:p-4 text-left transition-all overflow-hidden cursor-pointer",
                  active
                    ? conf.borderActive
                    : "border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] hover:border-slate-300 dark:hover:border-[#1e3555]"
                )}
              >
                {/* Active Indicator Bar */}
                {active && (
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: conf.color }}
                  />
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5 sm:mb-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span
                      className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full animate-pulse shrink-0"
                      style={{ backgroundColor: conf.color }}
                    />
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                      {conf.label}
                    </span>
                  </div>
                  <span className="hidden sm:inline-block text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-md">
                    {conf.latency}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] truncate">{conf.sub}</span>
                  <span
                    className="hidden sm:inline-block text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${conf.color}20`,
                      color: conf.color,
                    }}
                  >
                    {conf.tag}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN INTERACTIVE SPLIT: BUNDLE MATRIX + CYBER DISPATCH HUD ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: BUNDLE CARDS MATRIX (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Capacity Classification Pills */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5">
              {[
                { id: "ALL", label: "All Bundles" },
                { id: "MICRO", label: "Micro (≤ 2GB)" },
                { id: "STANDARD", label: "Standard (3GB–10GB)" },
                { id: "HEAVY", label: "Heavy (15GB+)" },
              ].map((t) => {
                const active = filter === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFilter(t.id as any)}
                    className={cn(
                      "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                      active
                        ? "bg-[#00df82] text-[#041d14] font-black shadow-[0_0_15px_rgba(0,223,130,0.3)]"
                        : "border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#111e33]"
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
              {filteredPackages.length} package{filteredPackages.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Bundle Cards Grid (2 cols on sm, 3 cols on xl) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {loading ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 text-[#00df82] animate-spin" />
                <span className="text-xs font-mono text-slate-400">Querying carrier catalogs...</span>
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-slate-500 dark:text-slate-400 rounded-3xl border border-slate-200 dark:border-[#162740] p-6 bg-white dark:bg-[#0b1322]">
                No packages match this capacity filter. Switch filters to view more sizes.
              </div>
            ) : (
              filteredPackages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                const price = pkg.price ?? pkg.retailPriceGHS ?? 0;
                const conf = CARRIER_CONFIG[selectedNetwork];

                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackage(pkg)}
                    className={cn(
                      "relative rounded-2xl border p-4 text-left transition-all flex flex-col justify-between gap-4 group cursor-pointer shadow-xs",
                      isSelected
                        ? "border-[#00df82] bg-[#00df82]/[0.08] ring-1 ring-[#00df82]/50 shadow-[0_0_20px_rgba(0,223,130,0.15)]"
                        : "border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] hover:border-slate-300 dark:hover:border-[#1e3555] hover:bg-slate-50/80 dark:hover:bg-[#111e33]"
                    )}
                  >
                    {/* Top Row: GB Capacity & Never Expires Tag */}
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-8 w-8 rounded-xl font-black text-xs flex items-center justify-center shadow-sm"
                          style={{
                            backgroundColor: conf.color,
                            color: selectedNetwork === "MTN" ? "#0f172a" : "#ffffff",
                          }}
                        >
                          {pkg.gbAmount}G
                        </span>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#00df82] transition-colors">
                            {pkg.gbAmount} GB
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Non-Expiry</p>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00df82] text-[#041d14]">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">
                          READY
                        </span>
                      )}
                    </div>

                    {/* Middle Info */}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {pkg.name || `${conf.label} ${pkg.gbAmount}GB`}
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-[#00df82]" /> Instant USSD Delivery
                      </p>
                    </div>

                    {/* Bottom Pricing Row */}
                    <div className="pt-2 border-t border-slate-200 dark:border-[#162740] flex items-center justify-between w-full">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                          WHOLESALE RATE
                        </span>
                        <span className="text-base font-black text-[#00df82] font-mono">
                          {formatGHS(price)}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "rounded-lg px-2 py-1 text-[10px] font-bold transition",
                          isSelected
                            ? "bg-[#00df82] text-[#041d14]"
                            : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 group-hover:bg-[#00df82]/20 group-hover:text-[#00df82]"
                        )}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CYBER DISPATCH HUD (4 COLS) */}
        <div className="lg:col-span-4 sticky top-20 space-y-4">
          <form
            onSubmit={handleBuyNow}
            className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#162740]">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-[#00df82]" />
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Dispatch Command
                </h2>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#00df82] bg-[#00df82]/10 border border-[#00df82]/20 px-2 py-0.5 rounded-full">
                LIVE
              </span>
            </div>

            {/* Recipient Phone Input with Carrier Auto-Detection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Recipient SIM Number
                </label>
                {detectedCarrier && (
                  detectedCarrier === selectedNetwork ? (
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#00df82] flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#00df82]" />
                      Prefix: {detectedCarrier}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Ported SIM ({detectedCarrier} prefix)
                    </span>
                  )
                )}
              </div>
              <div className="relative">
                <Phone className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="recipient-phone-input"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="0241234567"
                  maxLength={10}
                  required
                  className="w-full h-12 rounded-xl bg-slate-50 dark:bg-[#070d18] border border-slate-200 dark:border-[#162740] pl-10 pr-4 text-sm font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-[#00df82] focus:ring-1 focus:ring-[#00df82] transition-colors"
                />
              </div>

              {detectedCarrier && detectedCarrier !== selectedNetwork ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>
                      Number prefix belongs to <strong>{CARRIER_CONFIG[detectedCarrier as Network]?.label || detectedCarrier}</strong>. If this SIM is ported to <strong>{CARRIER_CONFIG[selectedNetwork]?.label || selectedNetwork}</strong>, your package will be delivered via {selectedNetwork}.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedNetwork(detectedCarrier as Network)}
                    className="shrink-0 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Switch to {detectedCarrier}?
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500">
                  Accepts Ghanaian numbers (024, 050, 027, etc.) including ported SIMs with automatic routing.
                </p>
              )}
            </div>

            {/* Selected Package Card HUD */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] space-y-3">
              {selectedPackage ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Target Allocation
                      </span>
                      <p className="text-base font-black text-slate-900 dark:text-white">
                        {selectedPackage.name}
                      </p>
                    </div>
                    <span className="text-xl font-black text-[#00df82] font-mono">
                      {formatGHS(currentPrice)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200 dark:border-white/5">
                    <div>
                      <span className="text-slate-500 block">Carrier Network:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{selectedPackage.network}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Data Volume:</span>
                      <span className="font-bold text-[#00df82]">{selectedPackage.gbAmount} GB</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-3">
                  Please click a package from the catalog matrix to proceed.
                </p>
              )}
            </div>

            {/* Wallet Impact Ledger Calculation */}
            <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.02] p-3 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                <span>Wallet Balance:</span>
                <span>{formatGHS(balance)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                <span>Order Cost:</span>
                <span className="text-[#00df82]">- {formatGHS(currentPrice)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-white/5">
                <span>Remaining:</span>
                <span className={balance < currentPrice ? "text-rose-500 font-bold" : "text-slate-900 dark:text-white"}>
                  {formatGHS(remainingBalance)}
                </span>
              </div>
            </div>

            {/* High-Energy Dispatch CTA Button */}
            <button
              type="submit"
              disabled={submitting || !selectedPackage || !submissionEnabled || balance < currentPrice}
              className="w-full h-12 rounded-2xl bg-[#00df82] hover:bg-[#00c572] active:scale-[0.98] text-[#041d14] font-black text-xs shadow-[0_0_25px_rgba(0,223,130,0.35)] flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#041d14]" />
                  <span>Transmitting to Carrier Switch...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-[#041d14]" />
                  <span>Dispatch Now · {formatGHS(currentPrice)}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 text-center">
              <ShieldCheck className="h-3.5 w-3.5 text-[#00df82]" />
              <span>Direct Carrier Switched · Zero Manual Processing</span>
            </div>
          </form>
        </div>
      </div>

      {/* ── STICKY MOBILE DISPATCH BAR ─────────────────────────────────────── */}
      {selectedPackage && (
        <div className="lg:hidden fixed bottom-14 left-0 right-0 z-30 p-2.5 bg-white/95 dark:bg-[#0b1322]/95 backdrop-blur-xl border-t border-slate-200 dark:border-[#162740] shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#00df82] font-mono">
                  {selectedPackage.network}
                </span>
                <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {selectedPackage.gbAmount} GB
                </span>
              </div>
              <p className="font-mono text-sm font-black text-[#00df82]">
                {formatGHS(currentPrice)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("recipient-phone-input");
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
                el?.focus();
              }}
              className="rounded-xl bg-[#00df82] px-4 py-2.5 text-xs font-black text-[#041d14] shadow-md shadow-[#00df82]/30 uppercase tracking-wider shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <span>{phone ? "Ready to Dispatch" : "Enter Phone"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

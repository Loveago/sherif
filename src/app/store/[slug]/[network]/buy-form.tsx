"use client";

import * as React from "react";
import {
  Loader2,
  X,
  ShoppingBag,
  Smartphone,
  Mail,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Flame,
  Check,
  Signal,
  Radio,
  Lock,
} from "lucide-react";
import { NetworkLogo } from "@/components/store/network-logo";
import { NETWORK_BRANDS, ghs } from "@/components/store/brands";
import type { NetworkProvider } from "@/lib/types";

export interface Product {
  packageId: string;
  gbAmount: number;
  name: string;
  price: number; // GHS
  network?: NetworkProvider;
}

interface NetworkBuyFormProps {
  slug: string;
  products: Product[];
  network?: NetworkProvider;
  storeName?: string;
  showCarrierFilter?: boolean;
}

// Carrier prefix detection helper for Ghana
function detectCarrier(phone: string): { network: NetworkProvider; label: string; color: string } | null {
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 3) return null;
  const prefix = clean.slice(0, 3);

  // MTN prefixes: 024, 025, 053, 054, 055, 059
  if (["024", "025", "053", "054", "055", "059"].includes(prefix)) {
    return { network: "MTN", label: "MTN Ghana", color: "#f59e0b" };
  }
  // Telecel prefixes: 020, 050
  if (["020", "050"].includes(prefix)) {
    return { network: "TELECEL", label: "Telecel", color: "#f43f5e" };
  }
  // AirtelTigo prefixes: 027, 057, 026, 056
  if (["027", "057", "026", "056"].includes(prefix)) {
    return { network: "AIRTELTIGO", label: "AT Ghana", color: "#38bdf8" };
  }
  return null;
}

export function NetworkBuyForm({
  slug,
  products,
  network,
  storeName,
  showCarrierFilter = false,
}: NetworkBuyFormProps) {
  // Modal & selected bundle state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Product | null>(null);

  // Network filter for multi-network view
  const [activeNetwork, setActiveNetwork] = React.useState<string>(network || "MTN");

  // Active capacity filter tab
  const [filterTab, setFilterTab] = React.useState<"all" | "popular" | "light" | "heavy">("all");

  // Customer input state
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const phoneInputRef = React.useRef<HTMLInputElement>(null);

  // Restore saved email/phone from previous checkout on mount
  React.useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("storefront_customer_email");
      if (savedEmail) setEmail(savedEmail);
      const savedPhone = localStorage.getItem("storefront_customer_phone");
      if (savedPhone) setPhone(savedPhone.replace(/\D/g, "").slice(0, 10));
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  // Handle escape key & body scroll lock when modal is open
  React.useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        setModalOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 150);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      clearTimeout(timer);
    };
  }, [modalOpen, busy]);

  const phoneValid = /^0\d{9}$/.test(phone.trim());
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const detectedCarrier = React.useMemo(() => detectCarrier(phone), [phone]);

  const openCheckout = (product: Product) => {
    setSelected(product);
    setError("");
    setModalOpen(true);
  };

  const closeCheckout = () => {
    if (busy) return;
    setModalOpen(false);
  };

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;

    if (!phoneValid) {
      setError("Enter a valid 10-digit number starting with 0, e.g. 0241234567");
      phoneInputRef.current?.focus();
      return;
    }
    if (!emailValid) {
      setError("Enter a valid email address so Paystack can send your payment receipt.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      try {
        localStorage.setItem("storefront_customer_email", email.trim().toLowerCase());
        localStorage.setItem("storefront_customer_phone", phone.trim());
      } catch {}

      const res = await fetch(`/api/store/${slug}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selected.packageId,
          customerPhone: phone.trim(),
          customerEmail: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start payment");

      window.location.href = data.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment");
      setBusy(false);
    }
  }

  // Filter products based on selected network & size tab
  const filteredProducts = React.useMemo(() => {
    let list = products;
    if (activeNetwork !== "ALL") {
      list = list.filter((p) => (p.network || network) === activeNetwork);
    }
    if (filterTab === "popular") {
      list = list.filter((p) => [5, 10, 15, 20].includes(p.gbAmount) || list.length <= 4);
    } else if (filterTab === "light") {
      list = list.filter((p) => p.gbAmount < 5);
    } else if (filterTab === "heavy") {
      list = list.filter((p) => p.gbAmount >= 10);
    }
    return list.sort((a, b) => a.gbAmount - b.gbAmount || a.price - b.price);
  }, [products, network, activeNetwork, filterTab]);

  const targetNetwork = selected?.network || network || "MTN";
  const targetBrand = NETWORK_BRANDS[targetNetwork];
  const fee = selected ? Math.round(selected.price * 0.02 * 100) / 100 : 0;
  const total = selected ? Math.round((selected.price + fee) * 100) / 100 : 0;

  // Check if detected recipient phone number matches selected bundle's network
  const carrierMismatch =
    detectedCarrier &&
    targetNetwork &&
    detectedCarrier.network !== targetNetwork &&
    phoneValid;

  return (
    <div className="space-y-6">
      {/* ── MULTI-CARRIER FILTER SWITCHBOARD (IF APPLICABLE) ────────────────── */}
      {showCarrierFilter && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "MTN", label: "MTN Ghana" },
            { id: "TELECEL", label: "Telecel" },
            { id: "AIRTELTIGO", label: "AT iShare" },
          ].map((c) => {
            const active = activeNetwork === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveNetwork(c.id)}
                className={`rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? "bg-[#00df82] text-[#041d14] shadow-[0_0_15px_rgba(0,223,130,0.3)]"
                    : "border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#111e33]"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── CAPACITY FILTER PILLS TOOLBAR ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-[#162740] pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-1 px-1 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              filterTab === "all"
                ? "bg-[#00df82] text-[#041d14] font-black shadow-[0_0_12px_rgba(0,223,130,0.3)]"
                : "border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#111e33]"
            }`}
          >
            All Sizes ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("popular")}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              filterTab === "popular"
                ? "bg-[#00df82] text-[#041d14] font-black shadow-[0_0_12px_rgba(0,223,130,0.3)]"
                : "border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#111e33]"
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
            <span>Popular (5GB–20GB)</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("light")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              filterTab === "light"
                ? "bg-[#00df82] text-[#041d14] font-black shadow-[0_0_12px_rgba(0,223,130,0.3)]"
                : "border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#111e33]"
            }`}
          >
            Starter (&lt; 5GB)
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("heavy")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              filterTab === "heavy"
                ? "bg-[#00df82] text-[#041d14] font-black shadow-[0_0_12px_rgba(0,223,130,0.3)]"
                : "border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#111e33]"
            }`}
          >
            Mega (25GB+)
          </button>
        </div>

        <span className="text-xs font-mono text-emerald-600 dark:text-[#00df82] flex items-center gap-1.5 self-start sm:self-auto">
          <Zap className="h-3.5 w-3.5 fill-emerald-600 dark:fill-[#00df82]" /> Instant Automated SIM Crediting
        </span>
      </div>

      {/* ── CYBER-NEON PACKAGE CARDS GRID ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {filteredProducts.map((p) => {
          const isPopular = [5, 10, 20].includes(p.gbAmount);
          const pkgNetwork = p.network || network || "MTN";
          const pkgBrand = NETWORK_BRANDS[pkgNetwork];

          return (
            <div
              key={p.packageId}
              onClick={() => openCheckout(p)}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border bg-white dark:bg-[#0b1322] p-4 sm:p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#00df82]/50 hover:shadow-[0_0_25px_rgba(0,223,130,0.15)] active:scale-[0.98] cursor-pointer ${
                isPopular
                  ? "border-[#00df82]/40 shadow-[0_0_15px_rgba(0,223,130,0.08)]"
                  : "border-slate-200 dark:border-[#162740]"
              }`}
            >
              {/* Top Row: Network Pill + Non-Expiry Badge */}
              <div className="flex items-center justify-between gap-1">
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 dark:bg-[#070d18] border border-slate-200 dark:border-[#162740] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <Check className="h-2.5 w-2.5 text-[#00df82]" />
                  Never Expires
                </span>
                {isPopular ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#00df82]/15 border border-[#00df82]/30 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:text-[#00df82]">
                    <Sparkles className="h-2.5 w-2.5" /> Popular
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    {pkgBrand?.label || pkgNetwork}
                  </span>
                )}
              </div>

              {/* Data Size Display */}
              <div className="my-4 text-center sm:text-left">
                <div className="flex items-baseline justify-center sm:justify-start gap-1">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-[#00df82] transition-colors">
                    {p.gbAmount}
                  </span>
                  <span className="text-sm font-black text-emerald-600 dark:text-[#00df82]">GB</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
                  {p.name || `${pkgBrand?.label || pkgNetwork} ${p.gbAmount}GB`}
                </p>
              </div>

              {/* Price & Action Button */}
              <div className="pt-3 border-t border-slate-100 dark:border-[#162740] flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 block leading-tight">Price</span>
                  <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white">
                    ₵{p.price.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#00df82] text-[#041d14] font-black transition-all group-hover:scale-105 shadow-md shadow-[#00df82]/20"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-12 text-center text-sm text-slate-500 dark:text-slate-400">
          No bundle packages match the selected criteria.
        </div>
      )}

      {/* ── CYBER-NEON BUY DATA CHECKOUT POPUP MODAL ───────────────────────── */}
      {modalOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={closeCheckout}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200"
          >
            {/* Ambient Cyber Light */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#00df82]/15 blur-3xl" />

            {/* Modal Header */}
            <div className="relative flex items-center justify-between border-b border-slate-200 dark:border-[#162740] p-5 sm:p-6 bg-slate-50 dark:bg-[#070d18]">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${targetBrand?.tile ?? "bg-[#00df82] text-[#041d14]"} shadow-md border border-slate-200 dark:border-[#162740]`}>
                  <NetworkLogo network={targetNetwork} className="h-full w-full object-contain" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    Checkout &amp; SIM Dispatch
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {storeName ? `${storeName} · ` : ""}Instant Mobile Money fulfillment
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCheckout}
                disabled={busy}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-200 dark:hover:bg-[#111e33] hover:text-slate-900 dark:hover:text-white disabled:opacity-50 cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleBuy} className="p-5 sm:p-6 space-y-4">
              {/* Selected Bundle Summary Banner */}
              <div className="rounded-2xl border border-[#00df82]/30 bg-[#00df82]/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#00df82] flex items-center gap-1.5">
                      <Signal className="h-3 w-3" /> Selected Package
                    </span>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      {targetBrand?.label ? `${targetBrand.label} ` : ""}{selected.gbAmount}GB Non-Expiry
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">Automated USSD clearance</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Subtotal</span>
                    <span className="text-2xl font-black font-mono text-emerald-600 dark:text-[#00df82]">
                      ₵{selected.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recipient Phone Input with Live Carrier Prefix Detection */}
              <div className="space-y-1.5">
                <label htmlFor="customerPhone" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-[#00df82]" /> Target Recipient SIM Number
                  </span>
                  {detectedCarrier && (
                    <span
                      className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: `${detectedCarrier.color}15`,
                        borderColor: `${detectedCarrier.color}40`,
                        color: detectedCarrier.color,
                      }}
                    >
                      Detected: {detectedCarrier.label}
                    </span>
                  )}
                </label>
                <input
                  ref={phoneInputRef}
                  id="customerPhone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="0241234567"
                  maxLength={10}
                  required
                  disabled={busy}
                  className="w-full h-12 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3.5 text-base font-black font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[#00df82] focus:outline-none transition-colors"
                />

                {carrierMismatch && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1 font-mono">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Notice: Number looks like {detectedCarrier?.label}, but package is {targetBrand?.label}. Double-check before paying.
                  </p>
                )}
              </div>

              {/* Paystack Receipt Email Input */}
              <div className="space-y-1.5">
                <label htmlFor="customerEmail" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" /> Digital Receipt Email <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">For Paystack payment confirmation</span>
                </label>
                <input
                  id="customerEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  required
                  disabled={busy}
                  className="w-full h-11 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[#00df82] focus:outline-none transition-colors"
                />
              </div>

              {/* Price Breakdown Telemetry */}
              <div className="rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] p-3 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Bundle Value</span>
                  <span className="text-slate-900 dark:text-white">₵{selected.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>MoMo Gateway Clearance (2%)</span>
                  <span className="text-slate-900 dark:text-white">₵{fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-[#162740] text-sm">
                  <span className="uppercase text-[11px] text-slate-500 dark:text-slate-400">Total Settlement Due</span>
                  <span className="text-emerald-600 dark:text-[#00df82] text-base">₵{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={busy || !phoneValid || !emailValid}
                  className="inline-flex w-full h-12 items-center justify-center gap-2 rounded-2xl bg-[#00df82] text-sm font-black text-[#041d14] shadow-[0_0_20px_rgba(0,223,130,0.35)] transition-all hover:bg-[#00c572] active:scale-[0.99] disabled:opacity-40 cursor-pointer"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#041d14]" />
                      Connecting to Paystack MoMo Gateway...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 fill-[#041d14]" />
                      Pay ₵{total.toFixed(2)} with Mobile Money
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#00df82]" />
                  Paystack 256-Bit SSL Encrypted · Automated Carrier Dispatches
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

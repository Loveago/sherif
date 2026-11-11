"use client";

import * as React from "react";
import Link from "next/link";
import {
  Signal,
  ClipboardList,
  Star,
  Phone,
  MessageCircle,
  Users,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  Loader2,
  X,
  Share2,
  ShieldCheck,
  Zap,
  Sparkles,
  Calendar,
} from "lucide-react";
import { fromPesewas } from "@/lib/storefront";
import { buildWhatsAppLink } from "@/lib/storefront-utils";
import type { NetworkProvider } from "@/lib/types";

export interface StorefrontProductItem {
  packageId: string;
  gbAmount: number;
  name: string;
  price: number; // in GHS
  network: NetworkProvider;
  validity?: string;
}

interface StorefrontPortalProps {
  storefront: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    whatsappGroupLink?: string | null;
    logoUrl?: string | null;
    reviewsEnabled?: boolean;
  };
  products: StorefrontProductItem[];
  availableNetworks: NetworkProvider[];
}

// Carrier prefix detection helper for Ghana
function detectCarrier(phone: string): { network: string; label: string; color: string } | null {
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 3) return null;
  const prefix = clean.slice(0, 3);

  if (["024", "025", "053", "054", "055", "059"].includes(prefix)) {
    return { network: "MTN", label: "MTN Ghana", color: "#f59e0b" };
  }
  if (["020", "050"].includes(prefix)) {
    return { network: "TELECEL", label: "Telecel", color: "#e60000" };
  }
  if (["027", "057", "026", "056"].includes(prefix)) {
    return { network: "AIRTELTIGO", label: "AirtelTigo", color: "#005fb8" };
  }
  return null;
}

function whatsappDirectLink(phone: string | null | undefined): string {
  const link = buildWhatsAppLink(phone);
  return link || "#";
}

export function StorefrontPortal({
  storefront,
  products,
  availableNetworks,
}: StorefrontPortalProps) {
  // Navigation tabs: data | track | reviews
  const isReviewsEnabled = storefront.reviewsEnabled ?? true;
  const [activeTab, setActiveTab] = React.useState<"data" | "track" | "reviews">("data");

  React.useEffect(() => {
    if (!isReviewsEnabled && activeTab === "reviews") {
      setActiveTab("data");
    }
  }, [isReviewsEnabled, activeTab]);

  // Carrier filter: default to MTN if available, else first network
  const defaultNetwork = availableNetworks.includes("MTN")
    ? "MTN"
    : availableNetworks[0] || "MTN";
  const [activeNetwork, setActiveNetwork] = React.useState<string>(defaultNetwork);

  // Buy checkout modal state
  const [selectedProduct, setSelectedProduct] = React.useState<StorefrontProductItem | null>(null);
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [checkingOut, setCheckingOut] = React.useState(false);
  const [checkoutError, setCheckoutError] = React.useState("");

  // Tracking query & date filter state
  const [trackQuery, setTrackQuery] = React.useState("");
  const [trackDate, setTrackDate] = React.useState<string>("");
  const [trackDateMode, setTrackDateMode] = React.useState<"all" | "today" | "yesterday" | "past7" | "custom">("all");
  const [trackStartDate, setTrackStartDate] = React.useState<string>("");
  const [trackEndDate, setTrackEndDate] = React.useState<string>("");
  const [trackLoading, setTrackLoading] = React.useState(false);
  const [trackResult, setTrackResult] = React.useState<any[] | null>(null);
  const [trackError, setTrackError] = React.useState("");

  // Review states (real approved reviews)
  const [reviewsList, setReviewsList] = React.useState<any[]>([]);
  const [reviewsStats, setReviewsStats] = React.useState<{ averageRating: number; totalCount: number }>({
    averageRating: 5.0,
    totalCount: 0,
  });
  const [reviewsLoading, setReviewsLoading] = React.useState(false);
  const [reviewModalOpen, setReviewModalOpen] = React.useState(false);
  const [reviewRating, setReviewRating] = React.useState(5);
  const [reviewName, setReviewName] = React.useState("");
  const [reviewComment, setReviewComment] = React.useState("");
  const [submittingReview, setSubmittingReview] = React.useState(false);
  const [reviewSubmitted, setReviewSubmitted] = React.useState(false);
  const [reviewSubmitFeedback, setReviewSubmitFeedback] = React.useState<string>("");

  // Filter products by selected network
  const filteredProducts = React.useMemo(() => {
    return products
      .filter((p) => {
        if (activeNetwork === "ALL") return true;
        if (activeNetwork === "AIRTELTIGO_ISHARE" || activeNetwork === "AIRTELTIGO") {
          return p.network === "AIRTELTIGO";
        }
        return p.network === activeNetwork;
      })
      .sort((a, b) => a.gbAmount - b.gbAmount || a.price - b.price);
  }, [products, activeNetwork]);

  // Customer contact details
  const rawContact = storefront.whatsapp || storefront.phone || "";
  const displayPhone = rawContact || "0242075374";
  const waChatUrl = whatsappDirectLink(rawContact);
  const waGroupUrl = storefront.whatsappGroupLink || waChatUrl;

  // Real-time phone carrier check
  const carrierInfo = detectCarrier(phone);

  const handleOpenBuy = (pkg: StorefrontProductItem) => {
    setSelectedProduct(pkg);
    setCheckoutError("");
  };

  const handleCloseBuy = () => {
    if (checkingOut) return;
    setSelectedProduct(null);
    setCheckoutError("");
  };

  // Submit MoMo payment
  const handleProceedCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const cleanPhone = phone.replace(/\D/g, "").slice(0, 10);
    if (cleanPhone.length !== 10 || !cleanPhone.startsWith("0")) {
      setCheckoutError("Please enter a valid 10-digit Ghana mobile number (e.g. 0244123456).");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setCheckoutError("Please enter a valid email address for your payment receipt.");
      return;
    }

    setCheckingOut(true);
    setCheckoutError("");

    try {
      const res = await fetch(`/api/store/${storefront.slug}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedProduct.packageId,
          customerPhone: cleanPhone,
          customerEmail: cleanEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to initialize payment.");
      }

      // Save customer info in localStorage for future convenience
      try {
        localStorage.setItem("storefront_customer_phone", cleanPhone);
        if (cleanEmail) localStorage.setItem("storefront_customer_email", cleanEmail);
      } catch {}

      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        throw new Error("No payment link returned by gateway.");
      }
    } catch (err: any) {
      setCheckoutError(err.message || "Failed to process payment. Please try again.");
      setCheckingOut(false);
    }
  };

  const handleSetTrackPreset = (mode: "all" | "today" | "yesterday" | "past7" | "custom") => {
    setTrackDateMode(mode);
    const now = new Date();
    const toYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    if (mode === "all") {
      setTrackDate("");
      setTrackStartDate("");
      setTrackEndDate("");
    } else if (mode === "today") {
      setTrackDate(toYMD(now));
      setTrackStartDate("");
      setTrackEndDate("");
    } else if (mode === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setTrackDate(toYMD(y));
      setTrackStartDate("");
      setTrackEndDate("");
    } else if (mode === "past7") {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      setTrackDate("");
      setTrackStartDate(toYMD(past));
      setTrackEndDate(toYMD(now));
    }
  };

  // Execute tracking search with date filter
  const handleExecuteTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = trackQuery.trim();
    if (!q) {
      setTrackError("Please enter a phone number or order reference.");
      return;
    }
    setTrackLoading(true);
    setTrackError("");
    setTrackResult(null);

    try {
      const res = await fetch(`/api/store/${storefront.slug}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          date: trackDate || undefined,
          startDate: trackStartDate || undefined,
          endDate: trackEndDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error looking up order.");
      setTrackResult(data.orders || []);
      if ((data.orders || []).length === 0) {
        setTrackError("No orders found matching this search criteria and date filter.");
      }
    } catch (err: any) {
      setTrackError(err.message || "Unable to retrieve order status.");
    } finally {
      setTrackLoading(false);
    }
  };

  // Load real approved storefront reviews
  const loadStoreReviews = React.useCallback(async () => {
    try {
      setReviewsLoading(true);
      const res = await fetch(`/api/store/${storefront.slug}/reviews`);
      const data = await res.json();
      if (res.ok) {
        setReviewsList(data.reviews || []);
        if (data.stats) setReviewsStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load storefront reviews:", err);
    } finally {
      setReviewsLoading(false);
    }
  }, [storefront.slug]);

  React.useEffect(() => {
    if (isReviewsEnabled) {
      loadStoreReviews();
    }
  }, [isReviewsEnabled, loadStoreReviews]);

  // Handle customer review submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;

    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/store/${storefront.slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: reviewName.trim(),
          rating: reviewRating,
          comment: reviewComment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to submit review.");
        return;
      }
      setReviewSubmitFeedback(data.message || "Thank you! Your review has been submitted for approval.");
      setReviewSubmitted(true);
      setReviewComment("");
    } catch {
      alert("Network error while submitting review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f5f9] text-slate-900 font-sans pb-16">
      {/* ── 1. ROYAL BLUE HERO HEADER SECTION ───────────────────────────────── */}
      <header className="relative bg-gradient-to-b from-[#1a56db] via-[#1650d2] to-[#1244be] text-white pt-6 pb-0 shadow-md">
        {/* Top bar with Store Title */}
        <div className="mx-auto max-w-xl px-4 text-center relative">

          {/* Store Logo or Verified Badge */}
          {storefront.logoUrl && (
            <div className="mx-auto mb-2 h-14 w-14 rounded-2xl bg-white p-1 shadow-md overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={storefront.logoUrl}
                alt={storefront.name}
                className="h-full w-full object-cover rounded-xl"
              />
            </div>
          )}

          {/* Store Title */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
            {storefront.name || "DataRush"}
          </h1>

          {/* Subtitle / Tagline */}
          <p className="mt-1.5 text-xs sm:text-sm text-blue-100 font-normal leading-relaxed max-w-md mx-auto px-2">
            {storefront.description ||
              "Instant delivery, trusted service, and unbeatable prices for all networks!"}
          </p>

          {/* Contact Action Pills */}
          <div className="mt-4 flex flex-col items-center gap-2">
            {/* Row 1: Phone and WhatsApp */}
            <div className="flex items-center justify-center gap-2.5 flex-wrap">
              <a
                href={`tel:${displayPhone.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0d3ea6]/70 hover:bg-[#0d3ea6] text-white border border-white/20 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm transition shadow-sm"
              >
                <Phone className="h-3.5 w-3.5 fill-white" />
                <span>{displayPhone}</span>
              </a>

              <a
                href={waChatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0d3ea6]/70 hover:bg-[#0d3ea6] text-white border border-white/20 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm transition shadow-sm"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>

            {/* Row 2: WhatsApp Group */}
            <div>
              <a
                href={waGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0d3ea6]/70 hover:bg-[#0d3ea6] text-white border border-white/20 px-5 py-1.5 text-xs font-semibold backdrop-blur-sm transition shadow-sm"
              >
                <Users className="h-3.5 w-3.5" />
                <span>WA Group</span>
              </a>
            </div>
          </div>
        </div>

        {/* Navy Blue Strip: "WE ARE AVAILABLE •" */}
        <div className="mt-5 bg-[#0e358c] py-2 text-center text-xs font-extrabold text-white uppercase tracking-wider flex items-center justify-center gap-2 border-t border-white/10">
          <span>WE ARE AVAILABLE</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
        </div>
      </header>

      {/* ── 2. MAIN TABS BAR (Data | Order Status | Reviews) ───────────────────── */}
      <nav className="sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-sm">
        <div className="mx-auto max-w-xl flex items-center justify-around text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab("data")}
            className={`flex-1 py-3.5 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === "data"
                ? "border-[#1a56db] text-[#1a56db] font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Signal className="h-4 w-4" />
            <span>Data</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("track")}
            className={`flex-1 py-3.5 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === "track"
                ? "border-[#1a56db] text-[#1a56db] font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Order Status</span>
          </button>

          {isReviewsEnabled && (
            <button
              type="button"
              onClick={() => setActiveTab("reviews")}
              className={`flex-1 py-3.5 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
                activeTab === "reviews"
                  ? "border-[#1a56db] text-[#1a56db] font-black"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span>Reviews</span>
            </button>
          )}
        </div>
      </nav>

      {/* ── 3. DATA PACKAGES VIEW ────────────────────────────────────────────── */}
      {activeTab === "data" && (
        <main className="mx-auto max-w-xl px-3 sm:px-4 pt-4">
          {/* Network Pills Toolbar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start sm:justify-center">
            {/* MTN */}
            <button
              type="button"
              onClick={() => setActiveNetwork("MTN")}
              className={`rounded-full px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-extrabold whitespace-nowrap transition cursor-pointer shadow-sm ${
                activeNetwork === "MTN"
                  ? "bg-[#fbb014] text-slate-950 border border-[#fbb014]"
                  : "bg-white text-[#d97706] border border-[#fbb014] hover:bg-[#fffbeb]"
              }`}
            >
              MTN
            </button>

            {/* Telecel */}
            <button
              type="button"
              onClick={() => setActiveNetwork("TELECEL")}
              className={`rounded-full px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-extrabold whitespace-nowrap transition cursor-pointer shadow-sm ${
                activeNetwork === "TELECEL"
                  ? "bg-[#e60000] text-white border border-[#e60000]"
                  : "bg-white text-[#e60000] border-2 border-[#e60000] hover:bg-rose-50"
              }`}
            >
              Telecel
            </button>

            {/* AirtelTigo iShare */}
            <button
              type="button"
              onClick={() => setActiveNetwork("AIRTELTIGO_ISHARE")}
              className={`rounded-full px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-extrabold whitespace-nowrap transition cursor-pointer shadow-sm ${
                activeNetwork === "AIRTELTIGO_ISHARE" || activeNetwork === "AIRTELTIGO"
                  ? "bg-[#005fb8] text-white border border-[#005fb8]"
                  : "bg-white text-[#005fb8] border-2 border-[#005fb8] hover:bg-blue-50"
              }`}
            >
              AirtelTigo iShare
            </button>

            {/* AirtelTigo Big Time */}
            {availableNetworks.includes("AIRTELTIGO_BIGTIME") && (
              <button
                type="button"
                onClick={() => setActiveNetwork("AIRTELTIGO_BIGTIME")}
                className={`rounded-full px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-extrabold whitespace-nowrap transition cursor-pointer shadow-sm ${
                  activeNetwork === "AIRTELTIGO_BIGTIME"
                    ? "bg-[#0284c7] text-white border border-[#0284c7]"
                    : "bg-white text-[#0284c7] border-2 border-[#0284c7] hover:bg-sky-50"
                }`}
              >
                AirtelTigo Big Time
              </button>
            )}
          </div>

          {/* 3-Column Card Grid (Matching Screenshot Exactly) */}
          {filteredProducts.length === 0 ? (
            <div className="mt-8 rounded-2xl bg-white p-8 text-center text-xs text-slate-500 border border-slate-200">
              No packages currently on sale for this network. Please select another network above.
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2.5 sm:gap-3.5">
              {filteredProducts.map((pkg) => {
                const isMtn = pkg.network === "MTN";
                const isTelecel = pkg.network === "TELECEL";

                return (
                  <div
                    key={pkg.packageId}
                    className={`flex flex-col justify-between rounded-2xl bg-white shadow-sm overflow-hidden transition-all duration-150 hover:shadow-md ${
                      isMtn
                        ? "border border-amber-300 hover:border-amber-400"
                        : isTelecel
                        ? "border border-rose-300 hover:border-rose-500"
                        : "border border-blue-300 hover:border-blue-500"
                    }`}
                  >
                    {/* Top Carrier Colored Banner */}
                    <div
                      className={`py-3 px-2 flex items-center justify-center ${
                        isMtn
                          ? "bg-[#fbb014]"
                          : isTelecel
                          ? "bg-[#e60000]"
                          : "bg-[#005fb8]"
                      }`}
                    >
                      {/* Carrier Oval matching exact screenshot style */}
                      {isMtn ? (
                        <div className="w-[66px] sm:w-[72px] h-[30px] sm:h-[32px] rounded-full border-[2.5px] border-black flex items-center justify-center bg-transparent shadow-xs">
                          <span className="text-black font-black text-xs sm:text-sm tracking-tight font-sans">
                            MTN
                          </span>
                        </div>
                      ) : isTelecel ? (
                        <div className="w-[66px] sm:w-[72px] h-[30px] sm:h-[32px] rounded-full border-2 border-white flex items-center justify-center bg-white shadow-xs">
                          <span className="text-[#e60000] font-black text-[11px] sm:text-xs tracking-tight font-sans">
                            telecel
                          </span>
                        </div>
                      ) : (
                        <div className="w-[66px] sm:w-[72px] h-[30px] sm:h-[32px] rounded-full border-2 border-white flex items-center justify-center bg-white shadow-xs">
                          <span className="text-[#005fb8] font-black text-[10px] sm:text-[11px] tracking-tight font-sans">
                            AirtelTigo
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Middle: Capacity, Validity, Price */}
                    <div className="p-2 sm:p-2.5 text-center flex-1 flex flex-col justify-between">
                      <div>
                        {/* Capacity */}
                        <div
                          className={`font-black text-base sm:text-lg tracking-tight leading-none ${
                            isMtn
                              ? "text-[#e59b00]"
                              : isTelecel
                              ? "text-[#e60000]"
                              : "text-[#005fb8]"
                          }`}
                        >
                          {pkg.gbAmount}GB
                        </div>

                        {/* Validity */}
                        <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">
                          {pkg.validity || "90 days"}
                        </div>

                        {/* Price */}
                        <div className="text-xs sm:text-sm font-black text-slate-900 mt-1 font-mono">
                          GH₵{pkg.price.toFixed(2)}
                        </div>
                      </div>

                      {/* Buy Now Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenBuy(pkg)}
                        className={`mt-2 w-full py-1.5 text-center text-xs font-bold text-white rounded-lg shadow-sm transition active:scale-95 cursor-pointer ${
                          isMtn
                            ? "bg-[#f59e0b] hover:bg-[#d97706]"
                            : isTelecel
                            ? "bg-[#e60000] hover:bg-[#cc0000]"
                            : "bg-[#005fb8] hover:bg-[#004a91]"
                        }`}
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ── 4. ORDER STATUS / TRACKING TAB VIEW ──────────────────────────────── */}
      {activeTab === "track" && (
        <section className="mx-auto max-w-xl px-4 pt-5">
          <div className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-sm space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-base font-black text-slate-900">
                Track Order Status
              </h2>
              <p className="text-xs text-slate-500">
                Enter your recipient phone number or order reference to check live delivery telemetry.
              </p>
            </div>

            <form onSubmit={handleExecuteTrack} className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. 0244123456 or reference code"
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1a56db] focus:outline-none transition"
                />
              </div>

              {/* Date Filter Controls */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Filter By Order Date</span>
                  </label>
                  {(trackDate || trackStartDate) && (
                    <button
                      type="button"
                      onClick={() => handleSetTrackPreset("all")}
                      className="text-[10px] font-semibold text-rose-500 hover:underline"
                    >
                      Clear Date
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: "all", label: "All Dates" },
                    { id: "today", label: "Today" },
                    { id: "yesterday", label: "Yesterday" },
                    { id: "past7", label: "Past 7 Days" },
                    { id: "custom", label: "Custom Date" },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSetTrackPreset(preset.id as any)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition whitespace-nowrap cursor-pointer ${
                        trackDateMode === preset.id
                          ? "bg-[#1a56db] text-white border-[#1a56db] shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {trackDateMode === "custom" && (
                  <div className="pt-1">
                    <input
                      type="date"
                      value={trackDate}
                      onChange={(e) => setTrackDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 font-mono outline-none focus:border-[#1a56db]"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={trackLoading}
                className="w-full py-2.5 bg-[#1a56db] hover:bg-[#1546b3] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {trackLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Checking Status...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-3.5 w-3.5" />
                    <span>Track Order</span>
                  </>
                )}
              </button>
            </form>

            {trackError && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{trackError}</span>
              </div>
            )}

            {/* Tracking Results */}
            {trackResult && trackResult.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Found {trackResult.length} order(s)
                </span>

                {trackResult.map((ord: any) => {
                  const isDelivered =
                    ord.status === "COMPLETED" || ord.status === "DELIVERED";
                  const isCompleted = isDelivered;
                  const isProcessing =
                    ord.status === "PROCESSING" || ord.status === "PENDING";
                  const isFailed = ord.status === "FAILED";

                  return (
                    <div
                      key={ord.id || ord.reference}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-900">
                          {ord.package?.name || ord.packageName || `${ord.network || ""} ${ord.size || (ord.gbAmount ? `${ord.gbAmount}GB` : "")}`.trim()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDelivered
                              ? "bg-emerald-100 text-emerald-700"
                              : isProcessing
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 font-mono flex items-center justify-between">
                        <span>Recipient: {ord.phoneNumber || ord.phone || ord.recipient || "—"}</span>
                        <span className="font-bold">₵{typeof (ord.price ?? ord.amount) === "number" ? (ord.price ?? ord.amount).toFixed(2) : (ord.price || ord.amount || "—")}</span>
                      </div>

                      <div className="text-[10px] text-slate-400">
                        Placed on {new Date(ord.createdAt).toLocaleDateString()} at{" "}
                        {new Date(ord.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>

                      {/* Not Received / Dispute Status */}
                      {ord.deliveryReport && (
                        <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-2.5 text-xs space-y-1 mt-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sky-900">
                              Report {ord.deliveryReport.code}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-200/80 text-sky-800">
                              {ord.deliveryReport.status}
                            </span>
                          </div>
                          {ord.deliveryReport.adminResponse && (
                            <p className="text-[11px] text-sky-800 font-medium pt-0.5">
                              {ord.deliveryReport.adminResponse}
                            </p>
                          )}
                          <div className="pt-1 flex justify-end">
                            <Link
                              href={`/store/${storefront.slug}/track?query=${encodeURIComponent(ord.reference || ord.phoneNumber || ord.phone || "")}`}
                              className="text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:underline inline-flex items-center gap-1"
                            >
                              <span>View Full Report &amp; Evidence</span>
                              <span>→</span>
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* Not Received Help Button */}
                      {!ord.deliveryReport && isCompleted && (
                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Not received your data?</span>
                          <Link
                            href={`/store/${storefront.slug}/track?query=${encodeURIComponent(ord.reference || ord.phoneNumber || ord.phone || "")}`}
                            className="text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1"
                          >
                            <span>Report Issue</span>
                            <span>→</span>
                          </Link>
                        </div>
                      )}

                      {isProcessing && (
                        <div className="pt-1 flex justify-end">
                          <a
                            href={waChatUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-[#1a56db] hover:underline flex items-center gap-1"
                          >
                            <span>Need help with this order?</span>
                            <span>→</span>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── 5. REVIEWS TAB VIEW ──────────────────────────────────────────────── */}
      {isReviewsEnabled && activeTab === "reviews" && (
        <section className="mx-auto max-w-xl px-4 pt-5 space-y-4">
          {/* Rating Summary Card */}
          <div className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-sm text-center space-y-2">
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-5 w-5 fill-amber-400 text-amber-400" />
              ))}
            </div>

            <div className="text-2xl font-black text-slate-900">
              {reviewsStats.totalCount > 0 ? reviewsStats.averageRating.toFixed(1) : "5.0"} / 5.0
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {reviewsStats.totalCount > 0 ? (
                <>Based on <strong>{reviewsStats.totalCount} verified customer review{reviewsStats.totalCount === 1 ? "" : "s"}</strong>.</>
              ) : (
                <>Verified customer rating for this storefront.</>
              )}
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setReviewModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2 text-xs font-bold text-amber-900 transition cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>Leave a Review</span>
              </button>
            </div>
          </div>

          {/* Testimonial Cards */}
          <div className="space-y-3">
            {reviewsLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
                <p className="text-xs text-slate-400 mt-2">Loading customer reviews...</p>
              </div>
            ) : reviewsList.length > 0 ? (
              reviewsList.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                        {rev.customerName ? rev.customerName[0].toUpperCase() : "C"}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                          <span>{rev.customerName}</span>
                        </div>
                        <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Verified Store Customer</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3 w-3 ${
                            s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                    &ldquo;{rev.comment}&rdquo;
                  </p>

                  <div className="text-[10px] text-slate-400 font-mono text-right">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center rounded-2xl bg-white border border-slate-200/90 p-6 space-y-2">
                <Star className="h-8 w-8 text-amber-300 mx-auto fill-amber-100" />
                <h4 className="text-sm font-bold text-slate-800">No reviews yet</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Be the first customer to share your experience with this storefront!
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-1.5 text-xs font-bold text-blue-700 transition cursor-pointer"
                  >
                    <span>Write First Review</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── 6. INSTANT CHECKOUT POPUP MODAL ──────────────────────────────────── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={handleCloseBuy}
          />

          <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl z-10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white ${
                    selectedProduct.network === "MTN"
                      ? "bg-[#fbb014] text-slate-950"
                      : selectedProduct.network === "TELECEL"
                      ? "bg-[#e60000]"
                      : "bg-[#005fb8]"
                  }`}
                >
                  {selectedProduct.network}
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Instant Checkout
                </span>
              </div>

              <button
                type="button"
                onClick={handleCloseBuy}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Selected Bundle Summary */}
            {(() => {
              const bundlePrice = selectedProduct.price;
              const fee = Math.round(bundlePrice * 0.02 * 100) / 100;
              const total = Math.round((bundlePrice + fee) * 100) / 100;
              return (
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-base font-black text-slate-900 leading-tight">
                      {selectedProduct.gbAmount}GB Data Plan
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {selectedProduct.validity || "90 Days Validity · Never Expires"}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Subtotal</span>
                    <span className="text-lg font-black text-slate-900 font-mono">
                      GH₵{bundlePrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Checkout Form */}
            <form onSubmit={handleProceedCheckout} className="space-y-3.5">
              {/* Recipient Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Recipient Phone Number</span>
                  <span className="text-[10px] font-normal text-slate-400">Ghana SIM</span>
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  maxLength={10}
                  required
                  autoFocus
                  placeholder="0241234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 outline-none transition"
                />

                {/* Carrier detection badge */}
                {carrierInfo && (
                  <div className="pt-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>✓ {carrierInfo.label} number recognized</span>
                  </div>
                )}
              </div>

              {/* Customer Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>
                    Email Address <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] font-medium text-slate-500">For Paystack receipt</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="your-email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 outline-none transition"
                />
              </div>

              {/* Price Breakdown Telemetry (Below Inputs) */}
              {(() => {
                const bundlePrice = selectedProduct.price;
                const fee = Math.round(bundlePrice * 0.02 * 100) / 100;
                const total = Math.round((bundlePrice + fee) * 100) / 100;
                return (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between text-slate-500">
                      <span>Bundle Value</span>
                      <span className="font-bold text-slate-900">GH₵{bundlePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>MoMo Gateway Clearance (2%)</span>
                      <span className="font-bold text-slate-900">+GH₵{fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-black text-slate-900 pt-1.5 border-t border-slate-200 text-sm">
                      <span className="uppercase text-[11px] text-slate-500">Total Settlement Due</span>
                      <span className="text-[#1a56db] text-base">GH₵{total.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}

              {checkoutError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 flex items-start gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Pay Button */}
              {(() => {
                const bundlePrice = selectedProduct.price;
                const fee = Math.round(bundlePrice * 0.02 * 100) / 100;
                const total = Math.round((bundlePrice + fee) * 100) / 100;
                return (
                  <button
                    type="submit"
                    disabled={checkingOut}
                    className="w-full py-3 bg-[#f59e0b] hover:bg-[#d97706] text-white font-extrabold text-sm rounded-xl shadow-md shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {checkingOut ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Connecting MoMo...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        <span>Pay GH₵{total.toFixed(2)} via MoMo</span>
                      </>
                    )}
                  </button>
                );
              })()}

              {/* Security Footnote */}
              <div className="text-center pt-1 space-y-1">
                <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  <span>256-bit Secure Mobile Money · Instant SIM Crediting</span>
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Supported: MTN MoMo · Telecel Cash · AT Money
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. LEAVE A REVIEW MODAL ─────────────────────────────────────────── */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setReviewModalOpen(false)}
          />

          <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">
                Write a Store Review
              </h3>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {reviewSubmitted ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">Thank you for your feedback!</h4>
                <p className="text-xs text-slate-500">
                  {reviewSubmitFeedback || "Your review has been submitted and will appear once approved by the store owner."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReviewModalOpen(false);
                    setReviewSubmitted(false);
                  }}
                  className="mt-3 px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  Close
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleReviewSubmit}
                className="space-y-3"
              >
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Your Rating
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setReviewRating(s)}
                        className="p-1 hover:scale-110 transition"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            s <= reviewRating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samuel K."
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#1a56db]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Comment</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Share your experience with delivery speed, prices, etc."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-[#1a56db] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full py-2.5 bg-[#1a56db] hover:bg-[#1546b3] disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2"
                >
                  {submittingReview ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Submitting Review...</span>
                    </>
                  ) : (
                    "Submit Review"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

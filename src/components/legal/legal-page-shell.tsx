"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import {
  FileText,
  ShieldCheck,
  RotateCcw,
  Printer,
  ChevronRight,
  ExternalLink,
  Mail,
  Phone,
  Clock,
  ArrowRight,
  ArrowLeft,
  Store,
} from "lucide-react";

interface LegalPageShellProps {
  currentSlug: "terms" | "refund-policy" | "privacy";
  title: string;
  badge: string;
  lastUpdated: string;
  description: string;
  children: React.ReactNode;
}

const LEGAL_TABS = [
  {
    slug: "terms" as const,
    href: "/terms",
    label: "Terms of Service",
    icon: FileText,
  },
  {
    slug: "refund-policy" as const,
    href: "/refund-policy",
    label: "Refund Policy",
    icon: RotateCcw,
  },
  {
    slug: "privacy" as const,
    href: "/privacy",
    label: "Privacy Policy",
    icon: ShieldCheck,
  },
];

function OriginStorefrontHeader() {
  const searchParams = useSearchParams();
  const fromSlug = searchParams?.get("from");
  const storeName = searchParams?.get("name");

  if (!fromSlug) {
    return (
      <Link
        href="/store"
        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
      >
        Storefront Directory
      </Link>
    );
  }

  const returnUrl = `/${fromSlug}`;

  return (
    <Link
      href={returnUrl}
      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-950/40 transition-colors"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      <span>Back to {storeName || fromSlug}</span>
    </Link>
  );
}

function OriginStorefrontBanner() {
  const searchParams = useSearchParams();
  const fromSlug = searchParams?.get("from");
  const storeName = searchParams?.get("name");

  if (!fromSlug) return null;
  const returnUrl = `/${fromSlug}`;

  return (
    <div className="border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-900 dark:text-emerald-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            Viewing customer terms &amp; conditions for <strong>{storeName || fromSlug}</strong> storefront.
          </span>
        </div>
        <Link
          href={returnUrl}
          className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-white transition-colors shrink-0 underline underline-offset-2"
        >
          <span>Return to Storefront</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function OriginStorefrontTabs({ currentSlug }: { currentSlug: "terms" | "refund-policy" | "privacy" }) {
  const searchParams = useSearchParams();
  const fromSlug = searchParams?.get("from");
  const storeName = searchParams?.get("name");

  const querySuffix = fromSlug
    ? `?from=${encodeURIComponent(fromSlug)}${storeName ? `&name=${encodeURIComponent(storeName)}` : ""}`
    : "";

  return (
    <div className="border-t border-slate-200/60 dark:border-white/[0.04] bg-slate-50/50 dark:bg-slate-950/40">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8 no-scrollbar">
        {LEGAL_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentSlug === tab.slug;
          return (
            <Link
              key={tab.slug}
              href={`${tab.href}${querySuffix}`}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-400/40"
                  : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function OriginStorefrontCtaCard() {
  const searchParams = useSearchParams();
  const fromSlug = searchParams?.get("from");
  const storeName = searchParams?.get("name");

  if (!fromSlug) return null;
  const returnUrl = `/${fromSlug}`;

  return (
    <div className="mt-8 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 p-6 sm:p-8 text-center space-y-3">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <Store className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Ready to purchase from {storeName || fromSlug}?
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Return to the storefront anytime to pick your data package and complete your instant Mobile Money checkout.
        </p>
      </div>
      <div className="pt-2 flex justify-center">
        <Link
          href={returnUrl}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-xs sm:text-sm font-black text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to {storeName || fromSlug} Storefront</span>
        </Link>
      </div>
    </div>
  );
}

export function LegalPageShell({
  currentSlug,
  title,
  badge,
  lastUpdated,
  description,
  children,
}: LegalPageShellProps) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white dark:bg-[#070c14] dark:text-slate-100 flex flex-col justify-between">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden print:hidden">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-600/10 via-teal-600/10 to-transparent blur-3xl opacity-70 dark:opacity-80" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-cyan-600/10 via-emerald-900/5 to-transparent blur-3xl opacity-60 dark:opacity-70" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 blur-3xl rounded-full" />
      </div>

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-white/[0.08] dark:bg-slate-950/70 print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/store"
              className="flex items-center gap-2 group transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <BrandLogo size="sm" showTagline={true} />
            </Link>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Legal &amp; Compliance
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handlePrint}
              type="button"
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              title="Print document"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
            <Suspense fallback={null}>
              <OriginStorefrontHeader />
            </Suspense>
            <Link
              href="/login"
              className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-600 dark:bg-white/10 dark:hover:bg-emerald-600 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="hidden sm:inline-flex rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition-colors"
            >
              Register
            </Link>
          </div>
        </div>

        {/* Policy Tab Switcher */}
        <Suspense fallback={null}>
          <OriginStorefrontTabs currentSlug={currentSlug} />
        </Suspense>
      </header>

      {/* Origin Storefront Banner if navigated from a storefront */}
      <Suspense fallback={null}>
        <OriginStorefrontBanner />
      </Suspense>

      {/* Hero Header */}
      <div className="relative z-10 border-b border-slate-200/70 bg-gradient-to-b from-white via-slate-50 to-slate-100/50 px-4 py-10 sm:px-6 lg:px-8 dark:border-white/[0.06] dark:from-slate-950 dark:via-slate-900/80 dark:to-[#070c14]">
        <div className="mx-auto max-w-4xl text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              {badge}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-400">
              <Clock className="h-3 w-3 text-emerald-500" />
              {lastUpdated}
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white">
            {title}
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      {/* Document Content */}
      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/40">
          {children}
        </div>

        {/* Quick Contact & Escalation Box */}
        <div className="mt-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 sm:p-8 dark:border-emerald-500/20 dark:bg-emerald-950/15">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Need Assistance or Legal Clarification?</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Our support team is active daily from 5:00 AM to 11:59 PM GMT (Monday – Sunday).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="mailto:support@cleandatapacks.com"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>support@cleandatapacks.com</span>
              </a>
              <a
                href="https://wa.me/233242075374"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-500" />
                <span>0242075374</span>
              </a>
            </div>
          </div>
        </div>

        {/* Return to Origin Storefront CTA Card */}
        <Suspense fallback={null}>
          <OriginStorefrontCtaCard />
        </Suspense>
      </main>

      {/* Global Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 bg-white/70 px-4 py-8 sm:px-6 lg:px-8 text-xs text-slate-500 dark:border-white/[0.06] dark:bg-slate-950/60 dark:text-slate-400 print:hidden">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              cleandatapacks.com © 2026
            </span>
            <span>·</span>
            <span>All Rights Reserved</span>
            <span>·</span>
            <a
              href="https://wa.me/233507904981"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors group"
            >
              <span>Powered by</span>
              <span className="font-bold text-slate-800 group-hover:underline dark:text-slate-200">
                CrazyTech Enterprise
              </span>
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs">
            <Link
              href="/terms"
              className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors ${
                currentSlug === "terms" ? "font-bold text-emerald-600 dark:text-emerald-400" : ""
              }`}
            >
              Terms of Service
            </Link>
            <span>·</span>
            <Link
              href="/refund-policy"
              className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors ${
                currentSlug === "refund-policy" ? "font-bold text-emerald-600 dark:text-emerald-400" : ""
              }`}
            >
              Refund Policy
            </Link>
            <span>·</span>
            <Link
              href="/privacy"
              className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors ${
                currentSlug === "privacy" ? "font-bold text-emerald-600 dark:text-emerald-400" : ""
              }`}
            >
              Privacy Policy
            </Link>
            <span>·</span>
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Paystack PCI-DSS Secured
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

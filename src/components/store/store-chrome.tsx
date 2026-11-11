"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ShoppingBag,
  Clock,
  Menu as MenuIcon,
  X,
  ChevronRight,
  Home,
  ChevronDown,
  UserRound,
  Send,
  ShieldCheck,
  Zap,
  Activity,
  Radio,
  Lock,
  Headphones,
  Signal,
  Check,
  ArrowLeft,
} from "lucide-react";
import { NetworkLogo } from "./network-logo";
import { NETWORK_BRANDS, networkHref, storeHref } from "./brands";
import { buildWhatsAppLink } from "@/lib/storefront-utils";
import type { NetworkProvider } from "@/lib/types";

export interface StoreChromeProps {
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  whatsapp?: string | null;
  whatsappGroupLink?: string | null;
  email?: string | null;
  location?: string | null;
  contactText?: string | null;
  whatsappLabel?: string | null;
  notice?: string | null;
  networks: NetworkProvider[];
  children: React.ReactNode;
}

function whatsappLink(number: string | null | undefined, text?: string): string | null {
  return buildWhatsAppLink(number, text);
}

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function BrandDot({ network }: { network: NetworkProvider }) {
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#162740] shadow-sm ${NETWORK_BRANDS[network].tile}`}
    >
      <NetworkLogo network={network} className="h-full w-full object-contain" />
    </span>
  );
}

function AppearanceToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label="Toggle visual theme"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-[#162740] bg-[#070d18] transition-colors ${className} cursor-pointer`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[#00df82] shadow-[0_0_8px_#00df82] transition-transform ${dark ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}

function StoreMark({
  name,
  logoUrl,
  size = "h-9 w-9",
}: {
  name: string;
  logoUrl?: string | null;
  size?: string;
}) {
  return (
    <span
      className={`relative inline-flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#0b1322] to-[#070d18] ring-1 ring-[#00df82]/30 shadow-md`}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-black text-[#00df82] tracking-wider">{name.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}

export function StoreChrome(props: StoreChromeProps) {
  const {
    name,
    slug,
    description,
    logoUrl,
    whatsapp,
    whatsappGroupLink,
    email,
    location,
    contactText,
    whatsappLabel,
    notice,
    networks,
    children,
  } = props;
  const pathname = usePathname();
  const isHome = pathname === `/${slug}` || pathname === `/store/${slug}`;

  const [shopOpen, setShopOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [promoVisible, setPromoVisible] = React.useState(true);
  const [chatBoxOpen, setChatBoxOpen] = React.useState(false);
  const [chatMessage, setChatMessage] = React.useState("");

  // Listen for custom open-store-drawer event fired from the hero header button
  React.useEffect(() => {
    const handleOpen = () => setDrawerOpen(true);
    window.addEventListener("open-store-drawer", handleOpen);
    return () => window.removeEventListener("open-store-drawer", handleOpen);
  }, []);

  const wa = whatsappLink(whatsapp);
  const bannerText = notice?.trim() || "";

  return (
    <div className="min-h-screen bg-[#f3f5f9] text-slate-900 transition-colors pb-16 sm:pb-0 selection:bg-amber-400 selection:text-slate-900">
      {/* Optional Top Announcement Bar (if store owner set a custom notice) */}
      {promoVisible && bannerText && (
        <div
          className="relative bg-[#0d2f8a] text-white px-4 py-1.5 text-xs font-medium overflow-hidden border-b border-white/10"
          role="region"
          aria-label="Store Announcement"
        >
          <div className="mx-auto max-w-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-hidden text-xs">
              <span className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 shrink-0">
                Notice
              </span>
              <p className="truncate text-[11px] sm:text-xs text-blue-100">
                {bannerText}
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss banner"
              onClick={() => setPromoVisible(false)}
              className="rounded-full p-1 text-blue-200 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Sub-page Header: Only displayed on subpages (e.g. /track, /order/ref) so home is 100% true to screenshot */}
      {!isHome && (
        <header className="sticky top-0 z-40 bg-[#1a56db] text-white px-4 py-3 shadow-md">
          <div className="mx-auto flex max-w-xl items-center justify-between">
            <Link
              href={storeHref(slug)}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-100 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Store</span>
            </Link>

            <span className="font-extrabold text-sm tracking-tight text-white">
              {name}
            </span>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              title="Open Menu"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>
        </header>
      )}

      {/* Main Page Canvas */}
      <main className="relative z-10">{children}</main>

      {/* ── CLEAN RESELLER FOOTER ───────────────────────────────────────────── */}
      <footer className="mt-16 px-4 pb-12 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-xl py-8 space-y-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <StoreMark name={name} logoUrl={logoUrl} size="h-10 w-10" />
              <div>
                <h3 className="text-base font-black text-slate-900">{name}</h3>
                <span className="text-xs text-[#1a56db] font-semibold flex items-center gap-1 justify-center sm:justify-start">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Verified Telecom Merchant
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-bold hover:bg-emerald-100 transition"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5" />
                  <span>WhatsApp Help</span>
                </a>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {description ||
              "Instant automated non-expiry telecom data bundles delivered directly to your SIM. Secure Mobile Money clearing."}
          </p>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <p>
                {name} © {new Date().getFullYear()} · All Rights Reserved
              </p>
              <span>·</span>
              <a
                href="https://wa.me/233242075374"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-600 transition-colors group"
              >
                <span>Powered by</span>
                <span className="font-semibold text-slate-700 group-hover:underline">
                  CleanDataPacks
                </span>
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/terms?from=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}`}
                className="hover:text-slate-700 transition"
              >
                Terms
              </Link>
              <span>·</span>
              <Link
                href={`/refund-policy?from=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}`}
                className="hover:text-slate-700 transition"
              >
                Refunds
              </Link>
              <span>·</span>
              <Link
                href={`/privacy?from=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}`}
                className="hover:text-slate-700 transition"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── CONCIERGE CHAT WIDGET ────────────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
        {chatBoxOpen && (
          <div
            role="dialog"
            aria-label="Chat with Admin"
            className="w-80 sm:w-96 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl transition-all duration-200 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <StoreMark name={name} logoUrl={logoUrl} size="h-8 w-8" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Direct Store Assistance
                  </h3>
                  <p className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online for {name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close chat box"
                onClick={() => setChatBoxOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = chatMessage.trim();
                const target = trimmed ? whatsappLink(whatsapp, trimmed) : wa;
                if (target) {
                  window.open(target, "_blank", "noopener,noreferrer");
                  setChatBoxOpen(false);
                  setChatMessage("");
                }
              }}
              className="mt-3 space-y-3"
            >
              <textarea
                rows={3}
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type your message or order reference..."
                autoFocus
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1a56db] focus:outline-none transition"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">
                  Opens WhatsApp
                </span>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
                >
                  <Send className="h-3 w-3" />
                  <span>Send Message</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {wa && (
          <div className="flex items-center gap-2">
            {!chatBoxOpen && (contactText || whatsappLabel) && (
              <button
                type="button"
                onClick={() => setChatBoxOpen(true)}
                className="hidden sm:inline-flex items-center rounded-full border border-slate-200/90 bg-white/95 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-md backdrop-blur-xs hover:bg-white hover:text-slate-900 transition cursor-pointer"
              >
                {whatsappLabel || contactText}
              </button>
            )}
            <button
              type="button"
              aria-label="Chat on WhatsApp"
              onClick={() => setChatBoxOpen((v) => !v)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-500/30 transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              {chatBoxOpen ? <X className="h-5 w-5" /> : <WhatsAppIcon className="h-6 w-6" />}
            </button>
          </div>
        )}
      </div>

      {/* ── SLIDE-OUT MENU DRAWER ─────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-[85%] max-w-sm flex-col overflow-y-auto bg-white border-l border-slate-200 shadow-2xl animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#1a56db] text-white">
              <div className="flex items-center gap-3">
                <StoreMark name={name} logoUrl={logoUrl} size="h-9 w-9" />
                <div>
                  <h2 className="text-sm font-black text-white">{name}</h2>
                  <span className="flex items-center gap-1 text-[10px] text-blue-100 font-medium">
                    Verified Telecom Reseller
                  </span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Navigation
              </span>

              <Link
                href={storeHref(slug)}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 transition"
              >
                <div className="h-8 w-8 rounded-lg bg-[#1a56db]/10 text-[#1a56db] flex items-center justify-center">
                  <Signal className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900">Buy Data Packages</div>
                  <div className="text-[10px] text-slate-500">Browse all carrier plans</div>
                </div>
              </Link>

              <Link
                href={storeHref(slug, "track")}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 transition"
              >
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900">Track Order Status</div>
                  <div className="text-[10px] text-slate-500">Live USSD dispatch check</div>
                </div>
              </Link>
            </div>

            {/* Carrier Networks List */}
            <div className="px-4 py-2 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Carrier Networks
              </span>

              <div className="space-y-1.5">
                {networks.map((n) => {
                  const brand = NETWORK_BRANDS[n];
                  return (
                    <Link
                      key={n}
                      href={networkHref(slug, n)}
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center p-1.5 shadow-xs ${brand.tile}`}>
                          <NetworkLogo network={n} className="h-full w-full object-contain" />
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          {brand.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-[#1a56db]">
                        View →
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Drawer Bottom Contact */}
            <div className="mt-auto p-4 border-t border-slate-100 space-y-2">
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  <span>Chat on WhatsApp</span>
                </a>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

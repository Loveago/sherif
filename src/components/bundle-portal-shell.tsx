"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Zap,
  ShoppingCart,
  ClipboardList,
  Users,
  Package,
  Wallet,
  ArrowLeftRight,
  ShieldCheck,
  Code2,
  Store,
  Layers,
  BarChart3,
  Shield,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  Headphones,
  Menu,
  X,
  LogOut,
  ExternalLink,
  Share2,
  Sparkles,
  FileWarning,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useTheme } from "next-themes";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { AnnouncementBar } from "@/components/announcement-bar";
import { SystemChatWidget } from "@/components/chat/system-chat-widget";
import { cn } from "@/lib/utils";
import { formatGHS } from "@/lib/types";
import type { AuthUser } from "@/lib/types";

interface BundlePortalShellProps {
  user: AuthUser;
  children: React.ReactNode;
  announcement?: string | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/buy-now", label: "Buy Bundle", icon: Zap },
  { href: "/dashboard/send", label: "Bulk Order", icon: ShoppingCart },
  { href: "/dashboard/orders", label: "Orders", icon: ClipboardList },
  { href: "/dashboard/not-received", label: "Not Received", icon: FileWarning },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/packages", label: "Products", icon: Package },
  { href: "/dashboard/services", label: "Other Services", icon: Sparkles },
  { href: "/dashboard/billing", label: "Wallet & Billing", icon: Wallet },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/dashboard/mtn-verification", label: "MTN Verification", icon: ShieldCheck },
  { href: "/dashboard/api", label: "API", icon: Code2 },
  { href: "/dashboard/storefront", label: "Storefront", icon: Store },
  { href: "/dashboard/affiliate", label: "Affiliate Network", icon: Share2 },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin", label: "Admin Center", icon: Shield, adminOnly: true },
];

const BOTTOM_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/buy-now", label: "Buy", icon: Zap },
  { href: "/dashboard/send", label: "Bulk", icon: ShoppingCart },
  { href: "/dashboard/orders", label: "Orders", icon: ClipboardList },
  { href: "/dashboard/billing", label: "Wallet", icon: Wallet },
];

export function BundlePortalShell({ user, announcement, children }: BundlePortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = user.role === "ADMIN" || user.role === "MANAGER";
  const isSubAgent = Boolean(user.referredById);

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    // Sub-agents do not have access to Affiliate Network or Developer API
    if (isSubAgent && (item.href === "/dashboard/affiliate" || item.href === "/dashboard/api")) {
      return false;
    }
    return true;
  });

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return "BP";
  };

  const isDarkMode = mounted && (resolvedTheme === "dark" || theme === "dark");

  return (
    <div className="min-h-screen bg-[#f3f6fa] dark:bg-[#060b13] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 antialiased selection:bg-indigo-500 selection:text-white">
      {/* ── GLOBAL ANNOUNCEMENT / NOTIFICATION BAR ─────────────────────────── */}
      {announcement && <AnnouncementBar text={announcement} />}

      {/* ── TOP BAR (MATCHING SCREENSHOT) ─────────────────────────────────── */}
      <header className="h-16 border-b border-slate-200 dark:border-[#14233a] bg-white/90 dark:bg-[#070d18]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-2.5 sm:px-4 lg:px-6 w-full max-w-full">
        {/* Left: Mobile trigger & Brand */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 sm:p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0e192c] shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <BrandLogo size="sm" showTagline={true} href="/dashboard" />
        </div>

        {/* Center: Search Bar */}
        <div className="hidden md:flex items-center max-w-md w-full mx-6">
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bundles, orders, or customers..."
              className="w-full bg-slate-100 dark:bg-[#09121f] border border-slate-200 dark:border-[#14233a] rounded-xl pl-9 pr-12 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-slate-200 dark:bg-[#14233a] text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono pointer-events-none">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Actions, Theme, Mobile Balance, User Pill */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Quick Mobile Balance Pill */}
          <Link
            href="/dashboard/billing"
            className="flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-mono font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap shrink-0"
            title="Wallet Balance"
          >
            <Wallet className="h-3 w-3 shrink-0" />
            <span>{formatGHS(user.balance || 0)}</span>
          </Link>

          {/* Notification Center */}
          <NotificationCenter user={user} admin={isAdmin} announcement={announcement} />

          {/* Theme Toggle (Sun / Moon) - visible on tablet & desktop */}
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDarkMode ? "light" : "dark")}
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#09121f] text-slate-600 dark:text-cyan-300 hover:border-indigo-500 transition-colors"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-500" />}
            </button>
          )}

          {/* User Profile Pill */}
          <div className="flex items-center gap-1 sm:gap-2.5 pl-1 sm:pl-2 border-l border-slate-200 dark:border-[#14233a]">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:pointer-events-none shrink-0"
              title="View account"
            >
              <div className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 text-white font-black text-[10px] sm:text-xs shadow-md shadow-indigo-500/25">
                {getUserInitials(user.name, user.email)}
              </div>
            </button>

            <div className="hidden sm:flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {user.name || "Super Admin"}
                </span>
                <span className="rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/40 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="hidden sm:flex p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors ml-0.5 sm:ml-1"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── BODY: SIDEBAR + CONTENT ────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] shrink-0 overflow-y-auto p-3.5 space-y-6">
          {/* Main Navigation List */}
          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group",
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/25 border border-indigo-400/30"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0c1524]"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-white fill-white/20"
                        : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                    )}
                  />
                  <span className="truncate flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Need Help? Contact Support Card */}
          <div className="mt-auto pt-4 space-y-3">
            <Link
              href="/admin/chat"
              className="group flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-[#14233a] bg-slate-50 dark:bg-[#0a1322] hover:border-indigo-500/40 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-500/10 group-hover:scale-105 transition-transform">
                  <Headphones className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Need Help?</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Contact Support</div>
                </div>
              </div>
              <span className="text-xs text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all">
                →
              </span>
            </Link>

            <div className="pt-2 border-t border-slate-200/50 dark:border-white/5 text-center">
              <a
                href="https://wa.me/233242075374"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors group"
              >
                <span>Powered by</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300 group-hover:text-[#00df82] underline underline-offset-2">
                  CleanDataPacks
                </span>
              </a>
            </div>
          </div>
        </aside>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-200">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex flex-col w-[85%] max-w-xs bg-white dark:bg-[#070d18] border-r border-slate-200 dark:border-[#14233a] p-4 space-y-4 z-10 overflow-y-auto shadow-2xl">
              {/* Header with user info */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#14233a]">
                <BrandLogo size="sm" />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* User Account Brief */}
              <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-slate-50 dark:bg-[#0a1322] p-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#00df82] to-[#22d3ee] text-slate-950 font-black text-xs shadow-md shadow-[#00df82]/20">
                  {getUserInitials(user.name, user.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {user.name || "Subscriber"}
                    </p>
                    <span className="rounded bg-[#00df82]/15 text-[#00df82] border border-[#00df82]/30 px-1 py-0.2 text-[9px] font-black uppercase tracking-wider shrink-0">
                      {user.role}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[#00df82] font-black mt-0.5">
                    {formatGHS(user.balance || 0)}
                  </p>
                </div>
              </div>

              <nav className="space-y-1">
                {visibleNavItems.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold min-h-[44px]",
                        isActive
                          ? "bg-[#00df82] text-slate-950 font-black shadow-md shadow-[#00df82]/20"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0a1220]"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-2 border-t border-slate-200 dark:border-[#14233a] mt-auto space-y-1">
                {mounted && (
                  <button
                    type="button"
                    onClick={() => setTheme(isDarkMode ? "light" : "dark")}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0a1220] transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      {isDarkMode ? <Moon className="h-4 w-4 text-cyan-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
                      <span>{isDarkMode ? "Dark Mode" : "Light Mode"}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Switch</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
                <div className="pt-2 text-center">
                  <a
                    href="https://wa.me/233242075374"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-[#00df82] transition-colors group"
                  >
                    <span>Powered by</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300 group-hover:text-[#00df82] underline underline-offset-2">
                      CleanDataPacks
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAIN PAGE VIEWPORT (with bottom padding for mobile nav) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 lg:p-6 pb-28 lg:pb-6 flex flex-col justify-between w-full max-w-full">
          <div className="max-w-7xl mx-auto space-y-6 w-full">
            {children}
          </div>

          {/* Desktop/Mobile Global Bottom Footer */}
          <footer className="mt-12 border-t border-slate-200/70 dark:border-white/5 pt-5 text-xs text-slate-500 dark:text-slate-400 w-full max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <span>CleanDataPacks © {new Date().getFullYear()} · All Rights Reserved</span>
                <span>·</span>
                <Link href="/terms" target="_blank" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Terms
                </Link>
                <span>·</span>
                <Link href="/refund-policy" target="_blank" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Refunds
                </Link>
                <span>·</span>
                <Link href="/privacy" target="_blank" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Privacy
                </Link>
              </div>
              <a
                href="https://wa.me/233242075374"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 font-medium transition-colors group"
              >
                <span>Powered by</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2">
                  CleanDataPacks
                </span>
              </a>
            </div>
          </footer>
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION BAR (FIXED FOR ONE-THUMB OPERABILITY) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#070d18]/95 backdrop-blur-xl border-t border-slate-200 dark:border-[#14233a] px-1 pt-1.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-[0_-5px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_-5px_25px_rgba(0,0,0,0.5)]">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-0.5 px-1 rounded-xl transition-all min-w-[52px] text-center",
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-lg transition-all",
                  isActive && "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold mt-0.5 tracking-tight leading-none truncate max-w-[62px]",
                  isActive ? "font-black text-indigo-600 dark:text-indigo-400" : "font-medium"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Floating System Support Chat Bubble */}
      <SystemChatWidget user={user} />
    </div>
  );
}

export { BundlePortalShell as CleanDataPacksShell, BundlePortalShell as CommonTechShell };
export type { BundlePortalShellProps as CleanDataPacksShellProps, BundlePortalShellProps as CommonTechShellProps };

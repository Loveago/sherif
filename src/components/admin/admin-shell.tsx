"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  Wallet,
  Banknote,
  MessageSquare,
  Ticket,
  Store,
  Package,
  Receipt,
  CreditCard,
  FileBarChart,
  Code2,
  Settings,
  ScrollText,
  Activity,
  Menu,
  X,
  LogOut,
  ExternalLink,
  Bell,
  ChevronRight,
  PlusCircle,
  Clock,
  ShieldAlert,
  Search,
  Sun,
  Moon,
  Share2,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useToast } from "@/components/toast";
import { useNavBadges } from "@/components/app-nav";
import { ManualCreditDialog } from "@/components/admin/manual-credit-dialog";
import { SystemChatWidget } from "@/components/chat/system-chat-widget";
import { useTheme } from "next-themes";
import { AnnouncementBar } from "@/components/announcement-bar";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/types";

interface AdminShellProps {
  user: AuthUser;
  children: React.ReactNode;
  allowedNavHrefs?: string[];
  supportWhatsapp?: string;
  announcement?: string;
}

interface NavLinkItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: string;
  highlight?: boolean;
}

interface NavGroup {
  title: string;
  items: NavLinkItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "COMMAND HUB",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/notifications", label: "Broadcast Desk", icon: Bell },
      { href: "/admin/reports", label: "Analytics & Reports", icon: FileBarChart },
      { href: "/admin/audit-logs", label: "Audit Trails", icon: ScrollText },
    ],
  },
  {
    title: "TELECOM & DISPATCH",
    items: [
      { href: "/admin/orders", label: "Live Orders Desk", icon: Layers, badgeKey: "/admin/orders" },
      { href: "/admin/order-api-logs", label: "Provider API Logs", icon: Activity },
      { href: "/admin/mtn-verification", label: "MTN Verification", icon: ShieldCheck, badgeKey: "/admin/mtn-verification" },
      { href: "/admin/delivery-reports", label: "Disputes & Reports", icon: AlertTriangle, badgeKey: "/admin/delivery-reports" },
      { href: "/admin/exports", label: "Batch Data Exports", icon: FileSpreadsheet },
    ],
  },
  {
    title: "FINANCE & SETTLEMENTS",
    items: [
      { href: "/admin/billing", label: "Billing & MoMo", icon: CreditCard },
      { href: "/admin/wallets", label: "Reseller Wallets", icon: Wallet },
      { href: "/admin/storefronts/withdrawals", label: "Storefront Payouts", icon: Banknote, badgeKey: "/admin/storefronts/withdrawals" },
    ],
  },
  {
    title: "CATALOGUE & RATES",
    items: [
      { href: "/admin/packages", label: "Data Packages", icon: Package },
      { href: "/admin/pricing", label: "Pricing Profiles", icon: Receipt },
    ],
  },
  {
    title: "MERCHANTS & USERS",
    items: [
      { href: "/admin/users", label: "User Management", icon: Users },
      { href: "/admin/affiliates", label: "Affiliate Network", icon: Share2 },
      { href: "/admin/users/signup-codes", label: "Invitation Codes", icon: Ticket },
      { href: "/admin/storefronts", label: "Storefront Directory", icon: Store },
      { href: "/admin/chat", label: "Support Live Desk", icon: MessageSquare },
    ],
  },
  {
    title: "SYSTEM & ENGINE",
    items: [
      { href: "/admin/settings", label: "Platform Settings", icon: Settings },
      { href: "/admin/api", label: "Developer API Keys", icon: Code2 },
    ],
  },
];

export function AdminShell({ user, children, allowedNavHrefs, supportWhatsapp, announcement }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const badges = useNavBadges(true);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [mounted, setMounted] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [creditDialogOpen, setCreditDialogOpen] = React.useState(false);
  const [alertsDropdownOpen, setAlertsDropdownOpen] = React.useState(false);
  const [gmtTime, setGmtTime] = React.useState<string>("");
  const [halted, setHalted] = React.useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Live GMT Clock
  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setGmtTime(
        now.toLocaleTimeString("en-GB", {
          timeZone: "UTC",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " GMT"
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check Killswitch / Halt status
  React.useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.order_processing_halted === "true") {
          setHalted(true);
        }
      })
      .catch(() => {});
  }, []);

  // Close mobile drawer on navigation
  React.useEffect(() => {
    setMobileMenuOpen(false);
    setAlertsDropdownOpen(false);
  }, [pathname]);

  const totalAlertsCount =
    (badges["/admin/orders"]?.count ?? 0) +
    (badges["/admin/delivery-reports"]?.count ?? 0) +
    (badges["/admin/storefronts/withdrawals"]?.count ?? 0) +
    (badges["/admin/mtn-verification"]?.count ?? 0);

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
    return "SA";
  };

  const isDarkMode = mounted && (resolvedTheme === "dark" || theme === "dark");

  return (
    <div className="min-h-screen bg-[#f3f6fa] dark:bg-[#060b13] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 antialiased selection:bg-[#00df82] selection:text-slate-950">
      {/* Top Banner if Emergency Halt is Active */}
      {halted && (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 border-b border-rose-700/50 px-4 py-2 text-xs font-semibold text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-rose-400 animate-ping" />
            <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
            <span>CRITICAL ALERT: Order processing is currently HALTED across all telecom providers.</span>
          </div>
          <Link
            href="/admin/settings"
            className="rounded-md bg-rose-600/80 px-2.5 py-1 text-[11px] text-white hover:bg-rose-500 transition-colors"
          >
            Manage Halt Switch →
          </Link>
        </div>
      )}

      {/* Global Announcement / Notification Bar */}
      {announcement && <AnnouncementBar text={announcement} />}

      {/* ── TOP BAR (NEON DASHBOARD THEME) ─────────────────────────────────── */}
      <header className="h-16 border-b border-slate-200 dark:border-[#14233a] bg-white/90 dark:bg-[#070d18]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-2.5 sm:px-4 lg:px-6 w-full max-w-full">
        {/* Left: Mobile trigger & Brand */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0e192c] shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <BrandLogo size="sm" showTagline={true} />
            <span className="hidden sm:inline-flex rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border border-indigo-500/40 shadow-xs shadow-indigo-500/20 shrink-0">
              ADMIN CENTER
            </span>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders, users, providers, or logs... ⌘K"
              className="w-full h-10 pl-10 pr-4 rounded-xl text-xs bg-slate-100 dark:bg-[#0a1220] border border-slate-200 dark:border-[#162740] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Right: Actions, Live Clock, Notifications, Theme Toggle, User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Live GMT Clock */}
          {gmtTime && (
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0a1220] border border-slate-200 dark:border-[#162740] text-slate-700 dark:text-slate-300 text-[11px] font-mono">
              <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{gmtTime}</span>
            </div>
          )}

          {/* Quick Manual Credit Shortcut */}
          <button
            type="button"
            onClick={() => setCreditDialogOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5 text-white" />
            <span>+ Manual Credit</span>
          </button>

          {/* Alerts Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setAlertsDropdownOpen(!alertsDropdownOpen)}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#0a1220] border border-slate-200 dark:border-[#162740] transition-colors"
              title="Operational Alerts"
            >
              <Bell className="h-4 w-4" />
              {totalAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-[#070b13]">
                  {totalAlertsCount}
                </span>
              )}
            </button>

            {alertsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0d1424] shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-slate-200">
                  <span>Operational Alerts</span>
                  <span className="text-[10px] text-[#00df82] font-mono">{totalAlertsCount} pending</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 py-1 text-xs">
                  <Link
                    href="/admin/orders"
                    className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-amber-500" />
                      <span>Pending Orders</span>
                    </div>
                    <span className="font-bold text-amber-500 font-mono">
                      {badges["/admin/orders"]?.count ?? 0}
                    </span>
                  </Link>
                  <Link
                    href="/admin/delivery-reports"
                    className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-500" />
                      <span>Disputes Under Review</span>
                    </div>
                    <span className="font-bold text-rose-500 font-mono">
                      {badges["/admin/delivery-reports"]?.count ?? 0}
                    </span>
                  </Link>
                  <Link
                    href="/admin/storefronts/withdrawals"
                    className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
                  >
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-[#00df82]" />
                      <span>Pending Payouts</span>
                    </div>
                    <span className="font-bold text-[#00df82] font-mono">
                      {badges["/admin/storefronts/withdrawals"]?.count ?? 0}
                    </span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle Button - hidden on mobile, available in mobile drawer */}
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDarkMode ? "light" : "dark")}
              className="hidden sm:flex p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#0a1220] border border-slate-200 dark:border-[#162740] transition-colors"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>
          )}

          {/* Switch to Reseller Portal Link */}
          <Link
            href="/dashboard"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0a1220] border border-slate-200 dark:border-[#162740] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors"
            title="Switch to Reseller Portal"
          >
            <ExternalLink className="h-3.5 w-3.5 text-[#00df82]" />
            <span>Portal</span>
          </Link>

          {/* User Profile Card */}
          <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-[#14233a]">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:pointer-events-none shrink-0"
              title="Open Admin Navigation"
            >
              <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#00df82] to-[#0070f3] p-[1.5px] shrink-0">
                <div className="h-full w-full rounded-[6px] sm:rounded-[10px] bg-slate-900 flex items-center justify-center text-white text-[10px] sm:text-xs font-black">
                  {getUserInitials(user.name, user.email)}
                </div>
              </div>
            </button>
            <div className="hidden lg:flex flex-col">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[120px]">
                {user.name || "Super Admin"}
              </span>
              <span className="text-[10px] text-[#00df82] font-semibold uppercase tracking-wider">
                {user.role}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="hidden sm:flex p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors ml-1"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN BODY CONTAINER ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* DESKTOP SIDEBAR */}
        <aside
          className={cn(
            "hidden md:flex flex-col border-r border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] transition-all duration-300 z-20 shrink-0",
            sidebarCollapsed ? "w-20" : "w-64"
          )}
        >
          {/* Sidebar Toggle & Header */}
          <div className="h-12 flex items-center justify-between px-4 border-b border-slate-200 dark:border-[#14233a]">
            {!sidebarCollapsed && (
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                NAVIGATION
              </span>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors ml-auto"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronRight
                className={cn("h-4 w-4 transition-transform duration-200", !sidebarCollapsed && "rotate-180")}
              />
            </button>
          </div>

          {/* Navigation Groups */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {NAV_GROUPS.map((group) => {
              const items = group.items.filter((item) => {
                if (!allowedNavHrefs) return true;
                return allowedNavHrefs.includes(item.href);
              });
              if (items.length === 0) return null;

              return (
                <div key={group.title} className="space-y-1">
                  {!sidebarCollapsed && (
                    <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                      {group.title}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const isActive =
                        item.href === "/admin"
                          ? pathname === "/admin"
                          : pathname.startsWith(item.href);
                      const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={sidebarCollapsed ? item.label : undefined}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative",
                            isActive
                              ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-bold border border-indigo-400/30 shadow-md shadow-indigo-500/20"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0e192c]"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                            )}
                          />

                          {!sidebarCollapsed && (
                            <span className="truncate flex-1">{item.label}</span>
                          )}

                          {badge && badge.count > 0 && (
                            <span
                              className={cn(
                                "flex items-center justify-center rounded-full text-[10px] font-bold h-4 min-w-[16px] px-1 text-white shadow-xs",
                                sidebarCollapsed
                                  ? "absolute top-1 right-1 h-3 min-w-[12px] text-[8px]"
                                  : "",
                                badge.variant === "danger"
                                  ? "bg-rose-500 animate-pulse"
                                  : badge.variant === "warning"
                                  ? "bg-amber-500"
                                  : "bg-[#00df82] text-slate-950 font-bold"
                              )}
                            >
                              {badge.count > 99 ? "99+" : badge.count}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-[#14233a] bg-slate-50 dark:bg-[#070d18] space-y-2">
            {!sidebarCollapsed && (
              <div className="flex items-center justify-between px-2 text-[10px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#00df82] animate-pulse" />
                  <span>Single-Order Engine</span>
                </div>
                <span className="font-mono text-slate-400">v2.0 Core</span>
              </div>
            )}
          </div>
        </aside>

        {/* MAIN BODY AREA */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden w-full max-w-full">
          {/* PAGE CONTENT */}
          <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 flex flex-col justify-between overflow-x-hidden">
            <div className="space-y-6">
              {children}
            </div>

            {/* Global Bottom Footer */}
            <footer className="mt-12 border-t border-slate-200/70 dark:border-[#14233a] pt-5 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <span>CleanDataPacks Admin © {new Date().getFullYear()} · All Rights Reserved</span>
                  <span>·</span>
                  <Link href="/terms" target="_blank" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    Terms
                  </Link>
                  <span>·</span>
                  <Link href="/refund-policy" target="_blank" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    Refunds
                  </Link>
                  <span>·</span>
                  <Link href="/privacy" target="_blank" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    Privacy
                  </Link>
                </div>
                <a
                  href="https://wa.me/233507904981"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 font-medium transition-colors group"
                >
                  <span>Powered by</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2">
                    CrazyTech Enterprise
                  </span>
                </a>
              </div>
            </footer>
          </main>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-4/5 max-w-xs bg-white dark:bg-[#070d18] border-r border-slate-200 dark:border-[#14233a] p-4 space-y-4 z-10 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#14233a]">
              <div className="flex items-center gap-2">
                <BrandLogo size="sm" showTagline={true} />
                <span className="text-[10px] font-black uppercase text-[#00df82] tracking-wider px-1.5 py-0.5 rounded bg-[#00df82]/10 border border-[#00df82]/20">
                  ADMIN
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {NAV_GROUPS.map((group) => (
                <div key={group.title} className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-2">{group.title}</div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive =
                        item.href === "/admin"
                          ? pathname === "/admin"
                          : pathname.startsWith(item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium",
                            isActive
                              ? "bg-[#00df82]/20 text-[#00df82] font-bold"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0e192c]"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-[#14233a]">
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-slate-100 dark:bg-[#0e192c] border border-slate-200 dark:border-[#162740] px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#00df82]" />
                <span>Reseller Portal</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Manual Credit Dialog */}
      {creditDialogOpen && (
        <ManualCreditDialog
          open={creditDialogOpen}
          user={null}
          onClose={() => setCreditDialogOpen(false)}
          onCredited={() => {
            setCreditDialogOpen(false);
            toast("Manual credit applied successfully", "success");
            router.refresh();
          }}
        />
      )}
      {/* Floating System Support Chat Bubble */}
      <SystemChatWidget user={user} />
    </div>
  );
}

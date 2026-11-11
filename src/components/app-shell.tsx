"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Lock,
  LogOut,
  MessageCircle,
  Signal,
  Wallet,
  Plus,
  Menu,
  X,
  Send,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useToast } from "@/components/toast";
import {
  ThemeToggle,
  AppSidebarNav,
  adminNav,
  userNav,
  resolveNavIcon,
  useNavBadges,
  isActive,
  type NavItem,
  type ExtraNavItem,
} from "@/components/app-nav";
import { formatGHS, canAccessDeveloperApi, type AuthUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SystemChatWidget } from "@/components/chat/system-chat-widget";
import { UserWalkthrough, TourLauncherButton } from "@/components/onboarding/user-walkthrough";
import { NotificationCenter } from "@/components/notifications/notification-center";

/** Seconds elapsed since the last user interaction (mouse, key, scroll, touch). */
function useIdleSeconds() {
  const [idle, setIdle] = React.useState(0);
  React.useEffect(() => {
    let last = Date.now();
    const bump = () => {
      last = Date.now();
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const timer = window.setInterval(
      () => setIdle(Math.floor((Date.now() - last) / 1000)),
      1000
    );
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(timer);
    };
  }, []);
  return idle;
}

function IdleIndicator({ idle }: { idle: number }) {
  const active = idle < 5;
  return (
    <div
      className="hidden h-7 shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 text-[11px] font-semibold text-slate-500 md:flex dark:bg-white/5 dark:text-slate-400"
      title={active ? "You are active" : `Idle for ~${idle}s`}
    >
      <Signal
        className={cn(
          "h-3.5 w-3.5",
          active ? "text-emerald-500" : "text-slate-400 dark:text-slate-500"
        )}
      />
      {active ? "Active" : `Idle ~${idle}s`}
    </div>
  );
}

/** Global announcement banner */
function AnnouncementBar({ text }: { text: string }) {
  return (
    <div
      className="banner-container relative z-30 overflow-hidden bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-800 py-2 border-b border-emerald-500/20 shadow-sm"
      role="region"
      aria-label="Platform Announcement"
    >
      <div className="relative flex w-full overflow-hidden">
        <div className="animate-banner-slide py-0.5 text-xs sm:text-sm font-bold tracking-wide text-white">
          <span className="inline-flex items-center gap-2 px-6">
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wider font-extrabold text-amber-300">
              Notice
            </span>
            <span>{text}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function Avatar({ user, className }: { user: AuthUser; className?: string }) {
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[10px] font-bold text-white shadow-xs",
        className
      )}
    >
      {initials}
    </span>
  );
}

function RoleBadge({ role, className }: { role: string; className?: string }) {
  const label = role.charAt(0) + role.slice(1).toLowerCase();
  return (
    <span
      className={cn(
        "shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300",
        className
      )}
    >
      {label}
    </span>
  );
}

export function AppShell({
  user,
  children,
  admin,
  announcement,
  extraNavItems,
  supportWhatsapp,
  supportPhone,
  supportTelegram,
  supportEmail,
  footerText,
  allowedNavHrefs,
}: {
  user: AuthUser;
  children: React.ReactNode;
  admin?: boolean;
  announcement?: string | null;
  extraNavItems?: ExtraNavItem[];
  supportWhatsapp?: string;
  supportPhone?: string;
  supportTelegram?: string;
  supportEmail?: string;
  footerText?: string;
  allowedNavHrefs?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const idle = useIdleSeconds();

  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [balance, setBalance] = React.useState<number>(user.balance ?? 0);

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  React.useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileDrawerOpen]);

  const resolvedExtras: NavItem[] = (extraNavItems ?? []).map((item) => ({
    ...item,
    icon: resolveNavIcon(item.icon),
  }));

  let userItems: NavItem[] = [];
  if (!admin) {
    const buyNow = userNav.find((i) => i.href === "/dashboard/buy-now");
    const bulkOrder = userNav.find((i) => i.href === "/dashboard/send");
    const sentOrders = userNav.find((i) => i.href === "/dashboard/orders");
    const notReceived = userNav.find((i) => i.href === "/dashboard/not-received");
    const billing = userNav.find((i) => i.href === "/dashboard/billing");
    const mtn = userNav.find((i) => i.href === "/dashboard/mtn-verification");
    const isSubAgent = Boolean(user.referredById);
    // API item: only for RESELLER, AGENT, ADMIN, MANAGER — not plain USER or sub-agents
    const api = (!isSubAgent && canAccessDeveloperApi(user.role, user.referredById))
      ? userNav.find((i) => i.href === "/dashboard/api")
      : undefined;
    const others = userNav.filter(
      (i) =>
        ![
          "/dashboard/buy-now",
          "/dashboard/send",
          "/dashboard/orders",
          "/dashboard/not-received",
          "/dashboard/billing",
          "/dashboard/mtn-verification",
          "/dashboard/api",
        ].includes(i.href) &&
        !(isSubAgent && i.href === "/dashboard/affiliate")
    );

    userItems = [
      buyNow,
      bulkOrder,
      sentOrders,
      notReceived,
      billing,
      ...resolvedExtras,
      mtn,
      api,
      ...others,
    ].filter(Boolean) as NavItem[];
  }

  React.useEffect(() => {
    setBalance(user.balance ?? 0);
  }, [user.balance]);

  React.useEffect(() => {
    let isMounted = true;
    const refreshBalance = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.user && typeof data.user.balance === "number") {
            setBalance(data.user.balance);
          }
        }
      } catch {}
    };

    refreshBalance();

    const handleCustomUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ balance?: number }>;
      if (customEvent.detail && typeof customEvent.detail.balance === "number") {
        setBalance(customEvent.detail.balance);
      } else {
        refreshBalance();
      }
    };

    window.addEventListener("balance-update", handleCustomUpdate);
    window.addEventListener("focus", refreshBalance);

    return () => {
      isMounted = false;
      window.removeEventListener("balance-update", handleCustomUpdate);
      window.removeEventListener("focus", refreshBalance);
    };
  }, [pathname]);

  let adminItems = adminNav;
  if (admin && user.role === "SECRETARY" && allowedNavHrefs && allowedNavHrefs.length > 0) {
    adminItems = adminNav.filter((i) => allowedNavHrefs.includes(i.href) || i.href === "/admin");
  }
  const isSecretaryRestricted = Boolean(
    admin &&
      user.role === "SECRETARY" &&
      allowedNavHrefs &&
      allowedNavHrefs.length > 0 &&
      pathname !== "/admin" &&
      !allowedNavHrefs.some((h) => pathname === h || pathname.startsWith(`${h}/`))
  );

  const items: NavItem[] = admin ? adminItems : userItems;
  const badges = useNavBadges(admin);

  const onLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast("Signed out", "info");
    router.push("/login");
    router.refresh();
  };

  const isStaffRole = user.role === "ADMIN" || user.role === "MANAGER" || user.role === "SECRETARY";

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070c14] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {announcement && <AnnouncementBar text={announcement} />}

      {/* Top Command Bar Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#070c14]/90 before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-emerald-500 before:via-teal-400 before:to-emerald-600">
        <div className="mx-auto flex h-14 w-full max-w-[1536px] items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Drawer Trigger Button */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open Navigation Menu"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 lg:hidden cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>

            <BrandLogo href={admin ? "/admin" : "/dashboard/buy-now"} size="sm" />

            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200/80 dark:border-white/10">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-extrabold tracking-tight text-emerald-700 dark:text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Direct Switch · 0s Delay
              </span>
            </div>

            <IdleIndicator idle={idle} />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Compact Balance */}
            {!admin && (
              <Link
                href="/dashboard/billing"
                className="flex sm:hidden items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-slate-900 dark:text-white shrink-0 whitespace-nowrap"
                title="View wallet & billing"
              >
                <div className="flex h-4 w-4 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <Wallet className="h-2.5 w-2.5" />
                </div>
                <span className="font-mono">{formatGHS(balance)}</span>
              </Link>
            )}

            {/* Desktop Available Balance & Distinctive Top Up (User Dashboard) */}
            {!admin && (
              <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 rounded-2xl border border-slate-200/90 bg-white/80 p-1 text-xs shadow-xs dark:border-white/10 dark:bg-white/[0.04] backdrop-blur-md">
                <Link
                  href="/dashboard/billing"
                  className="flex items-center gap-2 whitespace-nowrap rounded-xl px-2.5 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
                  title="View wallet & billing"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Wallet className="h-3 w-3" />
                  </div>
                  <span className="font-mono font-black tabular-nums text-slate-900 dark:text-white text-xs sm:text-sm">
                    {formatGHS(balance)}
                  </span>
                </Link>
                <Link
                  href="/dashboard/billing"
                  className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-[11px] font-black text-slate-950 shadow-sm transition hover:from-emerald-400 hover:to-teal-500 active:scale-95"
                  title="Top up wallet balance"
                >
                  <Plus className="h-3 w-3 stroke-[3]" />
                  <span>Top up</span>
                </Link>
              </div>
            )}

            {/* Portal Switcher (Merchant View <-> Admin Panel) */}
            {isStaffRole && (
              <Link
                href={admin ? "/dashboard/buy-now" : "/admin"}
                className="hidden sm:flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-500/20 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
                title={admin ? "Switch to Merchant View" : "Switch to Admin Panel"}
              >
                <span>{admin ? "Merchant View" : "Admin Panel"}</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}

            {/* Notification Center */}
            <NotificationCenter
              user={user}
              admin={admin}
              announcement={announcement}
            />

            <div className="hidden sm:flex items-center gap-1.5">
              <ThemeToggle />
              {!admin && <TourLauncherButton />}
            </div>

            {/* User Profile Pill & Signout */}
            <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1 dark:border-white/10 dark:bg-white/5">
              <Link
                href={admin ? "/admin/settings" : "/dashboard/profile"}
                title={admin ? "Account settings" : "My profile"}
                className="flex items-center gap-2 pl-1 pr-2 py-0.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <Avatar user={user} className="h-6 w-6" />
                <span className="max-w-[120px] truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                  {user.name}
                </span>
                <RoleBadge role={user.role} />
              </Link>

              <button
                onClick={onLogout}
                title="Sign out"
                aria-label="Sign out"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout with Modern Sidebar Rail */}
      <div className="mx-auto flex w-full max-w-[1536px] flex-1">
        {/* Desktop Left Sidebar Rail */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/70 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a101d]/60 px-4 py-5 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto no-scrollbar justify-between">
          <div className="space-y-6">
            {/* Quick Portal Switcher Tile */}
            {isStaffRole && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-600 dark:text-slate-300">Active Workspace</span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-300">
                    {admin ? "Admin" : "Merchant"}
                  </span>
                </div>
                <Link
                  href={admin ? "/dashboard/buy-now" : "/admin"}
                  className="mt-2.5 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-600 dark:bg-white/10 dark:hover:bg-emerald-600 transition-colors"
                >
                  <span>Switch to {admin ? "Merchant View" : "Admin Panel"}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {/* Categorized Navigation */}
            <AppSidebarNav items={items} admin={admin} />
          </div>

          {/* Sidebar Footer Support Card */}
          <div className="pt-6 border-t border-slate-200/70 dark:border-white/5 space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300">CleanDataPacks Telecom</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">v2.4</span>
            </div>
            {supportPhone && <p className="truncate">📞 {supportPhone}</p>}
            {supportTelegram && <p className="truncate">✈️ {supportTelegram}</p>}
            <div className="pt-2 border-t border-slate-200/40 dark:border-white/5">
              <a
                href="https://wa.me/233242075374"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group"
              >
                <span>Powered by</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2">
                  CleanDataPacks
                </span>
              </a>
            </div>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 pb-28 sm:pb-20 flex flex-col justify-between">
          <div>
            {isSecretaryRestricted ? (
              <div className="mx-auto my-16 max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-500/20 dark:bg-amber-500/10">
                <Lock className="mx-auto h-10 w-10 text-amber-600 dark:text-amber-400" />
                <h2 className="mt-3 text-base font-bold text-amber-900 dark:text-amber-200">
                  Page Access Restricted
                </h2>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                  Your account does not have access permissions for this section. Please contact the system administrator if you need access.
                </p>
                <Link
                  href="/admin"
                  className="mt-5 inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-emerald-700"
                >
                  Return to Admin Overview
                </Link>
              </div>
            ) : (
              children
            )}
          </div>

          {/* Desktop/Tablet Global Bottom Footer */}
          <footer className="mt-12 border-t border-slate-200/70 dark:border-white/5 pt-5 text-xs text-slate-400">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <p>{footerText || "CleanDataPacks Telecom © 2026 · All Rights Reserved"}</p>
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
                href="https://wa.me/233242075374"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 font-medium transition-colors group"
              >
                <span>Powered by</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2">
                  CleanDataPacks
                </span>
              </a>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile Off-Canvas Slide Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white dark:bg-[#09101d] shadow-2xl flex flex-col justify-between p-5 overflow-y-auto border-r border-slate-200 dark:border-white/10 animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-white/10">
                <BrandLogo href={admin ? "/admin" : "/dashboard/buy-now"} size="sm" />
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* User Profile Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-white/10 dark:bg-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar user={user} className="h-8 w-8" />
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate text-slate-900 dark:text-white">
                        {user.name}
                      </p>
                      <RoleBadge role={user.role} />
                    </div>
                  </div>
                  <ThemeToggle />
                </div>

                {!admin && (
                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2.5 dark:border-white/5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Available Balance</span>
                      <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                        {formatGHS(balance)}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/billing"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-xs"
                    >
                      Top up
                    </Link>
                  </div>
                )}
              </div>

              {/* Portal Switcher Pill (if staff) */}
              {isStaffRole && (
                <Link
                  href={admin ? "/dashboard/buy-now" : "/admin"}
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300"
                >
                  <span>Switch to {admin ? "Merchant View" : "Admin Panel"}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}

              {/* Categorized Links */}
              <AppSidebarNav items={items} admin={admin} onNavigate={() => setMobileDrawerOpen(false)} />
            </div>

            {/* Drawer Signout Button & Branding */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/10 mt-6 space-y-3">
              <button
                onClick={onLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
              <div className="text-center">
                <a
                  href="https://wa.me/233242075374"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group"
                >
                  <span>Powered by</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 underline underline-offset-2">
                    CleanDataPacks
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Quick Action Navigation Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 border-t border-slate-200 px-4 py-2 backdrop-blur-xl dark:bg-[#070c14]/95 dark:border-white/10 lg:hidden">
        <div className="flex items-center justify-around">
          <Link
            href={admin ? "/admin" : "/dashboard/buy-now"}
            className={cn(
              "flex flex-col items-center gap-1 py-1 text-slate-600 dark:text-slate-400 hover:text-emerald-500",
              isActive(pathname, admin ? "/admin" : "/dashboard/buy-now") && "text-emerald-600 dark:text-emerald-400 font-bold"
            )}
          >
            {admin ? <LayoutDashboard className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
            <span className="text-[10px]">{admin ? "Overview" : "Buy Now"}</span>
          </Link>

          {!admin && (
            <Link
              href="/dashboard/send"
              className={cn(
                "flex flex-col items-center gap-1 py-1 text-slate-600 dark:text-slate-400 hover:text-emerald-500",
                isActive(pathname, "/dashboard/send") && "text-emerald-600 dark:text-emerald-400 font-bold"
              )}
            >
              <Send className="h-4 w-4" />
              <span className="text-[10px]">Bulk</span>
            </Link>
          )}

          <Link
            href={admin ? "/admin/orders" : "/dashboard/orders"}
            className={cn(
              "flex flex-col items-center gap-1 py-1 text-slate-600 dark:text-slate-400 hover:text-emerald-500 relative",
              isActive(pathname, admin ? "/admin/orders" : "/dashboard/orders") && "text-emerald-600 dark:text-emerald-400 font-bold"
            )}
          >
            <ClipboardList className="h-4 w-4" />
            <span className="text-[10px]">Orders</span>
            {badges[admin ? "/admin/orders" : "/dashboard/orders"]?.count > 0 && (
              <span className="absolute top-0 right-2 h-2 w-2 rounded-full bg-emerald-500" />
            )}
          </Link>

          <Link
            href={admin ? "/admin/wallets" : "/dashboard/billing"}
            className={cn(
              "flex flex-col items-center gap-1 py-1 text-slate-600 dark:text-slate-400 hover:text-emerald-500",
              isActive(pathname, admin ? "/admin/wallets" : "/dashboard/billing") && "text-emerald-600 dark:text-emerald-400 font-bold"
            )}
          >
            <Wallet className="h-4 w-4" />
            <span className="text-[10px]">{admin ? "Wallets" : "Billing"}</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center gap-1 py-1 text-slate-600 dark:text-slate-400 hover:text-emerald-500"
          >
            <Menu className="h-4 w-4" />
            <span className="text-[10px]">Menu</span>
          </button>
        </div>
      </div>

      <SystemChatWidget user={user} />
      {!admin && <UserWalkthrough userName={user.name} />}
    </div>
  );
}

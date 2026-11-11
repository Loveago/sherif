"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FileBarChart,
  Receipt,
  BookOpen,
  Users,
  Settings,
  ClipboardList,
  ScrollText,
  Sun,
  Moon,
  Send,
  User,
  Store,
  Ticket,
  FileWarning,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  Loader2,
  MessageSquare,
  Banknote,
  Wallet,
  Layers,
  Share2,
  X,
  Menu,
  ShoppingBag,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Renders a live record-count badge next to the label. */
  badge?: boolean;
  /** Hidden from the desktop tab bar (still reachable on mobile and by URL). */
  mobileOnly?: boolean;
};

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Plain-data variant of NavItem safe to pass from Server Components to Client
 * Components — icons are referenced by name and resolved client-side via
 * resolveNavIcon (component references cannot cross the RSC boundary).
 */
export type ExtraNavItem = {
  href: string;
  label: string;
  icon?: NavIconName;
  badge?: boolean;
  mobileOnly?: boolean;
};

/** Icons selectable by name for ExtraNavItem entries. */
const extraIconRegistry = {
  store: Store,
  user: User,
  package: Package,
  receipt: Receipt,
  wallet: Wallet,
} satisfies Record<string, React.ComponentType<{ className?: string }>>;

export type NavIconName = keyof typeof extraIconRegistry;

export function resolveNavIcon(name: NavIconName | undefined): React.ComponentType<{
  className?: string;
}> {
  return (name && name in extraIconRegistry
    ? extraIconRegistry[name as NavIconName]
    : extraIconRegistry.store);
}

export const userNav: NavItem[] = [
  { href: "/dashboard/buy-now", label: "Buy Now", icon: ShoppingBag },
  { href: "/dashboard/send", label: "Bulk Order", icon: Send },
  { href: "/dashboard/orders", label: "Orders", icon: ClipboardList, badge: true },
  { href: "/dashboard/not-received", label: "Order Reports", icon: FileWarning },
  { href: "/dashboard/affiliate", label: "Affiliate Network", icon: Share2 },
  { href: "/dashboard/billing", label: "Billing", icon: Receipt },
  { href: "/dashboard/transactions", label: "Transactions", icon: Wallet },
  { href: "/dashboard/mtn-verification", label: "MTN Verification", icon: CheckCircle2 },
  { href: "/dashboard/api", label: "API", icon: BookOpen },
  { href: "/dashboard/packages", label: "Packages", icon: Package },
  { href: "/dashboard/reports", label: "Reports", icon: FileBarChart },
  { href: "/dashboard/profile", label: "Profile", icon: User, mobileOnly: true },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList, badge: true },
  { href: "/admin/order-api-logs", label: "Order API Logs", icon: Activity },
  { href: "/admin/mtn-verification", label: "MTN Verification", icon: ShieldCheck },
  { href: "/admin/exports", label: "Exports", icon: FileSpreadsheet },
  { href: "/admin/delivery-reports", label: "Not Received", icon: FileWarning, badge: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/affiliates", label: "Affiliate Network", icon: Share2 },
  { href: "/admin/wallets", label: "User Wallets", icon: Wallet },
  { href: "/admin/chat", label: "Support Chat", icon: MessageSquare },
  { href: "/admin/users/signup-codes", label: "Signup Codes", icon: Ticket },
  { href: "/admin/storefronts", label: "Storefronts", icon: Store, badge: true },
  { href: "/admin/storefronts/withdrawals", label: "Withdrawals", icon: Banknote, badge: true },
  { href: "/admin/packages", label: "Packages", icon: Package },
  { href: "/admin/pricing", label: "Pricing", icon: Receipt },
  { href: "/admin/billing", label: "Billing", icon: Receipt },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart },
  { href: "/admin/api", label: "API", icon: BookOpen },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
];

export function groupUserNav(items: NavItem[]): NavSection[] {
  const opsHrefs = ["/dashboard/buy-now", "/dashboard/send", "/dashboard/orders", "/dashboard/not-received"];
  const affHrefs = ["/dashboard/affiliate"];
  const finHrefs = ["/dashboard/billing", "/dashboard/transactions"];
  const storeHrefs = ["/dashboard/storefront", "/dashboard/storefront/apply"];
  const telHrefs = ["/dashboard/mtn-verification", "/dashboard/api", "/dashboard/packages", "/dashboard/reports"];
  const accHrefs = ["/dashboard/profile"];

  const ops = items.filter((i) => opsHrefs.includes(i.href));
  const aff = items.filter((i) => affHrefs.includes(i.href));
  const fin = items.filter((i) => finHrefs.includes(i.href));
  const store = items.filter((i) => storeHrefs.includes(i.href));
  const tel = items.filter((i) => telHrefs.includes(i.href));
  const acc = items.filter((i) => accHrefs.includes(i.href));
  const others = items.filter(
    (i) =>
      !opsHrefs.includes(i.href) &&
      !affHrefs.includes(i.href) &&
      !finHrefs.includes(i.href) &&
      !storeHrefs.includes(i.href) &&
      !telHrefs.includes(i.href) &&
      !accHrefs.includes(i.href)
  );

  const sections: NavSection[] = [];
  if (ops.length > 0) sections.push({ title: "Operations", items: ops });
  if (aff.length > 0) sections.push({ title: "Growth & Network", items: aff });
  if (fin.length > 0) sections.push({ title: "Wallet & Billing", items: fin });
  if (store.length > 0) sections.push({ title: "My Storefront", items: store });
  if (tel.length > 0) sections.push({ title: "Telecom & Tools", items: tel });
  if (others.length > 0) sections.push({ title: "More", items: others });
  if (acc.length > 0) sections.push({ title: "Account", items: acc });
  return sections;
}

export function groupAdminNav(items: NavItem[]): NavSection[] {
  const overviewHrefs = ["/admin", "/admin/reports"];
  const ordersHrefs = ["/admin/orders", "/admin/order-api-logs", "/admin/delivery-reports", "/admin/exports"];
  const usersHrefs = ["/admin/users", "/admin/affiliates", "/admin/wallets", "/admin/chat", "/admin/users/signup-codes", "/admin/storefronts", "/admin/storefronts/withdrawals"];
  const systemHrefs = ["/admin/packages", "/admin/pricing", "/admin/billing", "/admin/mtn-verification", "/admin/api", "/admin/settings", "/admin/audit-logs"];

  const overview = items.filter((i) => overviewHrefs.includes(i.href));
  const orders = items.filter((i) => ordersHrefs.includes(i.href));
  const users = items.filter((i) => usersHrefs.includes(i.href));
  const system = items.filter((i) => systemHrefs.includes(i.href));
  const others = items.filter(
    (i) =>
      !overviewHrefs.includes(i.href) &&
      !ordersHrefs.includes(i.href) &&
      !usersHrefs.includes(i.href) &&
      !systemHrefs.includes(i.href)
  );

  const sections: NavSection[] = [];
  if (overview.length > 0) sections.push({ title: "Command Center", items: overview });
  if (orders.length > 0) sections.push({ title: "Orders & Batches", items: orders });
  if (users.length > 0) sections.push({ title: "Users & Storefronts", items: users });
  if (system.length > 0) sections.push({ title: "Telecom Engine", items: system });
  if (others.length > 0) sections.push({ title: "Other Tools", items: others });
  return sections;
}

export function isActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/admin" || href === "/admin/storefronts") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted ? (resolvedTheme === "dark" || theme === "dark") : false;

  const toggle = () => {
    if (!mounted) return;
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Dark mode active — click for Light mode" : "Light mode active — click for Dark mode"}
      className={cn(
        "group relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
        isDark
          ? "bg-slate-800 border border-emerald-500/40 shadow-inner"
          : "bg-amber-50/90 border border-amber-300/80 shadow-sm",
        className
      )}
    >
      <div className="flex w-full items-center justify-between px-0.5">
        <Sun className={cn("h-3.5 w-3.5 transition-opacity duration-200", isDark ? "opacity-30 text-amber-400" : "opacity-0")} />
        <Moon className={cn("h-3.5 w-3.5 transition-opacity duration-200", isDark ? "opacity-0" : "opacity-30 text-emerald-400")} />
      </div>

      <span
        className={cn(
          "absolute top-1 flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-all duration-300 ease-out",
          isDark
            ? "translate-x-6 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-600/40"
            : "translate-x-0 bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-900 shadow-amber-400/30"
        )}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-emerald-100" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-amber-950 fill-amber-950/20" />
        )}
      </span>
    </button>
  );
}

export interface NavBadgeData {
  count: number;
  label?: string;
  variant?: "brand" | "warning" | "danger";
}

/** Hook to fetch and synchronize navigation badge counters for both admin and regular users. */
export function useNavBadges(admin?: boolean): Record<string, NavBadgeData> {
  const pathname = usePathname();
  const isAdmin = admin ?? pathname.startsWith("/admin");
  const [badges, setBadges] = React.useState<Record<string, NavBadgeData>>({});

  const refresh = React.useCallback(async () => {
    try {
      if (isAdmin) {
        const res = await fetch("/api/admin/nav-counts", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setBadges({
            "/admin/orders": {
              count: typeof data.pendingOrders === "number" ? data.pendingOrders : 0,
              label: "pending orders",
              variant: "warning",
            },
            "/admin/delivery-reports": {
              count: typeof data.underReviewReports === "number" ? data.underReviewReports : 0,
              label: "under review",
              variant: "danger",
            },
            "/admin/storefronts/withdrawals": {
              count: typeof data.pendingWithdrawals === "number" ? data.pendingWithdrawals : 0,
              label: "pending withdrawals",
              variant: "warning",
            },
            "/admin/storefronts": {
              count: typeof data.pendingWithdrawals === "number" ? data.pendingWithdrawals : 0,
              label: "pending withdrawals",
              variant: "warning",
            },
            "/admin/mtn-verification": {
              count: typeof data.pendingMtn === "number" ? data.pendingMtn : 0,
              label: "pending verification",
              variant: "warning",
            },
          });
        }
      } else {
        const res = await fetch("/api/orders?pageSize=1", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const inFlight = typeof data.queueTotal === "number" ? data.queueTotal : 0;
          setBadges({
            "/dashboard/orders": {
              count: inFlight,
              label: "orders in processing",
              variant: "brand",
            },
          });
        }
      }
    } catch {
      // ignore network errors
    }
  }, [isAdmin]);

  React.useEffect(() => {
    refresh();

    const interval = setInterval(refresh, 30000);
    const onUpdate = () => refresh();

    window.addEventListener("nav-counts-update", onUpdate);
    window.addEventListener("focus", onUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("nav-counts-update", onUpdate);
      window.removeEventListener("focus", onUpdate);
    };
  }, [refresh]);

  return badges;
}

/** Legacy hook kept for backward compatibility */
export function useSentOrdersCount() {
  const badges = useNavBadges(false);
  return badges["/dashboard/orders"]?.count ?? null;
}

/**
 * Modern Sidebar Navigation for Desktop and Tablet
 */
export function AppSidebarNav({
  items,
  admin,
  onNavigate,
  className,
}: {
  items: NavItem[];
  admin?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const isAdmin = admin ?? pathname.startsWith("/admin");
  const badges = useNavBadges(isAdmin);
  const sections = isAdmin ? groupAdminNav(items) : groupUserNav(items);

  return (
    <nav className={cn("space-y-6 text-xs", className)} aria-label="Sidebar Navigation">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1.5">
          <div className="flex items-center gap-1.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span className="h-1 w-1 rounded-full bg-emerald-500/40" />
            <span>{section.title}</span>
          </div>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              const badge = badges[item.href];
              const hasCount = item.badge && badge && badge.count > 0;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center justify-between rounded-xl px-3 py-2 font-bold transition-all duration-150",
                    active
                      ? "bg-slate-900 text-white shadow-sm dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-500/30 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-emerald-500"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all",
                        active
                          ? "bg-emerald-500/20 text-emerald-400 dark:text-emerald-300"
                          : "text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {hasCount && (
                    <span
                      className={cn(
                        "ml-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-black text-white shadow-xs",
                        badge.variant === "danger"
                          ? "bg-rose-500 ring-2 ring-rose-300 dark:ring-rose-950 animate-pulse"
                          : badge.variant === "warning"
                          ? "bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-950"
                          : "bg-emerald-600 ring-2 ring-white dark:ring-[#0a1120]"
                      )}
                      title={`${badge.count} ${badge.label ?? ""}`}
                    >
                      {badge.count > 999 ? `${Math.floor(badge.count / 1000)}k` : badge.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** Legacy TopTabs kept for backward compatibility if needed */
export function TopTabs({
  items,
  admin,
  className,
}: {
  items: NavItem[];
  admin?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const isAdmin = admin ?? pathname.startsWith("/admin");
  const badges = useNavBadges(isAdmin);

  return (
    <div className={cn("relative flex items-center w-full min-w-0 overflow-x-auto no-scrollbar py-1 gap-1", className)}>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const badge = badges[item.href];
        const hasCount = item.badge && badge && badge.count > 0;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-xs font-bold transition-all",
              active
                ? "bg-slate-900 text-white shadow-sm dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-500/30"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{item.label}</span>
            {hasCount && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
                {badge.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

/** Legacy MobileSelectNav kept for backward compatibility */
export function MobileSelectNav({
  items,
  isAdminRole,
  currentIsAdmin,
  className,
}: {
  items: NavItem[];
  isAdminRole?: boolean;
  currentIsAdmin?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const current = items.find((i) => isActive(pathname, i.href))?.href ?? "";
  const badges = useNavBadges(currentIsAdmin);

  return (
    <div className={cn("relative", className)}>
      <select
        value={current}
        onChange={(e) => router.push(e.target.value)}
        aria-label="Navigate to page"
        className="h-10 w-full appearance-none rounded-xl border border-[#162740] bg-white px-3 pr-9 text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00df82] dark:border-[#162740] dark:bg-[#0b1322] dark:text-slate-100"
      >
        <optgroup label={currentIsAdmin ? "Admin Navigation" : "Dashboard Pages"}>
          {items.map((item) => {
            const badge = badges[item.href];
            const badgeSuffix = badge && badge.count > 0 ? ` (${badge.count})` : "";
            return (
              <option key={item.href} value={item.href}>
                {item.label}{badgeSuffix}
              </option>
            );
          })}
        </optgroup>
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, Package, Settings, Wallet, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SUBNAV_ITEMS = [
  { href: "/dashboard/storefront", label: "Overview", icon: Store, exact: true },
  { href: "/dashboard/storefront/products", label: "Pricing Engine", icon: Package },
  { href: "/dashboard/storefront/settings", label: "Store Identity", icon: Settings },
  { href: "/dashboard/storefront/reviews", label: "Customer Reviews", icon: MessageSquare },
  { href: "/dashboard/storefront/wallet", label: "Settlement & Payouts", icon: Wallet },
];

export function StorefrontSubnav() {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  React.useEffect(() => {
    if (!pendingHref) return;
    const timer = setTimeout(() => setPendingHref(null), 8000);
    return () => clearTimeout(timer);
  }, [pendingHref]);

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-1.5 text-xs font-bold shadow-xl backdrop-blur-xl">
      {SUBNAV_ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const isPending = pendingHref === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={(e) => {
              if (active) return;
              if (pendingHref) {
                e.preventDefault();
                return;
              }
              setPendingHref(item.href);
            }}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3.5 sm:px-4 py-2 transition-all whitespace-nowrap text-xs font-bold shrink-0",
              active
                ? "bg-[#00df82] text-[#060b13] font-black shadow-[0_0_15px_rgba(0,223,130,0.35)]"
                : isPending
                ? "bg-slate-100 dark:bg-[#111e33] text-slate-900 dark:text-white opacity-90 animate-pulse border border-slate-200 dark:border-[#162740]"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#111e33]"
            )}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#00df82]" />
            ) : (
              <Icon className={cn("h-4 w-4", active ? "text-[#060b13]" : "text-[#00df82]")} />
            )}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

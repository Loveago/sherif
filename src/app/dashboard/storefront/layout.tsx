import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canAccessStorefront } from "@/lib/types";
import { StorefrontSubnav } from "@/components/storefront/storefront-subnav";
import { Lock, ShieldOff } from "lucide-react";
import Link from "next/link";

/**
 * Auth + role gate for every /dashboard/storefront page.
 * Only RESELLER, AGENT, ADMIN, and MANAGER accounts can access storefronts.
 */
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?session_expired=1");

  if (!canAccessStorefront(user.role)) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-[#162740] bg-[#0b1322] p-8 text-center shadow-2xl">
          {/* Icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
            <Lock className="h-8 w-8" />
          </div>

          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-rose-300">
            <ShieldOff className="h-3.5 w-3.5" />
            Tier Access Restricted
          </span>

          <h2 className="mt-4 text-2xl font-black tracking-tight text-white">
            Reseller Storefront Studio
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Public Storefronts and automated retail clearance are reserved for{" "}
            <strong className="text-white">Agent</strong> and{" "}
            <strong className="text-white">Reseller</strong> tier accounts.
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/dashboard/buy-now"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00df82] py-3 text-xs font-black text-[#060b13] shadow-md shadow-[#00df82]/20 hover:bg-[#00df82]/90 transition"
            >
              Return to Teleport Terminal
            </Link>
            <p className="text-[11px] text-slate-500">
              Contact administration to elevate your telecom merchant tier.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StorefrontSubnav />
      {children}
    </div>
  );
}

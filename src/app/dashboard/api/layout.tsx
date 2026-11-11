import { getCurrentUser } from "@/lib/auth";
import { canAccessDeveloperApi } from "@/lib/types";
import { Lock, ShieldOff } from "lucide-react";
import Link from "next/link";

export default async function ApiDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || !canAccessDeveloperApi(user.role, user.referredById)) {
    const isSubAgent = Boolean(user?.referredById);
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-8 text-center shadow-2xl">
          {/* Icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400">
            <Lock className="h-8 w-8" />
          </div>

          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
            <ShieldOff className="h-3.5 w-3.5" />
            Tier Access Restricted
          </span>

          <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Developer API Gateway
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {isSubAgent
              ? "As a sub-agent under a partner wholesale account, direct developer API provisioning is not available."
              : (
                <>
                  Direct API provisioning and carrier webhook keys are reserved for{" "}
                  <strong className="text-slate-900 dark:text-white">Agent</strong> and{" "}
                  <strong className="text-slate-900 dark:text-white">Reseller</strong> accounts.
                </>
              )}
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/dashboard/buy-now"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00df82] py-3 text-xs font-black text-[#060b13] shadow-md shadow-[#00df82]/20 hover:bg-[#00df82]/90 transition"
            >
              Return to Teleport Terminal
            </Link>
            <p className="text-[11px] text-slate-500">
              Contact administration to elevate your telecom developer permissions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

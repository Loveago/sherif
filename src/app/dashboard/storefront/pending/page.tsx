import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, XCircle, Store, Radio } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getStorefrontForUser } from "@/lib/storefront";

/** Application status page while a store is PENDING or REJECTED. */
export default async function StorePendingPage() {
  const user = await requireUser();
  const storefront = await getStorefrontForUser(user.id);
  if (!storefront || storefront.status === "NOT_ENABLED") {
    redirect("/dashboard/storefront/apply");
  }
  if (storefront.status === "ENABLED" || storefront.status === "SUSPENDED") {
    redirect("/dashboard/storefront");
  }

  const pending = storefront.status === "PENDING";

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-8 text-center shadow-xl">
        <span
          className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl border ${
            pending
              ? "border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400"
              : "border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400"
          }`}
        >
          {pending ? <Clock className="h-8 w-8 animate-pulse" /> : <XCircle className="h-8 w-8" />}
        </span>

        <h1 className="mt-5 text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {pending ? "Application Telemetry: In Review" : "Application Not Approved"}
        </h1>

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
          {pending
            ? `Our operations team is currently reviewing “${storefront.name}”. Once verified, your public storefront domain and automated USSD routing will activate immediately.`
            : storefront.rejectionNote
              ? `“${storefront.name}” was not approved. Feedback: ${storefront.rejectionNote}`
              : `“${storefront.name}” was not approved.`}
        </p>

        {pending && (
          <div className="mx-auto mt-6 flex max-w-xs items-center justify-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            QUEUE STATUS: PENDING VERIFICATION
          </div>
        )}
      </div>

      {pending ? (
        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Need adjustments prior to clearance? Contact support via WhatsApp.
        </p>
      ) : (
        <Link
          href="/dashboard/storefront/apply"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#00df82] py-3 text-xs font-black text-[#060b13] shadow-md shadow-[#00df82]/20 hover:bg-[#00df82]/90 transition"
        >
          <Store className="h-4 w-4" /> Recalibrate Application
        </Link>
      )}
    </div>
  );
}

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getStorefrontForUser, isOwnedStorefrontStatus } from "@/lib/storefront";
import { StoreApplyForm } from "./apply-form";

/**
 * User-side store application (§4): the user only enters their store name —
 * an admin reviews and approves before the store goes live.
 */
export default async function StoreApplyPage() {
  const user = await requireUser();
  const storefront = await getStorefrontForUser(user.id);
  if (storefront && isOwnedStorefrontStatus(storefront.status)) {
    redirect("/dashboard/storefront");
  }
  if (storefront?.status === "PENDING") {
    redirect("/dashboard/storefront/pending");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-4">
      <header className="text-center space-y-2">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 shadow-lg shadow-emerald-600/20">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7">
            <path d="M3 9l1.5-5h15L21 9M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9M3 9h18M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Reseller Partnership
          </span>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white tracking-tight">Open Your Storefront</h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Sell data bundles under your own brand, set retail prices, and earn instant commissions on every buyer checkout.
          </p>
        </div>
      </header>
      <StoreApplyForm
        rejected={storefront?.status === "REJECTED"}
        rejectionNote={storefront?.rejectionNote ?? null}
        previousName={storefront?.name ?? ""}
        previousPhone={storefront?.phone ?? ""}
        previousWhatsappGroupLink={storefront?.whatsappGroupLink ?? ""}
        previousDescription={storefront?.description ?? ""}
      />
    </div>
  );
}

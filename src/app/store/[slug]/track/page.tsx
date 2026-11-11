import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TrackForm } from "./track-form";
import { ArrowLeft, Clock, ShieldCheck, Zap, HelpCircle } from "lucide-react";
import { storeHref } from "@/components/store/brands";

export const dynamic = "force-dynamic";

export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const storefront = await prisma.storefront.findUnique({
    where: { slug },
    select: { name: true, status: true },
  });
  const enabled = storefront?.status === "ENABLED";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      {/* Breadcrumb Navigation */}
      <div className="py-4 text-xs font-mono">
        <Link
          href={storeHref(slug)}
          className="inline-flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400 hover:text-[#00df82] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-[#00df82]" />
          Back to {storefront?.name || "Store"}
        </Link>
      </div>

      {/* Hero Tracking Terminal Header */}
      <div className="text-center pt-4 pb-8 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#00df82]/30 bg-[#00df82]/10 px-3.5 py-1 text-xs font-bold text-[#00df82]">
          <Clock className="h-3.5 w-3.5 text-[#00df82]" />
          Carrier Dispatch Verification Console
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
          Track Your Bundle Delivery
        </h1>
        <p className="mx-auto max-w-lg text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Check real-time SIM crediting status using your recipient phone number, order ID, or Paystack payment reference.
        </p>
      </div>

      {/* Main Terminal Frame */}
      {enabled ? (
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 sm:p-10 shadow-2xl backdrop-blur-2xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#00df82]/15 blur-3xl" />
          <TrackForm slug={slug} />
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-12 text-center text-sm text-slate-500 dark:text-slate-400">
          This store is not accepting orders at this time.
        </div>
      )}

      {/* USSD Network Verification Guidelines */}
      <div className="mt-8 rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="h-4 w-4 text-[#00df82]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
            How to verify non-expiry data on your handset
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] p-3.5">
            <span className="font-extrabold text-amber-500 dark:text-amber-400 block mb-1">MTN Ghana</span>
            <span className="text-slate-500 dark:text-slate-400">Dial <code className="font-mono font-bold text-slate-900 dark:text-white bg-slate-200 dark:bg-[#111e33] px-1.5 py-0.5 rounded">*138#</code> to inspect bundle balance.</span>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] p-3.5">
            <span className="font-extrabold text-rose-500 dark:text-rose-400 block mb-1">Telecel Ghana</span>
            <span className="text-slate-500 dark:text-slate-400">Dial <code className="font-mono font-bold text-slate-900 dark:text-white bg-slate-200 dark:bg-[#111e33] px-1.5 py-0.5 rounded">*110#</code> or check the Telecel Play app.</span>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] p-3.5">
            <span className="font-extrabold text-sky-500 dark:text-sky-400 block mb-1">AT Ghana</span>
            <span className="text-slate-500 dark:text-slate-400">Dial <code className="font-mono font-bold text-slate-900 dark:text-white bg-slate-200 dark:bg-[#111e33] px-1.5 py-0.5 rounded">*124#</code> or <code className="font-mono font-bold text-slate-900 dark:text-white bg-slate-200 dark:bg-[#111e33] px-1.5 py-0.5 rounded">*125#</code>.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

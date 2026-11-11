import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fromPesewas, syncStorefrontWithPricingProfile } from "@/lib/storefront";
import { NetworkLogo } from "@/components/store/network-logo";
import { NETWORK_BRANDS, NETWORK_ORDER, ghs, networkBySlug, networkHref, storeHref } from "@/components/store/brands";
import { NetworkBuyForm } from "./buy-form";
import { Zap, ShieldCheck, CheckCircle2, ArrowLeft, Radio, Activity, Signal } from "lucide-react";
import type { NetworkProvider } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NetworkPage({
  params,
}: {
  params: Promise<{ slug: string; network: string }>;
}) {
  const { slug, network: networkSlug } = await params;
  const network = networkBySlug(networkSlug);
  if (!network) notFound();

  const [storefront, featureSetting] = await Promise.all([
    prisma.storefront.findUnique({ where: { slug } }),
    prisma.systemSetting.findUnique({ where: { key: "storefront_feature_enabled" } }),
  ]);
  if (!storefront || storefront.status !== "ENABLED") notFound();
  if (featureSetting?.value === "false") {
    return (
      <div className="mx-auto mt-20 max-w-md p-8 text-center bg-white dark:bg-[#0b1322] rounded-3xl border border-slate-200 dark:border-[#162740] shadow-2xl">
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Storefronts Temporarily Paused</h2>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Reseller storefront orders are currently paused by administration for scheduled maintenance. Please check back soon.
        </p>
      </div>
    );
  }

  if (!storefront.isActive) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-8 shadow-2xl">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Store Temporarily Paused</h2>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {storefront.name} is not accepting new orders at this time.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href={storeHref(slug)}
              className="inline-flex h-10 items-center rounded-xl bg-[#00df82] px-5 text-xs font-black text-[#041d14] shadow-md shadow-[#00df82]/20 transition-all hover:bg-[#00c572]"
            >
              Back to store
            </Link>
            <Link
              href={storeHref(slug, "track")}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-5 text-xs font-bold text-slate-700 dark:text-white transition-colors hover:bg-slate-200 dark:hover:bg-[#111e33]"
            >
              Track order
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Auto-sync missing active packages with agent's pricing profile
  await syncStorefrontWithPricingProfile(storefront.id, storefront.userId, { force: false });

  const allActiveProducts = await prisma.storefrontProduct.findMany({
    where: { storefrontId: storefront.id, isActive: true, dataPackage: { active: true } },
    include: { dataPackage: true },
  });

  const availableNetworks = NETWORK_ORDER.filter((n) =>
    allActiveProducts.some((p) => p.dataPackage.network === n)
  );

  const products = allActiveProducts.filter((p) => p.dataPackage.network === network);
  if (products.length === 0) notFound();

  products.sort(
    (a, b) => a.dataPackage.gbAmount - b.dataPackage.gbAmount || a.sellingPrice - b.sellingPrice
  );
  const prices = products.map((p) => fromPesewas(p.sellingPrice));
  const brand = NETWORK_BRANDS[network];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      {/* Navigation Breadcrumb & Carrier Quick Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-4 text-xs">
        <nav className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono">
          <Link
            href={storeHref(slug)}
            className="flex items-center gap-1.5 font-bold hover:text-[#00df82] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#00df82]" />
            <span>{storefront.name}</span>
          </Link>
          <span>/</span>
          <span className="font-black text-slate-900 dark:text-white">{brand.label} Bundles</span>
        </nav>

        {/* Carrier Quick Switcher Tabs */}
        {availableNetworks.length > 1 && (
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#070d18] p-1 rounded-xl border border-slate-200 dark:border-[#162740]">
            {availableNetworks.map((net) => {
              const b = NETWORK_BRANDS[net];
              const isCurrent = net === network;
              return (
                <Link
                  key={net}
                  href={networkHref(slug, net)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? "bg-[#00df82] text-[#041d14] font-black shadow-[0_0_12px_rgba(0,223,130,0.3)]"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#111e33]"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${b.tile}`} />
                  <span>{b.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Cyber Carrier Showcase Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#00df82]/10 blur-3xl" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl flex items-center justify-center p-3 shadow-md border border-slate-200 dark:border-[#162740] ${brand.tile}`}>
              <NetworkLogo network={network} className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#00df82]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#00df82] border border-[#00df82]/30 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00df82] animate-pulse" />
                  USSD Switch Active
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {products.length} packages online
                </span>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {brand.label} Non-Expiry Bundles
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Direct SIM crediting across Ghana with automated Mobile Money confirmation.
              </p>
            </div>
          </div>

          {/* Pricing Highlight Pill */}
          <div className="sm:text-right shrink-0 bg-slate-50 dark:bg-[#070d18] p-4 rounded-2xl border border-slate-200 dark:border-[#162740]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-mono">
              Package Range
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
              {ghs(Math.min(...prices))} <span className="text-sm font-normal text-slate-400 dark:text-slate-500">–</span> {ghs(Math.max(...prices))}
            </div>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-[#00df82] flex items-center gap-1 sm:justify-end mt-0.5">
              <Zap className="h-3 w-3 fill-emerald-600 dark:fill-[#00df82]" /> Sub-2s Delivery
            </span>
          </div>
        </div>
      </div>

      {/* Main Packages & Buy Form */}
      <div className="mt-6">
        <NetworkBuyForm
          slug={slug}
          network={network}
          storeName={storefront.name}
          products={products.map((p) => ({
            packageId: p.packageId,
            gbAmount: p.dataPackage.gbAmount,
            name: p.dataPackage.name,
            price: fromPesewas(p.sellingPrice),
          }))}
        />
      </div>
    </div>
  );
}

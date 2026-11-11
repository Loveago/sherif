import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { fromPesewas, syncStorefrontWithPricingProfile } from "@/lib/storefront";
import { NETWORK_ORDER, storeHref } from "@/components/store/brands";
import { buildWhatsAppLink } from "@/lib/storefront-utils";
import { StorefrontPortal } from "@/components/store/storefront-portal";
import type { NetworkProvider } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PublicStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ payment?: string; reference?: string }>;
}) {
  const { slug } = await params;
  const { payment, reference } = await searchParams;

  const [storefront, featureSetting] = await Promise.all([
    prisma.storefront.findUnique({ where: { slug } }),
    prisma.systemSetting.findUnique({ where: { key: "storefront_feature_enabled" } }),
  ]);
  if (!storefront || storefront.status !== "ENABLED") notFound();

  const effectiveWhatsApp = storefront.whatsapp || storefront.phone || null;
  if (featureSetting?.value === "false") {
    return (
      <div className="mx-auto mt-20 max-w-md p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xl">
        <h2 className="text-xl font-black text-slate-900">Storefronts Temporarily Paused</h2>
        <p className="mt-2 text-xs text-slate-500">
          Reseller storefront orders are currently paused by administration for scheduled maintenance. Please check back soon.
        </p>
      </div>
    );
  }

  if (!storefront.isActive) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
            <Clock className="h-8 w-8" />
          </div>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3.5 py-1 text-xs font-bold text-amber-800">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            Store Taking a Break
          </span>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {storefront.name} is Temporarily Paused
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            {storefront.description || "The store owner has temporarily paused new orders. Please check back shortly."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={storeHref(slug, "track")}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#1a56db] px-6 text-sm font-bold text-white shadow-md hover:bg-[#1546b3] transition"
            >
              <Clock className="h-4 w-4" />
              Track existing order
            </Link>
            {effectiveWhatsApp && (
              <a
                href={buildWhatsAppLink(effectiveWhatsApp) || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Chat on WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Auto-sync missing active packages with agent's pricing profile
  await syncStorefrontWithPricingProfile(storefront.id, storefront.userId, { force: false });

  const products = await prisma.storefrontProduct.findMany({
    where: { storefrontId: storefront.id, isActive: true, dataPackage: { active: true } },
    include: { dataPackage: true },
  });

  const groups = NETWORK_ORDER.map((network) => {
    const items = products.filter((p) => p.dataPackage.network === network);
    if (items.length === 0) return null;
    return {
      network: network as NetworkProvider,
      count: items.length,
      min: Math.min(...items.map((p) => fromPesewas(p.sellingPrice))),
    };
  }).filter((g): g is NonNullable<typeof g> => g !== null);

  return (
    <div>
      {/* Payment Feedback Banner */}
      {payment && (
        <div className="mx-auto max-w-xl px-4 pt-3">
          <div
            className={`rounded-2xl px-4 py-3 text-xs font-bold border ${
              payment === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {payment === "success"
              ? `✓ Payment verified! Your bundle is being dispatched to the number you provided.${reference ? ` (Ref: ${reference})` : ""}`
              : "Payment could not be completed. If your Mobile Money was debited, please contact support on WhatsApp with your payment reference."}
          </div>
        </div>
      )}

      {/* ── IMMERSIVE STOREFRONT PORTAL (MATCHING SCREENSHOT) ────────────────── */}
      <StorefrontPortal
        storefront={{
          id: storefront.id,
          name: storefront.name,
          slug: storefront.slug,
          description: storefront.description,
          phone: storefront.phone,
          whatsapp: effectiveWhatsApp,
          whatsappGroupLink: storefront.whatsappGroupLink,
          logoUrl: storefront.logoUrl,
          reviewsEnabled: storefront.reviewsEnabled ?? true,
        }}
        products={products.map((p) => ({
          packageId: p.packageId,
          gbAmount: p.dataPackage.gbAmount,
          name: p.dataPackage.name,
          price: fromPesewas(p.sellingPrice),
          network: p.dataPackage.network as NetworkProvider,
          validity: "90 days",
        }))}
        availableNetworks={groups.map((g) => g.network)}
      />
    </div>
  );
}

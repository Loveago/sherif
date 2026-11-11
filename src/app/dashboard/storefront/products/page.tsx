import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireActiveStorefront, getMarkupBounds, syncStorefrontWithPricingProfile } from "@/lib/storefront";
import { resolveUserWholesalePrice } from "@/lib/orders";
import { PricingEditor } from "./pricing-editor";
import { Package, Sliders, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StorefrontProductsPage() {
  const user = await requireUser();
  const storefront = await requireActiveStorefront(user.id);

  // Auto-sync missing packages or below-cost products with agent's pricing profile
  await syncStorefrontWithPricingProfile(storefront.id, user.id, { force: false });

  const [packages, products, bounds] = await Promise.all([
    prisma.dataPackage.findMany({
      where: { active: true },
      orderBy: [{ network: "asc" }, { gbAmount: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.storefrontProduct.findMany({
      where: { storefrontId: storefront.id },
      include: { dataPackage: true },
      orderBy: [{ dataPackage: { network: "asc" } }, { dataPackage: { gbAmount: "asc" } }],
    }),
    getMarkupBounds(),
  ]);

  const packagesWithCost = (
    await Promise.all(
      packages.map(async (p) => ({
        id: p.id,
        network: p.network,
        gbAmount: p.gbAmount,
        name: p.name,
        cost: await resolveUserWholesalePrice(user, p),
      }))
    )
  ).sort((a, b) => {
    if (a.network !== b.network) return a.network.localeCompare(b.network);
    return a.gbAmount - b.gbAmount;
  });

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00df82]/30 bg-[#00df82]/10 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-[#00df82]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00df82] animate-pulse" />
                Retail Pricing Engine
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">· Instant Commission Clearing</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Products &amp; Retail Pricing Matrix
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Set your own retail selling prices for each bundle displayed on your storefront. You can add whatever profit margin you desire on top of wholesale cost — your margin profit is automatically released to your settlement wallet on successful customer checkout.
            </p>
          </div>
        </div>
      </div>

      <PricingEditor
        packages={packagesWithCost}
        products={products.map((p) => ({
          packageId: p.packageId,
          sellingPrice: p.sellingPrice / 100,
          isActive: p.isActive,
        }))}
        disabled={storefront.status !== "ENABLED"}
      />
    </div>
  );
}

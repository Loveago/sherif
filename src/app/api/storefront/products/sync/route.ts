import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError, apiError } from "@/lib/api-helpers";
import { requireStorefront, syncStorefrontWithPricingProfile } from "@/lib/storefront";
import { resolveUserWholesalePrice } from "@/lib/orders";

/**
 * Reseller endpoint: synchronizes storefront products with the agent's current pricing profile.
 * - Updates existing products to match current profile rates.
 * - Seeds any missing active packages.
 * - Optional `markup` in GHS applied uniformly.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const storefront = await requireStorefront(user.id);
    if (storefront.status !== "ENABLED") return apiError(403, "Storefront is not active");

    const body = await request.json().catch(() => ({}));
    const uniformMarkupGHS = typeof body.markup === "number" ? body.markup : 0;

    const result = await syncStorefrontWithPricingProfile(storefront.id, user.id, {
      force: true,
      uniformMarkupGHS,
    });

    const [products, allPackages] = await Promise.all([
      prisma.storefrontProduct.findMany({
        where: { storefrontId: storefront.id },
        include: { dataPackage: true },
        orderBy: [
          { dataPackage: { network: "asc" } },
          { dataPackage: { gbAmount: "asc" } },
          { dataPackage: { sortOrder: "asc" } },
        ],
      }),
      prisma.dataPackage.findMany({
        where: { active: true },
        orderBy: [{ network: "asc" }, { gbAmount: "asc" }, { sortOrder: "asc" }],
      }),
    ]);

    const packageCosts = (
      await Promise.all(
        allPackages.map(async (pkg) => ({
          id: pkg.id,
          network: pkg.network,
          gbAmount: pkg.gbAmount,
          name: pkg.name,
          cost: await resolveUserWholesalePrice(user, pkg),
        }))
      )
    ).sort((a, b) => {
      if (a.network !== b.network) return a.network.localeCompare(b.network);
      return a.gbAmount - b.gbAmount;
    });

    return NextResponse.json({
      success: true,
      updated: result.updated,
      products,
      packages: packageCosts,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

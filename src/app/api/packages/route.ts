import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError, apiError } from "@/lib/api-helpers";
import { getSetting, resolveUserWholesalePrice } from "@/lib/orders";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const packages = await prisma.dataPackage.findMany({
      where: { active: true },
      orderBy: [{ network: "asc" }, { gbAmount: "asc" }, { sortOrder: "asc" }],
    });

    const showPricesSetting = await getSetting("show_package_prices_to_users", "true");
    const showPrices = showPricesSetting !== "false";

    const data = await Promise.all(
      packages.map(async (p) => {
        const distinctPrice = await resolveUserWholesalePrice(user, p);
        return {
          id: p.id,
          network: p.network,
          name: p.name,
          gbAmount: p.gbAmount,
          description: p.description,
          retailPriceGHS: showPrices ? p.retailPriceGHS : null,
          price: showPrices ? distinctPrice : null,
        };
      })
    );

    const killSwitch = await prisma.systemSetting.findUnique({
      where: { key: "number_submission_page_enabled" },
    });
    const submissionEnabled = killSwitch?.value !== "false";

    return NextResponse.json({ packages: data, submissionEnabled, userBalance: user.balance });
  } catch (err) {
    return handleRouteError(err);
  }
}

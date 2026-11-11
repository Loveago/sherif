import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { StoreChrome } from "@/components/store/store-chrome";
import { NETWORK_ORDER } from "@/components/store/brands";
import { syncStorefrontWithPricingProfile } from "@/lib/storefront";
import type { NetworkProvider } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const storefront = await prisma.storefront.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });

  const title = storefront?.name ? `${storefront.name} · Instant Bundles` : "CleanDataPacks Storefront";
  const description = storefront?.description || "Instant automated telecom data bundles delivered directly to your SIM.";

  return {
    title,
    description,
    icons: {
      icon: [
        { url: "/store/icon.svg", type: "image/svg+xml" },
        { url: "/store/favicon.ico", sizes: "any" },
        { url: "/store/icon.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        { url: "/store/apple-icon.svg", type: "image/svg+xml" },
        { url: "/store/apple-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
  };
}

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [storefront, supportSetting, siteAnnouncementSetting] = await Promise.all([
    prisma.storefront.findUnique({
      where: { slug },
      select: {
        id: true,
        userId: true,
        slug: true,
        name: true,
        description: true,
        logoUrl: true,
        phone: true,
        whatsapp: true,
        whatsappGroupLink: true,
        email: true,
        location: true,
        contactText: true,
        whatsappLabel: true,
        notice: true,
        status: true,
        isActive: true,
      },
    }),
    prisma.systemSetting.findUnique({ where: { key: "support_whatsapp" } }),
    prisma.systemSetting.findUnique({ where: { key: "site_announcement" } }),
  ]);

  // Disabled/unknown stores: skip chrome; the page itself renders notFound().
  if (!storefront || storefront.status !== "ENABLED") {
    return <div className="min-h-screen bg-[#e9ebf5] dark:bg-[#0a101e]">{children}</div>;
  }

  if (storefront.isActive) {
    await syncStorefrontWithPricingProfile(storefront.id, storefront.userId, { force: false });
  }

  const rows = storefront.isActive
    ? await prisma.dataPackage.findMany({
        where: {
          active: true,
          storefrontProducts: { some: { storefrontId: storefront.id, isActive: true } },
        },
        select: { network: true },
        distinct: ["network"],
      })
    : [];
  const networks = rows
    .map((r) => r.network as NetworkProvider)
    .sort((a, b) => NETWORK_ORDER.indexOf(a) - NETWORK_ORDER.indexOf(b));

  const effectiveWhatsApp = storefront.whatsapp || storefront.phone || supportSetting?.value || null;

  return (
    <StoreChrome
      name={storefront.name}
      slug={storefront.slug}
      description={storefront.description}
      logoUrl={storefront.logoUrl}
      whatsapp={effectiveWhatsApp}
      whatsappGroupLink={storefront.whatsappGroupLink}
      email={storefront.email}
      location={storefront.location}
      contactText={storefront.contactText}
      whatsappLabel={storefront.whatsappLabel}
      notice={storefront.notice?.trim() || siteAnnouncementSetting?.value?.trim() || undefined}
      networks={networks}
    >
      {children}
    </StoreChrome>
  );
}

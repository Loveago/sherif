import Link from "next/link";
import {
  Wallet,
  Package,
  Settings,
  ExternalLink,
  Store,
  Clock,
  TrendingUp,
  Hourglass,
  PauseCircle,
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Zap,
  Smartphone,
  Eye,
  Copy,
  Layers,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireActiveStorefront, ensureWallet, fromPesewas, storefrontOrderCode } from "@/lib/storefront";
import { CopyShareButtons } from "@/components/storefront/copy-share-buttons";
import { StoreStatusToggle } from "@/components/storefront/store-status-toggle";
import { RecentOrdersView } from "@/components/storefront/recent-orders-view";
import { cleanDomain, buildStorefrontUrl } from "@/lib/storefront-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StorefrontOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ orderPage?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const orderPage = Math.max(1, parseInt(resolvedParams.orderPage || "1", 10));
  const orderPageSize = 10;

  const user = await requireUser();
  const storefront = await requireActiveStorefront(user.id);
  const wallet = await ensureWallet(user.id);

  const [productCount, activeCount, recentOrders, totalStoreOrders, pendingWithdrawal, completedCount] =
    await Promise.all([
      prisma.storefrontProduct.count({ where: { storefrontId: storefront.id } }),
      prisma.storefrontProduct.count({ where: { storefrontId: storefront.id, isActive: true } }),
      prisma.storefrontOrder.findMany({
        where: { storefrontId: storefront.id },
        orderBy: { createdAt: "desc" },
        skip: (orderPage - 1) * orderPageSize,
        take: orderPageSize,
        include: { product: { include: { dataPackage: true } } },
      }),
      prisma.storefrontOrder.count({ where: { storefrontId: storefront.id } }),
      prisma.storefrontWithdrawal.findFirst({ where: { userId: user.id, status: "PENDING" } }),
      prisma.storefrontOrder.count({
        where: { storefrontId: storefront.id, status: "COMPLETED" },
      }),
    ]);

  const storefrontDomain = cleanDomain(
    process.env.NEXT_PUBLIC_MAIN_DOMAIN || process.env.MAIN_DOMAIN,
    "cleandatapacks.com"
  );
  const storeUrl = buildStorefrontUrl(storefront.slug, storefrontDomain);

  const isLive = storefront.status === "ENABLED" && storefront.isActive;
  const isUserPaused = storefront.status === "ENABLED" && !storefront.isActive;

  return (
    <div className="space-y-6">
      {/* Cyber Merchant Studio Command Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#00df82]/15 blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#00df82] text-[#041d14] font-black shadow-[0_0_25px_rgba(0,223,130,0.35)]">
              <Store className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00df82]/30 bg-[#00df82]/10 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-[#00df82]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00df82] animate-ping" />
                  RESELLER STOREFRONT STUDIO
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                    isLive
                      ? "bg-[#00df82]/15 text-[#00df82] border-[#00df82]/30"
                      : isUserPaused
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                  }`}
                >
                  {isLive ? "LIVE & ACCEPTING ORDERS" : isUserPaused ? "STORE PAUSED" : storefront.status}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {storefront.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#00df82] transition-colors"
                >
                  <span>{storeUrl.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </a>
                <CopyShareButtons url={storeUrl} storeName={storefront.name} />
              </div>
            </div>
          </div>

          {/* Quick Action Button Group */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            <StoreStatusToggle
              initialActive={storefront.isActive}
              storeStatus={storefront.status}
              variant="compact"
            />
            <Link
              href="/dashboard/storefront/products"
              className="rounded-xl bg-[#00df82] px-4 py-2 text-xs font-black text-[#041d14] shadow-[0_0_15px_rgba(0,223,130,0.3)] hover:bg-[#00c572] transition cursor-pointer"
            >
              Configure Prices
            </Link>
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#111e33] hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5 text-[#00df82]" />
              <span>Preview Store</span>
            </a>
          </div>
        </div>
      </div>

      {isUserPaused && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-medium text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <PauseCircle className="h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" />
            <p>
              <strong>Your storefront is currently paused.</strong> Buyers visiting your storefront link will see a maintenance notice until you unpause.
            </p>
          </div>
        </div>
      )}

      {/* Cyber Revenue & Commission Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Commission */}
        <div className="rounded-3xl border border-[#00df82]/30 bg-gradient-to-br from-emerald-500/10 via-white to-slate-50 dark:from-[#0b1322] dark:via-[#091a27] dark:to-[#05131b] p-5 shadow-xl shadow-[#00df82]/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Withdrawable Balance</span>
            <div className="h-8 w-8 rounded-xl bg-[#00df82]/15 border border-[#00df82]/30 flex items-center justify-center text-[#00df82]">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-mono text-2xl sm:text-3xl font-black text-[#00df82] tabular-nums tracking-tight">
              GHS {fromPesewas(wallet.balance).toFixed(2)}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Available to withdraw</span>
              <Link
                href="/dashboard/storefront/wallet"
                className="text-[11px] font-bold text-[#00df82] hover:underline"
              >
                Cash Out →
              </Link>
            </div>
          </div>
        </div>

        {/* Pending Clearance */}
        <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Clearance</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400">
              <Hourglass className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-mono text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              GHS {fromPesewas(wallet.pendingBalance).toFixed(2)}
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Awaiting order completion</p>
          </div>
        </div>

        {/* Active Products */}
        <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Packages</span>
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 dark:text-cyan-400">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-mono text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {activeCount} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">/ {productCount}</span>
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Listed on customer storefront</p>
          </div>
        </div>

        {/* Total Completed Sales */}
        <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Completed Sales</span>
            <div className="h-8 w-8 rounded-xl bg-[#00df82]/10 border border-[#00df82]/20 flex items-center justify-center text-[#00df82]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-mono text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {completedCount}
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Automated USSD deliveries</p>
          </div>
        </div>
      </div>

      {pendingWithdrawal && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-semibold text-amber-800 dark:text-amber-200">
          <Clock className="h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" />
          <p>
            A pending withdrawal of <strong>GHS {fromPesewas(pendingWithdrawal.amount).toFixed(2)}</strong> is currently being processed for payout to your Mobile Money number.
          </p>
        </div>
      )}

      {/* Merchant Command Console Quick Navigation */}
      <section className="space-y-3">
        <h2 className="px-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Reseller Operations Decks
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              href: "/dashboard/storefront/products",
              label: "Retail Pricing Matrix",
              desc: "Set profit margins & markups",
              icon: Package,
              accent: "text-[#00df82] bg-[#00df82]/10 border-[#00df82]/30",
            },
            {
              href: "/dashboard/storefront/wallet",
              label: "Cash Out Wallet",
              desc: "Withdraw profits to MoMo",
              icon: Wallet,
              accent: "text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
            },
            {
              href: "/dashboard/storefront/settings",
              label: "Storefront Settings",
              desc: "Brand logo, domain & WhatsApp",
              icon: Settings,
              accent: "text-sky-500 dark:text-sky-400 bg-sky-500/10 border-sky-500/30",
            },
            {
              href: storeUrl,
              label: "Live Buyer Storefront",
              desc: "Direct link for customer orders",
              icon: ExternalLink,
              external: true,
              accent: "text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/30",
            },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              {...(a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="group rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 transition-all hover:border-[#00df82]/40 hover:bg-slate-50 dark:hover:bg-[#0e192c] hover:shadow-xl hover:shadow-[#00df82]/5 shadow-sm"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${a.accent}`}>
                <a.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-black text-slate-900 dark:text-white group-hover:text-[#00df82] transition-colors">{a.label}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{a.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Storefront Orders Table Desk */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Recent Customer Sales ({totalStoreOrders})
          </h2>
        </div>
        <RecentOrdersView
          orders={recentOrders.map((o) => ({
            id: o.id,
            seq: o.seq,
            paymentReference: o.paymentReference,
            customerPhone: o.customerPhone,
            customerEmail: o.customerEmail,
            sellingPrice: o.sellingPrice,
            commission: o.commission,
            status: o.status,
            createdAt: o.createdAt.toISOString(),
            product: {
              dataPackage: {
                network: o.product.dataPackage.network,
                gbAmount: o.product.dataPackage.gbAmount,
              },
            },
          }))}
          totalOrders={totalStoreOrders}
          page={orderPage}
          pageSize={orderPageSize}
          storeUrl={storeUrl}
        />
      </section>
    </div>
  );
}

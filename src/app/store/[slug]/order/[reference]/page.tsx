import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Search,
  Zap,
  Smartphone,
  ShieldCheck,
  Radio,
  ExternalLink,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { fromPesewas } from "@/lib/storefront";
import { buildWhatsAppLink } from "@/lib/storefront-utils";
import { NETWORK_BRANDS, storeHref } from "@/components/store/brands";
import { NetworkLogo } from "@/components/store/network-logo";
import type { NetworkProvider } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<
  string,
  {
    icon: React.ElementType;
    iconCls: string;
    cardCls: string;
    badgeCls: string;
    label: string;
    message: string;
    step: number;
  }
> = {
  PENDING: {
    icon: Clock,
    iconCls: "text-amber-400",
    cardCls: "bg-amber-500/10 border-amber-500/25 text-amber-200",
    badgeCls: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    label: "Order Queued",
    message: "Payment received. Your order is queued on the telecom switch for SIM crediting.",
    step: 1,
  },
  PROCESSING: {
    icon: Clock,
    iconCls: "text-sky-400",
    cardCls: "bg-sky-500/10 border-sky-500/25 text-sky-200",
    badgeCls: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    label: "Dispatching to SIM",
    message: "Packet is actively routing through the telecom USSD pipeline. Crediting takes ~1-3 mins.",
    step: 2,
  },
  COMPLETED: {
    icon: CheckCircle2,
    iconCls: "text-[#00df82]",
    cardCls: "bg-[#00df82]/10 border-[#00df82]/25 text-[#00df82]",
    badgeCls: "bg-[#00df82]/20 text-[#00df82] border-[#00df82]/30",
    label: "Delivered to SIM",
    message: "Your non-expiry data package has been credited to your SIM line. Enjoy!",
    step: 3,
  },
  SUCCESS: {
    icon: CheckCircle2,
    iconCls: "text-[#00df82]",
    cardCls: "bg-[#00df82]/10 border-[#00df82]/25 text-[#00df82]",
    badgeCls: "bg-[#00df82]/20 text-[#00df82] border-[#00df82]/30",
    label: "Delivered to SIM",
    message: "Your non-expiry data package has been credited to your SIM line. Enjoy!",
    step: 3,
  },
  FAILED: {
    icon: XCircle,
    iconCls: "text-rose-400",
    cardCls: "bg-rose-500/10 border-rose-500/25 text-rose-200",
    badgeCls: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    label: "Delivery Failed",
    message: "Delivery could not complete automatically. Please contact the store with your reference number.",
    step: 2,
  },
  CANCELLED: {
    icon: XCircle,
    iconCls: "text-slate-400",
    cardCls: "bg-slate-500/10 border-slate-500/20 text-slate-300",
    badgeCls: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    label: "Order Cancelled",
    message: "This order was cancelled. Please contact the store if you have questions.",
    step: 1,
  },
  REFUNDED: {
    icon: AlertCircle,
    iconCls: "text-purple-400",
    cardCls: "bg-purple-500/10 border-purple-500/25 text-purple-200",
    badgeCls: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    label: "Refunded",
    message: "This order has been refunded. Please contact the store if you have questions.",
    step: 1,
  },
};

export default async function OrderReferencePage({
  params,
}: {
  params: Promise<{ slug: string; reference: string }>;
}) {
  const { slug, reference } = await params;

  let order = await prisma.storefrontOrder.findFirst({
    where: {
      paymentReference: reference,
      storefront: { slug },
    },
    include: {
      product: { include: { dataPackage: true } },
      storefront: true,
      underlyingOrder: true,
    },
  });

  if (!order && /^\d+$/.test(reference)) {
    order = await prisma.storefrontOrder.findFirst({
      where: {
        seq: parseInt(reference, 10),
        storefront: { slug },
      },
      include: {
        product: { include: { dataPackage: true } },
        storefront: true,
        underlyingOrder: true,
      },
    });
  }

  if (!order) notFound();

  // Active status sync
  if (order.status === "PENDING" && order.paymentReference) {
    try {
      const { verifyAndSettleStorefrontOrder } = await import("@/lib/storefront");
      const updated = await verifyAndSettleStorefrontOrder(order.paymentReference);
      if (updated?.settled) {
        order.status = "PROCESSING";
      }
    } catch (err) {
      console.error("Storefront order verify error:", err);
    }
  }

  if (order.underlyingOrder && (order.underlyingOrder.status === "PENDING" || order.underlyingOrder.status === "PROCESSING")) {
    try {
      const { syncTskconnectOrder } = await import("@/lib/provider-apis/router");
      const syncRes = await syncTskconnectOrder(order.underlyingOrder, "Storefront Order Page Sync");
      if (syncRes.changed && syncRes.newStatus) {
        order.underlyingOrder.status = syncRes.newStatus;
      }
    } catch (syncErr) {
      console.error("Storefront order sync error:", syncErr);
    }
  }

  let effectiveStatus = order.status;
  if (order.underlyingOrder) {
    effectiveStatus = order.underlyingOrder.status === "SUCCESS" ? "COMPLETED" : order.underlyingOrder.status;
  }

  const cfg = STATUS_CONFIG[effectiveStatus] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = cfg.icon;
  const network = order.product.dataPackage.network as NetworkProvider;
  const brand = NETWORK_BRANDS[network] || NETWORK_BRANDS.MTN;
  const gbAmount = order.product.dataPackage.gbAmount;
  const amountGhs = fromPesewas(order.sellingPrice);
  const paystackFee = Math.round(amountGhs * 0.02 * 100) / 100;
  const totalPaid = Math.round((amountGhs + paystackFee) * 100) / 100;

  const isDelivered = effectiveStatus === "COMPLETED" || effectiveStatus === "SUCCESS";
  const isFailed = effectiveStatus === "FAILED" || effectiveStatus === "CANCELLED";

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      {/* Back link */}
      <div className="mb-6 flex items-center justify-between font-mono text-xs">
        <Link
          href={storeHref(slug)}
          className="inline-flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400 hover:text-[#00df82] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-[#00df82]" />
          Back to {order.storefront.name}
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00df82]/30 bg-[#00df82]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#00df82]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00df82] animate-pulse" />
          Telecom Switch Active
        </span>
      </div>

      {/* Main Elevated Receipt Container */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] shadow-2xl backdrop-blur-2xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#00df82]/15 blur-3xl" />

        {/* Hero Status Banner */}
        <div className={`border-b border-slate-200 dark:border-[#162740] p-6 sm:p-8 ${cfg.cardCls}`}>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#070d18] border border-slate-200 dark:border-[#162740] shadow-md">
              <StatusIcon className={`h-6 w-6 ${cfg.iconCls}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${cfg.badgeCls}`}>
                  {cfg.label}
                </span>
              </div>
              <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed opacity-90">
                {cfg.message}
              </p>
            </div>
          </div>

          {/* Visual 3-Stage Progress Timeline */}
          <div className="mt-6 pt-5 border-t border-current/15">
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold font-mono">
              {/* Step 1: Payment */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00df82] text-[#041d14]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <span className="text-slate-900 dark:text-white">1. MoMo Cleared</span>
              </div>

              {/* Step 2: Gateway */}
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    isDelivered
                      ? "bg-[#00df82] text-[#041d14]"
                      : isFailed
                      ? "bg-rose-500 text-white"
                      : "bg-sky-500 text-white animate-pulse"
                  }`}
                >
                  <Radio className="h-3 w-3" />
                </span>
                <span className="text-slate-900 dark:text-white">2. USSD Routing</span>
              </div>

              {/* Step 3: Credited */}
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    isDelivered
                      ? "bg-[#00df82] text-[#041d14]"
                      : "bg-slate-100 dark:bg-[#070d18] border border-slate-300 dark:border-[#162740] text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <Smartphone className="h-3 w-3" />
                </span>
                <span className="text-slate-900 dark:text-white">3. SIM Credited</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Details Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#162740] pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                Dispatched Package
              </span>
              <div className="mt-1 flex items-center gap-2.5">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center p-1.5 shadow-sm border border-slate-200 dark:border-[#162740] ${brand.tile}`}>
                  <NetworkLogo network={network} className="h-full w-full object-contain" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    {gbAmount} GB {brand.label}
                  </h2>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-[#00df82]">
                    Non-Expiry Telecom Data
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                Amount Paid
              </span>
              <p className="mt-0.5 text-2xl font-black font-mono text-emerald-600 dark:text-[#00df82]">
                ₵{totalPaid.toFixed(2)}
              </p>
              <span className="text-[10px] text-slate-500 font-mono block">incl. 2% MoMo fee</span>
            </div>
          </div>

          {/* Breakdown Rows */}
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-[#070d18] p-3 border border-slate-200 dark:border-[#162740]">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Recipient Phone Line</span>
              <span className="font-mono text-sm font-black text-slate-900 dark:text-white tracking-wide">
                {order.customerPhone}
              </span>
            </div>

            {order.customerEmail && (
              <div className="flex items-center justify-between px-3">
                <span className="text-slate-500 dark:text-slate-400">Receipt Email</span>
                <span className="font-mono text-slate-900 dark:text-white">{order.customerEmail}</span>
              </div>
            )}

            <div className="flex items-center justify-between px-3">
              <span className="text-slate-500 dark:text-slate-400">Bundle Price</span>
              <span className="font-mono text-slate-900 dark:text-white">₵{amountGhs.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between px-3">
              <span className="text-slate-500 dark:text-slate-400">Paystack MoMo Processing Fee</span>
              <span className="font-mono text-emerald-600 dark:text-[#00df82]">+₵{paystackFee.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-[#070d18] p-3 border border-slate-200 dark:border-[#162740]">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Payment Reference</span>
              <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 select-all">
                {reference}
              </span>
            </div>

            <div className="flex items-center justify-between px-3">
              <span className="text-slate-500 dark:text-slate-400">Order Placed</span>
              <span className="font-mono text-slate-500 dark:text-slate-400">
                {new Date(order.createdAt).toLocaleString("en-GH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          </div>

          {/* Action Button Row */}
          <div className="flex flex-col gap-2.5 sm:flex-row pt-2">
            <Link
              href={storeHref(slug, "track")}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] py-3 text-xs font-bold text-slate-900 dark:text-white transition hover:bg-slate-200 dark:hover:bg-[#111e33] cursor-pointer"
            >
              <Search className="h-3.5 w-3.5 text-[#00df82]" />
              <span>Track SIM Status</span>
            </Link>
            <Link
              href={storeHref(slug)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#00df82] py-3 text-xs font-black text-[#041d14] shadow-[0_0_15px_rgba(0,223,130,0.3)] transition hover:bg-[#00c572] cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 fill-[#041d14]" />
              <span>Buy Another Bundle</span>
            </Link>
          </div>

          {/* WhatsApp Support Link if store has WhatsApp or phone */}
          {(() => {
            const waNumber = order.storefront.whatsapp || order.storefront.phone;
            const waLink = buildWhatsAppLink(
              waNumber,
              `Hello, I have a question about order ${reference} for ${order.customerPhone}`
            );
            if (!waLink) return null;
            return (
              <div className="text-center pt-1">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00df82] hover:underline"
                >
                  <span>Need help? Chat with {order.storefront.name} on WhatsApp</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

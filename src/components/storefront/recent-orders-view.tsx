"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, ChevronLeft, ChevronRight, Phone, Mail, DollarSign, Activity, ShoppingCart } from "lucide-react";
import { fromPesewas, storefrontOrderCode } from "@/lib/storefront-utils";

export interface StorefrontOrderData {
  id: string;
  seq: number;
  paymentReference: string;
  customerPhone: string;
  customerEmail: string | null;
  sellingPrice: number;
  commission: number;
  status: string;
  createdAt: string;
  product: {
    dataPackage: {
      network: string;
      gbAmount: number;
    };
  };
}

const ORDER_BADGES: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING: {
    label: "Awaiting MoMo",
    cls: "border border-amber-500/30 bg-amber-500/10 text-amber-400",
    dot: "bg-amber-400",
  },
  PROCESSING: {
    label: "Fulfilling USSD",
    cls: "border border-sky-500/30 bg-sky-500/10 text-sky-400",
    dot: "bg-sky-400 animate-pulse",
  },
  COMPLETED: {
    label: "Delivered",
    cls: "border border-[#00df82]/30 bg-[#00df82]/10 text-[#00df82]",
    dot: "bg-[#00df82]",
  },
  FAILED: {
    label: "Failed",
    cls: "border border-red-500/30 bg-red-500/10 text-red-400",
    dot: "bg-red-400",
  },
  REFUNDED: {
    label: "Refunded",
    cls: "border border-purple-500/30 bg-purple-500/10 text-purple-300",
    dot: "bg-purple-400",
  },
};

const NETWORK_BADGES: Record<string, string> = {
  MTN: "border border-amber-500/30 bg-amber-500/10 text-amber-300",
  TELECEL: "border border-rose-500/30 bg-rose-500/10 text-rose-300",
  AIRTELTIGO: "border border-sky-500/30 bg-sky-500/10 text-sky-300",
};

function StatusBadge({ status }: { status: string }) {
  const meta = ORDER_BADGES[status] ?? {
    label: status,
    cls: "border border-slate-700 bg-slate-800 text-slate-300",
    dot: "bg-slate-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${meta.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function RecentOrdersView({
  orders,
  totalOrders,
  page,
  pageSize = 10,
  storeUrl,
}: {
  orders: StorefrontOrderData[];
  totalOrders: number;
  page: number;
  pageSize?: number;
  storeUrl: string;
}) {
  const router = useRouter();
  const totalPages = Math.ceil(totalOrders / pageSize) || 1;

  function goToPage(p: number) {
    const next = Math.max(1, Math.min(totalPages, p));
    const url = new URL(window.location.href);
    url.searchParams.set("orderPage", String(next));
    router.push(url.pathname + url.search);
  }

  if (totalOrders === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-12 text-center shadow-xl">
        <ShoppingCart className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-600" />
        <p className="mt-3 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">No Customer Sales Yet</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Share your public storefront link{" "}
          <span className="font-mono font-bold text-[#00df82]">{storeUrl}</span> with your customers to begin receiving automated orders.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] shadow-xl">
      {/* Mobile Card List (sm:hidden) */}
      <div className="divide-y divide-slate-100 dark:divide-[#162740]/60 sm:hidden">
        {orders.map((o) => {
          const code = storefrontOrderCode(o.seq, o.paymentReference);
          const network = o.product.dataPackage.network;
          const gb = o.product.dataPackage.gbAmount;

          return (
            <div key={o.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-cyan-600 dark:text-cyan-400">
                  {code}
                </span>
                <StatusBadge status={o.status} />
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${NETWORK_BADGES[network] || "bg-slate-100 dark:bg-[#070d18] text-slate-700 dark:text-slate-300"}`}>
                    {network}
                  </span>
                  <span className="font-black text-slate-900 dark:text-white">{gb} GB Data Pack</span>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  {new Date(o.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Target MSISDN:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{o.customerPhone}</span>
                </div>
                {o.customerEmail && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="uppercase tracking-wider text-slate-500 dark:text-slate-400">Buyer Email:</span>
                    <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{o.customerEmail}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-[#162740]/60 text-xs font-mono">
                <div>
                  <span className="text-[11px] text-slate-500 uppercase">Paid: </span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">GHS {fromPesewas(o.sellingPrice).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase">Reseller Margin: </span>
                  <span className="font-black text-[#00df82]">+GHS {fromPesewas(o.commission).toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View (hidden sm:block) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18]/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="px-5 py-3.5">Order Code</th>
              <th className="px-5 py-3.5">Bundle Plan</th>
              <th className="px-5 py-3.5">Customer MSISDN</th>
              <th className="px-5 py-3.5">Retail Price</th>
              <th className="px-5 py-3.5">Your Margin</th>
              <th className="px-5 py-3.5 text-right">Fulfillment Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#162740]/60 font-mono">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-[#0e192d]/50 transition-colors">
                <td className="px-5 py-3.5">
                  <span className="font-black text-cyan-600 dark:text-cyan-400">
                    {storefrontOrderCode(o.seq, o.paymentReference)}
                  </span>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                    {new Date(o.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${NETWORK_BADGES[o.product.dataPackage.network] || "bg-slate-100 dark:bg-[#070d18]"}`}>
                      {o.product.dataPackage.network}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{o.product.dataPackage.gbAmount} GB</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <p className="font-bold text-slate-900 dark:text-white">{o.customerPhone}</p>
                  {o.customerEmail && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[170px] truncate font-sans" title={o.customerEmail}>
                      {o.customerEmail}
                    </p>
                  )}
                </td>
                <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-bold">
                  GHS {fromPesewas(o.sellingPrice).toFixed(2)}
                </td>
                <td className="px-5 py-3.5 font-black text-[#00df82]">
                  +GHS {fromPesewas(o.commission).toFixed(2)}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <StatusBadge status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-[#162740] p-4 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Page <strong className="text-slate-900 dark:text-white">{page}</strong> of <strong className="text-slate-900 dark:text-white">{totalPages}</strong> ({totalOrders} customer sales)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-3.5 py-1.5 font-bold text-slate-700 dark:text-slate-300 hover:border-[#00df82]/40 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-3.5 py-1.5 font-bold text-slate-700 dark:text-slate-300 hover:border-[#00df82]/40 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 transition cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

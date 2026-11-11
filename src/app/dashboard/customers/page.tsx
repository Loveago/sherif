"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Zap,
  ArrowUpDown,
  PhoneCall,
  Repeat,
  ShoppingBag,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { formatGHS, formatDateTime } from "@/lib/types";
import { useToast } from "@/components/toast";

interface CustomerRecord {
  phoneNumber: string;
  network: string;
  totalOrders: number;
  successfulOrders: number;
  totalSpend: number;
  totalVolumeGb: number;
  lastOrderDate: string;
  lastBundle: string;
}

interface CustomerStats {
  totalCustomers: number;
  repeatCustomers: number;
  totalOrders: number;
  totalSpend: number;
}

export default function CustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = React.useState<CustomerRecord[]>([]);
  const [stats, setStats] = React.useState<CustomerStats>({
    totalCustomers: 0,
    repeatCustomers: 0,
    totalOrders: 0,
    totalSpend: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [networkFilter, setNetworkFilter] = React.useState<string>("ALL");

  const fetchCustomers = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (networkFilter !== "ALL") params.set("network", networkFilter);

      const res = await fetch(`/api/customers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load customers");
      const data = await res.json();
      setCustomers(data.customers || []);
      setStats(
        data.stats || {
          totalCustomers: 0,
          repeatCustomers: 0,
          totalOrders: 0,
          totalSpend: 0,
        }
      );
    } catch {
      toast("Failed to load customer list", "error");
    } finally {
      setLoading(false);
    }
  }, [search, networkFilter, toast]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const getNetworkBadge = (network: string) => {
    const upper = network.toUpperCase();
    if (upper.includes("MTN")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/15 px-2 py-0.5 text-[11px] font-black text-amber-500 dark:text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          MTN
        </span>
      );
    }
    if (upper.includes("TELECEL") || upper.includes("VODA")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-[11px] font-black text-rose-500 dark:text-rose-400">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          TELECEL
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 px-2 py-0.5 text-[11px] font-black text-sky-500 dark:text-sky-400">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
        AIRTELTIGO
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 p-5 sm:p-6 shadow-sm backdrop-blur-xl dark:border-[#162740] dark:bg-[#0b1322]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00df82]/30 bg-[#00df82]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#00df82]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00df82] animate-pulse" />
                Customer & Recipient Directory
              </span>
              <span className="text-[10px] font-bold text-slate-400">· Real-time Phone Insights</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Customers &amp; Recipients
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Track recipient transaction history, frequent phone numbers, and repeat buyer volumes across all telecom carriers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/buy-now"
              className="inline-flex items-center gap-2 rounded-xl bg-[#00df82] px-4 py-2 text-xs font-black text-[#041d14] shadow-[0_0_20px_rgba(0,223,130,0.3)] transition hover:bg-[#00c572]"
            >
              <Zap className="h-3.5 w-3.5 fill-[#041d14]" />
              New Bundle Dispatch
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm dark:border-[#162740] dark:bg-[#0b1322]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Recipients</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00df82]/10 text-[#00df82]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {stats.totalCustomers}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">Unique phone numbers</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm dark:border-[#162740] dark:bg-[#0b1322]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Repeat Buyers</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
              <Repeat className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {stats.repeatCustomers}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">&gt; 1 successful order</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm dark:border-[#162740] dark:bg-[#0b1322]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Dispatched</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {stats.totalOrders}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">Bundles delivered</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm dark:border-[#162740] dark:bg-[#0b1322]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Volume Spent</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00df82]/10 text-[#00df82]">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {formatGHS(stats.totalSpend)}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">Recipient spend</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer phone number (e.g. 0559876543)..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#00df82] focus:outline-none focus:ring-1 focus:ring-[#00df82] dark:border-[#162740] dark:bg-[#070d18] dark:text-white"
          />
        </div>

        {/* Network Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "MTN", "TELECEL", "AIRTELTIGO"].map((net) => {
            const active = networkFilter === net;
            return (
              <button
                key={net}
                onClick={() => setNetworkFilter(net)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                  active
                    ? "bg-[#00df82] text-[#041d14] shadow-[0_0_12px_rgba(0,223,130,0.3)]"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[#162740] dark:bg-[#070d18] dark:text-slate-300 dark:hover:bg-[#111e33]"
                }`}
              >
                {net === "ALL" ? "All Networks" : net}
              </button>
            );
          })}
        </div>
      </div>

      {/* Customers Table / Mobile Cards */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 shadow-sm dark:border-[#162740] dark:bg-[#0b1322]">
        {/* Mobile Customer Cards (sm:hidden) */}
        <div className="block sm:hidden divide-y divide-slate-100 dark:divide-[#162740]">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <div className="inline-flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00df82] border-t-transparent" />
                <span className="text-xs">Loading recipient directory...</span>
              </div>
            </div>
          ) : customers.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#070d18] text-slate-400">
                <Users className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                No customer records found
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {search
                  ? `No phone numbers matched "${search}".`
                  : "Numbers you dispatch data bundles to will automatically show up here."}
              </p>
            </div>
          ) : (
            customers.map((c) => (
              <div key={c.phoneNumber} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="h-3.5 w-3.5 text-[#00df82]" />
                    <span className="font-mono text-sm font-black text-slate-900 dark:text-white">{c.phoneNumber}</span>
                  </div>
                  {getNetworkBadge(c.network)}
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] p-2.5 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Orders</span>
                    <span className="font-mono text-xs font-black text-slate-900 dark:text-white">{c.totalOrders}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Delivered</span>
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{c.totalVolumeGb > 0 ? `${c.totalVolumeGb} GB` : "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Spend</span>
                    <span className="font-mono text-xs font-black text-emerald-600 dark:text-[#00df82]">{formatGHS(c.totalSpend)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Last: {formatDateTime(c.lastOrderDate)}
                  </span>
                  <Link
                    href={`/dashboard/buy-now?phone=${encodeURIComponent(c.phoneNumber)}&network=${encodeURIComponent(c.network)}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#00df82] px-3 py-1.5 text-xs font-black text-[#041d14] shadow-md shadow-[#00df82]/20"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Send Bundle
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-[#162740] dark:bg-[#070d18] dark:text-slate-400">
                <th className="px-5 py-3.5">Recipient Number</th>
                <th className="px-4 py-3.5">Network</th>
                <th className="px-4 py-3.5">Orders Count</th>
                <th className="px-4 py-3.5">Data Delivered</th>
                <th className="px-4 py-3.5">Total Spend</th>
                <th className="px-4 py-3.5">Last Dispatched</th>
                <th className="px-5 py-3.5 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#162740]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00df82] border-t-transparent" />
                      <span>Loading recipient directory...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#070d18] text-slate-400">
                      <Users className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                      No customer records found
                    </p>
                    <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                      {search
                        ? `No phone numbers matched "${search}". Clear the search query to view all records.`
                        : "Numbers you dispatch data bundles to will automatically show up here with full order history."}
                    </p>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.phoneNumber}
                    className="transition hover:bg-slate-50/60 dark:hover:bg-[#111e33]/50"
                  >
                    <td className="px-5 py-4 font-black text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="h-3.5 w-3.5 text-[#00df82]" />
                        <span className="font-mono text-sm tracking-wide">{c.phoneNumber}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">{getNetworkBadge(c.network)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-800 dark:text-slate-100">
                          {c.totalOrders}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ({c.successfulOrders} fulfilled)
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300">
                      {c.totalVolumeGb > 0 ? `${c.totalVolumeGb} GB` : "—"}
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-[#00df82]">
                      {formatGHS(c.totalSpend)}
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-[11px]">
                      {formatDateTime(c.lastOrderDate)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/dashboard/buy-now?phone=${encodeURIComponent(c.phoneNumber)}&network=${encodeURIComponent(c.network)}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#00df82]/30 bg-[#00df82]/10 px-3 py-1.5 text-xs font-bold text-[#00df82] transition hover:bg-[#00df82] hover:text-[#041d14]"
                      >
                        <Zap className="h-3 w-3" />
                        Send Bundle
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

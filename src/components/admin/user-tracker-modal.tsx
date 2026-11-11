"use client";

import * as React from "react";
import {
  X,
  RefreshCw,
  ShoppingBag,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Store,
  Share2,
  Copy,
  Check,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Spinner } from "@/components/shared";
import { useToast } from "@/components/toast";
import Link from "next/link";

export interface UserTrackerModalProps {
  userId: string | null;
  onClose: () => void;
}

interface ActivityData {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    balance: number;
    affiliateBalance: number;
    affiliateCode: string | null;
    createdAt: string;
    lastLoginAt: string | null;
    pricingProfile: { id: string; name: string; type: string } | null;
    parentAgent: { id: string; name: string; email: string; phone: string | null; role: string } | null;
    subAgentsCount: number;
    ordersCount: number;
    storefront: { id: string; name: string; slug: string; status: string } | null;
    storefrontWallet: { balance: number; pendingBalance: number } | null;
    totalCommissionsEarned: number;
  };
  financialStats: {
    balance: number;
    totalIn: number;
    totalOut: number;
    netFlow: number;
    isReconciled: boolean;
    totalTopups: number;
    topupsCount: number;
    totalDebits: number;
    debitsCount: number;
    totalRefunds: number;
    refundsCount: number;
    totalAdjCredits: number;
    totalAdjDebits: number;
  };
  salesStats: {
    totalOrdersCount: number;
    successOrdersCount: number;
    failedOrdersCount: number;
    processingOrdersCount: number;
    successRate: number;
    totalSpend: number;
    totalGb: number;
    networks: Array<{ network: string; count: number; amount: number; gbAmount: number }>;
    channels: Array<{ source: string; count: number; amount: number }>;
  };
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    reference: string | null;
    note: string | null;
    createdAt: string;
    sendClaim?: {
      id: string;
      transactionReference: string;
      senderPhone: string;
      status: string;
    } | null;
  }>;
  orders: Array<{
    id: number;
    phoneNumber: string;
    network: string;
    gbAmount: number;
    amount: number;
    status: string;
    source: string;
    externalReference: string | null;
    createdAt: string;
    dataPackage?: { name: string } | null;
  }>;
}

export function UserTrackerModal({ userId, onClose }: UserTrackerModalProps) {
  const { toast } = useToast();
  const [data, setData] = React.useState<ActivityData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"sales" | "wallet" | "storefront">("sales");
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  // Orders filters
  const [orderSearch, setOrderSearch] = React.useState("");
  const [orderNetwork, setOrderNetwork] = React.useState("ALL");
  const [orderStatus, setOrderStatus] = React.useState("ALL");

  // Wallet tx filters
  const [txType, setTxType] = React.useState("ALL");
  const [txStatus, setTxStatus] = React.useState("ALL");

  const loadData = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/activity`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load user activity");
      }
      setData(json);
    } catch (err: any) {
      toast(err.message || "Failed to load user activity", "error");
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
      loadData();
    } else {
      setData(null);
    }
  }, [userId, loadData]);

  // Handle escape key
  React.useEffect(() => {
    if (!userId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [userId, onClose]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
    toast(`Copied ${label} to clipboard`, "success");
  };

  // Filtered orders
  const filteredOrders = React.useMemo(() => {
    if (!data?.orders) return [];
    return data.orders.filter((order) => {
      const matchSearch =
        !orderSearch ||
        order.phoneNumber.includes(orderSearch) ||
        String(order.id).includes(orderSearch) ||
        (order.externalReference && order.externalReference.toLowerCase().includes(orderSearch.toLowerCase()));
      const matchNetwork = orderNetwork === "ALL" || order.network.toUpperCase() === orderNetwork;
      const matchStatus = orderStatus === "ALL" || order.status.toUpperCase() === orderStatus;
      return matchSearch && matchNetwork && matchStatus;
    });
  }, [data?.orders, orderSearch, orderNetwork, orderStatus]);

  // Filtered transactions
  const filteredTransactions = React.useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions.filter((tx) => {
      const matchType = txType === "ALL" || tx.type.toUpperCase() === txType;
      const matchStatus = txStatus === "ALL" || tx.status.toUpperCase() === txStatus;
      return matchType && matchStatus;
    });
  }, [data?.transactions, txType, txStatus]);

  if (!userId) return null;

  const getNetworkStyle = (net: string) => {
    const u = net.toUpperCase();
    if (u === "MTN") return "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30";
    if (u === "AIRTELTIGO") return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";
    if (u === "TELECEL") return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
    return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30";
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#070d18] text-slate-900 dark:text-slate-200 shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#14233a] bg-slate-50 dark:bg-[#0a1220] flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00df82]/20 to-cyan-500/20 text-[#00df82] border border-[#00df82]/30 shadow-inner">
              <ShoppingBag className="h-6 w-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {data?.user.name || "User Activity Tracker"}
                </h2>
                {data?.user.role && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#00df82]/15 text-[#00df82] border border-[#00df82]/30">
                    {data.user.role}
                  </span>
                )}
                {data?.user.status && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      data.user.status === "ACTIVE"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {data.user.status}
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  {data?.user.email}
                  <button
                    type="button"
                    onClick={() => handleCopy(data!.user.email, "Email")}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition ml-0.5"
                    title="Copy email"
                  >
                    {copiedText === "Email" ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </span>

                {data?.user.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    {data.user.phone}
                  </span>
                )}

                {data?.user.createdAt && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Calendar className="h-3 w-3" />
                    Joined {new Date(data.user.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Upline or Downline Indicators */}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                {data?.user.parentAgent && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-cyan-700 dark:text-cyan-300">
                    <span className="text-slate-500 dark:text-slate-400 font-normal">Referred by Main Agent:</span>
                    <strong className="font-bold">{data.user.parentAgent.name}</strong>
                    <span className="text-cyan-600 dark:text-cyan-400 font-mono">({data.user.parentAgent.email})</span>
                  </div>
                )}

                {data?.user.affiliateCode && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                    <span className="text-slate-500 dark:text-slate-400 font-normal">Affiliate Code:</span>
                    <strong className="font-mono font-bold text-slate-900 dark:text-white">{data.user.affiliateCode}</strong>
                    <span className="text-slate-500 dark:text-slate-400">({data.user.subAgentsCount} Sub-Agents)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#14233a] border border-slate-200 dark:border-[#14233a] transition"
              title="Refresh activity"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-[#00df82]" : ""}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#14233a] border border-slate-200 dark:border-[#14233a] transition"
              title="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* LOADING SPINNER */}
        {loading && !data && (
          <div className="flex-1 flex flex-col items-center justify-center p-16 space-y-3">
            <Spinner className="h-8 w-8 text-[#00df82]" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Loading user sales & wallet ledger…</p>
          </div>
        )}

        {data && (
          <>
            {/* KPI STAT CARDS BAR */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/80 dark:bg-[#091220] border-b border-slate-200 dark:border-[#14233a] shrink-0">
              <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] p-3 space-y-1 shadow-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>Main Wallet</span>
                  <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
                  GH₵ {data.financialStats.balance.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                  {data.financialStats.isReconciled ? (
                    <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                      <ShieldCheck className="h-3 w-3" /> Reconciled
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-0.5">
                      <AlertTriangle className="h-3 w-3" /> Net: GH₵{data.financialStats.netFlow.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] p-3 space-y-1 shadow-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>Sales Volume</span>
                  <ShoppingBag className="h-3.5 w-3.5 text-cyan-500" />
                </div>
                <div className="text-lg font-black font-mono text-cyan-600 dark:text-cyan-400">
                  GH₵ {data.salesStats.totalSpend.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {data.salesStats.successOrdersCount} successful orders
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] p-3 space-y-1 shadow-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>Data Delivered</span>
                  <Layers className="h-3.5 w-3.5 text-purple-500" />
                </div>
                <div className="text-lg font-black font-mono text-purple-600 dark:text-purple-300">
                  {data.salesStats.totalGb.toFixed(1)} GB
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Success rate: {data.salesStats.successRate}%
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] p-3 space-y-1 shadow-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>Affiliate Wallet</span>
                  <Share2 className="h-3.5 w-3.5 text-[#00df82]" />
                </div>
                <div className="text-lg font-black font-mono text-[#00df82]">
                  GH₵ {data.user.affiliateBalance.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Earned: GH₵{data.user.totalCommissionsEarned.toFixed(2)}
                </div>
              </div>
            </div>

            {/* TAB SELECTION */}
            <div className="px-5 pt-3 border-b border-slate-200 dark:border-[#14233a] flex items-center gap-2 bg-slate-100/70 dark:bg-[#08101d] shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("sales")}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "sales"
                    ? "border-[#00df82] text-slate-950 dark:text-[#00df82] bg-white dark:bg-[#00df82]/10 shadow-xs"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Sales & Orders ({data.salesStats.totalOrdersCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("wallet")}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "wallet"
                    ? "border-[#00df82] text-slate-950 dark:text-[#00df82] bg-white dark:bg-[#00df82]/10 shadow-xs"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Wallet className="h-3.5 w-3.5" />
                <span>Wallet Ledger ({data.transactions.length})</span>
              </button>

              {data.user.storefront && (
                <button
                  type="button"
                  onClick={() => setActiveTab("storefront")}
                  className={`px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "storefront"
                      ? "border-[#00df82] text-slate-950 dark:text-[#00df82] bg-white dark:bg-[#00df82]/10 shadow-xs"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Store className="h-3.5 w-3.5" />
                  <span>Storefront Hub</span>
                </button>
              )}
            </div>

            {/* TAB BODY (SCROLLABLE) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 1: SALES & ORDERS */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === "sales" && (
                <div className="space-y-4">
                  {/* Network Volume Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {["MTN", "AIRTELTIGO", "TELECEL"].map((net) => {
                      const found = data.salesStats.networks.find((n) => n.network.toUpperCase() === net);
                      const count = found?.count ?? 0;
                      const amount = found?.amount ?? 0;
                      const gb = found?.gbAmount ?? 0;

                      return (
                        <div
                          key={net}
                          className={`rounded-2xl border p-3 flex items-center justify-between ${getNetworkStyle(
                            net
                          )}`}
                        >
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">
                              {net}
                            </span>
                            <span className="text-base font-black font-mono">
                              GH₵ {amount.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-right text-xs font-mono">
                            <span className="font-bold block">{count} orders</span>
                            <span className="text-[10px] opacity-75">{gb.toFixed(1)} GB</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Channel Breakdown Pill Badges */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px]">Sales Channels:</span>
                    {data.salesStats.channels.map((c) => (
                      <span
                        key={c.source}
                        className="rounded-lg bg-slate-50 dark:bg-[#0a1220] border border-slate-200 dark:border-[#14233a] px-2.5 py-1 font-mono text-[11px] text-slate-700 dark:text-slate-300"
                      >
                        <strong className="text-slate-900 dark:text-white">{c.source}</strong>: {c.count} orders (GH₵{c.amount.toFixed(2)})
                      </span>
                    ))}
                  </div>

                  {/* Orders Filter Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search phone or reference…"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        className="w-full bg-white dark:bg-[#0a1220] border border-slate-200 dark:border-[#14233a] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-[#00df82]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={orderNetwork}
                        onChange={(e) => setOrderNetwork(e.target.value)}
                        className="bg-white dark:bg-[#0a1220] border border-slate-200 dark:border-[#14233a] rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-[#00df82]"
                      >
                        <option value="ALL">All Networks</option>
                        <option value="MTN">MTN</option>
                        <option value="AIRTELTIGO">AirtelTigo</option>
                        <option value="TELECEL">Telecel</option>
                      </select>

                      <select
                        value={orderStatus}
                        onChange={(e) => setOrderStatus(e.target.value)}
                        className="bg-white dark:bg-[#0a1220] border border-slate-200 dark:border-[#14233a] rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-[#00df82]"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="SUCCESS">Success</option>
                        <option value="PENDING">Pending</option>
                        <option value="PROCESSING">Processing</option>
                        <option value="FAILED">Failed</option>
                      </select>
                    </div>
                  </div>

                  {/* Orders Table */}
                  <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] overflow-hidden shadow-xs">
                    {filteredOrders.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                        <ShoppingBag className="h-8 w-8 mx-auto opacity-30 text-slate-400" />
                        <p>No orders matching filter criteria.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-[#14233a] bg-slate-50 dark:bg-[#0a1220] text-slate-600 dark:text-slate-400 uppercase text-[10px] font-black">
                              <th className="p-3">Order ID</th>
                              <th className="p-3">Network</th>
                              <th className="p-3">Package / Recipient</th>
                              <th className="p-3">Channel</th>
                              <th className="p-3">Amount</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-[#14233a]/60 font-mono">
                            {filteredOrders.map((ord) => (
                              <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-[#0a1220]/60 transition">
                                <td className="p-3 text-slate-500 dark:text-slate-400">#{ord.id}</td>
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getNetworkStyle(
                                      ord.network
                                    )}`}
                                  >
                                    {ord.network}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="font-bold text-slate-900 dark:text-white">
                                    {ord.gbAmount} GB
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{ord.phoneNumber}</div>
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px]">
                                  {ord.source}
                                </td>
                                <td className="p-3 font-bold text-slate-900 dark:text-white">
                                  GH₵ {ord.amount.toFixed(2)}
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      ord.status === "SUCCESS"
                                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                        : ord.status === "FAILED"
                                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                        : "bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30"
                                    }`}
                                  >
                                    {ord.status}
                                  </span>
                                </td>
                                <td className="p-3 text-right text-[11px] text-slate-500 dark:text-slate-400">
                                  {new Date(ord.createdAt).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 2: WALLET TRANSACTIONS */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === "wallet" && (
                <div className="space-y-4">
                  {/* Flow Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                        <ArrowDownLeft className="h-4 w-4" />
                        <span>Total Inflow (Topups)</span>
                      </div>
                      <div className="mt-1 text-base font-black font-mono text-emerald-600 dark:text-emerald-300">
                        GH₵ {data.financialStats.totalIn.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {data.financialStats.topupsCount} credit transactions
                      </div>
                    </div>

                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3">
                      <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-bold">
                        <ArrowUpRight className="h-4 w-4" />
                        <span>Total Outflow (Debits)</span>
                      </div>
                      <div className="mt-1 text-base font-black font-mono text-rose-600 dark:text-rose-300">
                        GH₵ {data.financialStats.totalOut.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {data.financialStats.debitsCount} order deductions
                      </div>
                    </div>

                    <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-3">
                      <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-bold">
                        <RotateCcw className="h-4 w-4" />
                        <span>Total Refunds</span>
                      </div>
                      <div className="mt-1 text-base font-black font-mono text-purple-600 dark:text-purple-300">
                        GH₵ {data.financialStats.totalRefunds.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {data.financialStats.refundsCount} order refunds
                      </div>
                    </div>
                  </div>

                  {/* Tx Filter Bar */}
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-400">
                      Wallet Ledger Transactions ({filteredTransactions.length})
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={txType}
                        onChange={(e) => setTxType(e.target.value)}
                        className="bg-white dark:bg-[#0a1220] border border-slate-200 dark:border-[#14233a] rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-[#00df82]"
                      >
                        <option value="ALL">All Types</option>
                        <option value="TOPUP">TOPUP</option>
                        <option value="DEBIT">DEBIT</option>
                        <option value="REFUND">REFUND</option>
                        <option value="ADJUSTMENT">ADJUSTMENT</option>
                      </select>

                      <select
                        value={txStatus}
                        onChange={(e) => setTxStatus(e.target.value)}
                        className="bg-white dark:bg-[#0a1220] border border-slate-200 dark:border-[#14233a] rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-[#00df82]"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="APPROVED">Approved</option>
                        <option value="PENDING">Pending</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] overflow-hidden shadow-xs">
                    {filteredTransactions.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                        <Wallet className="h-8 w-8 mx-auto opacity-30 text-slate-400" />
                        <p>No wallet transactions found.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-[#14233a] bg-slate-50 dark:bg-[#0a1220] text-slate-600 dark:text-slate-400 uppercase text-[10px] font-black">
                              <th className="p-3">Type</th>
                              <th className="p-3">Amount</th>
                              <th className="p-3">Reference / Note</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-[#14233a]/60 font-mono">
                            {filteredTransactions.map((tx) => {
                              const isPositive =
                                tx.type === "TOPUP" ||
                                tx.type === "REFUND" ||
                                (tx.type === "ADJUSTMENT" && tx.amount > 0);

                              return (
                                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-[#0a1220]/60 transition">
                                  <td className="p-3">
                                    <div className="flex items-center gap-1.5">
                                      {isPositive ? (
                                        <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                                      ) : (
                                        <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" />
                                      )}
                                      <span className="font-bold text-slate-900 dark:text-white text-[11px]">{tx.type}</span>
                                    </div>
                                  </td>

                                  <td className="p-3">
                                    <span
                                      className={`font-black text-sm ${
                                        isPositive ? "text-[#00df82]" : "text-rose-500"
                                      }`}
                                    >
                                      {isPositive ? "+" : "-"}GH₵ {Math.abs(tx.amount).toFixed(2)}
                                    </span>
                                  </td>

                                  <td className="p-3 text-[11px]">
                                    {tx.sendClaim ? (
                                      <div>
                                        <span className="text-purple-600 dark:text-purple-300 font-bold">
                                          MoMo Claim: {tx.sendClaim.transactionReference}
                                        </span>
                                        <span className="text-slate-500 block">
                                          Sender: {tx.sendClaim.senderPhone}
                                        </span>
                                      </div>
                                    ) : (
                                      <div>
                                        <span className="text-slate-800 dark:text-slate-300 font-medium">{tx.reference || "N/A"}</span>
                                        {tx.note && (
                                          <span className="text-slate-500 block text-[10px]">{tx.note}</span>
                                        )}
                                      </div>
                                    )}
                                  </td>

                                  <td className="p-3">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        tx.status === "APPROVED"
                                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                          : tx.status === "PENDING"
                                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30"
                                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                      }`}
                                    >
                                      {tx.status}
                                    </span>
                                  </td>

                                  <td className="p-3 text-right text-[11px] text-slate-500 dark:text-slate-400">
                                    {new Date(tx.createdAt).toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 3: STOREFRONT HUB */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === "storefront" && data.user.storefront && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-slate-50 dark:bg-[#0a1220] p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">{data.user.storefront.name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          {data.user.storefront.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                        Slug: <strong className="text-cyan-600 dark:text-cyan-400">/store/{data.user.storefront.slug}</strong>
                      </p>
                    </div>

                    <a
                      href={`/store/${data.user.storefront.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#14233a] hover:bg-[#00df82] hover:text-slate-950 text-slate-700 dark:text-slate-200 font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Visit Storefront</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] p-3.5">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Storefront Available Balance</span>
                      <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                        GH₵ {data.user.storefrontWallet?.balance.toFixed(2) || "0.00"}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] p-3.5">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Pending Clearance</span>
                      <span className="text-lg font-black font-mono text-amber-600 dark:text-amber-300 mt-1 block">
                        GH₵ {data.user.storefrontWallet?.pendingBalance.toFixed(2) || "0.00"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-[#14233a] bg-slate-50 dark:bg-[#0a1220] flex items-center justify-between shrink-0">
              <div className="text-[11px] text-slate-500 font-mono">
                Tracking User ID: <span className="text-slate-700 dark:text-slate-400 font-bold">{data.user.id}</span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/wallets?userId=${data.user.id}`}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-transparent hover:bg-slate-100 dark:hover:bg-[#14233a] text-slate-700 dark:text-slate-300 font-bold text-xs transition inline-flex items-center gap-1"
                >
                  <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Wallet Hub</span>
                </Link>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xl bg-[#00df82] hover:bg-[#00f59b] text-slate-950 font-black text-xs transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import {
  Share2,
  Users,
  Wallet,
  ArrowUpRight,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  DollarSign,
  Copy,
  Check,
  Package,
  Layers,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Eye,
  AlertCircle,
  Banknote,
  X,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/shared";
import { UserTrackerModal } from "@/components/admin/user-tracker-modal";

interface SubAgentItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  balance: number;
  ordersCount: number;
  createdAt: string;
  totalSpend?: number;
}

interface MainAffiliateItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  affiliateCode: string | null;
  affiliateBalance: number;
  totalCommissionsEarned: number;
  subAgentsCount: number;
  customPricesCount: number;
  createdAt: string;
  subAgents: SubAgentItem[];
}

interface AffiliatePricingItem {
  packageId: string;
  packageName: string;
  network: string;
  gbAmount: number;
  retailPrice?: number | null;
  agentBaseCost: number;
  subAgentWholesalePrice: number;
  agentProfitMargin: number;
  updatedAt: string;
}

interface AffiliateCommissionItem {
  id: string;
  amount: number;
  sourceUserName: string;
  sourceUserEmail: string;
  subAgentCost: number;
  agentCost: number;
  status: string;
  createdAt: string;
}

interface AffiliateWithdrawalItem {
  id: string;
  amount: number;
  netAmount: number;
  status: string;
  reference?: string | null;
  payoutMethod: string;
  network?: string | null;
  momoNumber?: string | null;
  createdAt: string;
  processedAt?: string | null;
}

export default function AdminAffiliatesPage() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = React.useState<"hierarchy" | "subagents" | "withdrawals">("hierarchy");
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const [stats, setStats] = React.useState<{
    totalMainAffiliates: number;
    totalSubAgents: number;
    totalCommissionsEarned: number;
    totalCommissionsCount: number;
    pendingWithdrawalsCount: number;
    pendingWithdrawalsAmount: number;
    approvedWithdrawalsAmount: number;
  }>({
    totalMainAffiliates: 0,
    totalSubAgents: 0,
    totalCommissionsEarned: 0,
    totalCommissionsCount: 0,
    pendingWithdrawalsCount: 0,
    pendingWithdrawalsAmount: 0,
    approvedWithdrawalsAmount: 0,
  });

  const [affiliates, setAffiliates] = React.useState<MainAffiliateItem[]>([]);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  // Detail Modal / Drawer state
  const [selectedAffiliateId, setSelectedAffiliateId] = React.useState<string | null>(null);
  const [trackedUserId, setTrackedUserId] = React.useState<string | null>(null);
  const [detailData, setDetailData] = React.useState<{
    affiliate: MainAffiliateItem & {
      pricingSheet: AffiliatePricingItem[];
      commissions: AffiliateCommissionItem[];
      withdrawals: AffiliateWithdrawalItem[];
    };
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [activeModalTab, setActiveModalTab] = React.useState<"downline" | "pricing" | "commissions">("downline");

  // Withdrawals tab state
  const [withdrawalsList, setWithdrawalsList] = React.useState<any[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = React.useState(false);
  const [withdrawalActionId, setWithdrawalActionId] = React.useState<string | null>(null);
  const [actionType, setActionType] = React.useState<"APPROVE" | "REJECT">("APPROVE");
  const [actionNote, setActionNote] = React.useState("");
  const [processingAction, setProcessingAction] = React.useState(false);

  // Fetch affiliates data
  const loadAffiliates = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/affiliates?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
        setAffiliates(data.affiliates || []);
      }
    } catch {
      toast("Failed to load affiliate records.", "error");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, toast]);

  // Fetch withdrawals for payouts tab
  const loadWithdrawals = React.useCallback(async () => {
    try {
      setLoadingWithdrawals(true);
      const res = await fetch("/api/admin/affiliate-withdrawals");
      const data = await res.json();
      if (res.ok) {
        setWithdrawalsList(data.withdrawals || []);
      }
    } catch {
      toast("Failed to load affiliate payouts.", "error");
    } finally {
      setLoadingWithdrawals(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadAffiliates();
  }, [loadAffiliates]);

  React.useEffect(() => {
    if (activeTab === "withdrawals") {
      loadWithdrawals();
    }
  }, [activeTab, loadWithdrawals]);

  // Open detail drawer for a main affiliate
  const openAffiliateDetail = async (affiliateId: string, initialTab: "downline" | "pricing" | "commissions" = "downline") => {
    setSelectedAffiliateId(affiliateId);
    setActiveModalTab(initialTab);
    setLoadingDetail(true);
    setDetailData(null);
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliateId}`);
      const data = await res.json();
      if (res.ok && data.affiliate) {
        setDetailData(data);
      } else {
        toast(data.error || "Could not retrieve affiliate profile.", "error");
      }
    } catch {
      toast("Error loading affiliate details.", "error");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast("Copied to clipboard!", "success");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Handle payout approve/reject action
  const handleExecutePayoutAction = async () => {
    if (!withdrawalActionId) return;
    setProcessingAction(true);
    try {
      const res = await fetch("/api/admin/affiliate-withdrawals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: withdrawalActionId,
          action: actionType,
          adminNote: actionNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(`Withdrawal ${actionType === "APPROVE" ? "approved" : "rejected"} successfully.`, "success");
        setWithdrawalActionId(null);
        setActionNote("");
        loadWithdrawals();
        loadAffiliates();
      } else {
        toast(data.error || "Failed to process withdrawal action.", "error");
      }
    } catch {
      toast("Network error while processing payout.", "error");
    } finally {
      setProcessingAction(false);
    }
  };

  // Aggregate all sub-agents across all main affiliates for the "All Sub-Agents" tab
  const allSubAgents = React.useMemo(() => {
    const list: Array<SubAgentItem & { parentAgentName: string; parentAffiliateCode: string | null; parentAgentId: string }> = [];
    affiliates.forEach((parent) => {
      parent.subAgents.forEach((sub) => {
        list.push({
          ...sub,
          parentAgentName: parent.name,
          parentAffiliateCode: parent.affiliateCode,
          parentAgentId: parent.id,
        });
      });
    });
    return list;
  }, [affiliates]);

  return (
    <div className="space-y-6">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#14233a] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00df82]/15 text-[#00df82] border border-[#00df82]/30 shadow-sm shadow-[#00df82]/20">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Affiliate Network Management
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track top referring agents, inspect sub-agent downlines, review wholesale pricing sheets, and process payouts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              loadAffiliates();
              if (activeTab === "withdrawals") loadWithdrawals();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#00df82] transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#00df82]" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── KPI STATS CARDS ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Main Referring Agents */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Main Affiliates</span>
            <Share2 className="h-4 w-4 text-[#00df82]" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.totalMainAffiliates}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Agents with affiliate links/codes</p>
        </div>

        {/* Total Sub-Agents */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Total Sub-Agents</span>
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {stats.totalSubAgents}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Users referred under main agents</p>
        </div>

        {/* Total Paid Commissions */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Total Commissions</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-[#00df82] font-mono">
            GH₵ {stats.totalCommissionsEarned.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            From {stats.totalCommissionsCount} sub-agent sales
          </p>
        </div>

        {/* Pending Payouts */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Pending Payouts</span>
            <Banknote className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            GH₵ {stats.pendingWithdrawalsAmount.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {stats.pendingWithdrawalsCount} payout{stats.pendingWithdrawalsCount === 1 ? "" : "s"} awaiting approval
          </p>
        </div>
      </div>

      {/* ── NAVIGATION TABS ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-[#14233a] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("hierarchy")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
            activeTab === "hierarchy"
              ? "bg-[#00df82] text-slate-950 shadow-sm shadow-[#00df82]/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0a1220]"
          }`}
        >
          <Share2 className="h-4 w-4" />
          <span>Main Affiliates Hierarchy</span>
          <span className="rounded-full bg-black/10 dark:bg-black/25 px-1.5 py-0.2 text-[10px]">
            {affiliates.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("subagents")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
            activeTab === "subagents"
              ? "bg-[#00df82] text-slate-950 shadow-sm shadow-[#00df82]/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0a1220]"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>All Sub-Agents Directory</span>
          <span className="rounded-full bg-black/10 dark:bg-black/25 px-1.5 py-0.2 text-[10px]">
            {allSubAgents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("withdrawals")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
            activeTab === "withdrawals"
              ? "bg-[#00df82] text-slate-950 shadow-sm shadow-[#00df82]/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0a1220]"
          }`}
        >
          <Banknote className="h-4 w-4" />
          <span>Affiliate Payout Requests</span>
          {stats.pendingWithdrawalsCount > 0 && (
            <span className="rounded-full bg-amber-500 text-slate-950 px-1.5 py-0.2 text-[10px] font-black animate-pulse">
              {stats.pendingWithdrawalsCount}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: MAIN AFFILIATES HIERARCHY ─────────────────────────────────── */}
      {activeTab === "hierarchy" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search main affiliate, email, affiliate code, or sub-agent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-[#070d18] border border-slate-200 dark:border-[#14233a] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-500 outline-none focus:border-[#00df82]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white dark:bg-[#070d18] border border-slate-200 dark:border-[#14233a] rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-[#00df82]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="FROZEN">Frozen</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-3">
                <Spinner className="h-8 w-8 text-[#00df82]" />
                <p className="text-xs text-slate-400">Loading affiliate records…</p>
              </div>
            ) : affiliates.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Share2 className="h-10 w-10 text-slate-500 mx-auto opacity-40" />
                <h3 className="text-sm font-bold text-white">No Affiliates Found</h3>
                <p className="text-xs text-slate-400">
                  {searchQuery ? "No agents matched your search criteria." : "No agents have created an affiliate link or recruited sub-agents yet."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#14233a] bg-slate-50 dark:bg-[#0a1220] text-slate-400 uppercase text-[10px] font-black tracking-wider">
                      <th className="py-3 px-4">Main Agent</th>
                      <th className="py-3 px-4">Affiliate Code</th>
                      <th className="py-3 px-4">Sub-Agents</th>
                      <th className="py-3 px-4">Affiliate Wallet</th>
                      <th className="py-3 px-4">Total Earned</th>
                      <th className="py-3 px-4">Pricing Sheet</th>
                      <th className="py-3 px-4 text-right">Downline Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#14233a]/60">
                    {affiliates.map((aff) => (
                      <tr
                        key={aff.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-[#0a1220]/60 transition"
                      >
                        {/* Main Agent Column */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {aff.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {aff.email}
                          </div>
                          {aff.phone && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              {aff.phone}
                            </div>
                          )}
                        </td>

                        {/* Affiliate Code */}
                        <td className="py-3 px-4">
                          {aff.affiliateCode ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[#00df82] bg-[#00df82]/10 border border-[#00df82]/30 px-2 py-0.5 rounded-lg text-xs">
                                {aff.affiliateCode}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(aff.affiliateCode!)}
                                className="p-1 rounded text-slate-400 hover:text-white transition"
                                title="Copy affiliate code"
                              >
                                {copiedCode === aff.affiliateCode ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">No code</span>
                          )}
                        </td>

                        {/* Sub-Agents Count Pill */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => openAffiliateDetail(aff.id, "downline")}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 text-cyan-400 font-bold hover:bg-cyan-500/20 transition cursor-pointer"
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span>{aff.subAgentsCount} Sub-Agent{aff.subAgentsCount === 1 ? "" : "s"}</span>
                          </button>
                        </td>

                        {/* Affiliate Wallet Balance */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          GH₵ {aff.affiliateBalance.toFixed(2)}
                        </td>

                        {/* Total Commissions Earned */}
                        <td className="py-3 px-4 font-mono font-bold text-[#00df82]">
                          GH₵ {aff.totalCommissionsEarned.toFixed(2)}
                        </td>

                        {/* Custom Pricing Sheet status */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => openAffiliateDetail(aff.id, "pricing")}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-[#00df82] transition"
                          >
                            <Package className="h-3.5 w-3.5" />
                            <span>{aff.customPricesCount} custom rate{aff.customPricesCount === 1 ? "" : "s"}</span>
                          </button>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setTrackedUserId(aff.id)}
                              className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 font-bold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                              title="Track user sales, wallet & orders"
                            >
                              <TrendingUp className="h-3 w-3" />
                              <span>Track Activity</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openAffiliateDetail(aff.id, "downline")}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#14233a] hover:bg-[#00df82] hover:text-slate-950 font-bold text-xs text-slate-300 transition cursor-pointer"
                            >
                              Inspect Downline
                            </button>
                          </div>
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

      {/* ── TAB 2: ALL SUB-AGENTS DIRECTORY ─────────────────────────────────── */}
      {activeTab === "subagents" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] overflow-hidden shadow-sm">
            {allSubAgents.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Users className="h-10 w-10 text-slate-500 mx-auto opacity-40" />
                <h3 className="text-sm font-bold text-white">No Sub-Agents Recorded</h3>
                <p className="text-xs text-slate-400">
                  When new agents sign up using an affiliate referral code, they will be listed here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#14233a] bg-slate-50 dark:bg-[#0a1220] text-slate-400 uppercase text-[10px] font-black tracking-wider">
                      <th className="py-3 px-4">Sub-Agent Account</th>
                      <th className="py-3 px-4">Parent Referrer Agent</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Balance</th>
                      <th className="py-3 px-4">Total Orders</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#14233a]/60">
                    {allSubAgents.map((sub) => (
                      <tr
                        key={sub.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-[#0a1220]/60 transition"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{sub.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{sub.email}</div>
                          {sub.phone && <div className="text-[10px] text-slate-500 font-mono">{sub.phone}</div>}
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => openAffiliateDetail(sub.parentAgentId, "downline")}
                            className="text-left group cursor-pointer"
                          >
                            <div className="font-bold text-[#00df82] group-hover:underline flex items-center gap-1">
                              <span>{sub.parentAgentName}</span>
                              <ArrowUpRight className="h-3 w-3" />
                            </div>
                            {sub.parentAffiliateCode && (
                              <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                                {sub.parentAffiliateCode}
                              </span>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === "ACTIVE"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-white">
                          GH₵ {sub.balance.toFixed(2)}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                          {sub.ordersCount} orders
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setTrackedUserId(sub.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#14233a] hover:bg-[#00df82] hover:text-slate-950 font-bold text-xs text-slate-300 transition inline-flex items-center gap-1.5 cursor-pointer"
                            title="Track user sales, wallet & orders"
                          >
                            <TrendingUp className="h-3 w-3" />
                            <span>Track Activity</span>
                          </button>
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

      {/* ── TAB 3: AFFILIATE PAYOUT REQUESTS ─────────────────────────────────── */}
      {activeTab === "withdrawals" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] overflow-hidden shadow-sm">
            {loadingWithdrawals ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-3">
                <Spinner className="h-8 w-8 text-[#00df82]" />
                <p className="text-xs text-slate-400">Loading payout records…</p>
              </div>
            ) : withdrawalsList.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Banknote className="h-10 w-10 text-slate-500 mx-auto opacity-40" />
                <h3 className="text-sm font-bold text-white">No Payout Requests</h3>
                <p className="text-xs text-slate-400">
                  When agents request withdrawals from their affiliate wallets, they will be shown here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#14233a] bg-slate-50 dark:bg-[#0a1220] text-slate-400 uppercase text-[10px] font-black tracking-wider">
                      <th className="py-3 px-4">Affiliate Agent</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Payout Destination</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#14233a]/60">
                    {withdrawalsList.map((w) => (
                      <tr
                        key={w.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-[#0a1220]/60 transition"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{w.user?.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{w.user?.email}</div>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-lg text-[#00df82]">
                          GH₵ {w.netAmount.toFixed(2)}
                        </td>

                        <td className="py-3 px-4">
                          {w.payoutMethod === "MAIN_WALLET" ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2 py-0.5 text-[11px] font-bold">
                              <Wallet className="h-3 w-3" />
                              <span>Internal Wallet Transfer</span>
                            </span>
                          ) : (
                            <div>
                              <div className="font-bold text-slate-200">
                                {w.network} · {w.momoNumber}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {w.accountName}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              w.status === "APPROVED"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : w.status === "PENDING"
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse"
                                : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {w.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(w.createdAt).toLocaleString()}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {w.status === "PENDING" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setWithdrawalActionId(w.id);
                                  setActionType("APPROVE");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition cursor-pointer"
                              >
                                Approve Payout
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setWithdrawalActionId(w.id);
                                  setActionType("REJECT");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 font-bold text-xs text-white transition cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 font-mono text-[11px]">Processed</span>
                          )}
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

      {/* ── DETAIL DRAWER / MODAL FOR MAIN AFFILIATE ─────────────────────────── */}
      {selectedAffiliateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl h-full bg-white dark:bg-[#070d18] border-l border-slate-200 dark:border-[#14233a] shadow-2xl flex flex-col justify-between overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#14233a] bg-slate-50/80 dark:bg-[#0a1220] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00df82]/15 text-[#00df82] border border-[#00df82]/30">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {detailData?.affiliate.name || "Affiliate Details"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {detailData?.affiliate.email} · Code:{" "}
                    <strong className="text-[#00df82] font-mono">
                      {detailData?.affiliate.affiliateCode || "N/A"}
                    </strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedAffiliateId(null);
                  setDetailData(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#14233a] transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Subnav */}
            <div className="px-5 pt-3 border-b border-slate-200 dark:border-[#14233a] flex items-center gap-2 bg-slate-100/70 dark:bg-[#091220]">
              <button
                type="button"
                onClick={() => setActiveModalTab("downline")}
                className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition border-b-2 cursor-pointer ${
                  activeModalTab === "downline"
                    ? "border-[#00df82] text-slate-900 dark:text-[#00df82] bg-white dark:bg-[#00df82]/10"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Sub-Agents ({detailData?.affiliate.subAgentsCount || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("pricing")}
                className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition border-b-2 cursor-pointer ${
                  activeModalTab === "pricing"
                    ? "border-[#00df82] text-slate-900 dark:text-[#00df82] bg-white dark:bg-[#00df82]/10"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Wholesale Price Sheet ({detailData?.affiliate.pricingSheet.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("commissions")}
                className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition border-b-2 cursor-pointer ${
                  activeModalTab === "commissions"
                    ? "border-[#00df82] text-slate-900 dark:text-[#00df82] bg-white dark:bg-[#00df82]/10"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Commissions Log ({detailData?.affiliate.commissions.length || 0})
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-3">
                  <Spinner className="h-8 w-8 text-[#00df82]" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Loading downline data…</p>
                </div>
              ) : !detailData ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                  Could not load affiliate records.
                </div>
              ) : (
                <>
                  {/* TAB 1: SUB-AGENTS DOWNLINE */}
                  {activeModalTab === "downline" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Users Referred by {detailData.affiliate.name}
                        </span>
                        <span className="text-slate-500 font-mono">
                          {detailData.affiliate.subAgents.length} user{detailData.affiliate.subAgents.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      {detailData.affiliate.subAgents.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 dark:border-[#14233a] p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                          This agent has not registered any sub-agents yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {detailData.affiliate.subAgents.map((sub) => (
                            <div
                              key={sub.id}
                              className="rounded-xl border border-slate-200 dark:border-[#14233a] bg-slate-50/80 dark:bg-[#091220] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                                  <span>{sub.name}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-[#00df82]/15 text-[#00df82] border border-[#00df82]/30">
                                    {sub.role}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                  {sub.email} {sub.phone && `· ${sub.phone}`}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">
                                  Joined: {new Date(sub.createdAt).toLocaleDateString()}
                                </div>
                              </div>

                              <div className="flex items-center gap-4 text-xs font-mono">
                                <div>
                                  <span className="text-[10px] uppercase text-slate-500 block">Balance</span>
                                  <span className="font-bold text-slate-900 dark:text-white">GH₵ {sub.balance.toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase text-slate-500 block">Orders</span>
                                  <span className="font-bold text-cyan-600 dark:text-cyan-400">{sub.ordersCount}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setTrackedUserId(sub.id)}
                                  className="p-2 rounded-lg bg-slate-200 dark:bg-[#14233a] hover:bg-[#00df82] hover:text-slate-950 transition text-slate-700 dark:text-slate-300 cursor-pointer"
                                  title="Track sales & wallet transactions"
                                >
                                  <TrendingUp className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: PRICING SHEET */}
                  {activeModalTab === "pricing" && (
                    <div className="space-y-3">
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        These are the custom wholesale rates configured by <strong className="text-slate-900 dark:text-white">{detailData.affiliate.name}</strong> for their sub-agents.
                      </div>

                      {detailData.affiliate.pricingSheet.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 dark:border-[#14233a] p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                          This agent has not configured custom prices yet. Sub-agents are billed at standard wholesale rates.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18]">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-[#14233a] bg-slate-50 dark:bg-[#0a1220] text-slate-600 dark:text-slate-400 uppercase text-[10px] font-black">
                                <th className="p-3">Package</th>
                                <th className="p-3">Agent Cost</th>
                                <th className="p-3">Sub-Agent Price</th>
                                <th className="p-3 text-right">Profit / Margin</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#14233a]/60 font-mono">
                              {detailData.affiliate.pricingSheet.map((p) => (
                                <tr key={p.packageId} className="hover:bg-slate-50 dark:hover:bg-[#091220]">
                                  <td className="p-3">
                                    <div className="font-bold text-slate-900 dark:text-white">{p.packageName}</div>
                                    <div className="text-[10px] text-slate-500">{p.network} · {p.gbAmount} GB</div>
                                  </td>
                                  <td className="p-3 text-slate-600 dark:text-slate-400">
                                    GH₵ {p.agentBaseCost.toFixed(2)}
                                  </td>
                                  <td className="p-3 text-slate-900 dark:text-white font-bold">
                                    GH₵ {p.subAgentWholesalePrice.toFixed(2)}
                                  </td>
                                  <td className="p-3 text-right font-bold text-[#00df82]">
                                    +GH₵ {p.agentProfitMargin.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: COMMISSIONS LOG */}
                  {activeModalTab === "commissions" && (
                    <div className="space-y-3">
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Real-time sales commission records credited to <strong className="text-slate-900 dark:text-white">{detailData.affiliate.name}</strong>.
                      </div>

                      {detailData.affiliate.commissions.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 dark:border-[#14233a] p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                          No commissions recorded yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {detailData.affiliate.commissions.map((c) => (
                            <div
                              key={c.id}
                              className="rounded-xl border border-slate-200 dark:border-[#14233a] bg-slate-50/80 dark:bg-[#091220] p-3 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">
                                  From {c.sourceUserName} ({c.sourceUserEmail})
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Sub-agent paid: GH₵{c.subAgentCost.toFixed(2)} · Agent cost: GH₵{c.agentCost.toFixed(2)}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {new Date(c.createdAt).toLocaleString()}
                                </div>
                              </div>

                              <div className="font-mono font-black text-sm text-[#00df82]">
                                +GH₵ {c.amount.toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-[#14233a] flex items-center justify-between bg-slate-50 dark:bg-[#091220]">
              <div className="font-mono text-xs">
                <span className="text-slate-500 dark:text-slate-400">Affiliate Balance: </span>
                <strong className="text-[#00df82] font-black">
                  GH₵ {detailData?.affiliate.affiliateBalance.toFixed(2) || "0.00"}
                </strong>
              </div>

              <button
                type="button"
                onClick={() => setTrackedUserId(selectedAffiliateId)}
                className="px-4 py-2 rounded-xl bg-[#00df82] hover:bg-[#00f59b] text-slate-950 font-black text-xs transition inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#00df82]/20"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Track User Activity</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── APPROVE / REJECT WITHDRAWAL CONFIRMATION MODAL ───────────────────── */}
      {withdrawalActionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#070d18] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#14233a] pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {actionType === "APPROVE" ? "Confirm Payout Approval" : "Reject Payout Request"}
              </h3>
              <button
                type="button"
                onClick={() => setWithdrawalActionId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {actionType === "APPROVE"
                ? "Are you sure you want to approve and mark this affiliate payout as completed?"
                : "Enter an optional note explaining the rejection. The funds will be refunded to the agent's affiliate balance."}
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Admin Note (Optional)</label>
              <textarea
                rows={2}
                placeholder="e.g. Paid via MoMo Bulk Transfer #984392"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0a1220] border border-slate-200 dark:border-[#14233a] rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-[#00df82] resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWithdrawalActionId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#14233a] bg-slate-100 dark:bg-[#0a1220] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#14233a] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={processingAction}
                onClick={handleExecutePayoutAction}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 cursor-pointer ${
                  actionType === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {processingAction ? (
                  <Spinner className="h-4 w-4 text-white" />
                ) : (
                  <span>{actionType === "APPROVE" ? "Approve Payout" : "Reject Request"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── USER ACTIVITY TRACKER MODAL ────────────────────────────────────── */}
      {trackedUserId && (
        <UserTrackerModal
          userId={trackedUserId}
          onClose={() => setTrackedUserId(null)}
        />
      )}
    </div>
  );
}

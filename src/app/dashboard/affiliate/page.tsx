"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Share2,
  Copy,
  Check,
  Users,
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  ArrowRight,
  Info,
  QrCode,
  Edit2,
  Save,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Wallet,
  ArrowDownToLine,
  ArrowRightLeft,
  Smartphone,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/shared";

interface SubAgent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  joinedAt: string;
  orderCount: number;
}

interface Commission {
  id: string;
  amount: number;
  subAgentCost: number;
  agentCost: number;
  tierLevel: number;
  status: string;
  createdAt: string;
  sourceUserName: string;
  orderId: number;
  network?: string;
  gbAmount?: number;
}

interface Withdrawal {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  payoutMethod: "MOMO" | "MAIN_WALLET";
  network: string | null;
  momoNumber: string | null;
  accountName: string | null;
  status: string;
  reference: string | null;
  note: string | null;
  adminNote: string | null;
  createdAt: string;
}

interface OverviewData {
  affiliateCode: string;
  affiliateBalance: number;
  mainBalance: number;
  directSubAgentsCount: number;
  totalCommissionsEarned: number;
  totalCommissionsCount: number;
  totalWithdrawn: number;
  hasPendingWithdrawal: boolean;
  pendingWithdrawalAmount: number;
  subAgents: SubAgent[];
  recentCommissions: Commission[];
  withdrawals: Withdrawal[];
}

interface PricingPackage {
  packageId: string;
  network: string;
  name: string;
  gbAmount: number;
  retailPriceGHS?: number | null;
  agentCost: number;
  subAgentWholesalePrice: number;
  profitMargin: number;
  isCustomized: boolean;
}

type TabType = "pricing" | "earnings" | "subagents" | "commissions" | "guide";

export default function AffiliateDashboardPage() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("earnings");
  const [loading, setLoading] = useState(true);
  const [savingPrices, setSavingPrices] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Overview data
  const [overview, setOverview] = useState<OverviewData | null>(null);

  // Pricing sheet
  const [pricingSheet, setPricingSheet] = useState<PricingPackage[]>([]);
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [selectedNetwork, setSelectedNetwork] = useState<string>("ALL");

  // Code editor state
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [customCodeInput, setCustomCodeInput] = useState("");
  const [savingCode, setSavingCode] = useState(false);

  // Withdrawal form state
  const [withdrawalMethod, setWithdrawalMethod] = useState<"MAIN_WALLET" | "MOMO">("MAIN_WALLET");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [momoNetwork, setMomoNetwork] = useState<string>("MTN");
  const [momoNumber, setMomoNumber] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

  // Load overview & pricing
  const loadData = async () => {
    try {
      const [overviewRes, pricingRes] = await Promise.all([
        fetch("/api/affiliate"),
        fetch("/api/affiliate/pricing"),
      ]);

      if (overviewRes.ok) {
        const overviewJson = await overviewRes.json();
        setOverview(overviewJson);
        setCustomCodeInput(overviewJson.affiliateCode || "");
      }

      if (pricingRes.ok) {
        const pricingJson = await pricingRes.json();
        setPricingSheet(pricingJson.sheet || []);
        const initialMap: Record<string, number> = {};
        (pricingJson.sheet || []).forEach((p: PricingPackage) => {
          initialMap[p.packageId] = p.subAgentWholesalePrice;
        });
        setEditedPrices(initialMap);
      }
    } catch (err) {
      console.error("Failed to load affiliate details:", err);
      toast("Failed to load affiliate data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const affiliateUrl = overview?.affiliateCode
    ? `${origin}/register?ref=${overview.affiliateCode}`
    : "";

  const handleCopyLink = () => {
    if (!affiliateUrl) return;
    navigator.clipboard.writeText(affiliateUrl);
    setCopiedLink(true);
    toast("Affiliate registration link copied to clipboard!", "success");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    if (!overview?.affiliateCode) return;
    navigator.clipboard.writeText(overview.affiliateCode);
    setCopiedCode(true);
    toast("Affiliate code copied!", "success");
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSaveCode = async () => {
    const trimmed = customCodeInput.trim().toUpperCase();
    if (!trimmed || trimmed.length < 3) {
      toast("Code must be at least 3 characters.", "error");
      return;
    }

    try {
      setSavingCode(true);
      const res = await fetch("/api/affiliate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateCode: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to update affiliate code.", "error");
        return;
      }

      setOverview((prev) => (prev ? { ...prev, affiliateCode: data.affiliateCode } : null));
      setIsEditingCode(false);
      toast("Affiliate code updated successfully!", "success");
    } catch {
      toast("Network error while updating code.", "error");
    } finally {
      setSavingCode(false);
    }
  };

  const handlePriceChange = (packageId: string, val: string) => {
    const num = parseFloat(val);
    setEditedPrices((prev) => ({
      ...prev,
      [packageId]: isNaN(num) ? 0 : num,
    }));
  };

  const handleBulkMarkup = (markupGHS: number) => {
    setEditedPrices((prev) => {
      const next = { ...prev };
      pricingSheet.forEach((pkg) => {
        if (selectedNetwork === "ALL" || pkg.network.toUpperCase() === selectedNetwork.toUpperCase()) {
          const newPrice = Math.round((pkg.agentCost + markupGHS) * 100) / 100;
          next[pkg.packageId] = newPrice;
        }
      });
      return next;
    });
    toast(`Applied +GHS ${markupGHS.toFixed(2)} markup to ${selectedNetwork} packages`, "info");
  };

  const handleResetToCost = () => {
    setEditedPrices((prev) => {
      const next = { ...prev };
      pricingSheet.forEach((pkg) => {
        if (selectedNetwork === "ALL" || pkg.network.toUpperCase() === selectedNetwork.toUpperCase()) {
          next[pkg.packageId] = pkg.agentCost;
        }
      });
      return next;
    });
    toast(`Reset prices to your wholesale cost for ${selectedNetwork} packages`, "info");
  };

  const handleSavePricing = async () => {
    try {
      setSavingPrices(true);
      const payload = Object.entries(editedPrices).map(([packageId, priceGHS]) => ({
        packageId,
        priceGHS,
      }));

      const res = await fetch("/api/affiliate/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices: payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to save prices.", "error");
        return;
      }

      // Refresh pricing sheet
      const refreshRes = await fetch("/api/affiliate/pricing");
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setPricingSheet(refreshData.sheet || []);
      }

      toast("Sub-agent wholesale pricing updated successfully!", "success");
    } catch {
      toast("Network error while saving pricing sheet.", "error");
    } finally {
      setSavingPrices(false);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast("Please enter a valid withdrawal amount.", "error");
      return;
    }

    if (amountNum < 5) {
      toast("Minimum withdrawal amount is GHS 5.00.", "error");
      return;
    }

    if (amountNum > (overview?.affiliateBalance ?? 0)) {
      toast("Amount exceeds your available affiliate earnings balance.", "error");
      return;
    }

    if (withdrawalMethod === "MOMO") {
      const cleanMomo = momoNumber.replace(/\D/g, "");
      if (cleanMomo.length !== 10 || !cleanMomo.startsWith("0") || !accountName.trim()) {
        toast("Please provide a valid 10-digit Mobile Money phone number (e.g. 0241234567) and account name.", "error");
        return;
      }
    }

    try {
      setSubmittingWithdrawal(true);
      const res = await fetch("/api/affiliate/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          payoutMethod: withdrawalMethod,
          network: momoNetwork,
          momoNumber: momoNumber.trim(),
          accountName: accountName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to process withdrawal.", "error");
        return;
      }

      toast(
        withdrawalMethod === "MAIN_WALLET"
          ? "GHS " + amountNum.toFixed(2) + " successfully transferred to your main wallet balance!"
          : "Withdrawal request submitted for payout review.",
        "success"
      );

      setWithdrawAmount("");
      setMomoNumber("");
      setAccountName("");
      await loadData();
    } catch {
      toast("Network error while submitting withdrawal.", "error");
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  const filteredPackages = useMemo(() => {
    if (selectedNetwork === "ALL") return pricingSheet;
    return pricingSheet.filter(
      (p) => p.network.toUpperCase() === selectedNetwork.toUpperCase()
    );
  }, [pricingSheet, selectedNetwork]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner className="h-8 w-8 text-emerald-500" />
      </div>
    );
  }

  const affiliateBal = overview?.affiliateBalance ?? 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl flex items-center gap-2.5">
            <Share2 className="h-7 w-7 text-emerald-500" />
            Affiliate & Sub-Agent Network
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Recruit partner agents with your referral link, set wholesale prices for your downline,
            and manage your affiliate earnings in your dedicated earnings wallet.
          </p>
        </div>
      </div>

      {/* Referral Hub Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl text-white">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                Your Referral Program Link
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                Invite Sub-Agents to Sign Up Under You
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Any agent who registers using this link is locked as your sub-agent.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/90 border border-white/10 rounded-2xl p-2 px-3">
              <span className="text-xs font-semibold text-slate-400">Affiliate Code:</span>
              {isEditingCode ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={customCodeInput}
                    onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase())}
                    className="h-8 w-28 uppercase text-xs font-mono font-black bg-slate-950 text-emerald-400 border-emerald-500/40"
                    placeholder="CODE"
                  />
                  <Button
                    size="sm"
                    className="h-8 px-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold"
                    onClick={handleSaveCode}
                    disabled={savingCode}
                  >
                    {savingCode ? <Spinner className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-slate-400 hover:text-white text-xs"
                    onClick={() => {
                      setIsEditingCode(false);
                      setCustomCodeInput(overview?.affiliateCode || "");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-emerald-400 text-base tracking-wider">
                    {overview?.affiliateCode}
                  </span>
                  <button
                    onClick={() => setIsEditingCode(true)}
                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition"
                    title="Edit custom code"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition"
                    title="Copy code"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Share Link Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Input
                readOnly
                value={affiliateUrl}
                className="h-12 bg-slate-950/80 border-white/15 text-white font-mono text-xs sm:text-sm pl-4 pr-12 rounded-xl focus:border-emerald-500"
              />
            </div>
            <Button
              onClick={handleCopyLink}
              className="h-12 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20 gap-2 shrink-0"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4" /> Copied Link
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy Referral Link
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {/* Affiliate Wallet Balance Card */}
        <Card className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-sm relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Affiliate Wallet
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              GHS {affiliateBal.toFixed(2)}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-slate-500 font-medium">Isolated earnings</span>
              <button
                onClick={() => setActiveTab("earnings")}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                Withdraw <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Direct Sub-Agents
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {overview?.directSubAgentsCount ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Recruited via your link</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Lifetime Earnings
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
              GHS {(overview?.totalCommissionsEarned ?? 0).toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Across all order sales</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Withdrawn
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <ArrowDownToLine className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              GHS {(overview?.totalWithdrawn ?? 0).toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Paid out to MoMo / Wallet</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("earnings")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap px-1 ${
            activeTab === "earnings"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Wallet className="h-4 w-4" />
          Earnings & Withdrawals
        </button>

        <button
          onClick={() => setActiveTab("pricing")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap px-1 ${
            activeTab === "pricing"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Package className="h-4 w-4" />
          Sub-Agent Price Sheet
        </button>

        <button
          onClick={() => setActiveTab("subagents")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap px-1 ${
            activeTab === "subagents"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Users className="h-4 w-4" />
          Downline Agents ({overview?.directSubAgentsCount ?? 0})
        </button>

        <button
          onClick={() => setActiveTab("commissions")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap px-1 ${
            activeTab === "commissions"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Commissions Log
        </button>

        <button
          onClick={() => setActiveTab("guide")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap px-1 ${
            activeTab === "guide"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Info className="h-4 w-4" />
          How It Works
        </button>
      </div>

      {/* Tab: Earnings & Withdrawals */}
      {activeTab === "earnings" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left: Wallet Info & Balances */}
            <div className="space-y-6 lg:col-span-1">
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Separate Affiliate Wallet
                  </span>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                    GHS {affiliateBal.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Commissions earned from sub-agents are held in this separate wallet. They are never spent on regular data orders unless you transfer them.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Main Operating Balance:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      GHS {(overview?.mainBalance ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Total Withdrawn:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      GHS {(overview?.totalWithdrawn ?? 0).toFixed(2)}
                    </span>
                  </div>
                  {overview?.hasPendingWithdrawal && (
                    <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 font-medium">
                      <span>Pending MoMo Review:</span>
                      <span className="font-mono font-bold">
                        GHS {(overview?.pendingWithdrawalAmount ?? 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 p-4 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                  <span className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                    <ShieldCheck className="h-4 w-4" /> Two Payout Channels
                  </span>
                  <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
                    1. <strong>Transfer to Main Wallet</strong>: Instant with zero delay. Adds credit to purchase data bundles.
                    <br />
                    2. <strong>Mobile Money (MoMo)</strong>: Direct payout to your MTN, Telecel, or AirtelTigo account.
                  </p>
                </div>
              </Card>
            </div>

            {/* Right: Withdrawal Form */}
            <div className="lg:col-span-2">
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ArrowDownToLine className="h-5 w-5 text-emerald-500" />
                    Withdraw Affiliate Earnings
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Select where you would like your earnings sent.
                  </p>
                </div>

                {/* Method Selector */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWithdrawalMethod("MAIN_WALLET")}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      withdrawalMethod === "MAIN_WALLET"
                        ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <ArrowRightLeft className="h-5 w-5 text-emerald-500 mb-2" />
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      Transfer to Main Wallet
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Instant top-up to buy data bundles
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithdrawalMethod("MOMO")}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      withdrawalMethod === "MOMO"
                        ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <Smartphone className="h-5 w-5 text-emerald-500 mb-2" />
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      Mobile Money (MoMo)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Payout to MTN / Telecel / AirtelTigo
                    </div>
                  </button>
                </div>

                <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
                  {/* Amount Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Amount to Withdraw (GHS)
                      </label>
                      <span className="text-xs text-slate-400">
                        Available: <strong className="font-mono text-emerald-600 dark:text-emerald-400">GHS {affiliateBal.toFixed(2)}</strong>
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">
                        GHS
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="5"
                        max={affiliateBal}
                        placeholder="0.00"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="pl-14 h-12 text-base font-mono font-bold rounded-xl focus:border-emerald-500"
                      />
                    </div>
                    {/* Quick Pill Shortcuts */}
                    <div className="flex gap-2 pt-1">
                      {[10, 20, 50, 100].map((quick) => (
                        <button
                          key={quick}
                          type="button"
                          disabled={quick > affiliateBal}
                          onClick={() => setWithdrawAmount(quick.toString())}
                          className="px-2.5 py-1 text-xs rounded-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition"
                        >
                          GHS {quick}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={affiliateBal <= 0}
                        onClick={() => setWithdrawAmount(affiliateBal.toFixed(2))}
                        className="px-2.5 py-1 text-xs rounded-lg font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-40 transition"
                      >
                        All (Max)
                      </button>
                    </div>
                  </div>

                  {/* MoMo Specific Fields */}
                  {withdrawalMethod === "MOMO" && (
                    <div className="space-y-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-200 dark:border-slate-800 animate-in fade-in">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Mobile Money Carrier
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: "MTN", label: "MTN MoMo", color: "border-amber-400 bg-amber-400/10 text-amber-900 dark:text-amber-200" },
                            { id: "TELECEL", label: "Telecel Cash", color: "border-rose-400 bg-rose-400/10 text-rose-900 dark:text-rose-200" },
                            { id: "AIRTELTIGO", label: "ATMoney", color: "border-blue-400 bg-blue-400/10 text-blue-900 dark:text-blue-200" },
                          ].map((net) => (
                            <button
                              key={net.id}
                              type="button"
                              onClick={() => setMomoNetwork(net.id)}
                              className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
                                momoNetwork === net.id
                                  ? `${net.color} ring-2 ring-emerald-500/30`
                                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {net.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            MoMo Phone Number
                          </label>
                          <Input
                            type="tel"
                            inputMode="tel"
                            placeholder="0241234567"
                            maxLength={10}
                            value={momoNumber}
                            onChange={(e) => setMomoNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            className="h-11 rounded-xl font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Account Registered Name
                          </label>
                          <Input
                            placeholder="e.g. Kwame Mensah"
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            className="h-11 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={submittingWithdrawal || affiliateBal < 5}
                    className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-emerald-500/20"
                  >
                    {submittingWithdrawal ? (
                      <Spinner className="h-5 w-5 mr-2" />
                    ) : withdrawalMethod === "MAIN_WALLET" ? (
                      "Transfer to Main Wallet Instantly"
                    ) : (
                      "Submit MoMo Payout Request"
                    )}
                  </Button>
                </form>
              </Card>
            </div>
          </div>

          {/* Withdrawals History Table */}
          <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-400" />
                Withdrawal & Transfer History
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Log of all past payouts and transfers originating from your affiliate earnings wallet.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {overview?.withdrawals && overview.withdrawals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-y border-slate-200 dark:border-slate-800 font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Reference</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Destination</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {overview.withdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white text-xs">
                            {w.reference || w.id.slice(0, 10)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                w.payoutMethod === "MAIN_WALLET"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              }`}
                            >
                              {w.payoutMethod === "MAIN_WALLET" ? "Main Wallet" : "Mobile Money"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs">
                            {w.payoutMethod === "MAIN_WALLET" ? (
                              <span>Operating Balance</span>
                            ) : (
                              <span>
                                {w.network} • {w.momoNumber} ({w.accountName})
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                            GHS {w.amount.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                                w.status === "APPROVED"
                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                  : w.status === "PENDING"
                                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                  : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {w.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-500 text-xs">
                            {new Date(w.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center text-slate-500 text-xs">
                  No withdrawals made yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Sub-Agent Wholesale Pricing */}
      {activeTab === "pricing" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            {/* Network Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "ALL", label: "All Networks", color: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" },
                { id: "MTN", label: "MTN (Yellow)", color: "bg-amber-400/20 text-amber-700 dark:text-amber-300 border-amber-400/30" },
                { id: "TELECEL", label: "Telecel (Red)", color: "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30" },
                { id: "AIRTELTIGO", label: "AirtelTigo (Blue)", color: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30" },
              ].map((net) => (
                <button
                  key={net.id}
                  onClick={() => setSelectedNetwork(net.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    selectedNetwork === net.id
                      ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 border-transparent shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {net.label}
                </button>
              ))}
            </div>

            {/* Quick Markup Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Quick Markup:</span>
              <button
                onClick={() => handleBulkMarkup(0.5)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-100 transition"
              >
                +0.50 GHS
              </button>
              <button
                onClick={() => handleBulkMarkup(1.0)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-100 transition"
              >
                +1.00 GHS
              </button>
              <button
                onClick={() => handleBulkMarkup(2.0)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-100 transition"
              >
                +2.00 GHS
              </button>
              <button
                onClick={handleResetToCost}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Reset to your wholesale cost (no markup)"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPackages.map((pkg) => {
              const currentPrice = editedPrices[pkg.packageId] ?? pkg.subAgentWholesalePrice;
              const profitMargin = Math.round((currentPrice - pkg.agentCost) * 100) / 100;
              const netUpper = pkg.network.toUpperCase();

              // Carrier-themed card styling
              let borderClass = "border-slate-200 dark:border-slate-800";
              let headerBadge = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";

              if (netUpper === "MTN") {
                borderClass = "border-amber-300 dark:border-amber-500/30 shadow-amber-500/5";
                headerBadge = "bg-[#FFCB05] text-slate-950 font-black";
              } else if (netUpper === "TELECEL") {
                borderClass = "border-rose-300 dark:border-rose-500/30 shadow-rose-500/5";
                headerBadge = "bg-[#E4002B] text-white font-black";
              } else if (netUpper.includes("AIRTEL")) {
                borderClass = "border-blue-300 dark:border-blue-500/30 shadow-blue-500/5";
                headerBadge = "bg-[#005fb8] text-white font-black";
              }

              return (
                <div
                  key={pkg.packageId}
                  className={`relative rounded-2xl border ${borderClass} bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:shadow-md space-y-4`}
                >
                  {/* Top Carrier / Package Pill */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-lg text-xs tracking-wider uppercase ${headerBadge}`}>
                      {pkg.network}
                    </span>
                    <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                      {pkg.gbAmount} GB
                    </span>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                      <span>Your Wholesale Cost:</span>
                      <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                        GHS {pkg.agentCost.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                      <span>Your Profit Per Sale:</span>
                      <span
                        className={`font-black font-mono ${
                          profitMargin > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : profitMargin === 0
                            ? "text-slate-500"
                            : "text-rose-600"
                        }`}
                      >
                        {profitMargin >= 0 ? `+GHS ${profitMargin.toFixed(2)}` : `-GHS ${Math.abs(profitMargin).toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {/* Price Setting Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Sub-Agent Wholesale Price (GHS)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                        GHS
                      </span>
                      <Input
                        type="number"
                        step="0.05"
                        min={pkg.agentCost}
                        value={currentPrice}
                        onChange={(e) => handlePriceChange(pkg.packageId, e.target.value)}
                        className="pl-12 h-10 font-mono font-bold text-slate-900 dark:text-white rounded-xl focus:border-emerald-500"
                      />
                    </div>
                    {currentPrice < pkg.agentCost && (
                      <p className="text-[11px] text-rose-500 font-semibold">
                        Price cannot be lower than your cost of GHS {pkg.agentCost.toFixed(2)}.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Save Bar */}
          <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl bg-slate-950 p-4 text-white shadow-2xl border border-white/15">
            <div className="text-xs sm:text-sm">
              <span className="font-bold text-emerald-400">Custom Wholesale Pricing Active.</span>
              <span className="text-slate-400 hidden sm:inline ml-2">
                Click save to update what your sub-agents pay.
              </span>
            </div>
            <Button
              onClick={handleSavePricing}
              disabled={savingPrices}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 rounded-xl shadow-lg shadow-emerald-500/20"
            >
              {savingPrices ? <Spinner className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Pricing Changes
            </Button>
          </div>
        </div>
      )}

      {/* Tab: Downline Agents */}
      {activeTab === "subagents" && (
        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-black text-slate-900 dark:text-white">
              Your Sub-Agents Directory
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              All agents registered through your referral link who purchase bundles at your wholesale sheet.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {overview?.subAgents && overview.subAgents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-y border-slate-200 dark:border-slate-800 font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Agent Name</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Registered Date</th>
                      <th className="py-3 px-4 text-right">Total Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {overview.subAgents.map((sa) => (
                      <tr key={sa.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {sa.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                          {sa.email}
                          {sa.phone && <div className="text-[11px] text-slate-400">{sa.phone}</div>}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-xs">
                          {new Date(sa.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {sa.orderCount} orders
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 space-y-3">
                <Users className="mx-auto h-10 w-10 text-slate-400" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  No sub-agents registered yet.
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Share your referral link with agents and resellers to begin building your team and earning passive profit.
                </p>
                <Button onClick={handleCopyLink} size="sm" className="rounded-xl gap-2">
                  <Copy className="h-3.5 w-3.5" /> Copy Link Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Commissions Ledger */}
      {activeTab === "commissions" && (
        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-black text-slate-900 dark:text-white">
              Commissions Activity Log
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Live record of all profit margins earned from orders placed by your sub-agent network.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {overview?.recentCommissions && overview.recentCommissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-y border-slate-200 dark:border-slate-800 font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Order Ref</th>
                      <th className="py-3 px-4">Sub-Agent</th>
                      <th className="py-3 px-4">Package</th>
                      <th className="py-3 px-4">Sub-Agent Paid</th>
                      <th className="py-3 px-4">Your Cost</th>
                      <th className="py-3 px-4">Tier</th>
                      <th className="py-3 px-4 text-right">Your Profit</th>
                      <th className="py-3 px-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {overview.recentCommissions.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          #{c.orderId}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                          {c.sourceUserName}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {c.network} {c.gbAmount}GB
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-xs">
                          GHS {c.subAgentCost.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-xs">
                          GHS {c.agentCost.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className="rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5">
                            Tier {c.tierLevel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          +GHS {c.amount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-500 text-xs">
                          {new Date(c.createdAt).toLocaleDateString()}{" "}
                          <span className="text-[11px] text-slate-400">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <DollarSign className="mx-auto h-10 w-10 text-slate-400" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  No commissions earned yet.
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When your sub-agents make a purchase or sell on their storefronts, your profit is calculated and credited to your affiliate wallet instantly.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: How It Works */}
      {activeTab === "guide" && (
        <div className="space-y-6">
          <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              How the Multi-Tier Cascading Affiliate Model Works
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              CleanDataPacks provides a true wholesale cascading system. As an agent, you have the power to recruit other agents and set the exact wholesale prices they pay.
            </p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-5 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
                  1
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white">Share Your Link</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Share your affiliate referral link with your agents. When they register, they are bound under your account as your sub-agent.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-5 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black">
                  2
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white">Set Your Wholesale Sheet</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You determine the price they see for MTN, Telecel, and AirtelTigo. For example, if your cost is 10 GHS and you set 12 GHS, your sub-agent sees 12 GHS everywhere.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-5 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-black">
                  3
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white">Automated Cascading Profit</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Every time your sub-agent places an order, sells via their storefront, or submits via API, the 2 GHS profit is instantly credited to your separate affiliate wallet.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 p-5 text-xs text-emerald-900 dark:text-emerald-100 space-y-2">
              <span className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 text-sm">
                <CheckCircle2 className="h-4 w-4" /> Multi-Tier Downline Cascading
              </span>
              <p className="leading-relaxed">
                If your sub-agent also recruits their own sub-agent (Sub-Agent B) and sets a price of 13 GHS:
                when Sub-Agent B buys, your direct sub-agent gets 1 GHS profit, and <strong>you still get your 2 GHS profit</strong>! The profit cascades up the whole network.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

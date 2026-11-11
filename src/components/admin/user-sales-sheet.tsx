"use client";

import * as React from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Spinner, EmptyState } from "@/components/shared";
import { StatusBadge } from "@/components/status-badge";
import { formatGHS, formatDateTime } from "@/lib/types";
import {
  TrendingUp,
  Calendar,
  Layers,
  ShoppingBag,
  ExternalLink,
  Download,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Store,
  Wallet,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export interface UserSalesUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role?: string;
  status?: string;
  balance?: number;
  pricingProfile?: { id: string; name: string } | null;
}

interface SalesApiResponse {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    balance: number;
    pricingProfile: { id: string; name: string; type: string } | null;
    createdAt: string;
  };
  period: {
    mode: "day" | "month" | "year" | "range";
    label: string;
    from: string;
    to: string;
  };
  summary: {
    totalRevenue: number;
    totalGb: number;
    successfulOrdersCount: number;
    totalOrdersCount: number;
    successRate: number;
    averageOrderValue: number;
    statusBreakdown: Record<string, { count: number; amount: number; gbAmount: number }>;
  };
  networks: Array<{
    network: string;
    count: number;
    amount: number;
    gbAmount: number;
    percentage: number;
  }>;
  channels: Array<{
    source: string;
    count: number;
    amount: number;
    gbAmount: number;
  }>;
  storefront: {
    id: string;
    name: string;
    slug: string;
    status: string;
    completedOrders: number;
    salesGHS: number;
    commissionGHS: number;
  } | null;
  storefrontWallet?: {
    balance: number;
    pendingBalance: number;
  } | null;
  timeline: Array<{
    key: string;
    label: string;
    amount: number;
    gbAmount: number;
    count: number;
  }>;
  topPackages: Array<{
    network: string;
    gbAmount: number;
    count: number;
    amount: number;
  }>;
  recentOrders: Array<{
    id: number;
    phoneNumber: string;
    network: string;
    gbAmount: number;
    amount: number;
    status: string;
    source: string;
    externalReference: string | null;
    createdAt: string;
  }>;
}

type PeriodMode = "day" | "month" | "year" | "range";

interface UserSalesSheetProps {
  open: boolean;
  user: UserSalesUser | null;
  onClose: () => void;
  onSelectUser?: (user: UserSalesUser) => void;
  initialMode?: PeriodMode;
  initialDate?: string;
  initialRangeFrom?: string;
  initialRangeTo?: string;
  initialFromIso?: string;
  initialToIso?: string;
  initialNetwork?: string;
  initialStatus?: string;
  initialSource?: string;
}

export function UserSalesSheet({
  open,
  user,
  onClose,
  onSelectUser,
  initialMode,
  initialDate,
  initialRangeFrom,
  initialRangeTo,
  initialFromIso,
  initialToIso,
  initialNetwork,
  initialStatus,
  initialSource,
}: UserSalesSheetProps) {
  // Current active mode
  const [mode, setMode] = React.useState<PeriodMode>(initialMode || "day");

  // Day filter states
  const todayStr = React.useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const [selectedDate, setSelectedDate] = React.useState<string>(initialDate || todayStr);

  // Month filter states
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = React.useState<number>(currentMonth);
  const [selectedMonthYear, setSelectedMonthYear] = React.useState<number>(currentYear);

  // Year filter states
  const [selectedYear, setSelectedYear] = React.useState<number>(currentYear);

  // Range filter states
  const thirtyDaysAgoStr = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const [rangeFrom, setRangeFrom] = React.useState<string>(initialRangeFrom || thirtyDaysAgoStr);
  const [rangeTo, setRangeTo] = React.useState<string>(initialRangeTo || todayStr);

  // Filter Network, Status & Source
  const [filterNetwork, setFilterNetwork] = React.useState<string>(initialNetwork || "ALL");
  const [filterStatus, setFilterStatus] = React.useState<string>(initialStatus || "ALL");
  const [filterSource, setFilterSource] = React.useState<string>(initialSource || "ALL");

  // Sync state whenever sheet opens with new initial props
  React.useEffect(() => {
    if (open) {
      if (initialMode) setMode(initialMode);
      if (initialDate) setSelectedDate(initialDate);
      if (initialRangeFrom) setRangeFrom(initialRangeFrom);
      if (initialRangeTo) setRangeTo(initialRangeTo);
      if (initialNetwork !== undefined) setFilterNetwork(initialNetwork || "ALL");
      if (initialStatus !== undefined) setFilterStatus(initialStatus || "ALL");
      if (initialSource !== undefined) setFilterSource(initialSource || "ALL");
    }
  }, [open, user?.id, initialMode, initialDate, initialRangeFrom, initialRangeTo, initialNetwork, initialStatus, initialSource]);

  // Chart view metric
  const [chartMetric, setChartMetric] = React.useState<"amount" | "gbAmount">("amount");

  // Fetching state
  const [data, setData] = React.useState<SalesApiResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  // User search/switcher state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<UserSalesUser[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = React.useState(false);

  // Load sales data
  const fetchSales = React.useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    const tzOffset = new Date().getTimezoneOffset();
    const params = new URLSearchParams({
      mode,
      tzOffset: String(tzOffset),
    });

    if (mode === "day") {
      params.set("date", selectedDate);
    } else if (mode === "month") {
      params.set("month", String(selectedMonth));
      params.set("year", String(selectedMonthYear));
    } else if (mode === "year") {
      params.set("year", String(selectedYear));
    } else if (mode === "range") {
      // Use exact ISO boundaries if matching initial range to ensure 100% millisecond precision with reports page
      if (initialFromIso && initialToIso && rangeFrom === initialRangeFrom && rangeTo === initialRangeTo) {
        params.set("from", initialFromIso);
        params.set("to", initialToIso);
      } else {
        if (rangeFrom) params.set("from", rangeFrom);
        if (rangeTo) params.set("to", rangeTo);
      }
    }

    if (filterNetwork && filterNetwork !== "ALL") {
      params.set("network", filterNetwork);
    }
    if (filterStatus && filterStatus !== "ALL") {
      params.set("status", filterStatus);
    }
    if (filterSource && filterSource !== "ALL") {
      params.set("source", filterSource);
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}/sales?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load sales data");
      setData(json);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error loading sales";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    user?.id,
    mode,
    selectedDate,
    selectedMonth,
    selectedMonthYear,
    selectedYear,
    rangeFrom,
    rangeTo,
    filterNetwork,
    filterStatus,
    filterSource,
    initialFromIso,
    initialToIso,
    initialRangeFrom,
    initialRangeTo,
  ]);

  React.useEffect(() => {
    if (open && user?.id) {
      fetchSales();
    }
  }, [open, user?.id, fetchSales]);

  // Search users for quick switcher
  React.useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/admin/users?q=${encodeURIComponent(searchQuery)}&pageSize=5`);
        const json = await res.json();
        setSearchResults(json.data ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Quick preset handlers
  const handleSetToday = () => {
    setSelectedDate(todayStr);
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  };

  const handleSetThisMonth = () => {
    const d = new Date();
    setSelectedMonth(d.getMonth() + 1);
    setSelectedMonthYear(d.getFullYear());
  };

  const handleSetLastMonth = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    setSelectedMonth(d.getMonth() + 1);
    setSelectedMonthYear(d.getFullYear());
  };

  const handleSetThisYear = () => {
    setSelectedYear(new Date().getFullYear());
  };

  const handleSetLastYear = () => {
    setSelectedYear(new Date().getFullYear() - 1);
  };

  const handleSetRangeDays = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const sStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    const eStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    setRangeFrom(sStr);
    setRangeTo(eStr);
  };

  const handleExport = (format: "csv" | "xlsx" | "pdf") => {
    if (!user || !data?.period) return;
    const url = `/api/admin/export?type=orders&userId=${user.id}&from=${encodeURIComponent(data.period.from)}&to=${encodeURIComponent(data.period.to)}&format=${format}`;
    window.open(url, "_blank");
  };

  const activeUser = React.useMemo(() => {
    if (!user) return null;
    if (data?.user && data.user.id === user.id) {
      return {
        ...user,
        ...data.user,
        balance: data.user.balance !== undefined ? data.user.balance : (user.balance ?? 0),
      };
    }
    return user;
  }, [user, data?.user]);

  if (!user || !activeUser) return null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      className="max-w-4xl w-full"
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <TrendingUp className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <span>User Sales Summary</span>
        </div>
      }
      description={
        <span>
          Detailed sales analytics, order volume, and network distribution for{" "}
          <strong className="text-slate-800 dark:text-slate-200">{activeUser.name}</strong>
        </span>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Export Orders:</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport("csv")}
              className="h-8 text-xs font-semibold"
              disabled={loading || !data?.summary.totalOrdersCount}
            >
              <Download className="h-3 w-3 mr-1" /> CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport("xlsx")}
              className="h-8 text-xs font-semibold"
              disabled={loading || !data?.summary.totalOrdersCount}
            >
              <Download className="h-3 w-3 mr-1" /> Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport("pdf")}
              className="h-8 text-xs font-semibold"
              disabled={loading || !data?.summary.totalOrdersCount}
            >
              <Download className="h-3 w-3 mr-1" /> PDF
            </Button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="h-8 text-xs"
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={fetchSales}
              disabled={loading}
              className="h-8 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* User Profile Card & Switcher */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-slate-800/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-sm font-bold text-white shadow-md shadow-brand-500/20">
                {activeUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                    {activeUser.name}
                  </h3>
                  <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                    {activeUser.role || "USER"}
                  </span>
                  {activeUser.status && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        activeUser.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                      }`}
                    >
                      {activeUser.status}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>{activeUser.email}</span>
                  {activeUser.phone && <span>• {activeUser.phone}</span>}
                  <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <Wallet className="h-3.5 w-3.5" />
                    <span>Wallet: {formatGHS(activeUser.balance ?? 0)}</span>
                    <a
                      href={`/admin/wallets?userId=${activeUser.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View wallet & ledger transactions"
                      className="inline-flex items-center text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-300 ml-0.5 transition"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {data?.storefrontWallet && data.storefrontWallet.balance > 0 && (
                    <div className="flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400">
                      <Store className="h-3.5 w-3.5" />
                      <span>Storefront: {formatGHS(data.storefrontWallet.balance)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick User Switcher Autocomplete */}
            {onSelectUser && (
              <div className="relative sm:w-60">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Switch user..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchDropdown(true);
                    }}
                    onFocus={() => setShowSearchDropdown(true)}
                    className="w-full h-8 pl-8 pr-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                  />
                  {searchLoading && (
                    <Spinner className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-brand-600" />
                  )}
                </div>

                {showSearchDropdown && searchResults.length > 0 && (
                  <div className="absolute right-0 top-full mt-1.5 w-72 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900 z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {searchResults.map((su) => (
                      <button
                        key={su.id}
                        type="button"
                        onClick={() => {
                          onSelectUser(su);
                          setSearchQuery("");
                          setShowSearchDropdown(false);
                        }}
                        className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {su.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{su.email}</p>
                        </div>
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                          {formatGHS(su.balance ?? 0)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Time Period Controls */}
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900 shadow-2xs">
          {/* Period Mode Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setMode("day")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  mode === "day"
                    ? "bg-white text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setMode("month")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  mode === "month"
                    ? "bg-white text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setMode("year")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  mode === "year"
                    ? "bg-white text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Year
              </button>
              <button
                type="button"
                onClick={() => setMode("range")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  mode === "range"
                    ? "bg-white text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Range
              </button>
            </div>

            {/* Current Active Label Display & Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {data?.period?.label && (
                <div className="flex items-center gap-1.5 rounded-lg bg-brand-50/70 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{data.period.label}</span>
                </div>
              )}
              {filterNetwork !== "ALL" && (
                <div className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  <span>Network: {filterNetwork}</span>
                  <button type="button" onClick={() => setFilterNetwork("ALL")} className="ml-0.5 hover:text-red-500 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {filterStatus !== "ALL" && (
                <div className="flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                  <span>Status: {filterStatus}</span>
                  <button type="button" onClick={() => setFilterStatus("ALL")} className="ml-0.5 hover:text-red-500 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {filterSource !== "ALL" && (
                <div className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  <span>Source: {filterSource}</span>
                  <button type="button" onClick={() => setFilterSource("ALL")} className="ml-0.5 hover:text-red-500 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mode-Specific Date Pickers & Shortcuts */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/5">
            {mode === "day" && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Quick Pick:
                  </span>
                  <Button
                    size="sm"
                    variant={selectedDate === todayStr ? "default" : "outline"}
                    onClick={handleSetToday}
                    className="h-7 text-xs font-semibold"
                  >
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSetYesterday}
                    className="h-7 text-xs font-semibold"
                  >
                    Yesterday
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Select Day:
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-8 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            )}

            {mode === "month" && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Quick Pick:
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSetThisMonth}
                    className="h-7 text-xs font-semibold"
                  >
                    This Month
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSetLastMonth}
                    className="h-7 text-xs font-semibold"
                  >
                    Last Month
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Month & Year:
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value={1}>January</option>
                    <option value={2}>February</option>
                    <option value={3}>March</option>
                    <option value={4}>April</option>
                    <option value={5}>May</option>
                    <option value={6}>June</option>
                    <option value={7}>July</option>
                    <option value={8}>August</option>
                    <option value={9}>September</option>
                    <option value={10}>October</option>
                    <option value={11}>November</option>
                    <option value={12}>December</option>
                  </select>
                  <select
                    value={selectedMonthYear}
                    onChange={(e) => setSelectedMonthYear(Number(e.target.value))}
                    className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {mode === "year" && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Quick Pick:
                  </span>
                  <Button
                    size="sm"
                    variant={selectedYear === currentYear ? "default" : "outline"}
                    onClick={handleSetThisYear}
                    className="h-7 text-xs font-semibold"
                  >
                    This Year ({currentYear})
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedYear === currentYear - 1 ? "default" : "outline"}
                    onClick={handleSetLastYear}
                    className="h-7 text-xs font-semibold"
                  >
                    Last Year ({currentYear - 1})
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Select Year:
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="h-8 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4].map(
                      (y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            )}

            {mode === "range" && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
                    Presets:
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetRangeDays(7)}
                    className="h-7 text-xs font-semibold"
                  >
                    Last 7D
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetRangeDays(30)}
                    className="h-7 text-xs font-semibold"
                  >
                    Last 30D
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetRangeDays(90)}
                    className="h-7 text-xs font-semibold"
                  >
                    Last 90D
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value)}
                    className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="date"
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                    className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Spinner className="h-8 w-8 text-brand-600" />
            <p className="text-xs font-medium text-slate-500">Calculating sales summary...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="font-semibold">{error}</p>
            <Button
              size="sm"
              onClick={fetchSales}
              className="mt-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Main Content Area */}
        {!loading && !error && data && (
          <div className="space-y-6">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total Completed Sales GHS */}
              <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white p-4 dark:border-emerald-500/20 dark:from-emerald-950/20 dark:to-slate-900">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide block">
                  Total Sales (GHS)
                </span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {formatGHS(data.summary.totalRevenue)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span className="truncate">{data.summary.successfulOrdersCount.toLocaleString()} completed orders</span>
                </p>
              </div>

              {/* Total Orders Placed */}
              <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/80 to-white p-4 dark:border-blue-500/20 dark:from-blue-950/20 dark:to-slate-900">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide block">
                  Total Orders
                </span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {data.summary.totalOrdersCount.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 truncate">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {data.summary.successfulOrdersCount.toLocaleString()} completed
                  </span>
                  {data.summary.totalOrdersCount > data.summary.successfulOrdersCount && (
                    <span className="text-slate-400">
                      • {(data.summary.totalOrdersCount - data.summary.successfulOrdersCount).toLocaleString()} other
                    </span>
                  )}
                </p>
              </div>

              {/* Total GB Volume */}
              <div className="rounded-2xl border border-brand-200/80 bg-gradient-to-br from-brand-50/80 to-white p-4 dark:border-brand-500/20 dark:from-brand-950/20 dark:to-slate-900">
                <span className="text-[11px] font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wide block">
                  Total Volume
                </span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {data.summary.totalGb.toLocaleString(undefined, { maximumFractionDigits: 1 })}{" "}
                  <span className="text-sm font-semibold">GB</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 truncate">
                  <Layers className="h-3 w-3 text-brand-500 shrink-0" />
                  <span>
                    Avg {(data.summary.successfulOrdersCount > 0 ? (data.summary.totalGb / data.summary.successfulOrdersCount).toFixed(1) : "0")} GB / order
                  </span>
                </p>
              </div>

              {/* Success Rate */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                  Success Rate
                </span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {data.summary.successRate}%
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                  AOV: {formatGHS(data.summary.averageOrderValue)}
                </p>
              </div>
            </div>

            {/* Storefront Performance (if user has storefront) */}
            {data.storefront && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-500/20 dark:bg-indigo-950/20">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-bold text-sm text-indigo-900 dark:text-indigo-200">
                      Reseller Storefront: {data.storefront.name}
                    </span>
                  </div>
                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                    {data.storefront.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
                  <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Retail Sales</span>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {formatGHS(data.storefront.salesGHS)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Commissions Earned</span>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {formatGHS(data.storefront.commissionGHS)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Retail Customers</span>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {data.storefront.completedOrders} orders
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sales Distribution Chart */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {mode === "day"
                      ? "Hourly Sales Activity"
                      : mode === "year"
                      ? "Monthly Sales Activity"
                      : "Daily Sales Activity"}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Showing sales progression over {data.period.label}
                  </p>
                </div>
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setChartMetric("amount")}
                    className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                      chartMetric === "amount"
                        ? "bg-white text-emerald-600 shadow-2xs dark:bg-slate-900 dark:text-emerald-400"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    }`}
                  >
                    Revenue (GHS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric("gbAmount")}
                    className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                      chartMetric === "gbAmount"
                        ? "bg-white text-brand-600 shadow-2xs dark:bg-slate-900 dark:text-brand-400"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    }`}
                  >
                    Volume (GB)
                  </button>
                </div>
              </div>

              <div className="h-64 w-full">
                {data.timeline.length === 0 || data.timeline.every((t) => t.amount === 0) ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
                    <Calendar className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs font-semibold">No sales recorded for this period</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                      <XAxis dataKey="label" fontSize={11} tickLine={false} />
                      <YAxis fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0d1526",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                        formatter={(val: unknown) => [
                          chartMetric === "amount" ? formatGHS(Number(val)) : `${Number(val)} GB`,
                          chartMetric === "amount" ? "Revenue" : "Volume",
                        ]}
                      />
                      <Bar
                        dataKey={chartMetric}
                        name={chartMetric === "amount" ? "Revenue (GHS)" : "Data Volume (GB)"}
                        fill={chartMetric === "amount" ? "#10b981" : "#2563eb"}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Network & Channel Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Networks Breakdown */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                  Sales by Network
                </h4>
                {data.networks.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No network sales</p>
                ) : (
                  <div className="space-y-3">
                    {data.networks.map((n) => {
                      const netColor =
                        n.network === "MTN"
                          ? "bg-amber-400"
                          : n.network === "TELECEL"
                          ? "bg-red-500"
                          : "bg-blue-500";
                      return (
                        <div key={n.network} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {n.network}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {formatGHS(n.amount)}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                ({n.percentage}%)
                              </span>
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${netColor}`}
                              style={{ width: `${Math.min(100, Math.max(3, n.percentage))}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                            <span>{n.count} orders</span>
                            <span>{n.gbAmount} GB</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status Breakdown & Source Channels */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                    Order Status Breakdown
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(data.summary.statusBreakdown).map(([st, stat]) => (
                      <div
                        key={st}
                        className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-800/40"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-[11px] text-slate-600 dark:text-slate-300">
                            {st}
                          </span>
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {stat.count}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                          {formatGHS(stat.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Source Channels */}
                <div className="pt-4 border-t border-slate-100 dark:border-white/5 mt-4">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2">
                    Order Source:
                  </span>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {data.channels.map((c) => (
                      <span
                        key={c.source}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold"
                      >
                        {c.source}: {c.count} orders ({formatGHS(c.amount)})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Packages Purchased */}
            {data.topPackages.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                  Top Data Bundles Purchased
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {data.topPackages.map((pkg, idx) => (
                    <div
                      key={`${pkg.network}-${pkg.gbAmount}-${idx}`}
                      className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {pkg.network} {pkg.gbAmount} GB
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {pkg.count} sold
                        </span>
                      </div>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {formatGHS(pkg.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders in this Period */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Orders in This Period
                  </h4>
                  <p className="text-xs text-slate-500">
                    Showing {data.recentOrders.length} recent orders
                  </p>
                </div>
                <a
                  href={`/admin/orders?q=${encodeURIComponent(activeUser.email)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  View in Orders Manager
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {data.recentOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No individual orders placed during this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/40">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold">Recipient</th>
                        <th className="px-3.5 py-2.5 font-semibold">Network</th>
                        <th className="px-3.5 py-2.5 font-semibold">Volume</th>
                        <th className="px-3.5 py-2.5 font-semibold">Amount</th>
                        <th className="px-3.5 py-2.5 font-semibold">Status</th>
                        <th className="px-3.5 py-2.5 font-semibold">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.recentOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-3.5 py-2.5 font-mono text-slate-900 dark:text-slate-100">
                            {ord.phoneNumber}
                          </td>
                          <td className="px-3.5 py-2.5 font-semibold">{ord.network}</td>
                          <td className="px-3.5 py-2.5">{ord.gbAmount} GB</td>
                          <td className="px-3.5 py-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                            {formatGHS(ord.amount)}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                ord.status === "SUCCESS"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                  : ord.status === "FAILED" || ord.status === "CANCELLED"
                                  ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                              }`}
                            >
                              {ord.status}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-500 whitespace-nowrap">
                            {formatDateTime(ord.createdAt)}
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
      </div>
    </Sheet>
  );
}

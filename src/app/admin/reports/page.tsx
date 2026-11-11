"use client";

import * as React from "react";
import { PageHeader, Spinner, StatCard } from "@/components/shared";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { formatGHS, NETWORK_META, type NetworkProvider } from "@/lib/types";
import {
  FileBarChart,
  TrendingUp,
  ClipboardList,
  Users,
  Calendar,
  Filter,
  RefreshCw,
  X,
  ChevronRight,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  Radio,
  Layers,
  Wallet,
  AlertCircle,
  XCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { UserSalesSheet, type UserSalesUser } from "@/components/admin/user-sales-sheet";

interface NetworkStat {
  network: string;
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  revenue: number;
  gbAmount: number;
  successRate: number;
}

interface ReportData {
  statusCounts: Record<string, number>;
  statusDetails?: Record<string, { count: number; amount: number; gbAmount: number }>;
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  processingOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  totalRevenue: number;
  pendingRevenue: number;
  totalGb: number;
  successRate: number;
  aov: number;
  networks: NetworkStat[];
  daily: {
    day: string;
    count: number;
    successCount?: number;
    amount: number;
    gbAmount?: number;
  }[];
  byPackage: { network: string; gbAmount: number; count: number; amount: number }[];
  topUsers: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    role?: string;
    status?: string;
    balance?: number;
    orders: number;
    totalOrders?: number;
    spend: number;
    gbAmount?: number;
  }[];
  filter?: {
    from?: string;
    to?: string;
    isSingleDay?: boolean;
    network?: string;
    status?: string;
    source?: string;
  };
}

type DatePreset = "today" | "yesterday" | "7" | "30" | "90" | "specific_date" | "custom";

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminReportsPage() {
  const [data, setData] = React.useState<ReportData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [salesUser, setSalesUser] = React.useState<UserSalesUser | null>(null);
  const [chartMetric, setChartMetric] = React.useState<"revenue" | "volume">("revenue");

  // Filter States
  const [preset, setPreset] = React.useState<DatePreset>("30");
  const [specificDate, setSpecificDate] = React.useState<string>(() => formatDateInput(new Date()));
  const [customFrom, setCustomFrom] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDateInput(d);
  });
  const [customTo, setCustomTo] = React.useState<string>(() => formatDateInput(new Date()));
  const [network, setNetwork] = React.useState<string>("ALL");
  const [status, setStatus] = React.useState<string>("ALL");
  const [source, setSource] = React.useState<string>("ALL");

  const buildQuery = React.useCallback(() => {
    const params = new URLSearchParams();

    if (preset === "today") {
      params.set("date", formatDateInput(new Date()));
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      params.set("date", formatDateInput(y));
    } else if (preset === "specific_date") {
      if (specificDate) params.set("date", specificDate);
    } else if (preset === "custom") {
      if (customFrom) params.set("from", customFrom);
      if (customTo) params.set("to", customTo);
    } else {
      // 7, 30, 90 days presets: clean full calendar day boundaries
      const days = Number(preset) || 30;
      const from = new Date();
      from.setDate(from.getDate() - (days - 1));
      params.set("from", formatDateInput(from));
      params.set("to", formatDateInput(new Date()));
    }

    if (network !== "ALL") params.set("network", network);
    if (status !== "ALL") params.set("status", status);
    if (source !== "ALL") params.set("source", source);

    const tzOffset = new Date().getTimezoneOffset();
    params.set("tzOffset", String(tzOffset));

    return params.toString();
  }, [preset, specificDate, customFrom, customTo, network, status, source]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQuery();
      const res = await fetch(`/api/admin/reports?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load reports data");
      setData({
        statusCounts: json.statusCounts ?? {},
        statusDetails: json.statusDetails ?? {},
        totalOrders: json.totalOrders ?? 0,
        successfulOrders: json.successfulOrders ?? 0,
        failedOrders: json.failedOrders ?? 0,
        processingOrders: json.processingOrders ?? 0,
        pendingOrders: json.pendingOrders ?? 0,
        cancelledOrders: json.cancelledOrders ?? 0,
        refundedOrders: json.refundedOrders ?? 0,
        totalRevenue: json.totalRevenue ?? 0,
        pendingRevenue: json.pendingRevenue ?? 0,
        totalGb: json.totalGb ?? 0,
        successRate: json.successRate ?? 0,
        aov: json.aov ?? 0,
        networks: json.networks ?? [],
        daily: json.daily ?? [],
        byPackage: json.byPackage ?? [],
        topUsers: json.topUsers ?? [],
        filter: json.filter,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load reports data");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const resetFilters = () => {
    setPreset("30");
    setNetwork("ALL");
    setStatus("ALL");
    setSource("ALL");
    setSpecificDate(formatDateInput(new Date()));
  };

  const hasActiveFilters =
    network !== "ALL" ||
    status !== "ALL" ||
    source !== "ALL" ||
    preset === "specific_date" ||
    preset === "custom" ||
    preset === "today" ||
    preset === "yesterday";

  const safeData: ReportData = data ?? {
    statusCounts: {},
    totalOrders: 0,
    successfulOrders: 0,
    failedOrders: 0,
    processingOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    refundedOrders: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    totalGb: 0,
    successRate: 0,
    aov: 0,
    networks: [],
    daily: [],
    byPackage: [],
    topUsers: [],
  };

  const daily = (safeData.daily ?? []).map((d) => ({
    ...d,
    amount: Number(d.amount),
    gbAmount: Number(d.gbAmount ?? 0),
  }));

  const isHourly = safeData.filter?.isSingleDay;

  // Human description for timeline chart
  const timelineTitle = isHourly
    ? preset === "today"
      ? "Hourly Orders & Performance (Today)"
      : preset === "yesterday"
      ? "Hourly Orders & Performance (Yesterday)"
      : `Hourly Orders & Performance (${specificDate || "Selected Date"})`
    : preset === "7"
    ? "Daily Orders & Performance (Last 7 Days)"
    : preset === "30"
    ? "Daily Orders & Performance (Last 30 Days)"
    : preset === "90"
    ? "Daily Orders & Performance (Last 90 Days)"
    : "Daily Orders & Performance (Custom Range)";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Reports"
        description="Comprehensive platform metrics, settled revenue, network distributions, and customer analytics"
        actions={
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-brand-600 dark:text-brand-400 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Filter Control Center */}
      <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-4 sm:p-5 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#0b1322]/90 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Date &amp; Filter Options</h2>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Reset all filters
            </button>
          )}
        </div>

        {/* Date Preset Buttons */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Date Range Preset</p>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7", label: "Last 7 Days" },
              { id: "30", label: "Last 30 Days" },
              { id: "90", label: "Last 90 Days" },
              { id: "specific_date", label: "Specific Date", icon: Calendar },
              { id: "custom", label: "Custom Range", icon: Filter },
            ].map((p) => {
              const active = preset === p.id;
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id as DatePreset)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-brand-600 text-white shadow-sm dark:bg-brand-500"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Inputs based on preset */}
        {preset === "specific_date" && (
          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-brand-200/60 bg-brand-50/40 p-3.5 dark:border-brand-500/20 dark:bg-brand-500/5">
            <div className="space-y-1">
              <label htmlFor="report-specific-date" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pick Exact Date
              </label>
              <input
                id="report-specific-date"
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                max={formatDateInput(new Date())}
                className="block rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => setSpecificDate(formatDateInput(new Date()))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              Set to Today
            </button>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 self-center">
              Viewing continuous 24-hour hourly distribution for this day.
            </p>
          </div>
        )}

        {preset === "custom" && (
          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-brand-200/60 bg-brand-50/40 p-3.5 dark:border-brand-500/20 dark:bg-brand-500/5">
            <div className="space-y-1">
              <label htmlFor="report-from-date" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                From Date
              </label>
              <input
                id="report-from-date"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                max={customTo || formatDateInput(new Date())}
                className="block rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="report-to-date" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                To Date
              </label>
              <input
                id="report-to-date"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                min={customFrom}
                max={formatDateInput(new Date())}
                className="block rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setCustomFrom(formatDateInput(new Date()));
                setCustomTo(formatDateInput(new Date()));
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              Today Only
            </button>
          </div>
        )}

        {/* Dropdown Filters (Network, Status, Source) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Network Filter */}
          <div className="space-y-1">
            <label htmlFor="filter-network" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Network
            </label>
            <select
              id="filter-network"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-bold text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-100"
            >
              <option value="ALL">All Networks</option>
              <option value="MTN">MTN</option>
              <option value="TELECEL">Telecel</option>
              <option value="AIRTELTIGO">AirtelTigo</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label htmlFor="filter-status" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Order Status
            </label>
            <select
              id="filter-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-bold text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-100"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Completed (Success)</option>
              <option value="PROCESSING">Processing</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          {/* Source Filter */}
          <div className="space-y-1">
            <label htmlFor="filter-source" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Order Source
            </label>
            <select
              id="filter-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-bold text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-100"
            >
              <option value="ALL">All Sources</option>
              <option value="WEB">Web Dashboard</option>
              <option value="API">Developer API</option>
              <option value="STOREFRONT">Storefront Customer</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <span className="text-[11px] font-medium text-slate-400">Active filters:</span>
            {network !== "ALL" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                Network: {network}
                <button type="button" onClick={() => setNetwork("ALL")} className="cursor-pointer">
                  <X className="h-3 w-3 hover:text-red-500" />
                </button>
              </span>
            )}
            {status !== "ALL" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                Status: {status}
                <button type="button" onClick={() => setStatus("ALL")} className="cursor-pointer">
                  <X className="h-3 w-3 hover:text-red-500" />
                </button>
              </span>
            )}
            {source !== "ALL" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                Source: {source}
                <button type="button" onClick={() => setSource("ALL")} className="cursor-pointer">
                  <X className="h-3 w-3 hover:text-red-500" />
                </button>
              </span>
            )}
            {preset === "specific_date" && specificDate && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                Date: {specificDate}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          <p className="font-semibold">{error}</p>
          <button
            onClick={() => loadData()}
            className="mt-3 inline-flex items-center rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading Overlay or Stat Cards */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8 text-brand-600" />
        </div>
      ) : (
        <>
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              title="Orders in Range"
              value={safeData.totalOrders.toLocaleString()}
              icon={ClipboardList}
              hint={
                `${(safeData.successfulOrders ?? safeData.statusCounts?.SUCCESS ?? 0).toLocaleString()} fulfilled • ${(safeData.failedOrders ?? safeData.statusCounts?.FAILED ?? 0).toLocaleString()} failed`
              }
            />
            <StatCard
              title="Completed Revenue"
              value={formatGHS(safeData.totalRevenue)}
              icon={TrendingUp}
              hint={
                safeData.pendingRevenue > 0
                  ? `+${formatGHS(safeData.pendingRevenue)} in-flight`
                  : `AOV: ${formatGHS(safeData.aov)}`
              }
            />
            <StatCard
              title="Data Delivered"
              value={`${safeData.totalGb.toLocaleString()} GB`}
              icon={Layers}
              hint="Delivered volume in range"
            />
            <StatCard
              title="Success Rate"
              value={`${safeData.successRate}%`}
              icon={FileBarChart}
              hint={`${(safeData.successfulOrders ?? 0).toLocaleString()} of ${safeData.totalOrders.toLocaleString()} completed`}
            />
          </div>

          {/* Status Breakdown Bar & Interactive Chips */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Order Status Distribution</h3>
                <p className="text-xs text-slate-400">
                  Exact order volumes and financial allocations in active range
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {safeData.totalOrders.toLocaleString()} Total Placed
              </span>
            </div>

            {/* Visual Distribution Stacked Bar */}
            {safeData.totalOrders > 0 && (
              <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden">
                {(safeData.successfulOrders > 0) && (
                  <div
                    style={{ width: `${(safeData.successfulOrders / safeData.totalOrders) * 100}%` }}
                    className="bg-emerald-500 transition-all"
                    title={`Completed: ${safeData.successfulOrders}`}
                  />
                )}
                {(safeData.processingOrders > 0) && (
                  <div
                    style={{ width: `${(safeData.processingOrders / safeData.totalOrders) * 100}%` }}
                    className="bg-blue-500 transition-all"
                    title={`Processing: ${safeData.processingOrders}`}
                  />
                )}
                {(safeData.pendingOrders > 0) && (
                  <div
                    style={{ width: `${(safeData.pendingOrders / safeData.totalOrders) * 100}%` }}
                    className="bg-amber-500 transition-all"
                    title={`Pending: ${safeData.pendingOrders}`}
                  />
                )}
                {(safeData.failedOrders > 0) && (
                  <div
                    style={{ width: `${(safeData.failedOrders / safeData.totalOrders) * 100}%` }}
                    className="bg-red-500 transition-all"
                    title={`Failed: ${safeData.failedOrders}`}
                  />
                )}
                {(safeData.cancelledOrders > 0) && (
                  <div
                    style={{ width: `${(safeData.cancelledOrders / safeData.totalOrders) * 100}%` }}
                    className="bg-slate-400 transition-all"
                    title={`Cancelled: ${safeData.cancelledOrders}`}
                  />
                )}
                {(safeData.refundedOrders > 0) && (
                  <div
                    style={{ width: `${(safeData.refundedOrders / safeData.totalOrders) * 100}%` }}
                    className="bg-purple-500 transition-all"
                    title={`Refunded: ${safeData.refundedOrders}`}
                  />
                )}
              </div>
            )}

            {/* Status Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
              {[
                {
                  key: "SUCCESS",
                  label: "Completed",
                  count: safeData.successfulOrders,
                  amount: safeData.statusDetails?.SUCCESS?.amount ?? safeData.totalRevenue,
                  color: "emerald",
                  icon: CheckCircle2,
                },
                {
                  key: "PROCESSING",
                  label: "Processing",
                  count: safeData.processingOrders,
                  amount: safeData.statusDetails?.PROCESSING?.amount ?? 0,
                  color: "blue",
                  icon: Clock,
                },
                {
                  key: "PENDING",
                  label: "Pending",
                  count: safeData.pendingOrders,
                  amount: safeData.statusDetails?.PENDING?.amount ?? 0,
                  color: "amber",
                  icon: AlertCircle,
                },
                {
                  key: "FAILED",
                  label: "Failed",
                  count: safeData.failedOrders,
                  amount: safeData.statusDetails?.FAILED?.amount ?? 0,
                  color: "red",
                  icon: XCircle,
                },
                {
                  key: "CANCELLED",
                  label: "Cancelled",
                  count: safeData.cancelledOrders,
                  amount: safeData.statusDetails?.CANCELLED?.amount ?? 0,
                  color: "slate",
                  icon: X,
                },
                {
                  key: "REFUNDED",
                  label: "Refunded",
                  count: safeData.refundedOrders,
                  amount: safeData.statusDetails?.REFUNDED?.amount ?? 0,
                  color: "purple",
                  icon: RotateCcw,
                },
              ].map((s) => {
                const Icon = s.icon;
                const isSelected = status === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStatus(isSelected ? "ALL" : s.key)}
                    className={`rounded-2xl p-2.5 text-left border transition cursor-pointer ${
                      isSelected
                        ? "border-brand-500 bg-brand-50/50 dark:bg-brand-500/10 shadow-sm"
                        : "border-slate-100 bg-slate-50/50 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1">
                        <Icon className="h-3 w-3" />
                        {s.label}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">{s.count}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {formatGHS(s.amount)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Network Performance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["MTN", "TELECEL", "AIRTELTIGO"] as NetworkProvider[]).map((net) => {
              const meta = NETWORK_META[net] || { label: net, className: "", dot: "bg-slate-400" };
              const stat = safeData.networks.find((n) => n.network === net) || {
                network: net,
                totalOrders: 0,
                successfulOrders: 0,
                failedOrders: 0,
                revenue: 0,
                gbAmount: 0,
                successRate: 0,
              };
              const isSelected = network === net;

              return (
                <div
                  key={net}
                  onClick={() => setNetwork(isSelected ? "ALL" : net)}
                  className={`rounded-3xl border p-4 sm:p-5 transition shadow-sm cursor-pointer ${
                    isSelected
                      ? "border-brand-500 bg-brand-50/30 dark:bg-brand-500/5 ring-1 ring-brand-500"
                      : "border-slate-100 bg-white hover:border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${meta.className}`}>
                      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {stat.successRate}% Success
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-left">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Orders</span>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {stat.totalOrders.toLocaleString()}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {stat.successfulOrders} fulfilled
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Delivered</span>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {stat.gbAmount.toLocaleString()} GB
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Revenue</span>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {formatGHS(stat.revenue)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timeline Chart (Hourly or Daily) */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{timelineTitle}</h3>
                <p className="text-xs text-slate-400">
                  {isHourly
                    ? "Orders, revenue, and delivered volume per hour of the selected date"
                    : "Continuous timeline aggregated per calendar day"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setChartMetric("revenue")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                      chartMetric === "revenue"
                        ? "bg-white text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-400"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    }`}
                  >
                    Revenue &amp; Orders
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric("volume")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                      chartMetric === "volume"
                        ? "bg-white text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-400"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    }`}
                  >
                    Data Volume (GB)
                  </button>
                </div>
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    Orders
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    {chartMetric === "revenue" ? "Revenue" : "Volume (GB)"}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-72">
              {daily.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No orders recorded for this filter criteria
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.15)" />
                    <XAxis dataKey="day" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="left" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" fontSize={11} tickLine={false} />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        name === "Revenue (GHS)"
                          ? formatGHS(Number(val))
                          : name === "Volume (GB)"
                          ? `${Number(val).toLocaleString()} GB`
                          : val,
                        name,
                      ]}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="count"
                      name="Orders"
                      stroke="#2563EB"
                      strokeWidth={2}
                      dot={false}
                    />
                    {chartMetric === "revenue" ? (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="amount"
                        name="Revenue (GHS)"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={false}
                      />
                    ) : (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="gbAmount"
                        name="Volume (GB)"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Breakdown Section: By Package & Top Users */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Orders by package */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Popular Packages</h3>
              <div className="h-64">
                {safeData.byPackage.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    No package volume found in this range
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={safeData.byPackage.map((b) => ({
                        name: `${b.network} ${b.gbAmount}GB`,
                        count: b.count,
                      }))}
                      layout="vertical"
                    >
                      <XAxis type="number" fontSize={11} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={110} fontSize={10} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563EB" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top users by spend */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Customers by Spend</h3>
                  <p className="text-xs text-slate-400">Click any user to view comprehensive sales analysis &amp; live wallet</p>
                </div>
              </div>
              {safeData.topUsers.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-xs text-slate-400">
                  No orders matching the active criteria
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  {safeData.topUsers.map((u, i) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSalesUser({
                            id: u.id,
                            name: u.name,
                            email: u.email,
                            phone: u.phone,
                            balance: u.balance,
                            role: u.role,
                            status: u.status,
                          })
                        }
                        className="w-full flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group cursor-pointer"
                        title={`View sales summary for ${u.name}`}
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                              {u.name}
                            </p>
                            {u.role && (
                              <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                {u.role}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                            <span className="truncate">{u.email}</span>
                            <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                              <Wallet className="h-3 w-3" />
                              Wallet: {formatGHS(u.balance ?? 0)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-slate-900 dark:text-white">{formatGHS(u.spend)}</p>
                          <p className="text-xs text-slate-500">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {(u.totalOrders ?? u.orders).toLocaleString()} total orders
                            </span>
                            {u.totalOrders && u.totalOrders !== u.orders
                              ? ` (${u.orders.toLocaleString()} completed)`
                              : ""}
                            {u.gbAmount ? ` • ${u.gbAmount} GB` : ""}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600 transition-colors ml-1 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {/* User Sales Summary Sheet */}
      {salesUser && (
        <UserSalesSheet
          key={`${salesUser.id}-${safeData.filter?.from}-${safeData.filter?.to}-${network}-${status}-${source}`}
          open={Boolean(salesUser)}
          user={salesUser}
          onClose={() => setSalesUser(null)}
          onSelectUser={(u) => setSalesUser(u)}
          initialMode={safeData.filter?.isSingleDay ? "day" : "range"}
          initialDate={
            preset === "today"
              ? formatDateInput(new Date())
              : preset === "yesterday"
              ? (() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  return formatDateInput(y);
                })()
              : preset === "specific_date"
              ? specificDate
              : safeData.filter?.from?.slice(0, 10)
          }
          initialRangeFrom={
            preset === "custom"
              ? customFrom
              : safeData.filter?.from
              ? safeData.filter.from.slice(0, 10)
              : undefined
          }
          initialRangeTo={
            preset === "custom"
              ? customTo
              : safeData.filter?.to
              ? safeData.filter.to.slice(0, 10)
              : undefined
          }
          initialFromIso={safeData.filter?.from}
          initialToIso={safeData.filter?.to}
          initialNetwork={network !== "ALL" ? network : undefined}
          initialStatus={status !== "ALL" ? status : undefined}
          initialSource={source !== "ALL" ? source : undefined}
        />
      )}
    </div>
  );
}

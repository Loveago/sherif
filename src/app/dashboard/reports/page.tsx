"use client";

import * as React from "react";
import { Spinner, StatCard } from "@/components/shared";
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
import { formatGHS } from "@/lib/types";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Calendar,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
  X,
  SlidersHorizontal,
  Activity,
  Zap,
} from "lucide-react";

interface ReportData {
  statusCounts: Record<string, number>;
  totalOrders: number;
  totalSpend: number;
  daily: { day: string; count: number; amount: number }[];
  byPackage: { network: string; gbAmount: number; count: number; amount: number }[];
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

export default function ReportsPage() {
  const [data, setData] = React.useState<ReportData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters state
  const [preset, setPreset] = React.useState<DatePreset>("30");
  const [specificDate, setSpecificDate] = React.useState<string>(formatDateInput(new Date()));
  const [customFrom, setCustomFrom] = React.useState<string>("");
  const [customTo, setCustomTo] = React.useState<string>("");
  const [network, setNetwork] = React.useState<string>("ALL");
  const [status, setStatus] = React.useState<string>("ALL");
  const [source, setSource] = React.useState<string>("ALL");

  const buildQuery = React.useCallback(() => {
    const params = new URLSearchParams();

    if (preset === "today") {
      params.set("preset", "today");
    } else if (preset === "yesterday") {
      params.set("preset", "yesterday");
    } else if (preset === "7") {
      params.set("preset", "7");
    } else if (preset === "30") {
      params.set("preset", "30");
    } else if (preset === "90") {
      params.set("preset", "90");
    } else if (preset === "specific_date" && specificDate) {
      params.set("date", specificDate);
    } else if (preset === "custom") {
      if (customFrom) params.set("from", customFrom);
      if (customTo) params.set("to", customTo);
    }

    if (network !== "ALL") params.set("network", network);
    if (status !== "ALL") params.set("status", status);
    if (source !== "ALL") params.set("source", source);

    return params.toString();
  }, [preset, specificDate, customFrom, customTo, network, status, source]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQuery();
      const res = await fetch(`/api/reports?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load report data");
      setData({
        statusCounts: json.statusCounts ?? {},
        totalOrders: json.totalOrders ?? 0,
        totalSpend: json.totalSpend ?? 0,
        daily: json.daily ?? [],
        byPackage: json.byPackage ?? [],
        filter: json.filter,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load report data");
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
    totalSpend: 0,
    daily: [],
    byPackage: [],
  };

  const success = safeData.statusCounts?.SUCCESS ?? 0;
  const failed = safeData.statusCounts?.FAILED ?? 0;
  const total = safeData.totalOrders ?? 0;
  const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : "0.0";

  const daily = (safeData.daily ?? []).map((d) => ({ ...d, amount: Number(d.amount) }));
  const isHourly = safeData.filter?.isSingleDay;

  const timelineTitle = isHourly
    ? preset === "today"
      ? "Hourly Orders & Spend (Today)"
      : preset === "yesterday"
      ? "Hourly Orders & Spend (Yesterday)"
      : `Hourly Orders & Spend (${specificDate || "Selected Date"})`
    : preset === "7"
    ? "Daily Orders & Spend (Last 7 Days)"
    : preset === "30"
    ? "Daily Orders & Spend (Last 30 Days)"
    : preset === "90"
    ? "Daily Orders & Spend (Last 90 Days)"
    : "Daily Orders & Spend (Custom Range)";

  return (
    <div className="space-y-6">
      {/* Top Cyber Telemetry Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#00df82]/15 blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00df82]/30 bg-[#00df82]/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#00df82]">
                <Activity className="h-3.5 w-3.5 text-[#00df82] animate-pulse" />
                TELECOM ANALYTICS &amp; VOLUME TELEMETRY
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">· Real-Time Throughput</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Spending &amp; Order Reports
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              Track packet fulfillment ratios, carrier distribution volumes, and expenditure metrics across your single-order dispatch operations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => loadData()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-200 dark:hover:bg-[#111e33] hover:text-slate-900 dark:hover:text-white disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#00df82] ${loading ? "animate-spin" : ""}`} />
              Sync Metrics
            </button>
          </div>
        </div>
      </div>

      {/* Date Filter & Control Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#162740] pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#00df82]" />
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Date Range &amp; Telemetry Filters</h2>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Reset all filters
            </button>
          )}
        </div>

        {/* Date Preset Selector */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Query Period</p>
          <div className="flex flex-wrap items-center gap-2">
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
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-[#00df82] text-[#041d14] font-black shadow-[0_0_15px_rgba(0,223,130,0.3)]"
                      : "bg-slate-100 dark:bg-[#070d18] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#162740] hover:bg-slate-200 dark:hover:bg-[#111e33]"
                  }`}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Specific Date input */}
        {preset === "specific_date" && (
          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50/70 dark:bg-[#070d18] p-4">
            <div className="space-y-1">
              <label htmlFor="user-specific-date" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Choose Specific Day
              </label>
              <input
                id="user-specific-date"
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                max={formatDateInput(new Date())}
                className="block rounded-xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white shadow-sm focus:border-[#00df82] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setSpecificDate(formatDateInput(new Date()))}
              className="rounded-xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              Set to Today
            </button>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 self-center">
              Viewing 24-hour hourly timeline for this day.
            </p>
          </div>
        )}

        {/* Custom Range inputs */}
        {preset === "custom" && (
          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50/70 dark:bg-[#070d18] p-4">
            <div className="space-y-1">
              <label htmlFor="user-from-date" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                From Date
              </label>
              <input
                id="user-from-date"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                max={customTo || formatDateInput(new Date())}
                className="block rounded-xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white shadow-sm focus:border-[#00df82] focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="user-to-date" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                To Date
              </label>
              <input
                id="user-to-date"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                min={customFrom}
                max={formatDateInput(new Date())}
                className="block rounded-xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white shadow-sm focus:border-[#00df82] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setCustomFrom(formatDateInput(new Date()));
                setCustomTo(formatDateInput(new Date()));
              }}
              className="rounded-xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              Today Only
            </button>
          </div>
        )}

        {/* Dropdowns (Network, Status, Source) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Network Filter */}
          <div className="space-y-1">
            <label htmlFor="user-filter-network" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Telecom Network
            </label>
            <select
              id="user-filter-network"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:border-[#00df82] focus:outline-none [&>option]:bg-white dark:[&>option]:bg-[#070d18] [&>option]:text-slate-900 dark:[&>option]:text-white"
            >
              <option value="ALL">All Networks (MTN, Telecel, AT)</option>
              <option value="MTN">MTN Ghana</option>
              <option value="TELECEL">Telecel Ghana</option>
              <option value="AIRTELTIGO">AirtelTigo</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label htmlFor="user-filter-status" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Order Status
            </label>
            <select
              id="user-filter-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:border-[#00df82] focus:outline-none [&>option]:bg-white dark:[&>option]:bg-[#070d18] [&>option]:text-slate-900 dark:[&>option]:text-white"
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
            <label htmlFor="user-filter-source" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Order Source
            </label>
            <select
              id="user-filter-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:border-[#00df82] focus:outline-none [&>option]:bg-white dark:[&>option]:bg-[#070d18] [&>option]:text-slate-900 dark:[&>option]:text-white"
            >
              <option value="ALL">All Sources (Web + API)</option>
              <option value="WEB">Web Dispatch Console</option>
              <option value="API">Developer REST API</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-[#162740]">
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Active filters:</span>
            {network !== "ALL" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#00df82]/10 border border-[#00df82]/30 px-2.5 py-0.5 text-[11px] font-bold text-[#00df82]">
                Network: {network}
                <button type="button" onClick={() => setNetwork("ALL")}>
                  <X className="h-3 w-3 hover:text-rose-400" />
                </button>
              </span>
            )}
            {status !== "ALL" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#00df82]/10 border border-[#00df82]/30 px-2.5 py-0.5 text-[11px] font-bold text-[#00df82]">
                Status: {status}
                <button type="button" onClick={() => setStatus("ALL")}>
                  <X className="h-3 w-3 hover:text-rose-400" />
                </button>
              </span>
            )}
            {source !== "ALL" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#00df82]/10 border border-[#00df82]/30 px-2.5 py-0.5 text-[11px] font-bold text-[#00df82]">
                Source: {source}
                <button type="button" onClick={() => setSource("ALL")}>
                  <X className="h-3 w-3 hover:text-rose-400" />
                </button>
              </span>
            )}
            {preset === "specific_date" && specificDate && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#00df82]/10 border border-[#00df82]/30 px-2.5 py-0.5 text-[11px] font-bold text-[#00df82]">
                Date: {specificDate}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading || !data ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] py-20 space-y-3">
          <Spinner className="h-8 w-8 text-[#00df82]" />
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 tracking-wider">COMPILING TELECOM METRICS...</p>
        </div>
      ) : (
        <>
          {/* Key Stat Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Dispatches</span>
                <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <ClipboardList className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="font-mono text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {total.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{data.daily.length} active periods recorded</p>
              </div>
            </div>

            <div className="rounded-3xl border border-[#00df82]/30 bg-white dark:bg-[#0b1322] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Successful Deliveries</span>
                <div className="h-8 w-8 rounded-xl bg-[#00df82]/15 border border-[#00df82]/30 flex items-center justify-center text-[#00df82]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="font-mono text-2xl sm:text-3xl font-black text-emerald-600 dark:text-[#00df82] tabular-nums tracking-tight">
                  {success.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] font-medium text-emerald-600/80 dark:text-[#00df82]/80">{successRate}% fulfillment success rate</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Failed / Reversals</span>
                <div className="h-8 w-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400">
                  <XCircle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="font-mono text-2xl sm:text-3xl font-black text-rose-500 dark:text-rose-400 tabular-nums tracking-tight">
                  {failed.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Auto-refunded to treasury</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Spend</span>
                <div className="h-8 w-8 rounded-xl bg-[#00df82]/10 border border-[#00df82]/20 flex items-center justify-center text-[#00df82]">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="font-mono text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {formatGHS(data.totalSpend)}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Total cleared volume</p>
              </div>
            </div>
          </div>

          {/* Orders & Spend Timeline chart */}
          <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-[#162740] pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">{timelineTitle}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isHourly
                    ? "Orders and spending recorded per hour of the selected date"
                    : "Daily order volume and expenditure throughout the selected timeframe"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00df82]/10 border border-[#00df82]/30 px-3 py-1 text-[11px] font-bold text-[#00df82]">
                  <span className="h-2 w-2 rounded-full bg-[#00df82]" />
                  Orders
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  Spend (GHS)
                </span>
              </div>
            </div>

            <div className="mt-6 h-64 w-full">
              {daily.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-500 font-mono">
                  No order activity matching this filter criteria.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                    <XAxis
                      dataKey="day"
                      fontSize={11}
                      tickLine={false}
                      stroke="#64748b"
                      tickFormatter={(d: string) => (d.length > 5 ? d.slice(5) : d)}
                    />
                    <YAxis yAxisId="left" fontSize={11} tickLine={false} stroke="#64748b" allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" fontSize={11} tickLine={false} stroke="#64748b" />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        name === "Spend (GHS)" ? formatGHS(Number(val) || 0) : val,
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: "#070d18",
                        borderColor: "#00df82",
                        borderRadius: "0.75rem",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="count"
                      name="Orders"
                      stroke="#00df82"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="amount"
                      name="Spend (GHS)"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Grid: Spend per package + Status breakdown */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Spend per Package */}
            <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#162740] pb-4">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Spend per Package Tier</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cumulative GHS volume across top bundle denominations
                  </p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00df82]/10 border border-[#00df82]/30 text-[#00df82]">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>

              <div className="mt-6 h-60 w-full">
                {safeData.byPackage.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500 font-mono">
                    No package data recorded for this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={safeData.byPackage.map((b) => ({
                        name: `${b.network} ${b.gbAmount}GB`,
                        amount: b.amount,
                      }))}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} stroke="#64748b" />
                      <YAxis fontSize={11} tickLine={false} stroke="#64748b" />
                      <Tooltip
                        formatter={(val: any) => [formatGHS(Number(val) || 0), "Spend"]}
                        contentStyle={{
                          backgroundColor: "#070d18",
                          borderColor: "#00df82",
                          borderRadius: "0.75rem",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="amount" fill="#00df82" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Status breakdown */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 sm:p-6 shadow-xl">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#162740] pb-4">
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white">Status Telemetry Breakdown</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Distribution across SIM dispatch clearing stages
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00df82]/10 border border-[#00df82]/30 text-[#00df82]">
                    <PieChartIcon className="h-4 w-4" />
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  {Object.entries(safeData.statusCounts ?? {}).map(([s, c]) => {
                    const pct = total > 0 ? Math.round((c / total) * 100) : 0;
                    const isSuccess = s === "SUCCESS";
                    const isFailed = s === "FAILED";
                    const isPending = s === "PENDING";

                    const badgeColor = isSuccess
                      ? "bg-[#00df82]/10 text-emerald-600 dark:text-[#00df82] border-[#00df82]/30"
                      : isFailed
                      ? "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/30"
                      : isPending
                      ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30"
                      : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30";

                    const barColor = isSuccess
                      ? "bg-[#00df82]"
                      : isFailed
                      ? "bg-rose-500"
                      : isPending
                      ? "bg-amber-500"
                      : "bg-cyan-500";

                    return (
                      <div
                        key={s}
                        className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50/70 dark:bg-[#070d18] p-3.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeColor}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${barColor}`} />
                            {s}
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {c} <span className="text-slate-500 dark:text-slate-400 font-normal">({pct}%)</span>
                          </span>
                        </div>
                        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-[#162740]">
                          <div
                            className={`h-full rounded-full ${barColor} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {Object.keys(safeData.statusCounts ?? {}).length === 0 && (
                    <p className="py-8 text-center text-xs text-slate-500 font-mono">
                      No status records available for this period.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

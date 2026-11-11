"use client";

import * as React from "react";
import { EmptyState, Spinner } from "@/components/shared";
import { NotReceivedReportDetailDialog } from "@/components/orders/not-received-report-dialog";
import { DeliveryReportStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { orderCode } from "@/lib/utils";
import { deliveryReportCode, formatDateTime, sanitizeCustomerRefundNote } from "@/lib/types";
import { OrderDateFilter, getTodayRange, getAllTimeRange, type DateFilterValue } from "@/components/orders/order-date-filter";
import {
  CheckCircle2,
  CheckCheck,
  ClipboardList,
  Clock,
  Eye,
  FileWarning,
  Search,
  RotateCcw,
} from "lucide-react";

interface MyReportRow {
  id: string;
  seq: number;
  code: string;
  status: string;
  reason: string | null;
  adminResponse: string | null;
  createdAt: string;
  order: {
    id: number;
    phoneNumber: string;
    network: string;
    gbAmount: number;
    amount: number;
    status: string;
  };
}

interface Stats {
  total: number;
  underReview?: number;
  confirmSent?: number;
  resolved?: number;
  refunded?: number;
  open?: number;
  investigating?: number;
  closed?: number;
}

const statusInputCls =
  "h-9 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3 font-mono text-xs text-slate-900 dark:text-white outline-none transition focus:border-[#00df82] placeholder:text-slate-400 dark:placeholder:text-slate-500 [&>option]:bg-white dark:[&>option]:bg-[#070d18] [&>option]:text-slate-900 dark:[&>option]:text-white";

export default function NotReceivedPage() {
  const { toast } = useToast();
  const [myReports, setMyReports] = React.useState<MyReportRow[]>([]);
  const [myStats, setMyStats] = React.useState<Stats>({ total: 0, underReview: 0, confirmSent: 0, resolved: 0, refunded: 0 });
  const [total, setTotal] = React.useState(0);
  const [pages, setPages] = React.useState(1);
  const [page, setPage] = React.useState(1);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>(getTodayRange());
  const [loading, setLoading] = React.useState(true);
  const [viewReportId, setViewReportId] = React.useState<string | null>(null);

  const loadMyReports = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ view: "reports", page: String(page), pageSize: "15" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (dateFilter.from) params.set("from", dateFilter.from);
    if (dateFilter.to) params.set("to", dateFilter.to);
    try {
      const res = await fetch(`/api/reports/not-received?${params}`);
      const json = await res.json();
      setMyReports(json.reports ?? []);
      setMyStats(json.stats ?? { total: 0, underReview: 0, confirmSent: 0, resolved: 0, refunded: 0 });
      setTotal(json.total ?? 0);
      setPages(json.pages ?? 1);
    } catch {
      toast("Failed to load reports", "error");
    } finally {
      setLoading(false);
    }
  }, [page, q, status, dateFilter, toast]);

  React.useEffect(() => {
    const t = setTimeout(loadMyReports, 250);
    return () => clearTimeout(t);
  }, [loadMyReports]);

  const tiles = [
    { label: "Total Reports", value: String(myStats.total), icon: ClipboardList, cls: "text-slate-400" },
    { label: "Under Review", value: String(myStats.underReview ?? myStats.open ?? 0), icon: Clock, cls: "text-amber-500" },
    { label: "Confirm Sent", value: String(myStats.confirmSent ?? 0), icon: CheckCheck, cls: "text-sky-500" },
    { label: "Resolved", value: String(myStats.resolved ?? 0), icon: CheckCircle2, cls: "text-emerald-500" },
    { label: "Refunded", value: String(myStats.refunded ?? 0), icon: RotateCcw, cls: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00df82]/30 bg-[#00df82]/10 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-[#00df82]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00df82] animate-pulse" />
                Delivery Protection &amp; Resolution
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">· 24h Inquiry Window</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Order Dispute &amp; Delivery Reports
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Track filed delivery inquiries, monitor carrier gateway investigation status, and review admin resolution proof or automatic wallet credit refunds.
            </p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4 shadow-xl transition hover:border-slate-300 dark:hover:border-slate-700"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] ${t.cls}`}
            >
              <t.icon className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-lg font-black tracking-tight text-slate-900 dark:text-white">{t.value}</p>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 truncate">{t.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + table */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] shadow-xl overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-[#162740] px-5 py-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by phone or inquiry reason..."
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] pl-10 pr-3 font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition focus:border-[#00df82]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <OrderDateFilter
              value={dateFilter}
              onChange={(df) => {
                setDateFilter(df);
                setPage(1);
              }}
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className={`${statusInputCls} w-36`}
            >
              <option value="">All Status</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="CONFIRM_SENT">Confirm Sent</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            {(q || status || dateFilter.mode !== "today") && (
              <button
                onClick={() => {
                  setQ("");
                  setStatus("");
                  setDateFilter(getAllTimeRange());
                  setPage(1);
                }}
                className="h-9 rounded-lg bg-slate-500/10 px-3 text-xs font-bold text-slate-500 transition hover:bg-slate-500/20 dark:text-slate-400 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8 text-[#00df82]" />
          </div>
        ) : myReports.length === 0 ? (
          dateFilter.mode !== "all" ? (
            <EmptyState
              icon={FileWarning}
              title={`No reports found for ${dateFilter.label}`}
              description="No delivery reports were filed on this date. You can select another date from the calendar or view all time."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDateFilter(getAllTimeRange());
                    setPage(1);
                  }}
                >
                  View All Time Reports
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={FileWarning}
              title="No reports yet"
              description="Reports you submit from a completed order will appear here."
            />
          )
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {myReports.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-bold">{deliveryReportCode(r.seq)}</p>
                    <DeliveryReportStatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-sm">
                    {r.order.network} · {r.order.phoneNumber} · {r.order.gbAmount} GB
                    <span className="ml-2 font-mono text-[11px] text-slate-400">{orderCode(r.order.id)}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Reported {formatDateTime(r.createdAt)}
                    {r.reason ? ` · ${r.reason}` : ""}
                    {r.adminResponse ? ` · Response: ${sanitizeCustomerRefundNote(r.adminResponse, r.order.amount)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => setViewReportId(r.id)}
                    className="inline-flex h-8 items-center rounded-xl bg-[#00df82] px-3.5 text-xs font-black text-[#060b13] shadow-md shadow-[#00df82]/20 hover:bg-[#00df82]/90 transition"
                  >
                    View Report
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm dark:border-white/5">
            <span className="text-slate-500">
              Page {page} of {pages} · {total} report(s)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold transition hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5"
              >
                Previous
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold transition hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <NotReceivedReportDetailDialog
        reportId={viewReportId}
        open={!!viewReportId}
        onClose={() => setViewReportId(null)}
      />
    </div>
  );
}

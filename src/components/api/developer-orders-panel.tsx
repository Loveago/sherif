"use client";

import * as React from "react";
import { Search, Filter, RefreshCw, ExternalLink, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner, EmptyState } from "@/components/shared";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatGHS, sanitizeCustomerRefundNote } from "@/lib/types";

export function DeveloperOrdersPanel() {
  const [orders, setOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [networkFilter, setNetworkFilter] = React.useState("ALL");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [selectedOrder, setSelectedOrder] = React.useState<any | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (networkFilter !== "ALL") params.set("network", networkFilter);
      if (search.trim()) params.set("reference", search.trim());

      const res = await fetch(`/v1/orders?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setOrders(json.data.orders || []);
        setTotalPages(json.data.totalPages || 1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, networkFilter, search]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-9 w-48 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] pl-8 pr-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#00df82] focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3 text-xs font-bold text-slate-900 dark:text-white focus:border-[#00df82] focus:outline-none [&>option]:bg-white dark:[&>option]:bg-[#070d18] [&>option]:text-slate-900 dark:[&>option]:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="FAILED">FAILED</option>
          </select>

          <select
            value={networkFilter}
            onChange={(e) => {
              setNetworkFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3 text-xs font-bold text-slate-900 dark:text-white focus:border-[#00df82] focus:outline-none [&>option]:bg-white dark:[&>option]:bg-[#070d18] [&>option]:text-slate-900 dark:[&>option]:text-white"
          >
            <option value="ALL">All Networks</option>
            <option value="MTN">MTN</option>
            <option value="TELECEL">Telecel</option>
            <option value="AIRTELTIGO">AirtelTigo</option>
          </select>
        </div>

        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 h-9 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-[#00df82]/40"
        >
          <RefreshCw className="h-3.5 w-3.5 text-[#00df82]" /> Refresh
        </button>
      </div>

      {/* Orders Table */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8 text-[#00df82]" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-[#00df82]/10 border border-[#00df82]/20 text-[#00df82] flex items-center justify-center mx-auto">
              <Search className="h-6 w-6" />
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-white">No API orders found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Orders created via POST /v1/orders will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">Order ID &amp; Ref</th>
                  <th className="px-4 py-3.5">Network &amp; Package</th>
                  <th className="px-4 py-3.5">Recipient</th>
                  <th className="px-4 py-3.5">Amount</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Created At</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#162740]">
                {orders.map((o) => (
                  <tr key={o.orderId} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{o.orderId}</p>
                      <p className="font-mono text-[11px] text-slate-500">{o.reference || "No ref"}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-900 dark:text-white">{o.network}</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{o.package}</p>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700 dark:text-slate-200">
                      {o.recipient}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-black text-emerald-600 dark:text-[#00df82]">
                      {formatGHS(o.amount)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {formatDateTime(o.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-[#00df82] hover:border-[#00df82]/40"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-[#162740] p-4 text-xs">
            <p className="text-slate-500 dark:text-slate-400 font-mono">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] font-bold text-slate-700 dark:text-white disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] font-bold text-slate-700 dark:text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0b1322] p-6 shadow-2xl border border-slate-200 dark:border-[#162740]">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#162740] pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Order Details: {selectedOrder.orderId}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-base">
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 dark:bg-[#070d18] border border-slate-200 dark:border-[#162740] p-4 font-mono">
                <div>
                  <p className="text-slate-500 uppercase text-[10px]">Order ID</p>
                  <p className="font-bold text-cyan-600 dark:text-cyan-400">{selectedOrder.orderId}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase text-[10px]">External Ref</p>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedOrder.reference || "None"}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase text-[10px]">Recipient</p>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedOrder.recipient}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase text-[10px]">Network &amp; Package</p>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {selectedOrder.network} - {selectedOrder.package}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase text-[10px]">Amount Charged</p>
                  <p className="font-black text-emerald-600 dark:text-[#00df82]">{formatGHS(selectedOrder.amount)}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase text-[10px]">Status</p>
                  <div className="mt-0.5">
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>
              </div>

              {selectedOrder.failureReason && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-600 dark:text-rose-300">
                  <p className="font-bold">Failure Reason:</p>
                  <p className="mt-0.5">{sanitizeCustomerRefundNote(selectedOrder.failureReason, selectedOrder.amount)}</p>
                </div>
              )}

              <div className="space-y-1 text-slate-500 dark:text-slate-400 pt-1 font-mono text-[11px]">
                <p>Created: {formatDateTime(selectedOrder.createdAt)}</p>
                {selectedOrder.completedAt && <p>Completed: {formatDateTime(selectedOrder.completedAt)}</p>}
                {selectedOrder.isSandbox && (
                  <p className="text-amber-600 dark:text-amber-400 font-semibold">Environment: SANDBOX (Test order)</p>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl bg-[#00df82] px-4 py-2 text-xs font-black text-[#041d14]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

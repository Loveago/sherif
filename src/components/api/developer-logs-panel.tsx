"use client";

import * as React from "react";
import { Search, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner, EmptyState } from "@/components/shared";
import { formatDateTime } from "@/lib/types";

export function DeveloperLogsPanel() {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "25");
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/developer/logs?${params.toString()}`);
      const json = await res.json();
      setLogs(json.logs ?? []);
      setTotalPages(json.totalPages || 1);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search request ID, endpoint, or error..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] pl-8 pr-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#00df82] focus:outline-none"
          />
        </div>

        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 h-9 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-[#00df82]/40"
        >
          <RefreshCw className="h-3.5 w-3.5 text-[#00df82]" /> Refresh
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8 text-[#00df82]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-[#00df82]/10 border border-[#00df82]/20 text-[#00df82] flex items-center justify-center mx-auto">
              <Clock className="h-6 w-6" />
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-white">No API traffic recorded yet</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Live API calls will be logged here with HTTP codes, latency, and debug Request IDs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold font-sans">
                <tr>
                  <th className="px-5 py-3.5">Method &amp; Status</th>
                  <th className="px-4 py-3.5">Endpoint</th>
                  <th className="px-4 py-3.5">Duration</th>
                  <th className="px-4 py-3.5">Request ID</th>
                  <th className="hidden px-4 py-3.5 md:table-cell">Client IP</th>
                  <th className="px-5 py-3.5 text-right font-sans">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#162740]">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                          l.success
                            ? "bg-[#00df82]/15 text-emerald-600 dark:text-[#00df82] border-[#00df82]/30"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30"
                        }`}
                      >
                        {l.method} {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                      {l.endpoint}
                      {l.errorCode && (
                        <span className="ml-2 font-mono text-[10px] text-rose-500 dark:text-rose-400">
                          ({l.errorCode})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 font-sans">
                      {l.responseTimeMs ? `${l.responseTimeMs}ms` : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                      {l.requestId || "—"}
                    </td>
                    <td className="hidden px-4 py-3.5 text-slate-400 dark:text-slate-500 md:table-cell">
                      {l.ip || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-500 dark:text-slate-400 text-[11px] font-sans">
                      {formatDateTime(l.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-[#162740] p-4 text-xs font-sans">
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
    </div>
  );
}

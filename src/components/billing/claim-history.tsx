"use client";

import * as React from "react";
import { formatGHS, formatDateTime } from "@/lib/types";
import { Spinner, EmptyState } from "@/components/shared";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt, CheckCircle2, Clock, XCircle, Smartphone } from "lucide-react";

interface ClaimRow {
  id: string;
  transactionReference: string;
  claimedAmount: number;
  network: string;
  senderPhone: string | null;
  status: string;
  createdAt: string;
  processedAt: string | null;
  rejectionReason: string | null;
}

function claimBadge(status: string) {
  const styles: Record<string, string> = {
    APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
    REJECTED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles[status] ?? ""}`}>
      {status === "APPROVED" ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : status === "PENDING" ? (
        <Clock className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {status === "APPROVED" ? "CLAIMED" : status}
    </span>
  );
}

export function ClaimHistory() {
  const [claims, setClaims] = React.useState<ClaimRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pages, setPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [selectedClaim, setSelectedClaim] = React.useState<ClaimRow | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wallet/send-claim/history?page=${page}&pageSize=15`);
      const json = await res.json();
      setClaims(json.claims ?? []);
      setTotal(json.total ?? 0);
      setPages(json.pages ?? 1);
    } catch {
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-brand-600" />
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No claims yet"
        description="When you send Mobile Money and claim your payment, it will show up here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1322]/90">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">MoMo Claim Records</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Past claims submitted via Transaction ID</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">{total} record(s)</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {claims.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedClaim(c)}
              className="flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Smartphone className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {c.transactionReference}
                    </p>
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {c.network}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {formatDateTime(c.createdAt)}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-mono text-sm font-black text-slate-900 dark:text-white">
                  {formatGHS(c.claimedAmount)}
                </p>
                <div className="mt-1">
                  {claimBadge(c.status)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs dark:border-white/5">
            <span className="text-slate-500">
              Page {page} of {pages} ({total} claims)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedClaim && (
        <Dialog
          open={!!selectedClaim}
          onClose={() => setSelectedClaim(null)}
          title="Claim Details"
        >
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Status</span>
                {claimBadge(selectedClaim.status)}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">Amount</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatGHS(selectedClaim.claimedAmount)}
                </span>
              </div>
            </div>

            <dl className="divide-y divide-slate-100 text-xs dark:divide-white/5">
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">Transaction ID</dt>
                <dd className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {selectedClaim.transactionReference}
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">MoMo Network</dt>
                <dd className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedClaim.network}
                </dd>
              </div>
              {selectedClaim.senderPhone && (
                <div className="flex justify-between py-2">
                  <dt className="text-slate-500">Sender Phone</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedClaim.senderPhone}
                  </dd>
                </div>
              )}
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">Claim Date</dt>
                <dd className="text-slate-700 dark:text-slate-300">
                  {formatDateTime(selectedClaim.createdAt)}
                </dd>
              </div>
              {selectedClaim.processedAt && (
                <div className="flex justify-between py-2">
                  <dt className="text-slate-500">Processed At</dt>
                  <dd className="text-slate-700 dark:text-slate-300">
                    {formatDateTime(selectedClaim.processedAt)}
                  </dd>
                </div>
              )}
              {selectedClaim.rejectionReason && (
                <div className="flex justify-between py-2 text-red-600 dark:text-red-400">
                  <dt>Rejection Reason</dt>
                  <dd className="font-medium text-right max-w-[200px]">
                    {selectedClaim.rejectionReason}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </Dialog>
      )}
    </div>
  );
}


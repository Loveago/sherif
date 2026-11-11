"use client";

import { useEffect, useState } from "react";
import {
  Star,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertCircle,
  Clock,
  Sparkles,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/shared";

interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  approvedAt: string | null;
}

interface Counts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function StorefrontReviewsPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const url = activeFilter === "ALL" ? "/api/storefront/reviews" : `/api/storefront/reviews?status=${activeFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setReviews(data.reviews || []);
        if (data.counts) setCounts(data.counts);
      } else {
        toast(data.error || "Failed to load reviews.", "error");
      }
    } catch {
      toast("Network error loading reviews.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [activeFilter]);

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    try {
      setProcessingId(id);
      const res = await fetch(`/api/storefront/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to update review.", "error");
        return;
      }
      toast(
        action === "APPROVE"
          ? "Review approved! It is now visible on your storefront."
          : "Review rejected and hidden from storefront.",
        "success"
      );
      await loadReviews();
    } catch {
      toast("Error performing review action.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this customer review?")) {
      return;
    }

    try {
      setProcessingId(id);
      const res = await fetch(`/api/storefront/reviews/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to delete review.", "error");
        return;
      }
      toast("Review permanently deleted.", "success");
      await loadReviews();
    } catch {
      toast("Error deleting review.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <MessageSquare className="h-6 w-6 text-[#00df82]" />
            Customer Reviews Moderation
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Review, approve, reject, or delete customer testimonials. Only reviews approved by you will be visible on your public storefront.
          </p>
        </div>

        <Button
          onClick={() => loadReviews()}
          disabled={loading}
          variant="outline"
          size="sm"
          className="border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl gap-2 self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4 text-slate-900 dark:text-white shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Reviews
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-slate-900 dark:text-white">
            {counts.total}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">All customer submissions</p>
        </Card>

        <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-white shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            Pending Approval
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-amber-600 dark:text-amber-400">
            {counts.pending}
          </div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-200/70 mt-0.5">Awaiting your action</p>
        </Card>

        <Card className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-800 dark:text-white shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Approved Reviews
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-emerald-600 dark:text-emerald-400">
            {counts.approved}
          </div>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-200/70 mt-0.5">Live on storefront</p>
        </Card>

        <Card className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-800 dark:text-white shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            Rejected
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-rose-600 dark:text-rose-400">
            {counts.rejected}
          </div>
          <p className="text-[11px] text-rose-700/80 dark:text-rose-200/70 mt-0.5">Hidden from storefront</p>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#162740] pb-3 overflow-x-auto scrollbar-none">
        {[
          { id: "ALL", label: `All (${counts.total})` },
          { id: "PENDING", label: `Pending Approval (${counts.pending})` },
          { id: "APPROVED", label: `Approved (${counts.approved})` },
          { id: "REJECTED", label: `Rejected (${counts.rejected})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === tab.id
                ? "bg-[#00df82] text-[#060b13] font-black shadow-md shadow-[#00df82]/20"
                : "bg-slate-100 dark:bg-[#0b1322] border border-slate-200 dark:border-[#162740] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#111e33]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-7 w-7 text-[#00df82]" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {reviews.map((rev) => {
            const isPending = rev.status === "PENDING";
            const isApproved = rev.status === "APPROVED";
            const isRejected = rev.status === "REJECTED";
            const isBusy = processingId === rev.id;

            return (
              <div
                key={rev.id}
                className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 shadow-sm space-y-3 relative overflow-hidden"
              >
                {/* Status indicator bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    isApproved
                      ? "bg-emerald-500"
                      : isPending
                      ? "bg-amber-400"
                      : "bg-rose-500"
                  }`}
                />

                {/* Header: Name, Stars, Status */}
                <div className="flex items-start justify-between gap-2 pt-1">
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{rev.customerName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase ${
                          isApproved
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                            : isPending
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {rev.status}
                      </span>
                    </div>

                    {/* Star Rating */}
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            s <= rev.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300 dark:text-slate-600"
                          }`}
                        />
                      ))}
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono ml-1 font-bold">
                        {rev.rating}.0
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Comment Text */}
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#0f1b2e]/60 rounded-xl p-3 border border-slate-100 dark:border-[#162740] italic">
                  "{rev.comment}"
                </p>

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    {/* Approve button */}
                    {!isApproved && (
                      <button
                        onClick={() => handleAction(rev.id, "APPROVE")}
                        disabled={isBusy}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        <span>Approve</span>
                      </button>
                    )}

                    {/* Reject button */}
                    {!isRejected && (
                      <button
                        onClick={() => handleAction(rev.id, "REJECT")}
                        disabled={isBusy}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <ThumbsDown className="h-3 w-3" />
                        <span>Reject</span>
                      </button>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(rev.id)}
                    disabled={isBusy}
                    className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/20 text-xs transition disabled:opacity-50 cursor-pointer"
                    title="Delete permanently"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322]/50 p-12 text-center space-y-3 shadow-sm">
          <MessageSquare className="h-10 w-10 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No reviews found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {activeFilter === "ALL"
              ? "Customer reviews submitted on your public storefront will appear here for your moderation."
              : `There are currently no reviews in "${activeFilter.toLowerCase()}" status.`}
          </p>
        </div>
      )}
    </div>
  );
}

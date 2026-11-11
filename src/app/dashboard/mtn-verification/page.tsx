"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/shared";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Search,
  RefreshCw,
  Send,
  ShieldCheck,
  Info,
  Upload,
  FileText,
  Zap,
  Radio,
  Sparkles,
  ArrowRight,
  Sliders,
  Check,
} from "lucide-react";
import { formatDateTime } from "@/lib/types";

interface VerificationItem {
  id: string;
  number: string;
  normalizedNumber: string;
  status: "SUBMITTED" | "PROCESSING" | "VERIFIED" | "REJECTED";
  submittedAt: string;
  verifiedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  batch?: { batchReference: string; status: string } | null;
}

export default function UserMtnVerificationPage() {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<VerificationItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(15);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [instructions, setInstructions] = React.useState("");
  const [verificationEnabled, setVerificationEnabled] = React.useState(false);
  const [submissionFeedback, setSubmissionFeedback] = React.useState<{
    type: "success" | "verified" | "pending" | "error";
    message: string;
  } | null>(null);

  // Bulk file upload state
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadResult, setUploadResult] = React.useState<{
    success: boolean;
    message: string;
    submitted: number;
    alreadyPending: number;
    alreadyVerified: number;
    failed: number;
    invalidCount: number;
    duplicateCount: number;
    alreadyAcceptedCount: number;
    totalRows: number;
    errors?: { raw: string; reason: string; line: number }[];
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/mtn-verification?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load verification requests");
      const data = await res.json();
      setItems(data.data ?? []);
      setTotal(data.total ?? 0);
      if (data.instructions) setInstructions(data.instructions);
      if (typeof data.verificationEnabled === "boolean") {
        setVerificationEnabled(data.verificationEnabled);
      }
    } catch (err: any) {
      toast(err.message ?? "Error loading verification data", "error");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, search, toast]);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNumber = phoneNumber.trim().replace(/\D/g, "").slice(0, 10);
    if (!cleanNumber || cleanNumber.length !== 10 || !cleanNumber.startsWith("0")) {
      return toast("Please enter a valid 10-digit MTN phone number (e.g. 0241234567)", "error");
    }

    setSubmitting(true);
    setSubmissionFeedback(null);
    try {
      const res = await fetch("/api/mtn-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: cleanNumber }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmissionFeedback({
          type: "error",
          message: data.error ?? "Failed to submit number",
        });
        toast(data.error ?? "Submission failed", "error");
        return;
      }

      if (data.status === "VERIFIED") {
        setSubmissionFeedback({
          type: "verified",
          message: "✓ This number is already verified. You can dispatch MTN bundles to it immediately.",
        });
        toast("Number is already verified!", "success");
      } else if (data.status === "ALREADY_PENDING") {
        setSubmissionFeedback({
          type: "pending",
          message: "◷ This number already has an active verification request in progress.",
        });
        toast("Verification request already pending", "info");
      } else {
        setSubmissionFeedback({
          type: "success",
          message: "Number queued successfully! Status will update automatically once verified on MTN switch.",
        });
        toast("Submitted for MTN verification", "success");
        setPhoneNumber("");
      }

      fetchItems();
    } catch (err: any) {
      toast(err.message ?? "An error occurred", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return toast("Please select a .txt file first", "error");
    setUploading(true);
    setUploadResult(null);
    try {
      let data: any;
      try {
        const content = await uploadFile.text();
        const res = await fetch("/api/mtn-verification/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: uploadFile.name,
            content,
          }),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
      } catch (jsonErr: any) {
        const safeFilename = uploadFile.name.replace(/[^\w.-]/g, "_");
        const form = new FormData();
        form.append("file", uploadFile, safeFilename);
        const res = await fetch("/api/mtn-verification/upload", {
          method: "POST",
          body: form,
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error ?? jsonErr.message ?? "Upload failed");
      }

      setUploadResult(data);
      if (data.submitted > 0) {
        toast(`${data.submitted} number(s) submitted for verification`, "success");
        fetchItems();
      } else {
        toast(data.message ?? "No new numbers submitted", "info");
      }
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast(err.message ?? "An error occurred", "error");
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (item: VerificationItem) => {
    switch (item.status) {
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00df82]/10 border border-[#00df82]/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#00df82]">
            <CheckCircle2 className="h-3 w-3 text-[#00df82]" />
            VERIFIED
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-400">
            <RefreshCw className="h-3 w-3 animate-spin text-cyan-400" />
            PROCESSING
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-400">
            <XCircle className="h-3 w-3 text-rose-400" />
            REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-400">
            <Clock className="h-3 w-3 text-amber-400 animate-pulse" />
            QUEUED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Cyber Hero Command Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                MTN SUBSCRIBER VALIDATION GATEWAY
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">· Zero-Fail Pre-Flight Check</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              MTN Verification Terminal
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              Validate recipient MTN subscriber eligibility in advance to eliminate dispatch drops, prevent failed USSD calls, and ensure instant packet delivery.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-black tracking-wide ${
                verificationEnabled
                  ? "bg-[#00df82]/10 border-[#00df82]/30 text-[#00df82]"
                  : "bg-slate-100 dark:bg-[#070d18] border-slate-200 dark:border-[#162740] text-slate-700 dark:text-slate-300"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  verificationEnabled ? "bg-[#00df82] animate-ping" : "bg-slate-400 dark:bg-slate-500"
                }`}
              />
              {verificationEnabled ? "STRICT VALIDATION ENFORCED" : "OPTIONAL PRE-VALIDATION MODE"}
            </div>

            <Link
              href="/dashboard/buy-now"
              className="inline-flex items-center gap-2 rounded-xl bg-[#00df82] px-4 py-2.5 text-xs font-black text-[#041d14] shadow-[0_0_20px_rgba(0,223,130,0.3)] hover:bg-[#00c572] transition cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 fill-[#041d14]" />
              <span>Dispatch Bundle</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Verification Forms Grid: Single and Bulk */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Submit Single Card */}
        <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#162740]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-700 dark:text-amber-400 font-black text-xs">
                  MTN
                </div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Instant Single SIM Validation
                </h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00df82] bg-[#00df82]/10 px-2.5 py-0.5 rounded-md border border-[#00df82]/20">
                Live Check
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {instructions || "Validate recipient MTN number eligibility. Supported prefixes: 024, 025, 053, 054, 055, 059."}
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Recipient MTN Number
                </Label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <Input
                    id="phoneNumber"
                    type="tel"
                    inputMode="tel"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="0241234567"
                    className="font-mono text-sm h-11 rounded-xl border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] text-slate-900 dark:text-white focus:border-[#00df82] focus:ring-0 w-full"
                    disabled={submitting}
                  />
                  <Button
                    type="submit"
                    disabled={submitting || !phoneNumber.trim()}
                    className="w-full sm:w-auto shrink-0 h-11 px-6 rounded-xl bg-[#00df82] font-black text-[#041d14] shadow-[0_0_20px_rgba(0,223,130,0.3)] hover:bg-[#00c572] active:scale-[0.99] transition cursor-pointer"
                  >
                    {submitting ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4 mr-1.5" />}
                    Authorize
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  Standard Ghanaian format: 024XXXXXXX or 233XXXXXXXXX
                </p>
              </div>

              {submissionFeedback && (
                <div
                  className={`rounded-2xl p-4 text-xs font-semibold flex items-start gap-2.5 border ${
                    submissionFeedback.type === "verified"
                      ? "bg-[#00df82]/10 text-[#00df82] border-[#00df82]/30"
                      : submissionFeedback.type === "pending"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      : submissionFeedback.type === "success"
                      ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                  }`}
                >
                  {submissionFeedback.type === "verified" && <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#00df82]" />}
                  {submissionFeedback.type === "pending" && <Clock className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />}
                  {submissionFeedback.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-cyan-600 dark:text-cyan-400" />}
                  {submissionFeedback.type === "error" && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />}
                  <span>{submissionFeedback.message}</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Bulk TXT Upload Card */}
        <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#162740]">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-[#00df82]" />
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Bulk Roster Ingestion (.TXT)
                </h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-md border border-cyan-500/20">
                Parallel Batch
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Upload a plain-text file (.txt) with one MTN number per row to authorize hundreds of subscriber numbers in bulk.
            </p>

            <div className="mt-4 space-y-3">
              <label
                htmlFor="bulkFile"
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 cursor-pointer transition ${
                  uploadFile
                    ? "border-[#00df82]/50 bg-[#00df82]/5"
                    : "border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] hover:border-[#00df82]/40 hover:bg-slate-100 dark:hover:bg-[#0c1626]"
                }`}
              >
                {uploadFile ? (
                  <>
                    <FileText className="h-7 w-7 text-[#00df82]" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{uploadFile.name}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {(uploadFile.size / 1024 / 1024).toFixed(2)} MB · click to replace file
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="h-7 w-7 text-slate-400 dark:text-slate-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Click to choose or drag a <span className="text-[#00df82]">.txt</span> file
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">One MTN number per line · up to 200 MB</span>
                  </>
                )}
                <input
                  id="bulkFile"
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,text/plain"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setUploadFile(f);
                    setUploadResult(null);
                  }}
                  disabled={uploading}
                />
              </label>

              <button
                type="button"
                onClick={handleFileUpload}
                disabled={uploading || !uploadFile}
                className="w-full h-11 rounded-xl bg-[#00df82] font-black text-[#041d14] shadow-[0_0_20px_rgba(0,223,130,0.3)] hover:bg-[#00c572] active:scale-[0.99] transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 text-xs"
              >
                {uploading ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    <span>Processing Bulk Validation...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Upload &amp; Authorize Numbers</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Upload result summary */}
          {uploadResult && (
            <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] p-4 space-y-3">
              <p className={`text-xs font-bold ${uploadResult.submitted > 0 ? "text-[#00df82]" : "text-slate-700 dark:text-slate-300"}`}>
                {uploadResult.message}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="rounded-xl border border-[#00df82]/20 bg-[#00df82]/10 p-2.5">
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold">Submitted</p>
                  <p className="text-xl font-black text-[#00df82]">{uploadResult.submitted}</p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5">
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold">Already Pending</p>
                  <p className="text-xl font-black text-amber-500 dark:text-amber-400">{uploadResult.alreadyPending}</p>
                </div>
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2.5">
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold">Already Verified</p>
                  <p className="text-xl font-black text-cyan-500 dark:text-cyan-400">{uploadResult.alreadyVerified}</p>
                </div>
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5">
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold">Skipped / Invalid</p>
                  <p className="text-xl font-black text-rose-500 dark:text-rose-400">{uploadResult.invalidCount + uploadResult.failed}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submitted Requests List */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-[#162740] pb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Verified MTN Registry ({total})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live authorization status of subscriber SIMs eligible for direct MTN bundle fulfillment
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search phone number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-48 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#00df82] focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3 text-xs font-bold text-slate-900 dark:text-white focus:border-[#00df82] focus:outline-none [&>option]:bg-white dark:[&>option]:bg-[#070d18] [&>option]:text-slate-900 dark:[&>option]:text-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Queued</option>
              <option value="PROCESSING">Processing</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <button
              onClick={() => fetchItems()}
              title="Refresh Registry"
              className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-[#00df82]/40 transition cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 text-[#00df82] ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Spinner className="h-8 w-8 text-[#00df82]" />
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 tracking-wider">SYNCING VALIDATION REGISTRY...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-12 text-center space-y-3 shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-500 flex items-center justify-center mx-auto">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-white">No numbers found in registry</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Enter an MTN phone number above to validate and authorize it for instant bundle purchases.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4.5 transition-all hover:border-[#00df82]/40 hover:bg-slate-50 dark:hover:bg-[#0e192c] hover:shadow-xl hover:shadow-[#00df82]/5 space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                      {item.number}
                    </span>
                    {getStatusBadge(item)}
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Submitted:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                        {formatDateTime(item.submittedAt)}
                      </span>
                    </div>

                    {item.status === "VERIFIED" && item.verifiedAt && (
                      <div className="flex items-center justify-between text-[#00df82]">
                        <span className="text-[11px] font-semibold">Verified on switch:</span>
                        <span className="font-mono text-[11px] font-bold">
                          {formatDateTime(item.verifiedAt)}
                        </span>
                      </div>
                    )}

                    {item.status === "PROCESSING" && (
                      <div className="text-cyan-600 dark:text-cyan-400 text-[11px] font-mono mt-1">
                        Communicating with MTN Telecom Switch...
                      </div>
                    )}

                    {item.status === "REJECTED" && (
                      <div className="mt-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-[11px] text-rose-600 dark:text-rose-300">
                        <span className="font-bold">Reason: </span>
                        {item.rejectionReason || "Validation unsuccessful"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-[#162740] flex items-center justify-between">
                  {item.status === "VERIFIED" ? (
                    <Link
                      href={`/dashboard/buy-now?phone=${item.number}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00df82] hover:underline"
                    >
                      <span>Dispatch Bundle</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : item.status === "REJECTED" ? (
                    <button
                      onClick={() => {
                        setPhoneNumber(item.number);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-xs font-bold text-amber-500 hover:underline cursor-pointer"
                    >
                      Resubmit Number →
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono uppercase">
                      Queued for Carrier Clearing
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-between pt-2 rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-3 text-xs shadow-sm">
            <span className="text-slate-500 dark:text-slate-400 font-mono">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] font-bold text-slate-700 dark:text-white disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page * pageSize >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] font-bold text-slate-700 dark:text-white disabled:opacity-40 cursor-pointer"
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

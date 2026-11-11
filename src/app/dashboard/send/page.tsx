"use client";

import * as React from "react";
import Link from "next/link";
import { useToast } from "@/components/toast";
import { QueueList, SendSummary, type Line } from "@/components/send/queue-list";
import { NETWORKS, formatGHS, type NetworkProvider } from "@/lib/types";
import {
  NETWORK_LABELS,
  parseOrderLine,
  normalizeTextNumbers,
  splitOrderLines,
  isHeaderLine,
} from "@/lib/order-parse";
import { isMtnPrefix, detectNetworkNameByPrefix } from "@/lib/phone-utils";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LiveDeliverySpeedCard } from "@/components/send/live-delivery-speed-card";
import {
  AlertTriangle,
  Check,
  ClipboardPaste,
  Copy,
  Download,
  FileSpreadsheet,
  FileUp,
  Loader2,
  Send,
  ShieldAlert,
  Trash2,
  UploadCloud,
  Wallet,
  CheckCircle2,
  Zap,
  Sparkles,
  Radio,
  ArrowUpRight,
  Info,
  Layers,
  HelpCircle,
} from "lucide-react";

interface Pkg {
  id: string;
  network: string;
  name: string;
  gbAmount: number;
  price: number | null;
}

interface PortedNumberItem {
  phoneNumber: string;
  detectedNetwork: string;
  gbAmount: number;
}

const DRAFT_STORAGE_KEY = "bundle_portal_send_orders_draft_v1";

export default function SendOrderPage() {
  const { toast } = useToast();
  const [packages, setPackages] = React.useState<Pkg[]>([]);
  const [submissionEnabled, setSubmissionEnabled] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [network, setNetwork] = React.useState<NetworkProvider>("MTN");
  const [tab, setTab] = React.useState<"paste" | "upload">("paste");
  const [bulkText, setBulkText] = React.useState("");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [lines, setLines] = React.useState<Line[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [userBalance, setUserBalance] = React.useState<number | null>(null);
  const [draftLoaded, setDraftLoaded] = React.useState(false);
  const [copiedBulkText, setCopiedBulkText] = React.useState(false);
  const [copiedFromModal, setCopiedFromModal] = React.useState(false);

  // Insufficient balance dialog state
  const [insufficientBalanceModal, setInsufficientBalanceModal] = React.useState<{
    needed: number;
    balance: number;
    deficit: number;
    orders: Line[];
    message?: string;
  } | null>(null);

  const fileRef = React.useRef<HTMLInputElement>(null);

  // State for confirming unverified MTN numbers
  const [pendingUnverified, setPendingUnverified] = React.useState<{
    toAdd: Line[];
    unverifiedNumbers: string[];
    verifiedItems: Line[];
    verificationEnabled: boolean;
    rawText: string | null;
    mode: "add" | "submit";
  } | null>(null);

  // State for confirming ported numbers
  const [pendingPorted, setPendingPorted] = React.useState<{
    toAdd: Line[];
    portedItems: PortedNumberItem[];
    nonPortedItems: Line[];
    rawText: string | null;
  } | null>(null);

  const fetchBalance = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const d = await res.json();
        if (d.user && typeof d.user.balance === "number") {
          setUserBalance(d.user.balance);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    const onBalanceUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ balance?: number }>;
      if (customEvent.detail && typeof customEvent.detail.balance === "number") {
        setUserBalance(customEvent.detail.balance);
      } else {
        void fetchBalance();
      }
    };
    window.addEventListener("balance-update", onBalanceUpdate);
    return () => {
      window.removeEventListener("balance-update", onBalanceUpdate);
    };
  }, [fetchBalance]);

  React.useEffect(() => {
    fetch("/api/packages")
      .then((r) => r.json())
      .then((d) => {
        setPackages(d.packages ?? []);
        if (d.submissionEnabled !== undefined) {
          setSubmissionEnabled(d.submissionEnabled);
        }
        if (typeof d.userBalance === "number") {
          setUserBalance(d.userBalance);
        }
      })
      .catch(() => toast("Failed to load packages", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute available networks strictly from active packages (0 packages = excluded!)
  const availableNetworks = React.useMemo(() => {
    if (loading) return [];
    const present = new Set(
      packages
        .filter((p) => p.price == null || p.price > 0)
        .map((p) => p.network)
    );
    return NETWORKS.filter((n) => present.has(n));
  }, [packages, loading]);

  // Safe active network resolution: always falls back to the first available network
  // if current selection is disabled or not in availableNetworks
  const activeNetwork: NetworkProvider = React.useMemo(() => {
    if (availableNetworks.length === 0) return network;
    if (availableNetworks.includes(network)) return network;
    return availableNetworks[0];
  }, [network, availableNetworks]);

  // Restore draft from localStorage on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.bulkText) {
          setBulkText(parsed.bulkText);
          setTab("paste");
        }
        if (Array.isArray(parsed.lines) && parsed.lines.length > 0) {
          setLines(parsed.lines);
        }
        if (parsed.network && NETWORKS.includes(parsed.network as NetworkProvider)) {
          setNetwork(parsed.network as NetworkProvider);
        }
      }
    } catch {
      // ignore
    }
    setDraftLoaded(true);
  }, []);

  // Save draft to localStorage when bulkText or lines changes
  React.useEffect(() => {
    if (!draftLoaded || typeof window === "undefined") return;
    try {
      if (bulkText.trim() || lines.length > 0) {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ bulkText, lines, network: activeNetwork })
        );
      } else {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [bulkText, lines, activeNetwork, draftLoaded]);

  // If the selected network has no packages (disabled), synchronize state immediately!
  React.useEffect(() => {
    if (loading || !packages.length || !availableNetworks.length) return;
    if (network !== activeNetwork) {
      setNetwork(activeNetwork);
    }
  }, [packages, loading, network, activeNetwork, availableNetworks]);

  // Identify any queued orders whose network or package has been disabled by admin
  const unavailableIndices = React.useMemo(() => {
    if (loading || packages.length === 0) return new Set<number>();
    const indices = new Set<number>();
    lines.forEach((line, idx) => {
      const isNetActive = availableNetworks.includes(line.network as NetworkProvider);
      const isPkgActive = packages.some(
        (p) => p.network === line.network && p.gbAmount === line.gbAmount && (p.price == null || p.price > 0)
      );
      if (!isNetActive || !isPkgActive) {
        indices.add(idx);
      }
    });
    return indices;
  }, [lines, availableNetworks, packages, loading]);

  const removeUnavailableLines = React.useCallback(() => {
    if (unavailableIndices.size === 0) return;
    setLines((ls) => ls.filter((_, idx) => !unavailableIndices.has(idx)));
    toast(`Removed ${unavailableIndices.size} disabled/unavailable order(s)`, "info");
  }, [unavailableIndices, toast]);

  const checkPortedAndAdd = (items: Line[], skipped = 0) => {
    // Check for non-standard MTN prefixes (potentially ported numbers)
    const portedItems: PortedNumberItem[] = [];
    for (const item of items) {
      if (item.network === "MTN" && !isMtnPrefix(item.phoneNumber)) {
        portedItems.push({
          phoneNumber: item.phoneNumber,
          detectedNetwork: detectNetworkNameByPrefix(item.phoneNumber),
          gbAmount: item.gbAmount,
        });
      }
    }

    if (portedItems.length > 0) {
      setPendingPorted({
        toAdd: items,
        portedItems,
        nonPortedItems: items.filter(
          (item) => !(item.network === "MTN" && !isMtnPrefix(item.phoneNumber))
        ),
        rawText: null,
      });
      return;
    }

    setLines((l) => [...l, ...items]);
    toast(
      `${items.length} order(s) added${skipped > 0 ? ` — ${skipped} invalid line(s) skipped` : ""}`,
      "success"
    );
  };

  const addParsed = async (parsed: Line[], skipped: number, source: string, rawText?: string) => {
    if (!parsed.length) {
      toast(
        skipped > 0
          ? `${skipped} invalid line(s) skipped`
          : `No valid orders found in ${source}`,
        "error"
      );
      return;
    }

    // 1. Deduplicate within the newly parsed items (keep first occurrence)
    const seenNew = new Set<string>();
    const uniqueFromInput: Line[] = [];
    let duplicatesInInput = 0;
    for (const p of parsed) {
      if (seenNew.has(p.phoneNumber)) {
        duplicatesInInput++;
      } else {
        seenNew.add(p.phoneNumber);
        uniqueFromInput.push(p);
      }
    }

    // 2. Deduplicate against existing queue
    const existingPhones = new Set(lines.map((l) => l.phoneNumber));
    const toAdd: Line[] = [];
    let duplicatesAgainstQueue = 0;
    for (const p of uniqueFromInput) {
      if (existingPhones.has(p.phoneNumber)) {
        duplicatesAgainstQueue++;
      } else {
        toAdd.push(p);
      }
    }

    const totalDuplicates = duplicatesInInput + duplicatesAgainstQueue;
    if (totalDuplicates > 0) {
      toast(
        `${totalDuplicates} duplicate number(s) removed — only 1 order per number is allowed`,
        "info"
      );
    }

    if (!toAdd.length) {
      if (totalDuplicates > 0) {
        toast("All entered numbers are already in the queue", "error");
      }
      return;
    }

    // 3. Check for unverified MTN numbers
    const mtnItems = toAdd.filter((item) => item.network === "MTN");
    if (mtnItems.length > 0) {
      try {
        const checkRes = await fetch("/api/mtn-verification/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumbers: mtnItems.map((item) => item.phoneNumber) }),
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          const unverifiedList: string[] = checkData.unverifiedNumbers ?? [];
          if (unverifiedList.length > 0) {
            const unverifiedSet = new Set(unverifiedList);
            setPendingUnverified({
              toAdd,
              unverifiedNumbers: unverifiedList,
              verifiedItems: toAdd.filter((item) => !unverifiedSet.has(item.phoneNumber)),
              verificationEnabled: checkData.verificationEnabled ?? true,
              rawText: source === "pasted text" ? (rawText ?? null) : null,
              mode: "add",
            });
            return;
          }
        } else {
          const errorData = await checkRes.json().catch(() => null);
          toast(errorData?.message || "Failed to verify MTN numbers. Please try again.", "error");
          return;
        }
      } catch {
        toast("Network error verifying MTN numbers. Please try again.", "error");
        return;
      }
    }

    checkPortedAndAdd(toAdd, skipped);
  };

  const confirmUnverifiedAddition = (includeUnverified: boolean) => {
    if (!pendingUnverified) return;
    const mode = pendingUnverified.mode;
    const items = includeUnverified ? pendingUnverified.toAdd : pendingUnverified.verifiedItems;
    const unverifiedCount = pendingUnverified.unverifiedNumbers.length;
    setPendingUnverified(null);

    if (mode === "submit") {
      if (items.length > 0) {
        setLines(items);
        void executeOrderSubmission(items);
      } else {
        toast("No orders to send — unverified number(s) were removed", "info");
      }
    } else {
      if (items.length > 0) {
        if (!includeUnverified && unverifiedCount > 0) {
          toast(`${unverifiedCount} unverified number(s) removed`, "info");
        }
        checkPortedAndAdd(items, 0);
      } else {
        toast("No orders added — unverified number(s) were excluded", "info");
      }
    }
  };

  const [copiedUnverified, setCopiedUnverified] = React.useState(false);

  const copyUnverifiedNumbers = async () => {
    if (!pendingUnverified) return;

    const unverifiedSet = new Set(pendingUnverified.unverifiedNumbers);
    const unverifiedItems = pendingUnverified.toAdd.filter((item) =>
      unverifiedSet.has(item.phoneNumber)
    );

    const linesToFormat =
      unverifiedItems.length > 0
        ? unverifiedItems
        : pendingUnverified.unverifiedNumbers.map((num) => {
            const l = pendingUnverified.toAdd.find((item) => item.phoneNumber === num);
            return { phoneNumber: num, gbAmount: l?.gbAmount ?? "" };
          });

    const textToCopy = linesToFormat
      .map((item) => `${item.phoneNumber} ${item.gbAmount}`.trim())
      .join("\n");

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedUnverified(true);
      toast("Copied unverified numbers to clipboard", "success");
      setTimeout(() => setCopiedUnverified(false), 2000);
    } catch {
      toast("Failed to copy to clipboard", "error");
    }
  };

  const cancelUnverifiedAddition = () => {
    if (pendingUnverified?.rawText) {
      setBulkText(pendingUnverified.rawText);
      toast("Order addition cancelled — input restored for review", "info");
    }
    setPendingUnverified(null);
  };

  const confirmPortedAddition = (includePorted: boolean) => {
    if (!pendingPorted) return;
    const itemsToAdd = includePorted ? pendingPorted.toAdd : pendingPorted.nonPortedItems;
    if (itemsToAdd.length > 0) {
      setLines((l) => [...l, ...itemsToAdd]);
      toast(
        includePorted
          ? `${itemsToAdd.length} order(s) added (including ported numbers)`
          : `${itemsToAdd.length} order(s) added (${pendingPorted.portedItems.length} ported number(s) excluded)`,
        "success"
      );
    } else {
      toast("No orders added — ported number(s) were excluded", "info");
    }
    setPendingPorted(null);
  };

  const cancelPortedAddition = () => {
    if (pendingPorted?.rawText) {
      setBulkText(pendingPorted.rawText);
      toast("Ported order addition cancelled — input restored for review", "info");
    }
    setPendingPorted(null);
  };

  const handleText = (text: string, source: string) => {
    const rawLines = splitOrderLines(text);
    const parsed: Line[] = [];
    let skipped = 0;
    rawLines.forEach((line) => {
      if (isHeaderLine(line)) return;
      const parsedLine = parseOrderLine(line, packages, activeNetwork);
      if (parsedLine) parsed.push(parsedLine);
      else skipped++;
    });
    addParsed(parsed, skipped, source, text);
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    if (!/\.xlsx$/i.test(file.name)) {
      toast("Please upload an Excel (.xlsx) file — one row per order: number, then GB", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("File is too large — maximum 5MB", "error");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/orders/parse-excel", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        toast(json.error ?? "Failed to read the Excel file", "error");
        return;
      }
      const rows: string[][] = json.rows ?? [];
      const parsed: Line[] = [];
      let skipped = 0;
      for (const row of rows) {
        const rawLine = row.join(",").trim();
        if (!rawLine) continue;
        const line = normalizeTextNumbers(rawLine);
        if (isHeaderLine(line)) continue;
        const parsedLine = parseOrderLine(line, packages, activeNetwork);
        if (parsedLine) parsed.push(parsedLine);
        else skipped++;
      }
      addParsed(parsed, skipped, file.name);
    } catch {
      toast("Failed to read the Excel file", "error");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const total = lines.reduce((s, l) => s + (l.price ?? 0), 0);
  const totalGb = lines.reduce((s, l) => s + l.gbAmount, 0);

  const copyBulkText = async () => {
    if (!bulkText.trim()) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(bulkText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = bulkText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedBulkText(true);
      toast("Pasted text copied to clipboard", "success");
      setTimeout(() => setCopiedBulkText(false), 2000);
    } catch {
      toast("Failed to copy text", "error");
    }
  };

  const loadSampleText = () => {
    const samples = [
      "0241234567 5gb",
      "0559876543, 10",
      "0242075374 - 2.5",
      "0257467983 1GB",
    ].join("\n");
    setBulkText(samples);
    toast("Sample orders inserted into text box", "info");
  };

  const copyInsufficientBalanceOrders = async () => {
    if (!insufficientBalanceModal?.orders.length) return;
    const text = insufficientBalanceModal.orders
      .map((o) => `${o.phoneNumber} ${o.gbAmount}gb`)
      .join("\n");
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedFromModal(true);
      toast(
        `Copied ${insufficientBalanceModal.orders.length} order numbers to clipboard`,
        "success"
      );
      setTimeout(() => setCopiedFromModal(false), 2000);
    } catch {
      toast("Failed to copy numbers", "error");
    }
  };

  const executeOrderSubmission = async (ordersToSend: Line[]) => {
    if (submitting) return;
    if (!ordersToSend.length) {
      toast("Add at least one order", "error");
      return;
    }
    setSubmitting(true);
    setResult(null);
    const orderCost = ordersToSend.reduce((s, l) => s + (l.price ?? 0), 0);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orders: ordersToSend.map(({ phoneNumber, network: n, gbAmount: gb }) => ({
            phoneNumber,
            network: n,
            gbAmount: gb,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 402 || json.error?.toLowerCase().includes("insufficient balance")) {
          const currentBal = userBalance ?? 0;
          const deficit = Math.max(0, orderCost - currentBal);
          setInsufficientBalanceModal({
            needed: orderCost,
            balance: currentBal,
            deficit: deficit > 0 ? deficit : orderCost,
            orders: ordersToSend,
            message: json.error,
          });
        } else {
          toast(json.error ?? "Failed to send orders", "error");
        }
        return;
      }
      setResult(`${json.count} order(s) sent — total ${formatGHS(json.total)}. Now processing.`);
      setLines([]);
      setBulkText("");
      setFileName(null);
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {}
        if (typeof json.newBalance === "number") {
          setUserBalance(json.newBalance);
          window.dispatchEvent(
            new CustomEvent("balance-update", { detail: { balance: json.newBalance } })
          );
        } else {
          window.dispatchEvent(new Event("balance-update"));
        }
      }
      toast("Orders sent!", "success");
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async () => {
    let ordersToSubmit = lines;
    if (!ordersToSubmit.length && tab === "paste" && bulkText.trim()) {
      const rawLines = splitOrderLines(bulkText);
      const parsed: Line[] = [];
      let skipped = 0;
      rawLines.forEach((line) => {
        if (isHeaderLine(line)) return;
        const parsedLine = parseOrderLine(line, packages, activeNetwork);
        if (parsedLine) parsed.push(parsedLine);
        else skipped++;
      });
      if (parsed.length > 0) {
        addParsed(parsed, skipped, "pasted text", bulkText);
        return;
      }
    }

    if (unavailableIndices.size > 0) {
      toast(
        `Cannot dispatch: your queue contains ${unavailableIndices.size} order(s) for disabled networks or packages. Please remove them first.`,
        "error"
      );
      return;
    }

    if (!ordersToSubmit.length) {
      toast("Add at least one order", "error");
      return;
    }

    const currentTotal = ordersToSubmit.reduce((s, l) => s + (l.price ?? 0), 0);

    // Pre-check balance if known
    if (userBalance !== null && userBalance < currentTotal) {
      const deficit = Math.max(0, currentTotal - userBalance);
      setInsufficientBalanceModal({
        needed: currentTotal,
        balance: userBalance,
        deficit,
        orders: ordersToSubmit,
        message: `Insufficient balance. You need GHS ${currentTotal.toFixed(2)} but have GHS ${userBalance.toFixed(2)}.`,
      });
      return;
    }

    // Pre-submission check for any unverified MTN numbers
    const mtnLines = ordersToSubmit.filter((l) => l.network === "MTN");
    if (mtnLines.length > 0) {
      try {
        const checkRes = await fetch("/api/mtn-verification/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumbers: mtnLines.map((l) => l.phoneNumber) }),
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          const unverifiedList: string[] = checkData.unverifiedNumbers ?? [];
          if (unverifiedList.length > 0) {
            const unverifiedSet = new Set(unverifiedList);
            setPendingUnverified({
              toAdd: ordersToSubmit,
              unverifiedNumbers: unverifiedList,
              verifiedItems: ordersToSubmit.filter((l) => !unverifiedSet.has(l.phoneNumber)),
              verificationEnabled: checkData.verificationEnabled ?? true,
              rawText: null,
              mode: "submit",
            });
            return;
          }
        } else {
          const errorData = await checkRes.json().catch(() => null);
          toast(errorData?.message || "Failed to verify MTN numbers. Please try again.", "error");
          return;
        }
      } catch {
        toast("Network error verifying MTN numbers. Please try again.", "error");
        return;
      }
    }

    await executeOrderSubmission(ordersToSubmit);
  };

  return (
    <div className="space-y-6">
      {/* Platform Maintenance Notice */}
      {!submissionEnabled && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          <ShieldAlert className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <p>
            <strong>Number Submission Paused:</strong> Order submission has been temporarily turned
            off by the administrator. Please try again later.
          </p>
        </div>
      )}

      {/* Success Banner */}
      {result && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 shadow-sm animate-in fade-in-0 duration-200">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{result}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 p-5 sm:p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1322]/90">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00df82]/30 bg-[#00df82]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#00df82]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00df82] animate-pulse" />
                Single-Order Dispatch Engine v2.0
              </span>
              <span className="text-[10px] font-bold text-slate-400">· Zero Switch Delays</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Bulk Order Gateway
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Automated high-throughput data distribution terminal. Paste large recipient rosters or import Excel worksheets for instant parallel switch dispatch.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs dark:border-white/5 dark:bg-white/[0.04]">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Gateway Status</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">Online &amp; Active</p>
              </div>
            </div>

            {userBalance !== null && (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs dark:border-white/5 dark:bg-white/[0.04]">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Wallet className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Wallet Balance</p>
                  <p className="font-black text-slate-900 dark:text-white tabular-nums">
                    {formatGHS(userBalance)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Network Carrier Selection Rail */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Target Carrier Network
            </span>
            <span className="text-[11px] text-slate-400">
              ({availableNetworks.length} available)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            All orders in batch route through the chosen network switch
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-slate-200/80 bg-white/60 dark:border-white/10 dark:bg-white/5"
              />
            ))}
          </div>
        ) : availableNetworks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-6 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
            <AlertTriangle className="mx-auto h-6 w-6 text-amber-600 dark:text-amber-400" />
            <h3 className="mt-2 text-sm font-bold text-amber-900 dark:text-amber-200">
              No Telecom Carriers Currently Available
            </h3>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              All package tiers have been temporarily disabled. Please check back shortly or contact support.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {availableNetworks.map((n) => {
              const isSelected = activeNetwork === n;
              const netPackages = packages.filter((p) => p.network === n);
              const validPrices = netPackages
                .map((p) => p.price)
                .filter((pr): pr is number => typeof pr === "number" && pr > 0);
              const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

              // Network visual brand configs
              const isMtn = n === "MTN";
              const isTelecel = n === "TELECEL";
              const isBigTime = n === "AIRTELTIGO_BIGTIME";

              let brandBg = "bg-blue-600 text-white";
              let brandBorder = "hover:border-blue-400";
              let selectedRing =
                "ring-2 ring-blue-500 border-blue-500/80 bg-blue-50/30 dark:bg-blue-950/20";
              let tag = "iShare Switch";

              if (isMtn) {
                brandBg = "bg-[#FFCB05] text-slate-950";
                brandBorder = "hover:border-amber-400";
                selectedRing =
                  "ring-2 ring-amber-400 border-amber-400 bg-amber-50/40 dark:bg-amber-950/20";
                tag = "Direct Fiber Switch";
              } else if (isTelecel) {
                brandBg = "bg-[#E4002B] text-white";
                brandBorder = "hover:border-red-400";
                selectedRing =
                  "ring-2 ring-red-500 border-red-500 bg-red-50/30 dark:bg-red-950/20";
                tag = "Instant Core Switch";
              } else if (isBigTime) {
                brandBg = "bg-[#00A3E0] text-white";
                brandBorder = "hover:border-sky-400";
                selectedRing =
                  "ring-2 ring-sky-500 border-sky-500 bg-sky-50/30 dark:bg-sky-950/20";
                tag = "Big Time Gateway";
              }

              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNetwork(n)}
                  disabled={!submissionEnabled}
                  className={cn(
                    "group relative flex items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all duration-200 cursor-pointer shadow-xs",
                    isSelected
                      ? selectedRing
                      : "border-slate-200/90 bg-white hover:bg-slate-50/80 dark:border-white/10 dark:bg-[#0c1424]/80 dark:hover:bg-white/5",
                    brandBorder
                  )}
                >
                  {/* Carrier Logo / Initials Badge */}
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black text-sm shadow-xs tracking-tight",
                      brandBg
                    )}
                  >
                    {isMtn ? "MTN" : isTelecel ? "TC" : isBigTime ? "AT+" : "AT"}
                  </div>

                  {/* Network Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {NETWORK_LABELS[n]}
                      </h4>
                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
                      {tag}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        {netPackages.length} package{netPackages.length !== 1 ? "s" : ""}
                      </span>
                      {minPrice !== null && (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          from {formatGHS(minPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Terminal Grid: Order Intake Station & Dispatch Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Order Input & Active Queue List */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Order Intake Station Card */}
          <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#0c1424]/90">
            {/* Mode Selector Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5 dark:border-white/5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
                  <FileUp className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Order Input Station
                  </h3>
                  <p className="text-xs text-slate-400">
                    Routing batch to{" "}
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {NETWORK_LABELS[activeNetwork] ?? activeNetwork}
                    </span>
                  </p>
                </div>
              </div>

              {/* Segmented Mode Switcher */}
              <div className="flex items-center rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setTab("paste")}
                  disabled={!submissionEnabled}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                    tab === "paste"
                      ? "bg-white text-emerald-700 shadow-sm dark:bg-[#121c30] dark:text-emerald-400"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                  )}
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  <span>Quick Paste</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab("upload")}
                  disabled={!submissionEnabled}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                    tab === "upload"
                      ? "bg-white text-emerald-700 shadow-sm dark:bg-[#121c30] dark:text-emerald-400"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                  )}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Excel Sheet (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Input Station Body */}
            <div className="p-5">
              {loading ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
                  <p className="text-xs text-slate-400 font-medium">Synchronizing telecom packages…</p>
                </div>
              ) : !submissionEnabled ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Order submission is temporarily disabled by admin.
                </div>
              ) : tab === "upload" ? (
                /* Excel Upload Area */
                <div className="space-y-4">
                  <div
                    onClick={() => !uploading && fileRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all",
                      dragging
                        ? "border-emerald-500 bg-emerald-500/10 scale-[0.99]"
                        : "border-slate-300/80 hover:border-emerald-500 hover:bg-slate-50/50 dark:border-white/15 dark:hover:border-emerald-500/60 dark:hover:bg-white/[0.02]",
                      uploading && "pointer-events-none opacity-60"
                    )}
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 shadow-sm dark:bg-emerald-500/20 dark:text-emerald-400">
                      {uploading ? (
                        <Loader2 className="h-7 w-7 animate-spin" />
                      ) : (
                        <UploadCloud className="h-7 w-7 stroke-[1.75]" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {uploading ? (
                          "Parsing spreadsheet orders…"
                        ) : (
                          <>
                            Drag &amp; drop your Excel workbook or{" "}
                            <span className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">
                              browse files
                            </span>
                          </>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                        Supported: Standard .xlsx spreadsheet up to 5MB. Column 1: Recipient Phone, Column 2: Data Volume (GB).
                      </p>
                    </div>

                    {fileName && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        <Check className="h-3.5 w-3.5" />
                        Selected: {fileName}
                      </span>
                    )}

                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleFile(f);
                        e.target.value = "";
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <a
                      href="/api/orders/template"
                      download="bundle-portal-order-template.xlsx"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Starter Excel Template (.xlsx)</span>
                    </a>
                    <span className="text-[11px] text-slate-400">
                      Target Carrier: {NETWORK_LABELS[activeNetwork]}
                    </span>
                  </div>
                </div>
              ) : (
                /* Multi-line Paste Terminal */
                <div className="space-y-3.5">
                  <div className="relative">
                    <textarea
                      rows={7}
                      placeholder={
                        "0535308873 1gb\n0241234567, 5\n0242075374 10gb\n0257467983 2"
                      }
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      onPaste={(e) => {
                        const pasted = e.clipboardData?.getData("text");
                        if (pasted) {
                          e.preventDefault();
                          const converted = normalizeTextNumbers(pasted);
                          const target = e.currentTarget;
                          const start = target.selectionStart ?? 0;
                          const end = target.selectionEnd ?? 0;
                          const val = target.value;
                          const next = val.slice(0, start) + converted + val.slice(end);
                          setBulkText(next);
                        }
                      }}
                      onBlur={() => {
                        if (bulkText) setBulkText(normalizeTextNumbers(bulkText));
                      }}
                      className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 font-mono text-xs sm:text-sm text-slate-900 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:bg-[#070c14]"
                    />

                    {bulkText.trim() && (
                      <span className="absolute bottom-3 right-3 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                        {splitOrderLines(bulkText).filter((l) => !isHeaderLine(l)).length} line(s)
                      </span>
                    )}
                  </div>

                  {/* Text Toolbar Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!bulkText.trim() ? (
                        <button
                          type="button"
                          onClick={loadSampleText}
                          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          <span>Insert Sample</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={copyBulkText}
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition cursor-pointer"
                            title="Copy text to clipboard"
                          >
                            {copiedBulkText ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 text-slate-400" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setBulkText(normalizeTextNumbers(bulkText))}
                            className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50 px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition cursor-pointer"
                          >
                            Format Numbers
                          </button>
                          <button
                            type="button"
                            onClick={() => setBulkText("")}
                            className="inline-flex h-8 items-center gap-1 rounded-xl border border-rose-200/60 bg-rose-50/60 px-2 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 transition cursor-pointer"
                            title="Clear textarea"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Clear</span>
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleText(bulkText, "pasted text")}
                      disabled={!bulkText.trim() || !submissionEnabled}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 text-xs font-black text-slate-950 shadow-md transition hover:from-emerald-400 hover:to-teal-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ClipboardPaste className="h-4 w-4 stroke-[2.5]" />
                      <span>Parse &amp; Queue Orders</span>
                    </button>
                  </div>

                  {/* Input Syntax Guidelines */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-[11px] text-slate-500 dark:border-white/5 dark:bg-white/[0.02] space-y-1">
                    <p className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                      <Info className="h-3.5 w-3.5 text-emerald-500" />
                      Syntax Format: One order per row:{" "}
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        [PHONE] [GB]
                      </span>{" "}
                      (e.g. <span className="font-mono">0241234567 5gb</span> or{" "}
                      <span className="font-mono">0501234567, 10</span>)
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Automatic deduplication filters repeat recipient numbers. Excel-dropped leading zeroes (+233, 535...) are restored on the fly.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Queue Ledger */}
          <QueueList
            lines={lines}
            unavailableIndices={unavailableIndices}
            onRemoveUnavailable={removeUnavailableLines}
            onRemove={(i) => setLines((ls) => ls.filter((_, j) => j !== i))}
            onClear={() => setLines([])}
          />
        </div>

        {/* Right Column: Dispatch Action Center & Telemetry */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5 lg:sticky lg:top-20">
          <SendSummary
            count={lines.length}
            total={total}
            totalGb={totalGb}
            userBalance={userBalance}
            submitting={submitting}
            submissionEnabled={submissionEnabled}
            unavailableCount={unavailableIndices.size}
            onSubmit={submit}
          />

          {/* Live Delivery Speed Telemetry Card */}
          <LiveDeliverySpeedCard network={activeNetwork} />

          {/* Instructions & Guidelines Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 text-xs text-slate-500 shadow-sm backdrop-blur-xl dark:border-white/5 dark:bg-[#0c1424]/90 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-white/5 font-black text-slate-800 dark:text-slate-200">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <HelpCircle className="h-3.5 w-3.5" />
              </div>
              <h4>Bulk Dispatch Protocol</h4>
            </div>

            <ul className="space-y-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="font-black text-emerald-500">1.</span>
                <span>
                  <strong>Select Network:</strong> Pick the target carrier before queueing numbers.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-black text-emerald-500">2.</span>
                <span>
                  <strong>Carrier Verification:</strong> Unverified MTN recipients will prompt a confirmation dialog to safeguard your wallet.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-black text-emerald-500">3.</span>
                <span>
                  <strong>Deduplication Guard:</strong> Duplicate numbers inside your input or against existing queue entries are filtered automatically.
                </span>
              </li>
            </ul>

            <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-400">
              <span>CleanDataPacks Gateway v2.0</span>
              <Link
                href="/dashboard/buy-now"
                className="font-bold text-emerald-600 hover:underline dark:text-emerald-400 inline-flex items-center gap-0.5"
              >
                Single Buy Portal
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation modal for Ported numbers */}
      <Dialog
        open={!!pendingPorted}
        onClose={() => setPendingPorted(null)}
        title="Ported MTN Number Detected"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold">
                Your MTN order list contains number(s) with non-MTN prefixes:
              </p>
              <p>
                Normal MTN Ghana prefixes are:{" "}
                <span className="font-mono font-bold">024, 025, 053, 054, 055, 059</span>.
              </p>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Detected Ported Number(s):
            </p>
            <ul className="space-y-1.5 text-xs font-mono">
              {pendingPorted?.portedItems.map((item) => (
                <li
                  key={item.phoneNumber}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 shadow-sm dark:bg-[#111c30]"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {item.phoneNumber}
                  </span>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 font-sans text-[11px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                    {item.detectedNetwork} prefix ({item.gbAmount} GB)
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300">
            If this recipient ported their number to <strong>MTN</strong>, they will receive the bundle
            normally. If the number has NOT been ported to MTN, the order may fail.
          </p>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Do you want to proceed and add these orders to the queue?
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelPortedAddition}
            >
              Cancel / Edit
            </Button>
            {pendingPorted && pendingPorted.nonPortedItems.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => confirmPortedAddition(false)}
                className="border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-600/40 dark:text-amber-300 dark:hover:bg-amber-500/10"
              >
                Skip Ported &amp; Add Remaining ({pendingPorted.nonPortedItems.length})
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => confirmPortedAddition(true)}
              className="bg-brand-600 hover:bg-brand-700 text-white"
            >
              Proceed with All ({pendingPorted?.toAdd.length ?? 0})
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirmation modal for Unverified numbers */}
      <Dialog
        open={!!pendingUnverified}
        onClose={() => setPendingUnverified(null)}
        title="Unverified MTN Number(s) Detected"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold">
                {pendingUnverified?.unverifiedNumbers.length} MTN number(s) have not been verified yet.
              </p>
              <p>
                {pendingUnverified?.verificationEnabled
                  ? "MTN Number Verification is currently enforced on the platform. Orders for unverified numbers cannot be placed."
                  : "These numbers are not on the verified MTN list. You can remove them or proceed anyway (they will be logged for review)."}
              </p>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Unverified Number(s) ({pendingUnverified?.unverifiedNumbers.length}):
            </p>
            <ul className="space-y-1.5 text-xs font-mono">
              {pendingUnverified?.unverifiedNumbers.map((num) => {
                const line = pendingUnverified.toAdd.find((l) => l.phoneNumber === num);
                return (
                  <li
                    key={num}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 shadow-sm dark:bg-[#111c30]"
                  >
                    <span className="font-bold text-slate-800 dark:text-slate-100">{num}</span>
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 font-sans text-[11px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                      Unverified {line ? `(${line.gbAmount} GB)` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300">
            You can remove these unverified numbers and proceed with the remaining verified orders.
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyUnverifiedNumbers}
              className="gap-1.5"
            >
              {copiedUnverified ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>Copy</span>
                </>
              )}
            </Button>
            {pendingUnverified && pendingUnverified.verifiedItems.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={() => confirmUnverifiedAddition(false)}
                className="bg-brand-600 hover:bg-brand-700 text-white"
              >
                Remove Unverified &amp; Proceed ({pendingUnverified.verifiedItems.length})
              </Button>
            )}
            {pendingUnverified && !pendingUnverified.verificationEnabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => confirmUnverifiedAddition(true)}
                className="border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-600/40 dark:text-amber-300 dark:hover:bg-amber-500/10"
              >
                Proceed with All ({pendingUnverified.toAdd.length})
              </Button>
            )}
          </div>
        </div>
      </Dialog>

      {/* Insufficient Balance Prompt Dialog */}
      <Dialog
        open={!!insufficientBalanceModal}
        onClose={() => setInsufficientBalanceModal(null)}
        title="Insufficient Wallet Balance"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-sm">
                You do not have enough wallet balance to send these orders.
              </p>
              <p className="text-red-700 dark:text-red-300">
                {insufficientBalanceModal?.message || "Please top up your wallet to proceed."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Required</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {formatGHS(insufficientBalanceModal?.needed ?? 0)}
              </p>
            </div>
            <div className="border-x border-slate-200 dark:border-slate-800">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Current Balance</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {formatGHS(insufficientBalanceModal?.balance ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-red-500 dark:text-red-400">Top-Up Needed</p>
              <p className="text-sm font-bold text-red-600 dark:text-red-400">
                {formatGHS(insufficientBalanceModal?.deficit ?? 0)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <p className="font-semibold">✓ Your numbers have NOT been cleared</p>
            <p className="mt-0.5 text-emerald-700 dark:text-emerald-400">
              All {insufficientBalanceModal?.orders.length ?? 0} order(s) remain safely preserved in your queue and paste box. You can copy them below, or top up your wallet and return anytime — your orders will still be here.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyInsufficientBalanceOrders}
              className="gap-1.5"
            >
              {copiedFromModal ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Copied {insufficientBalanceModal?.orders.length} orders!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>Copy Numbers ({insufficientBalanceModal?.orders.length})</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInsufficientBalanceModal(null)}
            >
              Keep &amp; Close
            </Button>
            <Link href="/dashboard/billing">
              <Button
                type="button"
                size="sm"
                className="bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
              >
                <Wallet className="h-3.5 w-3.5" />
                <span>Top Up Wallet</span>
              </Button>
            </Link>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import {
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  FileSpreadsheet,
  Globe,
  Sliders,
  Check,
  Activity,
  Eye,
  EyeOff,
  Coins,
  Search,
  Package,
} from "lucide-react";
import Link from "next/link";

interface Props {
  settings: Record<string, string>;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSave?: () => Promise<void>;
  saving?: boolean;
}

export function ProviderApisSettings({ settings, setSettings, onSave, saving }: Props) {
  const { toast } = useToast();

  const [syncing, setSyncing] = React.useState(false);
  const [testingBalance, setTestingBalance] = React.useState(false);
  const [testingVerify, setTestingVerify] = React.useState(false);
  const [testingPackages, setTestingPackages] = React.useState(false);
  const [showTskKey, setShowTskKey] = React.useState(false);
  const [showTskSecret, setShowTskSecret] = React.useState(false);
  const [copiedWebhook, setCopiedWebhook] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    provider: string;
    message: string;
    success: boolean;
  } | null>(null);

  const isRoutingEnabled = settings.provider_routing_enabled === "true";
  const isTskconnectEnabled = settings.tskconnect_enabled !== "false";
  const isTskVerificationEnabled = settings.tskconnect_number_verification_enabled !== "false";

  const appBaseUrl = settings.app_base_url || (typeof window !== "undefined" ? window.location.origin : "");
  const tskWebhookUrl = `${appBaseUrl.replace(/\/+$/, "")}/api/webhooks/providers/tskconnect`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(true);
    toast("Webhook URL copied to clipboard", "success");
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const applyTskconnectAllPreset = () => {
    setSettings((s) => ({
      ...s,
      provider_routing_enabled: "true",
      provider_routing_default: "TSKCONNECT",
      provider_route_MTN: "TSKCONNECT",
      provider_route_MTN_XPRESS: "TSKCONNECT",
      provider_route_TELECEL: "TSKCONNECT",
      provider_route_AIRTELTIGO_ISHARE: "TSKCONNECT",
      provider_route_AIRTELTIGO_BIGTIME: "TSKCONNECT",
    }));
    toast("Preset applied: All Networks → Tskconnect API", "success");
  };

  const applyManualAllPreset = () => {
    setSettings((s) => ({
      ...s,
      provider_routing_enabled: "true",
      provider_routing_default: "MANUAL",
      provider_route_MTN: "MANUAL",
      provider_route_MTN_XPRESS: "MANUAL",
      provider_route_TELECEL: "MANUAL",
      provider_route_AIRTELTIGO_ISHARE: "MANUAL",
      provider_route_AIRTELTIGO_BIGTIME: "MANUAL",
    }));
    toast("Preset applied: All Networks → Manual File Export", "success");
  };

  const syncInFlight = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/provider-apis/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sync failed");
      toast(`Sync complete: ${json.checked} checked, ${json.updated} updated.`, "success");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSyncing(false);
    }
  };

  const testTskconnectBalance = async () => {
    setTestingBalance(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/provider-apis/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_tskconnect_balance",
          apiKey: settings.tskconnect_api_key,
          baseUrl: settings.tskconnect_base_url,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to check Tskconnect balance");
      const bal = json.balance;
      setTestResult({
        provider: "Tskconnect Balance",
        message: `Connected successfully! Balance: ${bal.currency || "GHS"} ${bal.balance?.toFixed(2)} (${bal.environment || "PRODUCTION"})`,
        success: true,
      });
      toast(`Tskconnect Balance: GHS ${bal.balance?.toFixed(2)}`, "success");
    } catch (err: any) {
      setTestResult({
        provider: "Tskconnect Balance Check",
        message: err.message,
        success: false,
      });
      toast(err.message, "error");
    } finally {
      setTestingBalance(false);
    }
  };

  const testTskconnectVerify = async () => {
    setTestingVerify(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/provider-apis/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_tskconnect_verify",
          apiKey: settings.tskconnect_api_key,
          baseUrl: settings.tskconnect_base_url,
          recipient: "0241234567",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to verify numbers on Tskconnect");
      const ver = json.verification;
      const count = ver?.validNumbers?.length ?? 0;
      setTestResult({
        provider: "Tskconnect Number Verification",
        message: `Endpoint verified: ${count} verified number(s) returned. Summary: total ${ver?.summary?.total ?? 1}, verified ${ver?.summary?.verified ?? count}.`,
        success: true,
      });
      toast("Tskconnect verification endpoint working properly!", "success");
    } catch (err: any) {
      setTestResult({
        provider: "Tskconnect Number Verification",
        message: err.message,
        success: false,
      });
      toast(err.message, "error");
    } finally {
      setTestingVerify(false);
    }
  };

  const testTskconnectPackages = async () => {
    setTestingPackages(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/provider-apis/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_tskconnect_packages",
          apiKey: settings.tskconnect_api_key,
          baseUrl: settings.tskconnect_base_url,
          network: "MTN",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch Tskconnect packages");
      const pkgs = json.packages || [];
      setTestResult({
        provider: "Tskconnect Packages",
        message: `Catalog query successful: found ${pkgs.length} package(s). Example: ${pkgs[0]?.name || "N/A"} (${pkgs[0]?.id || "N/A"}) - GHS ${pkgs[0]?.price}`,
        success: true,
      });
      toast(`Fetched ${pkgs.length} packages from Tskconnect`, "success");
    } catch (err: any) {
      setTestResult({
        provider: "Tskconnect Packages",
        message: err.message,
        success: false,
      });
      toast(err.message, "error");
    } finally {
      setTestingPackages(false);
    }
  };

  const networkRows = [
    { key: "MTN", label: "MTN Data (Regular)" },
    { key: "MTN_XPRESS", label: "MTN Xpress (Special)" },
    { key: "TELECEL", label: "Telecel / Vodafone" },
    { key: "AIRTELTIGO_ISHARE", label: "AirtelTigo iShare" },
    { key: "AIRTELTIGO_BIGTIME", label: "AirtelTigo Big Time" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Master Switch Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${
                  isRoutingEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Automated Order Processing (Provider APIs)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              When <strong>ON</strong>, orders placed for assigned networks are immediately dispatched
              to Tskconnect and status updates are tracked automatically.
              When <strong>OFF</strong>, orders remain in PENDING status for manual file export.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isRoutingEnabled}
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  provider_routing_enabled: isRoutingEnabled ? "false" : "true",
                }))
              }
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                isRoutingEnabled ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  isRoutingEnabled ? "left-[25px]" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <Label>Public App Base URL (for Webhooks & Callbacks)</Label>
            <Input
              type="url"
              placeholder="https://your-domain.com"
              value={settings.app_base_url ?? ""}
              onChange={(e) => setSettings((s) => ({ ...s, app_base_url: e.target.value }))}
            />
            <p className="text-[11px] text-slate-400">
              Used as the base domain when notifying provider APIs where to deliver status webhooks.
            </p>
          </div>

          <div className="flex flex-col justify-end gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyTskconnectAllPreset}
                className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 font-semibold"
              >
                <Zap className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Route All → Tskconnect API
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyManualAllPreset}
                className="text-xs text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Manual Export All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={syncInFlight}
                disabled={syncing}
                className="text-xs"
                title="Sync in-flight orders"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncing ? "animate-spin" : ""}`} /> Sync In-Flight Orders
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">
              Quick presets: <strong>Route All → Tskconnect API</strong>, or <strong>Manual Export All</strong>.
            </p>
          </div>
        </div>

        {/* Background Status Poller Setting */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw
                  className={`h-4 w-4 ${
                    settings.provider_sync_poller_enabled !== "false"
                      ? "text-brand-600"
                      : "text-slate-400"
                  }`}
                />
                Automated Status Poller (Background Puller)
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    settings.provider_sync_poller_enabled !== "false"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {settings.provider_sync_poller_enabled !== "false"
                    ? `Active (Every ${parseInt(settings.provider_sync_poller_interval_seconds || "30", 10) || 30}s)`
                    : "Paused"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                When <strong>ON</strong>, the background puller automatically checks Tskconnect every {parseInt(settings.provider_sync_poller_interval_seconds || "30", 10) || 30} seconds for in-flight orders in case the webhook fails or is delayed.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.provider_sync_poller_enabled !== "false"}
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  provider_sync_poller_enabled:
                    s.provider_sync_poller_enabled === "false" ? "true" : "false",
                }))
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                settings.provider_sync_poller_enabled !== "false"
                  ? "bg-brand-600"
                  : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  settings.provider_sync_poller_enabled !== "false"
                    ? "left-[22px]"
                    : "left-0.5"
                }`}
              />
            </button>
          </div>

          {settings.provider_sync_poller_enabled !== "false" && (
            <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-medium text-slate-700 dark:text-slate-300">Polling Interval:</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Timer frequency for pulling in-flight orders from provider API.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {[30, 60, 120].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        provider_sync_poller_interval_seconds: String(sec),
                      }))
                    }
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                      (parseInt(settings.provider_sync_poller_interval_seconds || "30", 10) || 30) === sec
                        ? "bg-brand-600 text-white shadow-sm"
                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    {sec}s {sec === 30 ? "(Default)" : ""}
                  </button>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="15"
                    max="600"
                    value={parseInt(settings.provider_sync_poller_interval_seconds || "30", 10) || 30}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings((s) => ({
                        ...s,
                        provider_sync_poller_interval_seconds: val,
                      }));
                    }}
                    className="w-16 px-2 py-1 text-xs text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <span className="text-[11px] text-slate-500">sec</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Link to Order API Logs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/60 p-4 shadow-sm dark:border-indigo-900/40 dark:bg-indigo-950/20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Order API Logs & Diagnostics
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Inspect provider API request/response payloads, HTTP error codes, and why order dispatches failed.
            </p>
          </div>
        </div>
        <Link
          href="/admin/order-api-logs"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
        >
          View Order API Logs →
        </Link>
      </div>

      {/* Test Feedback Banner */}
      {testResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            testResult.success
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-rose-50/80 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200"
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 overflow-hidden break-all">
            <strong>{testResult.provider}:</strong> {testResult.message}
          </div>
          <button
            onClick={() => setTestResult(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Network Routing Matrix */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-brand-50 dark:bg-brand-950/60 flex items-center justify-center text-brand-600">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Network-to-Provider Routing Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Assign which provider dispenses each carrier network. Select Tskconnect API or Manual File Export per network.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
            {networkRows.length} Networks Configured
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3 font-medium">Network / Bundle Type</th>
                <th className="py-2.5 px-3 font-medium text-center">Tskconnect API</th>
                <th className="py-2.5 px-3 font-medium text-center">Manual File Export</th>
                <th className="py-2.5 px-3 font-medium text-right">Active Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {networkRows.map((row) => {
                const settingKey = `provider_route_${row.key}`;
                const rawVal = settings[settingKey];
                const currentVal = rawVal === "MANUAL" ? "MANUAL" : "TSKCONNECT";

                return (
                  <tr key={row.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{row.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({row.key})</span>
                      </div>
                    </td>

                    {/* 1. Tskconnect Option */}
                    <td className="py-3 px-3 text-center">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name={settingKey}
                          value="TSKCONNECT"
                          checked={currentVal === "TSKCONNECT"}
                          onChange={() =>
                            setSettings((s) => ({ ...s, [settingKey]: "TSKCONNECT" }))
                          }
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium text-xs">
                          Tskconnect API
                        </span>
                      </label>
                    </td>

                    {/* 2. Manual Export Option */}
                    <td className="py-3 px-3 text-center">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name={settingKey}
                          value="MANUAL"
                          checked={currentVal === "MANUAL"}
                          onChange={() => setSettings((s) => ({ ...s, [settingKey]: "MANUAL" }))}
                          className="text-slate-600 focus:ring-slate-500"
                        />
                        <span className="text-slate-600 dark:text-slate-400 text-xs">Manual Export</span>
                      </label>
                    </td>

                    {/* 3. Active Mode Pill */}
                    <td className="py-3 px-3 text-right">
                      {!isRoutingEnabled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Export Manual (Routing Off)
                        </span>
                      ) : currentVal === "TSKCONNECT" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold">
                          ⚡ Tskconnect API
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          📁 Manual Export
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Select whether MTN, Telecel, or AirtelTigo orders use <strong>Tskconnect API</strong> or <strong>Manual File Export</strong>.</span>
          </div>
          <span className="text-[11px] text-slate-400 italic">Direct automated delivery</span>
        </div>
      </div>

      {/* 3. Tskconnect Developer API Gateway Configuration */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 shadow-sm">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Tskconnect Developer API Gateway
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  v1.0.0 REST
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official telecom integration for dispensing Ghanaian data bundles across MTN, Telecel, and AirtelTigo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Enable Tskconnect:</span>
            <button
              type="button"
              role="switch"
              aria-checked={isTskconnectEnabled}
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  tskconnect_enabled: isTskconnectEnabled ? "false" : "true",
                }))
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                isTskconnectEnabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  isTskconnectEnabled ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          {/* API Key */}
          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              <span>Secret API Key (Authorization Bearer Token)</span>
              <span className="text-[10px] text-slate-400">ct_live_... / ct_test_...</span>
            </Label>
            <div className="relative">
              <Input
                type={showTskKey ? "text" : "password"}
                placeholder="ct_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                value={settings.tskconnect_api_key ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, tskconnect_api_key: e.target.value }))}
                className="pr-10 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowTskKey(!showTskKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showTskKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Sent in the <code>Authorization: Bearer &lt;key&gt;</code> HTTP header.
            </p>
          </div>

          {/* Base URL */}
          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              <span>Base URL</span>
              <span className="text-[10px] text-slate-400">Default: https://tsk05.net/v1</span>
            </Label>
            <Input
              type="url"
              placeholder="https://tsk05.net/v1"
              value={settings.tskconnect_base_url ?? ""}
              onChange={(e) => setSettings((s) => ({ ...s, tskconnect_base_url: e.target.value }))}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-slate-400">
              Leave blank or default to <code>https://tsk05.net/v1</code>.
            </p>
          </div>

          {/* Webhook Secret */}
          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              <span>Webhook Signing Secret</span>
              <span className="text-[10px] text-slate-400">For HMAC SHA-256 verification</span>
            </Label>
            <div className="relative">
              <Input
                type={showTskSecret ? "text" : "password"}
                placeholder="whsec_xxxxxxxxxxxxxxxxxxxxxxxx"
                value={settings.tskconnect_webhook_secret ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, tskconnect_webhook_secret: e.target.value }))}
                className="pr-10 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowTskSecret(!showTskSecret)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showTskSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Used to verify <code>X-Tskconnect-Signature</code> on incoming order callbacks.
            </p>
          </div>

          {/* Pre-order Verification Toggle */}
          <div className="space-y-1.5 flex flex-col justify-between">
            <div>
              <Label className="flex items-center justify-between">
                <span>Phone Number Verification Engine</span>
                <span className="text-[10px] text-slate-400">/v1/numbers/verify</span>
              </Label>
              <p className="text-[11px] text-slate-400 mt-1">
                Pre-screen MTN numbers before dispatching orders. Unverified MTN recipients are rejected to prevent wallet deductions.
              </p>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Verify numbers via Tskconnect
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isTskVerificationEnabled}
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    tskconnect_number_verification_enabled: isTskVerificationEnabled ? "false" : "true",
                  }))
                }
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  isTskVerificationEnabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    isTskVerificationEnabled ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Webhook Endpoint Display */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-emerald-600" />
              Tskconnect Order Webhook Endpoint URL
            </span>
            <span className="text-[10px] text-slate-400">POST Event Delivery</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Configure this Webhook URL in your Tskconnect developer dashboard. Receives <code>order.completed</code> and <code>order.failed</code> updates.
          </p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={tskWebhookUrl}
              className="bg-white dark:bg-slate-900 font-mono text-xs select-all text-slate-700 dark:text-slate-300"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(tskWebhookUrl)}
              className="shrink-0 text-xs font-semibold"
            >
              {copiedWebhook ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy URL
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Diagnostic Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={testTskconnectBalance}
            disabled={testingBalance}
            className="text-xs font-semibold"
          >
            <Coins className={`h-3.5 w-3.5 mr-1.5 text-amber-500 ${testingBalance ? "animate-spin" : ""}`} />
            {testingBalance ? "Checking..." : "Check Wallet Balance"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={testTskconnectVerify}
            disabled={testingVerify}
            className="text-xs font-semibold"
          >
            <Search className={`h-3.5 w-3.5 mr-1.5 text-indigo-500 ${testingVerify ? "animate-spin" : ""}`} />
            {testingVerify ? "Verifying..." : "Test Number Verification"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={testTskconnectPackages}
            disabled={testingPackages}
            className="text-xs font-semibold"
          >
            <Package className={`h-3.5 w-3.5 mr-1.5 text-emerald-500 ${testingPackages ? "animate-spin" : ""}`} />
            {testingPackages ? "Fetching..." : "Fetch Packages (Catalog)"}
          </Button>
        </div>
      </div>
    </div>
  );
}

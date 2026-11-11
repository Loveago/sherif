"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Key,
  BookOpen,
  Play,
  ClipboardList,
  Webhook,
  FileText,
  BarChart2,
  Settings,
  ShieldCheck,
  Activity,
  ArrowRight,
  ChevronDown,
  Copy,
  Check,
  Terminal,
  Code2,
  Zap,
  Globe,
  Radio,
  Cpu,
  Layers,
} from "lucide-react";
import { PageHeader, StatCard, Spinner } from "@/components/shared";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/types";

// Sub-components
import { DeveloperApplicationCard } from "@/components/api/developer-application-card";
import { DeveloperCredentials } from "@/components/api/developer-credentials";
import { DeveloperDocs } from "@/components/api/developer-docs";
import { DeveloperPlayground } from "@/components/api/developer-playground";
import { DeveloperOrdersPanel } from "@/components/api/developer-orders-panel";
import { DeveloperWebhooksPanel } from "@/components/api/developer-webhooks-panel";
import { DeveloperLogsPanel } from "@/components/api/developer-logs-panel";
import { DeveloperStatusPanel } from "@/components/api/developer-status-panel";
import { DeveloperSettingsPanel } from "@/components/api/developer-settings-panel";

type TabKey =
  | "overview"
  | "access"
  | "credentials"
  | "docs"
  | "playground"
  | "orders"
  | "webhooks"
  | "logs"
  | "usage"
  | "settings"
  | "status";

export default function DeveloperDashboardPage() {
  const [activeTab, setActiveTab] = React.useState<TabKey>("overview");
  const [playgroundEndpoint, setPlaygroundEndpoint] = React.useState<string>("post-verify-numbers");
  const [usageData, setUsageData] = React.useState<any>(null);
  const [appData, setAppData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [snippetLanguage, setSnippetLanguage] = React.useState<"curl" | "js" | "python">("curl");

  // Sync tab from URL hash/query if present
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const tabParam = url.searchParams.get("tab") as TabKey;
      const endpointParam = url.searchParams.get("endpoint");
      if (tabParam) setActiveTab(tabParam);
      if (endpointParam) setPlaygroundEndpoint(endpointParam);
    }
  }, []);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [usageRes, appRes] = await Promise.all([
        fetch("/api/developer/usage"),
        fetch("/api/developer/application"),
      ]);
      const usageJson = await usageRes.json();
      const appJson = await appRes.json();
      setUsageData(usageJson);
      setAppData(appJson.application);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const navItems: { key: TabKey; label: string; icon: any; category: string }[] = [
    { key: "overview", label: "Overview", icon: LayoutDashboard, category: "Console" },
    { key: "credentials", label: "API Keys", icon: Key, category: "Console" },
    { key: "access", label: "Production Access", icon: ShieldCheck, category: "Console" },
    { key: "docs", label: "API Reference", icon: BookOpen, category: "Build" },
    { key: "playground", label: "Playground", icon: Play, category: "Build" },
    { key: "orders", label: "Dispatched Orders", icon: ClipboardList, category: "Telemetry" },
    { key: "webhooks", label: "Webhooks", icon: Webhook, category: "Telemetry" },
    { key: "logs", label: "Traffic Logs", icon: FileText, category: "Telemetry" },
    { key: "usage", label: "Rate & Usage", icon: BarChart2, category: "Telemetry" },
    { key: "settings", label: "Security & IP", icon: Settings, category: "Config" },
    { key: "status", label: "Gateway Health", icon: Activity, category: "Config" },
  ];

  const metrics = usageData?.metrics || {};
  const isApproved = appData?.status === "APPROVED";

  const copyBaseUrl = () => {
    navigator.clipboard.writeText("https://api.cleandatapacks.com/v1");
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const sampleSnippets = {
    curl: `curl -X POST https://api.cleandatapacks.com/v1/orders \\
  -H "Authorization: Bearer ct_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "network": "MTN",
    "packageId": "pkg_mtn_5gb",
    "recipientPhone": "0241234567"
  }'`,
    js: `const response = await fetch("https://api.cleandatapacks.com/v1/orders", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ct_live_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    network: "MTN",
    packageId: "pkg_mtn_5gb",
    recipientPhone: "0241234567"
  })
});
const data = await response.json();
console.log(data.orderId, data.status);`,
    python: `import requests

url = "https://api.cleandatapacks.com/v1/orders"
headers = {
    "Authorization": "Bearer ct_live_...",
    "Content-Type": "application/json"
}
payload = {
    "network": "MTN",
    "packageId": "pkg_mtn_5gb",
    "recipientPhone": "0241234567"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
  };

  return (
    <div className="space-y-6">
      {/* Top Cyber Telecom Studio Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#00df82]/15 blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00df82]/30 bg-[#00df82]/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#00df82]">
                <Cpu className="h-3.5 w-3.5 text-[#00df82] animate-pulse" />
                TELECOM GATEWAY TERMINAL · v2.0
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">· REST &amp; Webhooks</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Developer API Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              Programmatic automated telecom fulfillment. Dispatch high-speed non-expiry data directly to MTN, Telecel, and AirtelTigo SIMs via low-latency REST endpoints.
            </p>
          </div>

          {/* Live Endpoint & Auth Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
            <button
              onClick={copyBaseUrl}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3.5 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 hover:border-[#00df82]/40 transition group cursor-pointer"
              title="Click to copy endpoint"
            >
              <Globe className="h-3.5 w-3.5 text-[#00df82]" />
              <span>https://api.cleandatapacks.com/v1</span>
              {copiedUrl ? (
                <Check className="h-3 w-3 text-[#00df82]" />
              ) : (
                <Copy className="h-3 w-3 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300" />
              )}
            </button>
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-[#00df82]/10 border border-[#00df82]/30 px-3 py-2 text-xs font-black text-[#00df82]">
              <span className="h-2 w-2 rounded-full bg-[#00df82] animate-ping" />
              GATEWAY ONLINE
            </div>
          </div>
        </div>
      </div>

      {/* Cyber Station Modular Navigation Dock */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-2 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveTab(item.key);
                  if (typeof window !== "undefined") {
                    const url = new URL(window.location.href);
                    url.searchParams.set("tab", item.key);
                    window.history.replaceState({}, "", url.toString());
                  }
                }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-[#00df82] text-[#041d14] font-black shadow-[0_0_15px_rgba(0,223,130,0.3)]"
                    : "bg-slate-100 dark:bg-[#070d18] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#162740] hover:bg-slate-200 dark:hover:bg-[#111e33]"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isCurrent ? "text-[#041d14]" : "text-[#00df82]"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Spinner className="h-8 w-8 text-[#00df82]" />
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 tracking-wider">CONNECTING TO DEVELOPER GATEWAY...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Application Status Banner */}
              <DeveloperApplicationCard application={appData} onApplied={loadData} />

              {/* KPI Telemetry Strip */}
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4 flex flex-col justify-between shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Requests Today</p>
                  <p className="mt-2 font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                    {metrics.requestsToday?.toLocaleString() || "0"}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">{metrics.requestsMonth?.toLocaleString() || 0} this month</p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4 flex flex-col justify-between shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dispatched Today</p>
                  <p className="mt-2 font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                    {metrics.ordersToday?.toLocaleString() || "0"}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">{metrics.ordersTotal?.toLocaleString() || 0} lifetime</p>
                </div>

                <div className="rounded-2xl border border-[#00df82]/30 bg-white dark:bg-[#0b1322] p-4 flex flex-col justify-between shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Successful (200)</p>
                  <p className="mt-2 font-mono text-xl sm:text-2xl font-black text-[#00df82] tabular-nums">
                    {metrics.successfulRequests?.toLocaleString() || "0"}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-[#00df82]/80">99.9% Reliability</p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4 flex flex-col justify-between shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Errors / Failed</p>
                  <p className="mt-2 font-mono text-xl sm:text-2xl font-black text-rose-500 dark:text-rose-400 tabular-nums">
                    {metrics.failedRequests?.toLocaleString() || "0"}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">Zero USSD drops</p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4 flex flex-col justify-between shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rate Limit</p>
                  <p className="mt-2 font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                    {usageData?.rateLimit || 60}/min
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">Per API Key</p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4 flex flex-col justify-between shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Webhook Health</p>
                  <p className="mt-2 font-mono text-xl sm:text-2xl font-black text-[#00df82] tabular-nums">
                    {metrics.webhookSuccessRate || 100}%
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">Sub-second ping</p>
                </div>
              </div>

              {/* Interactive Code Dispatch Terminal Preview */}
              <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#070d18] p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#162740] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00df82]/10 border border-[#00df82]/30 text-[#00df82]">
                      <Terminal className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">Single-Order Bundle Dispatch Snippet</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Trigger programmatic telecom delivery in 3 lines of code</p>
                    </div>
                  </div>

                  {/* Language Selector */}
                  <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-[#0b1322] p-1 border border-slate-200 dark:border-[#162740]">
                    {(["curl", "js", "python"] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSnippetLanguage(lang)}
                        className={`rounded-lg px-3 py-1 text-xs font-mono font-bold uppercase transition ${
                          snippetLanguage === lang
                            ? "bg-[#00df82] text-[#041d14]"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative rounded-2xl bg-slate-950 p-4 border border-slate-800 dark:border-[#162740] font-mono text-xs overflow-x-auto text-emerald-400 selection:bg-[#00df82]/30">
                  <pre className="leading-relaxed">
                    <code>{sampleSnippets[snippetLanguage]}</code>
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(sampleSnippets[snippetLanguage]);
                      alert("Snippet copied to clipboard!");
                    }}
                    className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 dark:border-[#162740] bg-slate-800 dark:bg-[#0b1322] px-2.5 py-1 text-[11px] font-sans font-bold text-slate-200 hover:border-[#00df82]/40 hover:text-white transition cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                </div>
              </div>

              {/* Recent Activity Sections */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* Recent Requests */}
                <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#162740] pb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Recent API Requests</h3>
                    <button
                      onClick={() => setActiveTab("logs")}
                      className="text-xs font-bold text-[#00df82] hover:underline cursor-pointer"
                    >
                      View Logs →
                    </button>
                  </div>
                  {!usageData?.recentRequests || usageData.recentRequests.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 font-mono">No logged requests yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {usageData.recentRequests.slice(0, 5).map((r: any) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between text-xs font-mono p-2 rounded-xl bg-slate-50 dark:bg-[#070d18] border border-slate-200 dark:border-[#162740]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${
                                r.success
                                  ? "bg-[#00df82]/15 text-[#00df82]"
                                  : "bg-rose-500/15 text-rose-500 dark:text-rose-400"
                              }`}
                            >
                              {r.method} {r.status}
                            </span>
                            <span className="truncate text-slate-700 dark:text-slate-300">{r.endpoint}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-sans">
                            {formatDateTime(r.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Orders */}
                <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#162740] pb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Dispatched via API</h3>
                    <button
                      onClick={() => setActiveTab("orders")}
                      className="text-xs font-bold text-[#00df82] hover:underline cursor-pointer"
                    >
                      View All →
                    </button>
                  </div>
                  {!usageData?.recentOrders || usageData.recentOrders.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 font-mono">No API orders dispatched yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {usageData.recentOrders.slice(0, 5).map((o: any) => (
                        <div
                          key={o.id}
                          className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-[#070d18] border border-slate-200 dark:border-[#162740]"
                        >
                          <div>
                            <p className="font-mono font-bold text-slate-900 dark:text-white">{o.orderId}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {o.network} {o.gbAmount}GB • {o.phoneNumber}
                            </p>
                          </div>
                          <StatusBadge status={o.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Webhook Events */}
                <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#162740] pb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Webhook Deliveries</h3>
                    <button
                      onClick={() => setActiveTab("webhooks")}
                      className="text-xs font-bold text-[#00df82] hover:underline cursor-pointer"
                    >
                      Configure →
                    </button>
                  </div>
                  {!usageData?.recentWebhooks || usageData.recentWebhooks.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 font-mono">No webhook deliveries yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {usageData.recentWebhooks.slice(0, 5).map((w: any) => (
                        <div
                          key={w.id}
                          className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-[#070d18] border border-slate-200 dark:border-[#162740]"
                        >
                          <div>
                            <p className="font-mono font-semibold text-slate-900 dark:text-white">{w.event}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{w.orderId || "Ping test"}</p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              w.status === "SUCCESS"
                                ? "bg-[#00df82]/15 text-[#00df82]"
                                : "bg-rose-500/15 text-rose-500 dark:text-rose-400"
                            }`}
                          >
                            {w.statusCode ? `HTTP ${w.statusCode}` : w.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: API ACCESS */}
          {activeTab === "access" && (
            <div className="space-y-6">
              <DeveloperApplicationCard application={appData} onApplied={loadData} />
            </div>
          )}

          {/* TAB 3: CREDENTIALS */}
          {activeTab === "credentials" && (
            <DeveloperCredentials
              isApprovedForProduction={isApproved}
              applicationStatus={appData?.status || "NOT_APPLIED"}
            />
          )}

          {/* TAB 4: DOCUMENTATION */}
          {activeTab === "docs" && (
            <DeveloperDocs
              onOpenPlayground={(endpointId) => {
                setPlaygroundEndpoint(endpointId);
                setActiveTab("playground");
                if (typeof window !== "undefined") {
                  const u = new URL(window.location.href);
                  u.searchParams.set("tab", "playground");
                  u.searchParams.set("endpoint", endpointId);
                  window.history.replaceState({}, "", u.toString());
                }
              }}
            />
          )}

          {/* TAB 5: PLAYGROUND */}
          {activeTab === "playground" && (
            <DeveloperPlayground initialEndpointId={playgroundEndpoint} />
          )}

          {/* TAB 6: ORDERS */}
          {activeTab === "orders" && <DeveloperOrdersPanel />}

          {/* TAB 7: WEBHOOKS */}
          {activeTab === "webhooks" && <DeveloperWebhooksPanel />}

          {/* TAB 8: LOGS */}
          {activeTab === "logs" && <DeveloperLogsPanel />}

          {/* TAB 9: USAGE */}
          {activeTab === "usage" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                  title="Total API Requests"
                  value={
                    ((metrics.successfulRequests || 0) + (metrics.failedRequests || 0)).toLocaleString()
                  }
                />
                <StatCard
                  title="Requests (Month)"
                  value={metrics.requestsMonth?.toLocaleString() || "0"}
                />
                <StatCard
                  title="Orders Completed"
                  value={metrics.ordersCompleted?.toLocaleString() || "0"}
                />
                <StatCard
                  title="Webhook Reliability"
                  value={`${metrics.webhookSuccessRate || 100}%`}
                />
              </div>
              <DeveloperLogsPanel />
            </div>
          )}

          {/* TAB 10: SETTINGS */}
          {activeTab === "settings" && (
            <DeveloperSettingsPanel
              application={appData}
              onNavigateTab={(tab: string) => {
                setActiveTab(tab as TabKey);
                if (typeof window !== "undefined") {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", tab);
                  window.history.replaceState({}, "", url.toString());
                }
              }}
            />
          )}

          {/* TAB 11: STATUS */}
          {activeTab === "status" && <DeveloperStatusPanel />}
        </>
      )}
    </div>
  );
}

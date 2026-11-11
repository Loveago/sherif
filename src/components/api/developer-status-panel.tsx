"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Activity, Radio, Server, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/shared";

export function DeveloperStatusPanel() {
  const [statusData, setStatusData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/v1/status");
      const json = await res.json();
      if (json.success && json.data) {
        setStatusData(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-[#00df82]" />
      </div>
    );
  }

  const components = statusData?.components || {};

  const getStatusIcon = (status: string) => {
    if (status === "OPERATIONAL") return <CheckCircle2 className="h-5 w-5 text-[#00df82]" />;
    if (status === "DEGRADED" || status === "MAINTENANCE") return <AlertTriangle className="h-5 w-5 text-amber-400" />;
    return <XCircle className="h-5 w-5 text-red-400" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === "OPERATIONAL") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00df82]/30 bg-[#00df82]/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#00df82]">
          <span className="h-2 w-2 rounded-full bg-[#00df82] animate-pulse" /> Operational
        </span>
      );
    }
    if (status === "MAINTENANCE") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-400">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Maintenance
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-red-400">
        <span className="h-2 w-2 rounded-full bg-red-400" /> Degraded
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-[#00df82]/30 bg-[#00df82]/10 p-2.5 text-[#00df82]">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">Carrier Telemetry &amp; System Health</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Live operational health across carrier baseband gateways, order ingestion pipelines, and auth services.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={load}
          className="gap-2 border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#00df82]/40 hover:text-[#00df82]"
        >
          <RefreshCw className="h-3.5 w-3.5 text-[#00df82]" /> Polling Status
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(components).map(([key, comp]: [string, any]) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 shadow-lg transition-all duration-200 hover:border-slate-300 dark:hover:border-[#162740]/80"
          >
            <div className="flex items-center gap-3.5">
              <div className="rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] p-2.5">
                {getStatusIcon(comp.status)}
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{comp.name}</p>
                <p className="text-[10px] uppercase tracking-wider font-mono text-slate-500">ID: {key}</p>
              </div>
            </div>
            <div>{getStatusBadge(comp.status)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

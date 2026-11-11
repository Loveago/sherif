"use client";

import * as React from "react";
import { Settings, Shield, Sliders, Lock, Key, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

interface DeveloperSettingsProps {
  application: any | null;
  onNavigateTab: (tab: string) => void;
}

export function DeveloperSettingsPanel({ application, onNavigateTab }: DeveloperSettingsProps) {
  const isApproved = application?.status === "APPROVED";

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-[#162740] pb-4">
          <div className="rounded-2xl bg-[#00df82]/10 border border-[#00df82]/30 p-2.5 text-[#00df82]">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Developer API Settings &amp; Gateway Quotas</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Overview of authorized telecom scopes, production rate limits, and environment policies.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50/70 dark:bg-[#070d18] p-4.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Access Status</span>
              <StatusBadge status={application?.status || "NOT_APPLIED"} />
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              {isApproved
                ? "Your account is authorized to issue live production requests to carrier gateways."
                : "Submit or await review of your developer access application."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50/70 dark:bg-[#070d18] p-4.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rate Limit</span>
              <span className="font-mono text-xs font-black text-cyan-600 dark:text-cyan-400">
                {application?.rateLimitPerMin || 60} req/min
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              Applies across active API keys. Requests exceeding this threshold receive HTTP 429.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50/70 dark:bg-[#070d18] p-4.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Daily Order Quota</span>
              <span className="font-mono text-xs font-black text-emerald-600 dark:text-[#00df82]">
                {(application?.dailyRequestLimit || 5000).toLocaleString()} req/day
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              Standard daily throughput cap. Contact administration to request custom wholesale limits.
            </p>
          </div>
        </div>

        {/* Granted Scopes */}
        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50/70 dark:bg-[#070d18] p-5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#00df82]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Assigned Security Scopes
            </h4>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(application?.allowedScopes || "networks:read,packages:read,orders:create,orders:read,orders:status,balance:read,webhooks:read,webhooks:manage,numbers:verify")
              .split(",")
              .map((s: string) => (
                <span
                  key={s.trim()}
                  className="rounded-lg bg-white dark:bg-[#0b1322] border border-slate-200 dark:border-[#162740] px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300"
                >
                  {s.trim()}
                </span>
              ))}
          </div>
        </div>

        {/* IP Restrictions */}
        <div className="mt-4 rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50/70 dark:bg-[#070d18] p-5">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Server IP Whitelist
            </h4>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            {application?.ipRestrictions
              ? `Restricted to originating IP addresses: ${application.ipRestrictions}`
              : "No IP restrictions currently enforced. Any server bearing your secret key can submit requests."}
          </p>
        </div>

        {/* Quick links */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 dark:border-[#162740] pt-5">
          <button
            onClick={() => onNavigateTab("credentials")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-[#00df82]/40"
          >
            <Key className="h-3.5 w-3.5 text-[#00df82]" /> Manage API Keys
          </button>
          <button
            onClick={() => onNavigateTab("webhooks")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-[#00df82]/40"
          >
            Configure Webhook URL
          </button>
          <button
            onClick={() => onNavigateTab("docs")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-[#00df82]/40"
          >
            <ExternalLink className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" /> Read Documentation
          </button>
        </div>
      </div>
    </div>
  );
}

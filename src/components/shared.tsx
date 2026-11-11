import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  className,
}: {
  title: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-[#162740] dark:bg-[#0b1322] dark:shadow-none",
        className
      )}
    >
      {/* Subtle top accent neon line */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#00df82]/60 via-[#00f58f]/40 to-[#00df82]/20 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="mt-2 break-all text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
            {value}
          </div>
          {hint && (
            <div className="mt-2 flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {hint}
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#00df82]/20 bg-[#00df82]/10 text-[#00df82] group-hover:scale-105 transition-transform">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center rounded-3xl border border-dashed border-slate-200/80 bg-white/40 p-6 dark:border-white/10 dark:bg-white/[0.02]">
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <p className="text-base font-bold text-slate-900 dark:text-white">{title}</p>
      {description && (
        <p className="max-w-sm text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pb-1">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
    </div>
  );
}

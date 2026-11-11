import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warning" | "danger" | "info" | "muted" | "brand";

const variants: Record<Variant, string> = {
  default:
    "bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-white/5 dark:text-slate-300 dark:border-white/10",
  success:
    "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300 dark:bg-emerald-500/15 dark:border-emerald-500/30",
  warning:
    "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300 dark:bg-amber-500/15 dark:border-amber-500/30",
  danger:
    "bg-red-500/10 text-red-700 border-red-500/25 dark:text-red-300 dark:bg-red-500/15 dark:border-red-500/30",
  info:
    "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-300 dark:bg-blue-500/15 dark:border-blue-500/30",
  muted:
    "bg-slate-100/80 text-slate-600 border-slate-200/60 dark:bg-white/[0.04] dark:text-slate-400 dark:border-white/10",
  brand:
    "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300 dark:bg-emerald-500/15 dark:border-emerald-500/30",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-tight shadow-2xs transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

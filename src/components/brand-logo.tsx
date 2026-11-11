"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BrandProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  href?: string;
  variant?: "default" | "dark" | "light";
  taglineClassName?: string;
}

/**
 * CleanDataPacks Brand Mark
 * Sleek emerald/cyan data-wave shield badge with crisp "CD" signal monogram.
 */
export function BrandMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "default" | "dark" | "light";
}) {
  const sizeMap = {
    xs: "h-6 w-6",
    sm: "h-8 w-8 sm:h-9 sm:w-9",
    md: "h-9 w-9 sm:h-10 sm:w-10",
    lg: "h-11 w-11 sm:h-12 sm:w-12",
    xl: "h-14 w-14 sm:h-16 sm:w-16",
  };

  const sizePixels = {
    xs: 24,
    sm: 34,
    md: 38,
    lg: 46,
    xl: 60,
  };

  const px = sizePixels[size];

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center transition-transform hover:scale-105 active:scale-95",
        sizeMap[size],
        className
      )}
      style={{ width: px, height: px, maxWidth: "100%" }}
      aria-label="CleanDataPacks"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        width={px}
        height={px}
        style={{ width: px, height: px, maxWidth: "100%" }}
      >
        <defs>
          <radialGradient id="cdpBgGrad" cx="50%" cy="45%" r="58%">
            <stop offset="0%" stopColor="#12263a" />
            <stop offset="60%" stopColor="#0b1524" />
            <stop offset="100%" stopColor="#060c16" />
          </radialGradient>
          <linearGradient id="cdpAccentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00df82" />
            <stop offset="55%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
          <linearGradient id="cdpRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00df82" stopOpacity={0.75} />
            <stop offset="50%" stopColor="#1e293b" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.75} />
          </linearGradient>
        </defs>

        <rect width="100" height="100" rx="24" fill="url(#cdpBgGrad)" />
        <rect x="1.5" y="1.5" width="97" height="97" rx="22.5" stroke="url(#cdpRimGrad)" strokeWidth="1.5" />

        {/* Faceted C Arc */}
        <path
          d="M 60 24 L 38 24 C 28 24 22 30 22 40 L 22 60 C 22 70 28 76 38 76 L 60 76"
          stroke="url(#cdpAccentGrad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Central Data Bolt / Signal Nodes */}
        <path
          d="M 55 37 L 44 52 H 55 L 49 65 L 68 47 H 56 L 62 37 Z"
          fill="#ffffff"
        />
        <circle cx="72" cy="28" r="4.5" fill="#00df82" />
        <circle cx="72" cy="72" r="4.5" fill="#38bdf8" />
      </svg>
    </div>
  );
}

/**
 * Full Horizontal Brand Logo (Mark + "CleanDataPacks" + Tagline)
 */
export function BrandLogo({
  className,
  size = "md",
  showTagline = true,
  href,
  taglineClassName,
}: BrandProps) {
  const textSize =
    size === "xl"
      ? "text-2xl sm:text-3xl"
      : size === "lg"
      ? "text-xl sm:text-2xl"
      : size === "md"
      ? "text-lg sm:text-xl"
      : size === "xs"
      ? "text-xs sm:text-sm"
      : "text-lg sm:text-xl";

  const taglineSize =
    size === "xl"
      ? "text-[10.5px]"
      : size === "lg"
      ? "text-[9.5px]"
      : size === "md"
      ? "text-[8.5px]"
      : size === "xs"
      ? "text-[6.5px]"
      : "text-[6.5px] sm:text-[8px]";

  const content = (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-2 sm:gap-3 select-none",
        className
      )}
    >
      <BrandMark size={size} />
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center leading-none">
          <span className={cn("font-black tracking-[-0.035em] text-slate-900 dark:text-white", textSize)}>
            CleanData
          </span>
          <span
            className={cn(
              "ml-0.5 font-black tracking-[-0.035em] bg-gradient-to-r from-[#00df82] via-cyan-400 to-sky-500 bg-clip-text text-transparent",
              textSize
            )}
          >
            Packs
          </span>
        </div>
        {showTagline && (
          <span
            className={cn(
              "mt-0.5 font-bold uppercase tracking-[0.08em] sm:tracking-[0.14em] text-emerald-600 dark:text-[#00df82] block truncate max-w-[140px] xs:max-w-[170px] sm:max-w-none leading-none",
              taglineSize,
              taglineClassName
            )}
          >
            GHANA DATA HUB
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex transition-transform hover:scale-[1.02] active:scale-[0.98]">
        {content}
      </Link>
    );
  }

  return content;
}

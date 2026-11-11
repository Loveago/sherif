"use client";

import Link from "next/link";
import { NetworkLogo } from "./network-logo";
import { NETWORK_BRANDS, networkHref, storeHref } from "./brands";
import type { NetworkProvider } from "@/lib/types";

/**
 * Modern circular telecom network logo carousel. The orbit rotates smoothly via
 * CSS while each carrier badge counter-rotates to stay upright. Badges are clickable
 * links directly into each network's bundle page. Pauses on hover and respects
 * prefers-reduced-motion.
 */
export function NetworkWheel({
  slug,
  storeName,
  networks,
}: {
  slug: string;
  storeName: string;
  networks: NetworkProvider[];
}) {
  const count = networks.length;
  if (count === 0) return null;

  return (
    <div className="wheel-wrap relative mx-auto aspect-square w-[88%] max-w-[320px] md:w-full md:max-w-md">
      {/* Decorative pulse rings */}
      <div className="pointer-events-none absolute inset-0 rounded-full border border-emerald-500/30 dark:border-emerald-400/25 shadow-lg shadow-emerald-500/5" />
      <div className="pointer-events-none absolute inset-8 rounded-full border border-dashed border-teal-500/35 dark:border-teal-400/20" />
      <div className="pointer-events-none absolute inset-16 rounded-full border border-slate-300/50 dark:border-white/10" />

      {/* Rotating orbit of clickable carrier nodes */}
      <div className="wheel-spin pointer-events-none absolute inset-4 md:inset-5">
        {networks.map((network, i) => {
          const angle = (360 / count) * i;
          return (
            <div
              key={network}
              className="pointer-events-none absolute inset-0"
              style={{ transform: `rotate(${angle}deg)` }}
            >
              <Link
                href={networkHref(slug, network)}
                aria-label={`Shop ${NETWORK_BRANDS[network].label} bundles`}
                className="pointer-events-auto absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
              >
                <span
                  className="block"
                  style={{ transform: `rotate(${-angle}deg)` }}
                >
                  <span className="wheel-counter block">
                    <span
                      className={`block h-12 w-12 md:h-14 md:w-14 overflow-hidden rounded-2xl shadow-xl ring-2 ring-white/80 dark:ring-slate-800 transition-all hover:scale-115 hover:shadow-emerald-500/20 ${NETWORK_BRANDS[network].tile}`}
                    >
                      <NetworkLogo network={network} className="h-full w-full" />
                    </span>
                  </span>
                </span>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Center Store Brand Hub */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Link
          href={storeHref(slug)}
          className="pointer-events-auto flex flex-col items-center gap-1 rounded-3xl bg-white/90 px-8 py-5 text-center shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-xl transition-transform hover:scale-105 dark:bg-[#0b1322]/90 dark:ring-[#162740] md:px-10 md:py-7"
        >
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-base text-slate-900 dark:text-white md:text-xl truncate max-w-[180px]">
              {storeName}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 md:text-xs">
            Tap a carrier to shop
          </span>
        </Link>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';

export interface LogoProps {
  variant?: 'mark' | 'full' | 'compact';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  badgeText?: string;
  subline?: string;
  linkTo?: string;
  className?: string;
}

const sizeConfig = {
  xs: {
    mark: 'h-6 w-6',
    icon: 24,
    text: 'text-xs',
    sub: 'text-[8px]',
    gap: 'gap-1.5',
  },
  sm: {
    mark: 'h-8 w-8',
    icon: 32,
    text: 'text-sm',
    sub: 'text-[9px]',
    gap: 'gap-2',
  },
  md: {
    mark: 'h-9 w-9',
    icon: 36,
    text: 'text-base',
    sub: 'text-[10px]',
    gap: 'gap-2.5',
  },
  lg: {
    mark: 'h-11 w-11',
    icon: 44,
    text: 'text-lg',
    sub: 'text-[11px]',
    gap: 'gap-3',
  },
  xl: {
    mark: 'h-14 w-14',
    icon: 56,
    text: 'text-2xl',
    sub: 'text-xs',
    gap: 'gap-3.5',
  },
};

export function LogoMark({ size = 'md', className = '' }: { size?: LogoProps['size']; className?: string }) {
  const cfg = sizeConfig[size || 'md'];

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 p-[1.5px] shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/35 transition-all duration-300 ${cfg.mark} ${className}`}
    >
      {/* Inner card surface */}
      <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#090d16]/95 backdrop-blur-md overflow-hidden">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          className="h-full w-full p-1"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logo-c-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="60%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="logo-bolt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {/* Stylized "C" Arc */}
          <path
            d="M22.5 8.5H12C9.5 8.5 7.5 10.5 7.5 13V19C7.5 21.5 9.5 23.5 12 23.5H22.5"
            stroke="url(#logo-c-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* High-speed lightning surge */}
          <path
            d="M18.5 5.5L10 16.5H16L13.5 26.5L23.5 14.5H17.5L20 5.5H18.5Z"
            fill="url(#logo-bolt-grad)"
          />

          {/* Carrier Nodes */}
          <circle cx="23.5" cy="8.5" r="1.5" fill="#f59e0b" />
          <circle cx="23.5" cy="23.5" r="1.5" fill="#10b981" />
        </svg>
      </div>
    </div>
  );
}

export function Logo({
  variant = 'full',
  size = 'md',
  showBadge = true,
  badgeText = 'GHANA',
  subline,
  linkTo,
  className = '',
}: LogoProps) {
  const cfg = sizeConfig[size || 'md'];

  const content = (
    <div className={`group inline-flex items-center ${cfg.gap} select-none ${className}`}>
      <LogoMark size={size} />

      {variant !== 'mark' && (
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-extrabold tracking-tight text-white ${cfg.text}`}>
              CheapData<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">Packs</span>
            </span>

            {showBadge && (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse mr-0.5" />
                {badgeText}
              </span>
            )}
          </div>

          {subline && (
            <p className={`font-semibold uppercase tracking-wider text-slate-400 ${cfg.sub}`}>
              {subline}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="inline-flex items-center transition-opacity hover:opacity-95">
        {content}
      </Link>
    );
  }

  return content;
}

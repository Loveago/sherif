'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';

interface PoweredByProps {
  className?: string;
  variant?: 'light' | 'dark' | 'auto';
}

export function PoweredBy({ className = '', variant = 'auto' }: PoweredByProps) {
  const whatsappUrl = 'https://wa.me/233507904981?text=Hello%20Crazy%20Tech%20Enterprise';

  const colorStyles =
    variant === 'light'
      ? 'border-slate-200/80 bg-slate-50/80 text-slate-600 hover:text-slate-900 hover:border-emerald-300 hover:bg-emerald-50/50 shadow-sm'
      : variant === 'dark'
      ? 'border-white/10 bg-white/[0.03] text-gray-400 hover:text-white hover:border-emerald-500/40 hover:bg-emerald-500/[0.06]'
      : 'border-gray-200/60 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.03] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-emerald-400/50';

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Powered by Crazy Tech Enterprise - Contact on WhatsApp"
        className={`group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur-sm transition-all duration-200 ${colorStyles}`}
      >
        <span className="opacity-70">Powered by</span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline">
          Crazy Tech Enterprise
        </span>
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-200">
          <MessageCircle className="h-2.5 w-2.5" />
        </span>
      </a>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Gift, ArrowRight, Sparkles } from 'lucide-react';

export function ReferEarnCard() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-gray-800/60 bg-gradient-to-br from-[#111827] to-[#0d1321] p-5 animate-slide-up animate-slide-up-delay-4"
    >
      <div className="absolute -left-6 -bottom-6 h-28 w-28 rounded-full bg-violet-600/10 blur-[40px]" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/30 to-violet-800/20">
          <Gift className="h-7 w-7 text-violet-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Refer & Earn</h3>
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-400">
            Invite your friends and earn exciting rewards!
          </p>
        </div>
        <Link href="/referrals">
          <button className="flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:bg-violet-500 active:scale-95">
            Invite Now
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </Link>
      </div>
    </div>
  );
}

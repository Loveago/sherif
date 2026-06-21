'use client';

import Link from 'next/link';
import { Gift, ArrowRight, Sparkles } from 'lucide-react';

export function ReferEarnCard() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-gray-800/60 bg-gradient-to-br from-[#111827] to-[#0d1321] p-5 animate-slide-up animate-slide-up-delay-4"
    >
      <div
        className="absolute -left-6 -bottom-6 h-28 w-28 rounded-full blur-[40px]"
        style={{ backgroundColor: 'var(--color-primary-soft)' }}
      />
      <div className="relative flex items-center gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
          style={{
            background:
              'radial-gradient(circle at 0% 0%, var(--color-primary-soft), transparent 55%), radial-gradient(circle at 100% 100%, rgba(15,23,42,0.9), rgba(15,23,42,0.95))',
          }}
        >
          <Gift className="h-7 w-7" style={{ color: 'var(--color-accent)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Refer & Earn</h3>
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-400">
            Invite your friends and earn exciting rewards!
          </p>
        </div>
        <Link
          href="/referrals"
          className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
            boxShadow: '0 14px 35px rgba(15,23,42,0.9)',
          }}
        >
          Invite Now
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

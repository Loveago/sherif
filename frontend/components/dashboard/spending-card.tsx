'use client';

import { Wallet, TrendingUp } from 'lucide-react';

export function SpendingCard({ value, change }: { value: string; change: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-gray-800/60 bg-gradient-to-br from-[#111827] to-[#0d1321] p-5 glow-spending animate-slide-up animate-slide-up-delay-2"
    >
      <div
        className="absolute -right-6 -top-6 h-28 w-28 rounded-full blur-[40px]"
        style={{ backgroundColor: 'var(--color-primary-soft)' }}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400">Total Spending</p>
          <h3 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">{value}</h3>
          <div className="mt-2 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <p className="text-xs font-semibold text-emerald-400">{change}</p>
            <span className="text-[10px] text-gray-500">from last month</span>
          </div>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'var(--color-primary-soft)' }}
        >
          <Wallet className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
        </div>
      </div>
    </div>
  );
}

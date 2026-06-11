'use client';

import Link from 'next/link';
import { Wallet } from 'lucide-react';

export function WalletBalanceCard({ balance }: { balance: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#131c31] to-[#0d1321] p-5 sm:p-6 glow-ambient animate-slide-up"
    >
      {/* Ambient background glow */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-600/15 blur-[60px]" />
      <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-violet-500/10 blur-[50px]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMC41IiBmaWxsPSJyZ2JhKDEyNCw1OCwyMzcsMC4wNSkiLz48L3N2Zz4=')] opacity-50" />

      <div className="relative flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-400">Wallet Balance</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            GHS {balance.toFixed(2)}
          </h2>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Available Balance
          </div>
          <Link href="/wallet" className="mt-5 inline-flex">
            <button className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:bg-violet-500 hover:shadow-violet-600/40 active:scale-95">
              <Wallet className="h-4 w-4" />
              + Fund Wallet
            </button>
          </Link>
        </div>

        {/* Wallet illustration */}
        <div className="relative hidden shrink-0 sm:block">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/30 to-violet-800/20">
            <Wallet className="h-10 w-10 text-violet-300" />
            <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white shadow-lg shadow-violet-500/40">
              ₵
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

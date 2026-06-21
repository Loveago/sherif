'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export function WalletBalanceCard() {
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    setMounted(true);
  }, []);

  const rawBalance = user?.wallet?.availableBalance;
  const balance = mounted ? Number(rawBalance ?? 0) : 0;

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#131c31] to-[#0d1321] p-5 sm:p-6 glow-ambient animate-slide-up"
    >
      {/* Ambient background glow */}
      <div
        className="absolute -right-10 -top-10 h-40 w-40 rounded-full blur-[60px]"
        style={{ backgroundColor: 'var(--color-primary-soft)' }}
      />
      <div
        className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full blur-[50px]"
        style={{ backgroundColor: 'var(--color-primary-soft)' }}
      />
      <div className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-primary-soft) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

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
          <Link
            href="/wallet"
            className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              boxShadow: '0 18px 45px rgba(15,23,42,0.9)',
            }}
          >
            <Wallet className="h-4 w-4" />
            + Fund Wallet
          </Link>
        </div>

        {/* Wallet illustration */}
        <div className="relative hidden shrink-0 sm:block">
          <div
            className="relative flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{
              background:
                'radial-gradient(circle at 0% 0%, var(--color-primary-soft), transparent 60%), radial-gradient(circle at 100% 100%, rgba(15,23,42,0.9), rgba(15,23,42,0.95))',
            }}
          >
            <Wallet className="h-10 w-10 text-[color:var(--color-accent)]" />
            <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full nav-badge text-[10px] font-bold shadow-lg">
              ₵
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

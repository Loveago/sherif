'use client';

import Link from 'next/link';
import { ShoppingBag, Wallet, CreditCard, Package, Smartphone, ArrowUpRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

const actions = [
  { label: 'Buy Data', description: 'Instant bundle top-up', icon: ShoppingBag, href: '/buy-data', color: 'bg-violet-600/20 text-violet-400 border-violet-500/20' },
  { label: 'Send & Claim', description: 'MoMo direct instant credit', icon: Smartphone, href: '/wallet?tab=send-claim', color: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/20' },
  { label: 'Fund Wallet', description: 'Paystack card & MoMo checkout', icon: Wallet, href: '/wallet', color: 'bg-cyan-600/20 text-cyan-400 border-cyan-500/20' },
  { label: 'Bulk Orders', description: 'Upload multiple recipients', icon: CreditCard, href: '/bulk-orders', color: 'bg-amber-600/20 text-amber-400 border-amber-500/20' },
  { label: 'My Orders', description: 'Track & download receipts', icon: Package, href: '/orders', color: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/20' },
];

export function QuickActionsCard() {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between pb-1">
        <h3 className="text-base font-bold text-white tracking-tight">Quick Actions</h3>
        <span className="text-[11px] font-semibold text-slate-400">Shortcuts</span>
      </div>
      <div className="mt-3.5 space-y-2.5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 transition-all hover:border-white/[0.15] hover:bg-white/[0.05] hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${action.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white group-hover:text-violet-300 transition-colors">{action.label}</p>
                  <p className="text-[11px] text-slate-400">{action.description}</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </div>
    </GlassCard>
  );
}

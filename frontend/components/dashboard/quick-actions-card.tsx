'use client';

import Link from 'next/link';
import { ShoppingBag, Wallet, CreditCard, Package } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

const actions = [
  { label: 'Buy Data', description: 'Purchase data bundles', icon: ShoppingBag, href: '/buy-data', color: 'bg-violet-600/20 text-violet-400' },
  { label: 'Fund Wallet', description: 'Add money to wallet', icon: Wallet, href: '/wallet', color: 'bg-emerald-600/20 text-emerald-400' },
  { label: 'Bulk Data', description: 'Upload & purchase in bulk', icon: CreditCard, href: '/bulk-orders', color: 'bg-sky-600/20 text-sky-400' },
  { label: 'My Orders', description: 'Track your orders', icon: Package, href: '/orders', color: 'bg-amber-600/20 text-amber-400' },
];

export function QuickActionsCard() {
  return (
    <GlassCard className="p-5">
      <h3 className="text-base font-semibold text-white">Quick Actions</h3>
      <div className="mt-4 space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3 transition-colors hover:border-gray-700 hover:bg-gray-800/50"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{action.label}</p>
                <p className="text-xs text-gray-500">{action.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </GlassCard>
  );
}

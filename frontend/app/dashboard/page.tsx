'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { WalletBalanceCard } from '@/components/dashboard/wallet-balance-card';
import { OverviewStats } from '@/components/dashboard/overview-stats';
import { SpendingCard } from '@/components/dashboard/spending-card';
import { SpendingChart } from '@/components/dashboard/spending-chart';
import { ReferEarnCard } from '@/components/dashboard/refer-earn-card';
import { TransactionList } from '@/components/dashboard/transaction-list';
import { QuickActionsCard } from '@/components/dashboard/quick-actions-card';
import { DonutChartCard } from '@/components/charts/donut-chart-card';
import { BarChart3 } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import type { DashboardResponse } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { LoadingState } from '@/components/loaders/loading-state';

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiRequest<DashboardResponse>('/dashboard'),
    // Refresh while recent orders may still be settling at providers
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  return (
    <AuthGuard>
      <DashboardShell title="Dashboard" description="">
        <LoadingState isLoading={isLoading} error={error} skeleton="grid">
          {data ? <DashboardContent data={data} router={router} /> : null}
        </LoadingState>
      </DashboardShell>
    </AuthGuard>
  );
}

function DashboardContent({ data, router }: { data: any; router: any }) {

  const metrics = data.metrics ?? {};
  const stats = [
    { label: 'Total Orders', value: String(metrics.totalOrders ?? 0), change: '+18.5%', icon: 'orders' as const },
    { label: 'Successful Orders', value: String(metrics.successfulOrders ?? 0), change: '+16.2%', icon: 'success' as const },
    { label: 'Pending Orders', value: String(metrics.pendingOrders ?? 0), change: '-4.3%', icon: 'pending' as const },
    { label: 'Failed Orders', value: String(metrics.failedOrders ?? 0), change: '-2.1%', icon: 'failed' as const },
  ];

  const revenueSeries = data.revenueSeries ?? [];
  const orders = data.orders ?? [];
  const networkUsage = data.networkUsage ?? [];

  return (
    <div className="mx-auto max-w-xl lg:max-w-none space-y-5">
      {/* Wallet Balance */}
      <div className="animate-fade-in">
        <WalletBalanceCard />
      </div>

      {/* Mobile Quick Action Shortcuts (visible on sm/mobile) */}
      <div className="lg:hidden grid grid-cols-2 sm:grid-cols-4 gap-2.5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <button
          onClick={() => router.push('/buy-data')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] transition-all active:scale-95"
        >
          <div className="h-9 w-9 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center mb-1.5">
            <span className="text-base font-bold">⚡</span>
          </div>
          <span className="text-xs font-semibold text-white">Buy Data</span>
          <span className="text-[10px] text-slate-400">Instant bundles</span>
        </button>

        <button
          onClick={() => router.push('/wallet?tab=send-claim')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all active:scale-95"
        >
          <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1.5">
            <span className="text-base font-bold">📲</span>
          </div>
          <span className="text-xs font-semibold text-emerald-300">Send &amp; Claim</span>
          <span className="text-[10px] text-emerald-200/70">MoMo credit</span>
        </button>

        <button
          onClick={() => router.push('/wallet')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] transition-all active:scale-95"
        >
          <div className="h-9 w-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-1.5">
            <span className="text-base font-bold">💳</span>
          </div>
          <span className="text-xs font-semibold text-white">Fund Wallet</span>
          <span className="text-[10px] text-slate-400">Paystack top-up</span>
        </button>

        <button
          onClick={() => router.push('/orders')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] transition-all active:scale-95"
        >
          <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-1.5">
            <span className="text-base font-bold">📦</span>
          </div>
          <span className="text-xs font-semibold text-white">My Orders</span>
          <span className="text-[10px] text-slate-400">History &amp; status</span>
        </button>
      </div>

      {/* Overview Section Header */}
      <div className="flex items-center justify-between pt-1 animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">Overview &amp; Statistics</h2>
        </div>
        <select defaultValue="This Month" className="rounded-lg border border-white/[0.08] bg-slate-900/80 px-2.5 py-1 text-[11px] text-gray-300 outline-none">
          <option>This Month</option>
          <option>Last Month</option>
          <option>This Year</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <OverviewStats stats={stats} />
      </div>

      {/* Spending Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <SpendingCard value={formatCurrency(metrics.totalSpending ?? 0)} change="+22.4%" />
        </div>
        <div className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '0.35s' }}>
          <SpendingChart data={revenueSeries} dataKey="revenue" />
        </div>
      </div>

      {/* Refer & Earn */}
      <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <ReferEarnCard />
      </div>

      {/* Transactions & Network Activity (Visible on mobile & desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr_0.6fr] gap-4">
        <div className="animate-fade-in" style={{ animationDelay: '0.45s' }}>
          <TransactionList
            title="Recent Transactions"
            orders={orders}
            onViewAll={() => router.push('/orders')}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <DonutChartCard
            title="Network Distribution"
            data={networkUsage.map((entry: any) => ({
              label: entry.networkCode,
              count: entry.orders,
            }))}
          />
        </div>
        <div className="hidden lg:block animate-fade-in" style={{ animationDelay: '0.55s' }}>
          <QuickActionsCard />
        </div>
      </div>
    </div>
  );
}

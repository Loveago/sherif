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

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiRequest<DashboardResponse>('/dashboard'),
  });

  if (isLoading || !data) {
    return (
      <AuthGuard>
        <DashboardShell title="Dashboard" description="Loading...">
          <div className="flex items-center justify-center py-20 text-gray-400">Loading dashboard...</div>
        </DashboardShell>
      </AuthGuard>
    );
  }

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
    <AuthGuard>
      <DashboardShell title="Dashboard" description="">
        <div className="mx-auto max-w-xl lg:max-w-none space-y-4">
          {/* Wallet Balance */}
          <WalletBalanceCard balance={metrics.walletBalance ?? 0} />

          {/* Overview Section Header */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-bold text-white">Overview</h2>
            </div>
            <select defaultValue="This Month" className="rounded-lg border border-gray-700/60 bg-gray-900/80 px-2.5 py-1 text-[11px] text-gray-300 outline-none">
              <option>This Month</option>
              <option>Last Month</option>
              <option>This Year</option>
            </select>
          </div>

          {/* Stats Grid */}
          <OverviewStats stats={stats} />

          {/* Total Spending */}
          <SpendingCard value={formatCurrency(metrics.totalSpending ?? 0)} change="+22.4%" />

          {/* Spending Chart */}
          <SpendingChart data={revenueSeries} dataKey="revenue" />

          {/* Refer & Earn */}
          <ReferEarnCard />

          {/* Desktop extras */}
          <div className="hidden lg:grid lg:grid-cols-[1fr_0.8fr_0.5fr] lg:gap-4">
            <TransactionList
              title="Recent Transactions"
              orders={orders}
              onViewAll={() => router.push('/orders')}
            />
            <DonutChartCard
              title="Top Networks"
              data={networkUsage.map((entry) => ({
                label: entry.networkCode,
                count: entry.orders,
              }))}
            />
            <QuickActionsCard />
          </div>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { MetricCard } from '@/components/dashboard/metric-card';
import { LineChartCard } from '@/components/charts/line-chart-card';
import { DonutChartCard } from '@/components/charts/donut-chart-card';
import { TransactionList } from '@/components/dashboard/transaction-list';
import { QuickActionsCard } from '@/components/dashboard/quick-actions-card';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

  return (
    <AuthGuard>
      <DashboardShell title="Dashboard" description="">
        {/* Metrics Row - 5 cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Total Orders"
            value={String(data.metrics.totalOrders)}
            change="+18.5%"
            tone="violet"
          />
          <MetricCard
            label="Successful Orders"
            value={String(data.metrics.successfulOrders)}
            change="+16.2%"
            tone="emerald"
          />
          <MetricCard
            label="Pending Orders"
            value={String(data.metrics.pendingOrders)}
            change="-4.3%"
            tone="amber"
          />
          <MetricCard
            label="Failed Orders"
            value={String(data.metrics.failedOrders)}
            change="-2.1%"
            tone="rose"
          />
          <MetricCard
            label="Total Spending"
            value={formatCurrency(data.metrics.totalSpending)}
            change="+22.4%"
            tone="sky"
          />
        </div>

        {/* Charts + Transactions + Quick Actions Row */}
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.6fr]">
          <LineChartCard
            title="Spending Overview"
            value={formatCurrency(data.metrics.totalSpending)}
            data={data.revenueSeries}
            dataKey="revenue"
          />
          <TransactionList
            title="Recent Transactions"
            orders={data.orders}
            onViewAll={() => router.push('/orders')}
          />
          <QuickActionsCard />
        </div>

        {/* Top Networks + Announcements Row */}
        <div className="mt-4 grid gap-4 xl:grid-cols-[0.6fr_1fr]">
          <DonutChartCard
            title="Top Networks"
            data={data.networkUsage.map((entry) => ({
              label: entry.networkCode,
              count: entry.orders,
            }))}
          />
          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Announcements</h3>
              <button className="text-sm text-violet-400 hover:text-violet-300">View All</button>
            </div>
            <div className="mt-4 space-y-3">
              {data.announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="rounded-xl border border-gray-800 bg-gray-900/50 p-4"
                >
                  <div className="flex items-center gap-2">
                    {announcement.pinned && (
                      <span className="rounded-full bg-violet-600/20 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                        New
                      </span>
                    )}
                    <p className="text-sm font-medium text-white">{announcement.title}</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">{announcement.content}</p>
                  <Button size="sm" variant="outline" className="mt-3">
                    View Details
                  </Button>
                </div>
              ))}
              {data.announcements.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-500">No announcements</p>
              )}
            </div>
          </GlassCard>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}

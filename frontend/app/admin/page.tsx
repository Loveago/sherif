'use client';

import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { MetricCard } from '@/components/dashboard/metric-card';
import { LineChartCard } from '@/components/charts/line-chart-card';
import { BarChartCard } from '@/components/charts/bar-chart-card';
import { DataTableCard } from '@/components/dashboard/data-table-card';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import type { AdminDashboardResponse } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export default function AdminPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiRequest<AdminDashboardResponse>('/admin/dashboard'),
  });

  return (
    <AuthGuard requiredRole="ADMIN">
      <DashboardShell mode="admin" title="Admin Control Tower" description="Monitor revenue, orders, users, products, complaints, refunds, withdrawals and provider performance from one view.">
        {isLoading || !data ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-sm text-slate-400">Loading admin dashboard...</div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Platform Revenue" value={formatCurrency(data.metrics.revenue)} change="Live order revenue" tone="violet" />
              <MetricCard label="Active Users" value={String(data.metrics.activeUsers)} change="Across the ecosystem" tone="sky" />
              <MetricCard label="Pending Withdrawals" value={String(data.metrics.pendingWithdrawals)} change="Needs review" tone="amber" />
              <MetricCard label="Success Rate" value={`${data.metrics.successRate}%`} change="Order completion efficiency" tone="emerald" />
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <LineChartCard title="Revenue Trend" value={formatCurrency(data.metrics.revenue)} data={data.charts.revenueTrends} dataKey="value" />
              <BarChartCard title="Order Trend" value={`${data.metrics.orders} orders`} data={data.charts.orderTrends} dataKey="value" />
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <BarChartCard title="Network Distribution" value="Order share by network" data={data.charts.networkUsage.map((entry) => ({ label: entry.code, value: entry.count }))} dataKey="value" />
              <DataTableCard
                title="Recent Orders"
                columns={['Bundle', 'Phone', 'Status', 'Amount']}
                rows={data.recentOrders.map((order) => [
                  order.product.name,
                  order.phoneNumber,
                  <Badge key={`${order.id}-status`} value={order.status} />,
                  formatCurrency(order.amount),
                ])}
              />
            </div>
          </div>
        )}
      </DashboardShell>
    </AuthGuard>
  );
}

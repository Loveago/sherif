'use client';

import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { AdminOverviewStats } from '@/components/dashboard/admin-overview-stats';
import { SpendingChart } from '@/components/dashboard/spending-chart';
import { DataTableCard } from '@/components/dashboard/data-table-card';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';
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
      <DashboardShell mode="admin" title="Admin Dashboard" description="">
        {isLoading || !data ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Loading admin dashboard...</div>
        ) : (
          <div className="mx-auto max-w-xl lg:max-w-none space-y-4">
            {/* Overview Header */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-violet-400" />
                <h2 className="text-sm font-bold text-white">Platform Overview</h2>
              </div>
              <select defaultValue="This Month" className="rounded-lg border border-gray-700/60 bg-gray-900/80 px-2.5 py-1 text-[11px] text-gray-300 outline-none">
                <option>This Month</option>
                <option>Last Month</option>
                <option>This Year</option>
              </select>
            </div>

            {/* Stats */}
            <AdminOverviewStats
              stats={[
                { label: 'Platform Revenue', value: formatCurrency(data.metrics?.revenue ?? 0), change: 'Live', icon: 'revenue' },
                { label: 'Active Users', value: String(data.metrics?.activeUsers ?? 0), change: '+12% active', icon: 'users' },
                { label: 'Pending Withdrawals', value: String(data.metrics?.pendingWithdrawals ?? 0), change: 'Needs review', icon: 'pending' },
                { label: 'Success Rate', value: `${data.metrics?.successRate ?? 0}%`, change: '+2.1%', icon: 'success' },
              ]}
            />

            {/* Revenue Chart */}
            <SpendingChart data={data.charts?.revenueTrends ?? []} dataKey="value" />

            {/* Order Trend */}
            <SpendingChart data={data.charts?.orderTrends ?? []} dataKey="value" />

            {/* Network + Recent Orders — Desktop */}
            <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4">
              <DataTableCard
                title="Recent Orders"
                columns={['Bundle', 'Phone', 'Status', 'Amount']}
                rows={(data.recentOrders ?? []).map((order) => [
                  order.product?.name ?? 'Data Bundle',
                  order.phoneNumber ?? '-',
                  <Badge key={`${order.id}-status`} value={order.status} />,
                  formatCurrency(order.amount ?? 0),
                ])}
              />
            </div>
          </div>
        )}
      </DashboardShell>
    </AuthGuard>
  );
}

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, LineChart as LineChartIcon, PieChart, TrendingUp, Users, DollarSign, ShoppingCart } from 'lucide-react';

interface ReportData {
  sales: { date: string; amount: number }[];
  users: { date: string; count: number }[];
  orders: { status: string; count: number }[];
  topProducts: { name: string; sales: number; revenue: number }[];
  paymentMethods: { method: string; count: number; amount: number }[];
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  successRate: number;
}

export default function AdminReportsPage() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [reportType, setReportType] = useState<'sales' | 'users' | 'orders' | 'products'>('sales');

  const { data: report } = useQuery({
    queryKey: ['admin-reports', dateRange, reportType],
    queryFn: () =>
      apiRequest<ReportData>(
        `/admin/reports/${reportType}?startDate=${dateRange.start}&endDate=${dateRange.end}`
      ),
  });

  return (
    <AuthGuard>
      <DashboardShell title="Reports & Analytics" description="View comprehensive business analytics and reports." mode="admin">
        {/* Report Type Selector */}
        <div className="mb-6 flex flex-wrap gap-2">
          {(['sales', 'users', 'orders', 'products'] as const).map((type) => (
            <Button
              key={type}
              variant={reportType === type ? 'primary' : 'secondary'}
              onClick={() => setReportType(type)}
              className="capitalize"
            >
              {type === 'sales' && <DollarSign className="h-4 w-4 mr-2" />}
              {type === 'users' && <Users className="h-4 w-4 mr-2" />}
              {type === 'orders' && <ShoppingCart className="h-4 w-4 mr-2" />}
              {type === 'products' && <TrendingUp className="h-4 w-4 mr-2" />}
              {type}
            </Button>
          ))}
        </div>

        {/* Date Range Filter */}
        <GlassCard className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Filter by Date Range</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setDateRange({ start: '', end: '' })}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Key Metrics */}
        {report && (
          <>
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Revenue</p>
                    <p className="mt-2 text-3xl font-bold text-white">GHS {formatCurrency(report.totalRevenue)}</p>
                  </div>
                  <DollarSign className="h-12 w-12 text-violet-600/30" />
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Orders</p>
                    <p className="mt-2 text-3xl font-bold text-white">{report.totalOrders}</p>
                  </div>
                  <ShoppingCart className="h-12 w-12 text-sky-600/30" />
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Users</p>
                    <p className="mt-2 text-3xl font-bold text-white">{report.totalUsers}</p>
                  </div>
                  <Users className="h-12 w-12 text-emerald-600/30" />
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Success Rate</p>
                    <p className="mt-2 text-3xl font-bold text-white">{report.successRate.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className="h-12 w-12 text-amber-600/30" />
                </div>
              </GlassCard>
            </div>

            {/* Report Details */}
            {reportType === 'sales' && (
              <GlassCard className="p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <LineChartIcon className="h-5 w-5" />
                  Daily Sales
                </h3>
                <div className="space-y-2">
                  {report.sales.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">{item.date}</span>
                      <span className="text-sm font-medium text-white">GHS {formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {reportType === 'users' && (
              <GlassCard className="p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Growth
                </h3>
                <div className="space-y-2">
                  {report.users.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">{item.date}</span>
                      <span className="text-sm font-medium text-white">{item.count} users</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {reportType === 'orders' && (
              <GlassCard className="p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Orders by Status
                </h3>
                <div className="space-y-2">
                  {report.orders.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-gray-400 capitalize">{item.status.toLowerCase()}</span>
                      <span className="text-sm font-medium text-white">{item.count} orders</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {reportType === 'products' && (
              <GlassCard className="p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Products
                </h3>
                <div className="space-y-3">
                  {report.topProducts.map((product, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-700/50 bg-gray-900/30 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">{product.name}</span>
                        <span className="text-sm text-violet-400">GHS {formatCurrency(product.revenue)}</span>
                      </div>
                      <p className="text-xs text-gray-500">{product.sales} sales</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Payment Methods */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Payment Methods
              </h3>
              <div className="space-y-2">
                {report.paymentMethods.map((method, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white capitalize">{method.method}</p>
                      <p className="text-xs text-gray-500">{method.count} transactions</p>
                    </div>
                    <span className="text-sm font-medium text-violet-400">GHS {formatCurrency(method.amount)}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </>
        )}
      </DashboardShell>
    </AuthGuard>
  );
}

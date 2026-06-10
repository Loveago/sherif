'use client';

import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Eye, ShoppingCart, DollarSign, TrendingUp, BarChart3, Users } from 'lucide-react';

interface StorefrontAnalytics {
  totalViews: number;
  totalOrders: number;
  totalCommission: number;
  topProducts: { name: string; sales: number; commission: number }[];
  dailyViews: { date: string; views: number }[];
  dailyOrders: { date: string; orders: number; revenue: number }[];
  conversionRate: number;
  averageOrderValue: number;
}

export default function StorefrontAnalyticsPage() {
  const { data: analytics } = useQuery({
    queryKey: ['storefront-analytics'],
    queryFn: () => apiRequest<StorefrontAnalytics>('/storefront/analytics'),
  });

  if (!analytics) {
    return (
      <AuthGuard>
        <DashboardShell title="Storefront Analytics" description="Track your storefront performance.">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <GlassCard key={i} className="h-24 animate-pulse" />
            ))}
          </div>
        </DashboardShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <DashboardShell title="Storefront Analytics" description="Track your storefront performance and earnings.">
        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Views</p>
                <p className="mt-2 text-3xl font-bold text-white">{analytics.totalViews.toLocaleString()}</p>
              </div>
              <Eye className="h-12 w-12 text-violet-600/30" />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Orders</p>
                <p className="mt-2 text-3xl font-bold text-white">{analytics.totalOrders}</p>
              </div>
              <ShoppingCart className="h-12 w-12 text-sky-600/30" />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Commission</p>
                <p className="mt-2 text-3xl font-bold text-white">GHS {formatCurrency(analytics.totalCommission)}</p>
              </div>
              <DollarSign className="h-12 w-12 text-emerald-600/30" />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Conversion Rate</p>
                <p className="mt-2 text-3xl font-bold text-white">{analytics.conversionRate.toFixed(2)}%</p>
              </div>
              <TrendingUp className="h-12 w-12 text-amber-600/30" />
            </div>
          </GlassCard>
        </div>

        {/* Secondary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Average Order Value
            </h3>
            <p className="text-4xl font-bold text-violet-400">GHS {formatCurrency(analytics.averageOrderValue)}</p>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Performance Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Avg. views per order:</span>
                <span className="text-white font-medium">
                  {analytics.totalOrders > 0 ? (analytics.totalViews / analytics.totalOrders).toFixed(1) : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg. commission per order:</span>
                <span className="text-white font-medium">
                  GHS {analytics.totalOrders > 0 ? formatCurrency(analytics.totalCommission / analytics.totalOrders) : '0.00'}
                </span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Top Products */}
        <GlassCard className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Selling Products</h3>
          <div className="space-y-3">
            {analytics.topProducts.length > 0 ? (
              analytics.topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-900/30 p-4">
                  <div>
                    <p className="font-medium text-white">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.sales} sales</p>
                  </div>
                  <p className="text-lg font-semibold text-violet-400">GHS {formatCurrency(product.commission)}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No sales yet</p>
            )}
          </div>
        </GlassCard>

        {/* Daily Views Chart */}
        <GlassCard className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Daily Views</h3>
          <div className="space-y-2">
            {analytics.dailyViews.length > 0 ? (
              analytics.dailyViews.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{item.date}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-violet-600 rounded" style={{ width: `${(item.views / Math.max(...analytics.dailyViews.map(v => v.views))) * 200}px` }} />
                    <span className="text-sm font-medium text-white w-12 text-right">{item.views}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">No data available</p>
            )}
          </div>
        </GlassCard>

        {/* Daily Orders Chart */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Daily Orders & Revenue</h3>
          <div className="space-y-3">
            {analytics.dailyOrders.length > 0 ? (
              analytics.dailyOrders.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-gray-700/50 bg-gray-900/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{item.date}</span>
                    <span className="text-sm text-gray-400">{item.orders} orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-emerald-600 rounded flex-1" style={{ width: `${(item.revenue / Math.max(...analytics.dailyOrders.map(o => o.revenue))) * 100}%` }} />
                    <span className="text-sm font-medium text-emerald-400 w-24 text-right">GHS {formatCurrency(item.revenue)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">No data available</p>
            )}
          </div>
        </GlassCard>
      </DashboardShell>
    </AuthGuard>
  );
}

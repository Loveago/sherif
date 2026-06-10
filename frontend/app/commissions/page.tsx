'use client';

import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { MetricCard } from '@/components/dashboard/metric-card';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import type { Commission } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, TrendingUp, Hash, BarChart3 } from 'lucide-react';

export default function CommissionsPage() {
  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => apiRequest<Commission[]>('/commissions'),
  });

  const totalEarnings = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
  const todayEarnings = commissions
    .filter((c) => new Date(c.createdAt).toDateString() === new Date().toDateString())
    .reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <AuthGuard>
      <DashboardShell title="Commissions" description="View commission earnings by source order, track daily and total performance.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Earnings" value={formatCurrency(totalEarnings)} change="All-time commissions" tone="emerald" />
          <MetricCard label="Today's Earnings" value={formatCurrency(todayEarnings)} change="Current day only" tone="sky" />
          <MetricCard label="Total Commissions" value={String(commissions.length)} change="Records generated" tone="violet" />
          <MetricCard label="Average Commission" value={formatCurrency(commissions.length ? totalEarnings / commissions.length : 0)} change="Per order" tone="amber" />
        </div>

        <div className="mt-5">
          <GlassCard className="p-5">
            <h3 className="text-base font-semibold text-white">Commission History</h3>
            <div className="mt-4 space-y-2">
              {commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{commission.source}</p>
                      <p className="text-xs text-gray-500">{commission.order?.product?.name || '—'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-400">+{formatCurrency(commission.amount)}</p>
                    <p className="text-xs text-gray-500">{new Date(commission.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {commissions.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-500">No commissions yet</p>
              )}
            </div>
          </GlassCard>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Users, DollarSign, CheckCircle2, Clock } from 'lucide-react';

interface Commission {
  id: string;
  userId: string;
  orderId: string;
  amount: { toNumber: () => number };
  status: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
  order: { receiptNumber: string };
}

interface CommissionStats {
  total: number;
  pending: number;
  paid: number;
  topAgent: { name: string; amount: number };
}

export default function AdminCommissionsPage() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const { data: response } = useQuery({
    queryKey: ['admin-commissions', dateRange],
    queryFn: () =>
      apiRequest<{ commissions: Commission[]; total: number; stats: CommissionStats }>(
        `/admin/commissions?startDate=${dateRange.start}&endDate=${dateRange.end}`
      ),
  });

  const payoutMutation = useMutation({
    mutationFn: (commissionId: string) =>
      apiRequest(`/admin/commissions/${commissionId}/payout`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-commissions'] });
    },
  });

  const commissions = response?.commissions ?? [];
  const stats = response?.stats ?? { total: 0, pending: 0, paid: 0, topAgent: { name: '', amount: 0 } };

  return (
    <AuthGuard>
      <DashboardShell title="Commission Management" description="Track and process agent commissions." mode="admin">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Commissions</p>
                <p className="mt-2 text-3xl font-bold text-white">GHS {formatCurrency(stats.total)}</p>
              </div>
              <DollarSign className="h-12 w-12 text-violet-600/30" />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Payouts</p>
                <p className="mt-2 text-3xl font-bold text-amber-400">{stats.pending}</p>
              </div>
              <Clock className="h-12 w-12 text-amber-600/30" />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Paid Out</p>
                <p className="mt-2 text-3xl font-bold text-emerald-400">{stats.paid}</p>
              </div>
              <CheckCircle2 className="h-12 w-12 text-emerald-600/30" />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Top Agent</p>
                <p className="mt-2 text-lg font-bold text-white">{stats.topAgent.name}</p>
                <p className="text-xs text-gray-500">GHS {formatCurrency(stats.topAgent.amount)}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-violet-600/30" />
            </div>
          </GlassCard>
        </div>

        {/* Filters */}
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

        {/* Commissions Table */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Commission Records</h3>
          <div className="space-y-3">
            {commissions.map((commission) => (
              <div
                key={commission.id}
                className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-900/30 p-4"
              >
                <div className="flex-1">
                  <p className="font-medium text-white">
                    {commission.user.firstName} {commission.user.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{commission.user.email}</p>
                  <p className="text-xs text-gray-600 mt-1">Order: {commission.order.receiptNumber}</p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-semibold text-violet-400">
                    GHS {formatCurrency(commission.amount.toNumber())}
                  </p>
                  <Badge
                    variant={commission.status === 'PENDING' ? 'warning' : 'success'}
                    className="mt-2"
                  >
                    {commission.status}
                  </Badge>
                </div>

                {commission.status === 'PENDING' && (
                  <Button
                    size="sm"
                    onClick={() => payoutMutation.mutate(commission.id)}
                    disabled={payoutMutation.isPending}
                    className="ml-4"
                  >
                    {payoutMutation.isPending ? 'Processing...' : 'Process Payout'}
                  </Button>
                )}
              </div>
            ))}

            {commissions.length === 0 && (
              <p className="py-8 text-center text-gray-500">No commissions found</p>
            )}
          </div>
        </GlassCard>
      </DashboardShell>
    </AuthGuard>
  );
}

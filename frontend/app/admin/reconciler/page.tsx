'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  RefreshCw, Play, Pause, CheckCircle2, AlertTriangle,
  Clock, Package, Loader2, Zap, Ban
} from 'lucide-react';

interface ReconcilerStatus {
  isEnabled: boolean;
  isRunning: boolean;
  startAfter: string | null;
  lastRunAt: string | null;
  lastResult: {
    checked: number;
    reconciled: number;
    failed: number;
    skipped: number;
  } | null;
  totalReconciled: number;
  totalFailed: number;
  pendingCount: number;
}

interface PendingOrder {
  id: string;
  receiptNumber: string;
  phoneNumber: string;
  amount: number;
  createdAt: string;
  product: { name: string; network: { name: string } };
  user: { firstName: string; lastName: string };
}

export default function AdminReconcilerPage() {
  const queryClient = useQueryClient();
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['reconciler-status'],
    queryFn: () => apiRequest<ReconcilerStatus>('/admin/reconciler/status'),
    refetchInterval: 30000,
  });

  const { data: pendingOrders = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['reconciler-pending'],
    queryFn: () => apiRequest<PendingOrder[]>('/admin/reconciler/pending'),
    refetchInterval: 30000,
  });

  const triggerMutation = useMutation({
    mutationFn: () => apiRequest('/admin/reconciler/trigger', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciler-status'] });
      queryClient.invalidateQueries({ queryKey: ['reconciler-pending'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest('/admin/reconciler/toggle', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciler-status'] });
    },
  });

  const reconcileOneMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiRequest(`/admin/reconciler/${orderId}/reconcile`, { method: 'POST' }),
    onMutate: (orderId) => setReconcilingId(orderId),
    onSettled: () => {
      setReconcilingId(null);
      queryClient.invalidateQueries({ queryKey: ['reconciler-status'] });
      queryClient.invalidateQueries({ queryKey: ['reconciler-pending'] });
    },
  });

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <AuthGuard requiredRole="ADMIN">
      <DashboardShell mode="admin" title="Payment Reconciler" description="Automatically reconcile storefront Paystack payments.">
        {/* Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={`h-2.5 w-2.5 rounded-full ${status?.isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-sm text-gray-300">
              Automation: <span className={status?.isEnabled ? 'text-emerald-400 font-medium' : 'text-gray-400'}>{status?.isEnabled ? 'Enabled' : 'Disabled'}</span>
            </span>
            <span className="text-xs text-gray-500">
              Last run: {formatTimeAgo(status?.lastRunAt ?? null)}
            </span>
            {status?.startAfter && (
              <span className="text-xs text-amber-400/80">
                Tracking from: {new Date(status.startAfter).toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toggleMutation.mutate(!status?.isEnabled)}
              disabled={toggleMutation.isPending || statusLoading}
              className="flex items-center gap-2"
            >
              {status?.isEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {status?.isEnabled ? 'Disable' : 'Enable'}
            </Button>
            <Button
              size="sm"
              onClick={() => triggerMutation.mutate()}
              disabled={triggerMutation.isPending}
              className="flex items-center gap-2"
            >
              {triggerMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Run Now
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <GlassCard className="p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Pending</p>
            <p className="mt-2 text-2xl font-bold text-amber-400">{status?.pendingCount ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Unpaid storefront orders</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Reconciled</p>
            <p className="mt-2 text-2xl font-bold text-emerald-400">{status?.totalReconciled ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Auto-fixed since start</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Failed</p>
            <p className="mt-2 text-2xl font-bold text-rose-400">{status?.totalFailed ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Errors during checks</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Last Run</p>
            <p className="mt-2 text-2xl font-bold text-white">{status?.lastResult?.checked ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">
              {status?.lastResult
                ? `${status.lastResult.reconciled} reconciled / ${status.lastResult.skipped} skipped`
                : 'No runs yet'}
            </p>
          </GlassCard>
        </div>

        {/* Pending Orders Table */}
        <GlassCard className="overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              Pending Reconciliations
            </h3>
            <Badge variant="warning">{pendingOrders.length} orders</Badge>
          </div>

          {pendingLoading ? (
            <div className="p-8 text-center text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading pending orders...
            </div>
          ) : pendingOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-700/50 text-xs text-gray-400 uppercase">
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Age</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-white">{order.receiptNumber}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {order.user.firstName} {order.user.lastName}
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-mono">{order.phoneNumber}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {order.product.name}{' '}
                        <span className="text-xs text-gray-500">({order.product.network.name})</span>
                      </td>
                      <td className="px-4 py-3 text-emerald-400 font-medium">
                        GHS {formatCurrency(order.amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {formatTimeAgo(order.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => reconcileOneMutation.mutate(order.id)}
                            disabled={reconcilingId === order.id}
                            className="flex items-center gap-1.5 h-8"
                          >
                            {reconcilingId === order.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Reconcile
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500/30 mb-3" />
              <p className="text-gray-400">No pending reconciliations</p>
              <p className="text-sm text-gray-500 mt-1">All storefront orders are up to date</p>
            </div>
          )}
        </GlassCard>

        {/* How It Works */}
        <GlassCard className="p-5 mt-6">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            How the Reconciler Works
          </h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <RefreshCw className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              Every 2 minutes, the worker scans storefront orders created <strong className="text-white">after the reconciler was activated</strong> that are still <strong className="text-white">PENDING</strong> and have no <strong className="text-white">providerReference</strong>.
            </li>
            <li className="flex items-start gap-2">
              <Ban className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
              Orders created <strong className="text-white">before the reconciler was activated</strong> are completely ignored, even if they are pending. This protects manually processed orders.
            </li>
            <li className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
              For each order, it queries Paystack using the <strong className="text-white">receiptNumber</strong> as the Paystack reference.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              If Paystack reports the payment as <strong className="text-white">success</strong>, the order is marked paid, storefront stats are updated, and the order is sent to Shanka5 for processing.
            </li>
            <li className="flex items-start gap-2">
              <Ban className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
              If Paystack says the transaction is not found or not successful, the order is skipped and will be checked again in the next cycle.
            </li>
          </ul>
        </GlassCard>
      </DashboardShell>
    </AuthGuard>
  );
}

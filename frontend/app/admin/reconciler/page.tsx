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
  Clock, Loader2, Zap, Ban, Copy, Check, Wallet, ShoppingBag
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
  pendingPaymentsCount?: number;
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

interface PendingPayment {
  id: string;
  amount: number;
  providerRef: string;
  reference: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

export default function AdminReconcilerPage() {
  const queryClient = useQueryClient();
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'storefront' | 'wallet'>('storefront');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/v1/webhooks/paystack`
    : 'https://your-domain.com/api/v1/webhooks/paystack';

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['reconciler-status'],
    queryFn: () => apiRequest<ReconcilerStatus>('/admin/reconciler/status'),
    refetchInterval: 30000,
  });

  const { data: pendingOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['reconciler-pending'],
    queryFn: () => apiRequest<PendingOrder[]>('/admin/reconciler/pending'),
    refetchInterval: 30000,
  });

  const { data: pendingPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['reconciler-pending-payments'],
    queryFn: () => apiRequest<PendingPayment[]>('/admin/reconciler/pending-payments'),
    refetchInterval: 30000,
  });

  const triggerMutation = useMutation({
    mutationFn: () => apiRequest('/admin/reconciler/trigger', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciler-status'] });
      queryClient.invalidateQueries({ queryKey: ['reconciler-pending'] });
      queryClient.invalidateQueries({ queryKey: ['reconciler-pending-payments'] });
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

  const reconcilePaymentMutation = useMutation({
    mutationFn: (paymentId: string) =>
      apiRequest(`/admin/reconciler/payments/${paymentId}/reconcile`, { method: 'POST' }),
    onMutate: (paymentId) => setReconcilingId(paymentId),
    onSettled: () => {
      setReconcilingId(null);
      queryClient.invalidateQueries({ queryKey: ['reconciler-status'] });
      queryClient.invalidateQueries({ queryKey: ['reconciler-pending-payments'] });
    },
  });

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

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

        {/* Webhook Endpoint Banner */}
        <GlassCard className="p-4 mb-6 border-blue-500/20 bg-blue-500/[0.03]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Paystack Webhook Integration Active
                </h4>
              </div>
              <p className="text-xs text-gray-400">
                Set this URL in your <strong className="text-gray-200">Paystack Dashboard → Settings → Preferences → Webhooks</strong> to automatically fulfill orders & credit wallets in real-time when payments complete.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <code className="text-xs bg-black/40 text-blue-300 px-3 py-1.5 rounded-lg border border-white/10 font-mono truncate max-w-xs sm:max-w-md">
                {webhookUrl}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyWebhook}
                className="h-8 shrink-0 flex items-center gap-1.5"
              >
                {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedWebhook ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <GlassCard className="p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Pending Orders</p>
            <p className="mt-2 text-2xl font-bold text-amber-400">{status?.pendingCount ?? pendingOrders.length}</p>
            <p className="text-xs text-gray-500 mt-1">Unpaid storefront orders</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Pending Deposits</p>
            <p className="mt-2 text-2xl font-bold text-cyan-400">{status?.pendingPaymentsCount ?? pendingPayments.length}</p>
            <p className="text-xs text-gray-500 mt-1">Uncredited wallet deposits</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Reconciled</p>
            <p className="mt-2 text-2xl font-bold text-emerald-400">{status?.totalReconciled ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Auto-fixed by system</p>
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

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-4 border-b border-gray-700/50 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('storefront')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'storefront'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Storefront Orders
            <Badge variant={activeTab === 'storefront' ? 'secondary' : 'default'} className="ml-1 text-xs">
              {pendingOrders.length}
            </Badge>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'wallet'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            <Wallet className="h-4 w-4" />
            Wallet Deposits
            <Badge variant={activeTab === 'wallet' ? 'secondary' : 'default'} className="ml-1 text-xs">
              {pendingPayments.length}
            </Badge>
          </button>
        </div>

        {/* Tab 1: Storefront Orders Table */}
        {activeTab === 'storefront' && (
          <GlassCard className="overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                Pending Storefront Orders
              </h3>
              <Badge variant="warning">{pendingOrders.length} orders</Badge>
            </div>

            {ordersLoading ? (
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
                        <td className="px-4 py-3 font-medium text-white font-mono">{order.receiptNumber}</td>
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
                <p className="text-gray-400">No pending storefront orders</p>
                <p className="text-sm text-gray-500 mt-1">All storefront orders have been paid and fulfilled</p>
              </div>
            )}
          </GlassCard>
        )}

        {/* Tab 2: Wallet Deposits Table */}
        {activeTab === 'wallet' && (
          <GlassCard className="overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Wallet className="h-4 w-4 text-cyan-400" />
                Pending Wallet Deposits
              </h3>
              <Badge variant="warning">{pendingPayments.length} deposits</Badge>
            </div>

            {paymentsLoading ? (
              <div className="p-8 text-center text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                Loading pending deposits...
              </div>
            ) : pendingPayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-700/50 text-xs text-gray-400 uppercase">
                      <th className="px-4 py-3">Paystack Reference</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Age</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-white font-mono">{payment.providerRef}</td>
                        <td className="px-4 py-3 text-gray-300">
                          {payment.user.firstName} {payment.user.lastName}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                          {payment.user.phone || payment.user.email}
                        </td>
                        <td className="px-4 py-3 text-emerald-400 font-medium">
                          GHS {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {formatTimeAgo(payment.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => reconcilePaymentMutation.mutate(payment.id)}
                              disabled={reconcilingId === payment.id}
                              className="flex items-center gap-1.5 h-8"
                            >
                              {reconcilingId === payment.id ? (
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
                <p className="text-gray-400">No pending wallet deposits</p>
                <p className="text-sm text-gray-500 mt-1">All wallet deposits have been verified and credited</p>
              </div>
            )}
          </GlassCard>
        )}

        {/* How It Works */}
        <GlassCard className="p-5 mt-6">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            How Payment Reconciliation & Webhooks Work
          </h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <strong className="text-white">Real-Time Paystack Webhook:</strong> When a customer pays via Card or Mobile Money, Paystack immediately sends a webhook event (<code className="text-xs text-blue-300">charge.success</code>) to automatically fulfill orders and credit wallets without waiting for redirects.
            </li>
            <li className="flex items-start gap-2">
              <RefreshCw className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <strong className="text-white">Background Reconciler:</strong> Every 2 minutes, the worker scans all recent pending storefront orders and wallet deposits, verifies their transaction status directly with Paystack, and reconciles any that were missed.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
              <strong className="text-white">Manual Reconcile:</strong> You can click the &quot;Reconcile&quot; button on any order or deposit above to immediately query Paystack and validate the transaction on demand.
            </li>
          </ul>
        </GlassCard>
      </DashboardShell>
    </AuthGuard>
  );
}

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  AlertTriangle, XCircle, Clock, Search, RefreshCw, CheckCircle2,
  Package, ShieldAlert, Wifi, Phone, CreditCard, ChevronDown, ChevronUp,
  User, AlertOctagon, Activity, Server
} from 'lucide-react';

interface FailedOrder {
  id: string;
  receiptNumber: string;
  phoneNumber: string;
  amount: number;
  status: string;
  source: string;
  createdAt: string;
  network: string;
  productName: string;
  customer: string;
  customerEmail: string;
  refundStatus: string | null;
  refundAmount: number | null;
  failureReason: string;
  attemptedNetworkIds: number[] | null;
  providerReference: string | null;
  failedAt: string;
}

interface CriticalIssue {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  entityId: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

interface CriticalIssuesResponse {
  issues: CriticalIssue[];
  summary: {
    providerFailures24h: number;
    webhookFailures24h: number;
    stuckOrders: number;
    total: number;
  };
}

const severityColors = {
  critical: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const severityIcons = {
  critical: AlertOctagon,
  warning: AlertTriangle,
  info: Activity,
};

export default function AdminFailedOrdersPage() {
  const [search, setSearch] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'failed' | 'issues'>('failed');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: failedOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-failed-orders', search, networkFilter],
    queryFn: () =>
      apiRequest<FailedOrder[]>(
        `/admin/failed-orders?search=${search}&network=${networkFilter}`
      ),
    refetchInterval: 60000,
  });

  const { data: criticalIssues, isLoading: issuesLoading } = useQuery({
    queryKey: ['admin-critical-issues'],
    queryFn: () => apiRequest<CriticalIssuesResponse>('/admin/critical-issues'),
    refetchInterval: 30000,
  });

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const networks = Array.from(new Set(failedOrders.map((o) => o.network)));

  return (
    <AuthGuard requiredRole="ADMIN">
      <DashboardShell
        mode="admin"
        title="Failed Orders & Issues"
        description="Track failed orders, provider errors, and critical system issues."
      >
        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-700/50 pb-1">
          <button
            onClick={() => setActiveTab('failed')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[2px] ${
              activeTab === 'failed'
                ? 'border-rose-400 text-rose-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <XCircle className="h-4 w-4" />
            Failed Orders
            {failedOrders.length > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-xs text-rose-400">
                {failedOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[2px] ${
              activeTab === 'issues'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            Critical Issues
            {(criticalIssues?.summary.total ?? 0) > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-xs text-amber-400">
                {criticalIssues.summary.total}
              </span>
            )}
          </button>
        </div>

        {/* ─── FAILED ORDERS TAB ─── */}
        {activeTab === 'failed' && (
          <>
            {/* Filters */}
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    placeholder="Search by receipt, phone, or customer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Network
                </label>
                <select
                  value={networkFilter}
                  onChange={(e) => setNetworkFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-700/50 bg-slate-900/50 px-4 py-2.5 text-sm text-white outline-none transition-all hover:border-gray-600/50 focus:border-violet-500"
                >
                  <option value="">All Networks</option>
                  {networks.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <GlassCard className="p-4">
                <p className="text-xs text-gray-400 uppercase">Total Failed</p>
                <p className="mt-1 text-2xl font-bold text-rose-400">{failedOrders.length}</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs text-gray-400 uppercase">Refunded</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">
                  {failedOrders.filter((o) => o.refundStatus).length}
                </p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs text-gray-400 uppercase">Storefront</p>
                <p className="mt-1 text-2xl font-bold text-amber-400">
                  {failedOrders.filter((o) => o.source === 'STOREFRONT').length}
                </p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs text-gray-400 uppercase">Unrefunded</p>
                <p className="mt-1 text-2xl font-bold text-gray-300">
                  {failedOrders.filter((o) => !o.refundStatus).length}
                </p>
              </GlassCard>
            </div>

            {/* Failed Orders Table */}
            <GlassCard className="overflow-hidden">
              {ordersLoading ? (
                <div className="p-8 text-center text-gray-500">Loading failed orders...</div>
              ) : failedOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500/30 mb-3" />
                  <p className="text-gray-400">No failed orders found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-700/50 text-xs text-gray-400 uppercase">
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Phone / Product</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Source</th>
                        <th className="px-4 py-3">Refund</th>
                        <th className="px-4 py-3">Failed</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {failedOrders.map((order) => {
                        const isExpanded = expandedOrder === order.id;
                        return (
                          <>
                            <tr
                              key={order.id}
                              className="border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors cursor-pointer"
                              onClick={() =>
                                setExpandedOrder(isExpanded ? null : order.id)
                              }
                            >
                              <td className="px-4 py-3">
                                <div className="font-medium text-white">{order.receiptNumber}</div>
                                <div className="text-xs text-gray-500">{order.network}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-gray-300">{order.customer}</div>
                                <div className="text-xs text-gray-500">{order.customerEmail}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-gray-300 font-mono">{order.phoneNumber}</div>
                                <div className="text-xs text-gray-500">{order.productName}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-emerald-400 font-medium">
                                  GHS {formatCurrency(order.amount)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant={order.source === 'STOREFRONT' ? 'warning' : 'default'}
                                >
                                  {order.source}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                {order.refundStatus ? (
                                  <Badge variant="success">{order.refundStatus}</Badge>
                                ) : (
                                  <Badge variant="secondary">None</Badge>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-xs">
                                {formatTimeAgo(order.failedAt)}
                              </td>
                              <td className="px-4 py-3">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-gray-900/50">
                                <td colSpan={8} className="px-4 py-4">
                                  <div className="space-y-3">
                                    <div className="flex items-start gap-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3">
                                      <AlertTriangle className="h-5 w-5 text-rose-400 mt-0.5 shrink-0" />
                                      <div>
                                        <p className="text-sm font-medium text-rose-300">
                                          Failure Reason
                                        </p>
                                        <p className="text-sm text-gray-300 mt-1">
                                          {order.failureReason}
                                        </p>
                                      </div>
                                    </div>
                                    {order.attemptedNetworkIds && (
                                      <div className="text-xs text-gray-500">
                                        Attempted network IDs:{' '}
                                        {order.attemptedNetworkIds.join(', ')}
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                                      <div>
                                        <span className="text-gray-500">Order ID:</span>{' '}
                                        <span className="font-mono">{order.id.slice(0, 16)}...</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Provider Ref:</span>{' '}
                                        <span className="font-mono">{order.providerReference ?? 'N/A'}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Created:</span>{' '}
                                        {new Date(order.createdAt).toLocaleString()}
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Failed At:</span>{' '}
                                        {new Date(order.failedAt).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </>
        )}

        {/* ─── CRITICAL ISSUES TAB ─── */}
        {activeTab === 'issues' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <GlassCard className="p-4">
                <p className="text-xs text-gray-400 uppercase">Total Issues</p>
                <p className="mt-1 text-2xl font-bold text-amber-400">
                  {criticalIssues?.summary.total ?? 0}
                </p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs text-gray-400 uppercase">Provider Failures</p>
                <p className="mt-1 text-2xl font-bold text-rose-400">
                  {criticalIssues?.summary.providerFailures24h ?? 0}
                </p>
                <p className="text-xs text-gray-500">Last 24h</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs text-gray-400 uppercase">Webhook Failures</p>
                <p className="mt-1 text-2xl font-bold text-orange-400">
                  {criticalIssues?.summary.webhookFailures24h ?? 0}
                </p>
                <p className="text-xs text-gray-500">Last 24h</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs text-gray-400 uppercase">Stuck Orders</p>
                <p className="mt-1 text-2xl font-bold text-violet-400">
                  {criticalIssues?.summary.stuckOrders ?? 0}
                </p>
                <p className="text-xs text-gray-500">&gt; 30 min</p>
              </GlassCard>
            </div>

            {/* Issues List */}
            <GlassCard className="overflow-hidden">
              {issuesLoading ? (
                <div className="p-8 text-center text-gray-500">Loading issues...</div>
              ) : !criticalIssues?.issues?.length ? (
                <div className="p-8 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500/30 mb-3" />
                  <p className="text-gray-400">No critical issues in the last 24 hours</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700/30">
                  {criticalIssues.issues.map((issue, idx) => {
                    const Icon = severityIcons[issue.severity];
                    return (
                      <div
                        key={`${issue.type}-${idx}`}
                        className="flex items-start gap-4 p-4 hover:bg-gray-800/30 transition-colors"
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${severityColors[issue.severity]}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold text-white">
                              {issue.title}
                            </h4>
                            <Badge
                              variant="default"
                              className={severityColors[issue.severity]}
                            >
                              {issue.severity}
                            </Badge>
                            <span className="text-xs text-gray-500 font-mono">
                              {issue.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mt-1">
                            {issue.description}
                          </p>
                          {issue.metadata && Object.keys(issue.metadata).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {Object.entries(issue.metadata)
                                .filter(([_, v]) => v !== null && v !== undefined)
                                .map(([key, value]) => (
                                  <span
                                    key={key}
                                    className="inline-flex items-center rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-400"
                                  >
                                    <span className="text-gray-500 mr-1">{key}:</span>
                                    {String(value).slice(0, 40)}
                                  </span>
                                ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {formatTimeAgo(issue.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </>
        )}
      </DashboardShell>
    </AuthGuard>
  );
}

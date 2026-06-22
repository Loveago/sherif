'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api';
import type { Order } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Search, CheckCircle2, XCircle, Clock, Package, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusFilters = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Successful', value: 'SUCCESSFUL' },
  { label: 'Failed', value: 'FAILED' },
];

const statusIcons: Record<string, React.ReactNode> = {
  SUCCESSFUL: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  FAILED: <XCircle className="h-4 w-4 text-rose-400" />,
  PENDING: <Clock className="h-4 w-4 text-amber-400" />,
  PROCESSING: <Clock className="h-4 w-4 text-sky-400" />,
};

const networkColors: Record<string, string> = {
  MTN: 'bg-yellow-500/20 text-yellow-400',
  Telecel: 'bg-rose-500/20 text-rose-400',
  AirtelTigo: 'bg-sky-500/20 text-sky-400',
};

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => apiRequest<Order[]>('/orders'),
  });

  const cancelMutation = useMutation({
    mutationFn: (orderId: string) => apiRequest(`/orders/${orderId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const refundMutation = useMutation({
    mutationFn: (data: { orderId: string; reason: string }) =>
      apiRequest('/orders/refund', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowRefundModal(false);
      setRefundReason('');
      setSelectedOrder(null);
    },
  });

  const filtered = orders.filter((order) => {
    const matchesSearch =
      !search ||
      order.product.name.toLowerCase().includes(search.toLowerCase()) ||
      order.phoneNumber.includes(search) ||
      order.receiptNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AuthGuard>
      <DashboardShell title="My Orders" description="Track, search, and monitor your order fulfillment status.">
        {/* Search and Filter */}
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search orders..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  statusFilter === filter.value
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {filtered.map((order) => {
            const networkCode = order.product?.network?.code || 'MTN';
            const canCancel = ['PENDING', 'PROCESSING'].includes(order.status);
            const canRefund = order.status === 'SUCCESSFUL';
            const isStorefront = order.source === 'STOREFRONT' || order.receiptNumber.startsWith('STORE-');
            const isPaid = isStorefront ? Boolean(order.providerReference) : true;

            return (
              <GlassCard key={order.id} className="p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${networkColors[networkCode] || 'bg-gray-700 text-gray-300'}`}>
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{order.product.name}</p>
                        <p className="text-xs text-gray-500">{order.phoneNumber} • {order.receiptNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-white">{formatCurrency(order.amount)}</p>
                        <div className="mt-0.5 flex items-center justify-end gap-1">
                          {statusIcons[order.status]}
                          <span className="text-xs text-gray-400 capitalize">{order.status.toLowerCase()}</span>
                          <Badge variant={isPaid ? 'success' : 'secondary'} className="ml-1">
                            {isPaid ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {(canCancel || canRefund) && (
                    <div className="flex gap-2 border-t border-gray-700 pt-3">
                      {canCancel && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => cancelMutation.mutate(order.id)}
                          disabled={cancelMutation.isPending}
                          className="flex-1"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Cancel Order
                        </Button>
                      )}
                      {canRefund && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order.id);
                            setShowRefundModal(true);
                          }}
                          className="flex-1"
                        >
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Request Refund
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </GlassCard>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-600" />
              <p className="mt-3 text-sm text-gray-500">No orders found</p>
            </div>
          )}
        </div>

        {/* Refund Modal */}
        {showRefundModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <GlassCard className="w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Request Refund</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Reason for Refund</label>
                  <Textarea
                    placeholder="Please explain why you want a refund..."
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="h-32"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setShowRefundModal(false);
                      setRefundReason('');
                      setSelectedOrder(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (refundReason.trim()) {
                        refundMutation.mutate({
                          orderId: selectedOrder,
                          reason: refundReason,
                        });
                      }
                    }}
                    disabled={!refundReason.trim() || refundMutation.isPending}
                  >
                    {refundMutation.isPending ? 'Submitting...' : 'Submit Refund Request'}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </DashboardShell>
    </AuthGuard>
  );
}

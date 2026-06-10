'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, Package } from 'lucide-react';

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  status: string;
  phoneNumber: string;
  product: { name: string; network: { name: string } };
}

interface Order {
  id: string;
  receiptNumber: string;
  status: string;
  amount: number;
  createdAt: string;
  items: OrderItem[];
}

export default function OrdersTrackingPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { data: orders = [] } = useQuery({
    queryKey: ['my-orders', statusFilter],
    queryFn: () =>
      apiRequest<Order[]>(`/orders?status=${statusFilter}`),
  });

  const statusIcons: Record<string, React.ReactNode> = {
    PENDING: <Clock className="h-5 w-5 text-amber-400" />,
    PROCESSING: <Clock className="h-5 w-5 text-blue-400" />,
    SUCCESSFUL: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
    FAILED: <XCircle className="h-5 w-5 text-rose-400" />,
    CANCELLED: <XCircle className="h-5 w-5 text-rose-400" />,
    REFUNDED: <CheckCircle2 className="h-5 w-5 text-violet-400" />,
  };

  const filteredOrders = statusFilter
    ? orders.filter((o) => o.status === statusFilter)
    : orders;

  return (
    <AuthGuard>
      <DashboardShell
        title="Orders Tracking"
        description="Track all your orders and their status."
      >
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <GlassCard className="p-6">
            <p className="text-sm text-gray-400">Total Orders</p>
            <p className="mt-2 text-3xl font-bold text-white">{orders.length}</p>
          </GlassCard>
          <GlassCard className="p-6">
            <p className="text-sm text-gray-400">Pending</p>
            <p className="mt-2 text-3xl font-bold text-amber-400">
              {orders.filter((o) => o.status === 'PENDING').length}
            </p>
          </GlassCard>
          <GlassCard className="p-6">
            <p className="text-sm text-gray-400">Processing</p>
            <p className="mt-2 text-3xl font-bold text-blue-400">
              {orders.filter((o) => o.status === 'PROCESSING').length}
            </p>
          </GlassCard>
          <GlassCard className="p-6">
            <p className="text-sm text-gray-400">Completed</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {orders.filter((o) => o.status === 'SUCCESSFUL').length}
            </p>
          </GlassCard>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-700/50 bg-slate-900/50 px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 hover:border-gray-600/50 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SUCCESSFUL">Successful</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>

        {/* Orders List */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Your Orders</h3>

          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-900/30 p-4 cursor-pointer hover:bg-gray-900/50 transition-colors"
                onClick={() => {
                  setSelectedOrder(order);
                  setShowDetailsModal(true);
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/20">
                      <Package className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{order.receiptNumber}</p>
                      <p className="text-xs text-gray-500">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-3 text-sm text-gray-400 mt-2">
                    <div>
                      <p className="text-xs text-gray-500">Amount</p>
                      <p className="font-medium text-white">GHS {formatCurrency(order.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="font-medium text-white">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <div className="flex items-center gap-2">
                        {statusIcons[order.status]}
                        <Badge variant={order.status === 'SUCCESSFUL' ? 'success' : 'warning'}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredOrders.length === 0 && (
              <p className="text-center text-gray-500 py-8">No orders found</p>
            )}
          </div>
        </GlassCard>

        {/* Order Details Modal */}
        {showDetailsModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto">
            <GlassCard className="w-full max-w-2xl p-6 m-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Order Details - {selectedOrder.receiptNumber}
              </h3>

              {/* Order Info */}
              <div className="mb-6 p-4 rounded-lg bg-gray-900/30 border border-gray-700/50">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500">Receipt Number</p>
                    <p className="font-medium text-white">{selectedOrder.receiptNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="font-medium text-white">
                      GHS {formatCurrency(selectedOrder.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="font-medium text-white">
                      {new Date(selectedOrder.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <div className="flex items-center gap-2">
                      {statusIcons[selectedOrder.status]}
                      <Badge variant={selectedOrder.status === 'SUCCESSFUL' ? 'success' : 'warning'}>
                        {selectedOrder.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-white mb-3">Order Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-900/30 border border-gray-700/50"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">
                          {item.product.name} ({item.product.network.name})
                        </p>
                        <p className="text-xs text-gray-500">
                          Phone: {item.phoneNumber} | Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-medium text-white">
                          GHS {formatCurrency(item.price)}
                        </p>
                        <Badge variant={item.status === 'SUCCESSFUL' ? 'success' : 'warning'}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </GlassCard>
          </div>
        )}
      </DashboardShell>
    </AuthGuard>
  );
}

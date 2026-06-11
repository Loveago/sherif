'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  CheckCircle2, XCircle, RefreshCw, Loader2,
  Maximize2, Minimize2, Download, Search, Slash
} from 'lucide-react';

interface Order {
  id: string;
  receiptNumber: string;
  status: string;
  amount: number;
  phoneNumber: string;
  createdAt: string;
  user: { firstName: string; lastName: string };
  product: { name: string; description: string; dataSize: string; network: { name: string } };
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [fullTable, setFullTable] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', search, statusFilter],
    queryFn: () =>
      apiRequest<Order[]>(
        `/admin/orders?search=${search}&status=${statusFilter}`
      ),
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: (data: { orderId: string; status: string }) =>
      apiRequest(`/admin/orders/${data.orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: data.status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { orderIds: string[]; status: string }) => {
      return Promise.all(
        data.orderIds.map((id) =>
          apiRequest(`/admin/orders/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: data.status }),
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedOrders(new Set());
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => apiRequest('/admin/export/orders'),
  });

  const filteredOrders = orders.filter((order) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      order.receiptNumber.toLowerCase().includes(searchLower) ||
      order.phoneNumber.includes(search) ||
      order.user.firstName.toLowerCase().includes(searchLower) ||
      order.user.lastName.toLowerCase().includes(searchLower);
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesProduct =
      !productFilter || order.product.network.name.toLowerCase().includes(productFilter.toLowerCase());
    const matchesDate =
      !dateFilter ||
      new Date(order.createdAt).toISOString().split('T')[0] === dateFilter;
    return matchesSearch && matchesStatus && matchesProduct && matchesDate;
  });

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const processingCount = orders.filter((o) => o.status === 'PROCESSING').length;
  const completedCount = orders.filter((o) => o.status === 'SUCCESSFUL').length;
  const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;
  const failedCount = orders.filter((o) => o.status === 'FAILED').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
            <RefreshCw className="h-3 w-3" /> Pending
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-400 border border-blue-500/20">
            <Loader2 className="h-3 w-3 animate-spin" /> Processing
          </span>
        );
      case 'SUCCESSFUL':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-400 border border-rose-500/20">
            <XCircle className="h-3 w-3" /> Cancelled
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/15 px-3 py-1 text-xs font-medium text-red-500 border border-red-600/20">
            <XCircle className="h-3 w-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-500/15 px-3 py-1 text-xs font-medium text-gray-400 border border-gray-500/20">
            {status}
          </span>
        );
    }
  };

  const handleBulkAction = (status: string) => {
    if (selectedOrders.size === 0) return;
    bulkUpdateMutation.mutate({
      orderIds: Array.from(selectedOrders),
      status,
    });
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedOrders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedOrders(next);
  };

  const selectAll = () => {
    if (selectedOrders.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  return (
    <AuthGuard>
      <DashboardShell
        title="Order Management"
        description={`${orders.length} orders loaded`}
        mode="admin"
      >
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            All Orders ({filteredOrders.length})
          </h2>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setFullTable(!fullTable)}
              className="flex items-center gap-2"
              variant="secondary"
            >
              {fullTable ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
              {fullTable ? 'Close Table' : 'Open Full Table'}
            </Button>
            <div className="relative">
              <Input
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 pl-9"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2">
            <span className="font-bold text-amber-400">{pendingCount}</span>
            <span className="text-sm text-amber-300">Pending</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-2">
            <span className="font-bold text-blue-400">{processingCount}</span>
            <span className="text-sm text-blue-300">Processing</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2">
            <span className="font-bold text-emerald-400">{completedCount}</span>
            <span className="text-sm text-emerald-300">Completed</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2">
            <span className="font-bold text-rose-400">{cancelledCount}</span>
            <span className="text-sm text-rose-300">Cancelled</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-red-600/10 border border-red-600/20 px-4 py-2">
            <span className="font-bold text-red-500">{failedCount}</span>
            <span className="text-sm text-red-400">Failed</span>
          </div>
        </div>

        {/* Full Table Filters */}
        {fullTable && (
          <GlassCard className="p-4 mb-4">
            <div className="grid gap-3 md:grid-cols-6">
              <Input
                placeholder="Order ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Input
                placeholder="Phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="rounded-xl border border-gray-700/50 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">All Products</option>
                <option value="MTN">MTN</option>
                <option value="Telecel">Telecel</option>
                <option value="Vodafone">Vodafone</option>
                <option value="AirtelTigo">AirtelTigo</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-gray-700/50 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="SUCCESSFUL">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select className="rounded-xl border border-gray-700/50 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none">
                <option value="">All Sources</option>
                <option value="DASHBOARD">Dashboard</option>
                <option value="STOREFRONT">Storefront</option>
                <option value="API">API</option>
              </select>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-gray-400"
              />
            </div>

            {/* Bulk Actions */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <Button
                onClick={() => handleBulkAction('PROCESSING')}
                disabled={selectedOrders.size === 0 || bulkUpdateMutation.isPending}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4" />
                Process All
              </Button>
              <Button
                onClick={() => handleBulkAction('SUCCESSFUL')}
                disabled={selectedOrders.size === 0 || bulkUpdateMutation.isPending}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete All
              </Button>
              <Button
                onClick={() => handleBulkAction('FAILED')}
                disabled={selectedOrders.size === 0 || bulkUpdateMutation.isPending}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
              >
                <XCircle className="h-4 w-4" />
                Fail All
              </Button>
              <Button
                onClick={() => handleBulkAction('CANCELLED')}
                disabled={selectedOrders.size === 0 || bulkUpdateMutation.isPending}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700"
              >
                <Slash className="h-4 w-4" />
                Cancel All
              </Button>
              <Button
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                className="flex items-center gap-2"
                variant="secondary"
              >
                <Download className="h-4 w-4" />
                Download Excel
              </Button>
              <label className="flex items-center gap-2 text-sm text-gray-400 ml-auto cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                  onChange={selectAll}
                  className="rounded border-gray-600 bg-gray-800"
                />
                Select All ({selectedOrders.size})
              </label>
            </div>
          </GlassCard>
        )}

        {/* Orders Table */}
        <GlassCard className="overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading orders...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700/50 text-xs text-gray-400 uppercase">
                    {fullTable && (
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                          onChange={selectAll}
                          className="rounded border-gray-600 bg-gray-800"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Mobile</th>
                    <th className="px-4 py-3">Product</th>
                    {fullTable && <th className="px-4 py-3">Data</th>}
                    <th className="px-4 py-3">Status</th>
                    {fullTable && (
                      <>
                        <th className="px-4 py-3">Source</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Price</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors"
                    >
                      {fullTable && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(order.id)}
                            onChange={() => toggleSelect(order.id)}
                            className="rounded border-gray-600 bg-gray-800"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 font-medium text-white">
                        {order.receiptNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {order.user.firstName} {order.user.lastName}
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-mono">
                        {order.phoneNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        <span className="font-medium text-white">{order.product.description}</span>
                        <span className="text-xs text-gray-500 ml-1">({order.product.network.name})</span>
                      </td>
                      {fullTable && (
                        <td className="px-4 py-3 text-violet-400 font-medium">
                          {order.product.description}
                        </td>
                      )}
                      <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                      {fullTable && (
                        <>
                          <td className="px-4 py-3">
                            <span className="rounded bg-violet-500/10 px-2 py-0.5 text-xs text-violet-400 border border-violet-500/20">
                              Dashboard
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3 text-emerald-400 font-medium">
                            GHS {formatCurrency(order.amount)}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* Processing Button - Blue */}
                          {order.status !== 'PROCESSING' && order.status !== 'SUCCESSFUL' && order.status !== 'CANCELLED' && (
                            <button
                              onClick={() =>
                                updateOrderStatusMutation.mutate({
                                  orderId: order.id,
                                  status: 'PROCESSING',
                                })
                              }
                              disabled={updateOrderStatusMutation.isPending}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors border border-blue-500/30"
                              title="Mark as Processing"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                          {/* Complete Button - Green */}
                          {order.status !== 'SUCCESSFUL' && order.status !== 'CANCELLED' && (
                            <button
                              onClick={() =>
                                updateOrderStatusMutation.mutate({
                                  orderId: order.id,
                                  status: 'SUCCESSFUL',
                                })
                              }
                              disabled={updateOrderStatusMutation.isPending}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors border border-emerald-500/30"
                              title="Mark as Completed"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          {/* Failed Button - Dark Red */}
                          {order.status !== 'FAILED' && order.status !== 'SUCCESSFUL' && order.status !== 'CANCELLED' && (
                            <button
                              onClick={() =>
                                updateOrderStatusMutation.mutate({
                                  orderId: order.id,
                                  status: 'FAILED',
                                })
                              }
                              disabled={updateOrderStatusMutation.isPending}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/20 text-red-500 hover:bg-red-600/30 transition-colors border border-red-600/30"
                              title="Mark as Failed"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          {/* Cancel Button - Rose */}
                          {order.status !== 'CANCELLED' && order.status !== 'SUCCESSFUL' && (
                            <button
                              onClick={() =>
                                updateOrderStatusMutation.mutate({
                                  orderId: order.id,
                                  status: 'CANCELLED',
                                })
                              }
                              disabled={updateOrderStatusMutation.isPending}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors border border-rose-500/30"
                              title="Cancel Order"
                            >
                              <Slash className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredOrders.length === 0 && (
                <p className="text-center text-gray-500 py-8">No orders found</p>
              )}
            </div>
          )}
        </GlassCard>

        {/* Order Details Modal */}
        {showDetailsModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto">
            <GlassCard className="w-full max-w-2xl p-6 m-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Order Details - {selectedOrder.receiptNumber}
              </h3>

              <div className="mb-6 p-4 rounded-lg bg-gray-900/30 border border-gray-700/50">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500">Order ID</p>
                    <p className="font-medium text-white">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Receipt Number</p>
                    <p className="font-medium text-white">{selectedOrder.receiptNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="font-medium text-white">GHS {formatCurrency(selectedOrder.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="font-medium text-white">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone Number</p>
                    <p className="font-medium text-white">{selectedOrder.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p>{getStatusBadge(selectedOrder.status)}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-semibold text-white mb-3">Product Details</h4>
                <div className="p-3 rounded-lg bg-gray-900/30 border border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {selectedOrder.product.description} ({selectedOrder.product.network.name})
                      </p>
                      <p className="text-xs text-gray-500">Bundle: {selectedOrder.product.name}</p>
                      <p className="text-xs text-gray-500">Phone: {selectedOrder.phoneNumber}</p>
                    </div>
                    <p className="text-sm font-medium text-white">GHS {formatCurrency(selectedOrder.amount)}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Update Order Status</label>
                <div className="flex gap-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-700/50 bg-slate-900/50 px-4 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="SUCCESSFUL">Successful</option>
                    <option value="FAILED">Failed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                  <Button
                    onClick={() => updateOrderStatusMutation.mutate({ orderId: selectedOrder.id, status: newStatus })}
                    disabled={updateOrderStatusMutation.isPending}
                  >
                    {updateOrderStatusMutation.isPending ? 'Updating...' : 'Update'}
                  </Button>
                </div>
              </div>

              <Button variant="secondary" className="w-full" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
            </GlassCard>
          </div>
        )}
      </DashboardShell>
    </AuthGuard>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import type { Network, Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  Search, Pencil, Trash2, X, Check, RotateCcw,
  Package, Eye, EyeOff, Tag, Filter
} from 'lucide-react';

interface AdminProductsResponse {
  products: Product[];
  networks: Network[];
}

type FormValues = {
  name: string;
  description: string;
  dataSize: string;
  sellingPrice: number;
  agentPrice: number;
  resellerPrice: number;
  buyingPrice: number;
  promoPrice?: number | null;
  networkId: string;
  showInShop: boolean;
  showForAgents: boolean;
  status: boolean;
  rolePrices: Record<string, number>;
};

const ROLE_LABELS: Record<string, string> = {
  USER: 'User',
  PREMIUM: 'Premium',
  NORMAL: 'Normal',
  SUPER: 'Super',
  OTHER: 'Other',
  AGENT: 'Agent',
  ADMIN: 'Admin',
};

const NETWORK_ORDER = ['MTN', 'Telecel', 'AirtelTigo'];

function getNetworkColor(networkName: string): string {
  const name = networkName.toUpperCase();
  if (name.includes('MTN')) return '#facc15';
  if (name.includes('TELECEL')) return '#ef4444';
  if (name.includes('AIRTEL') || name.includes('TIGO')) return '#3b82f6';
  return '#6b7280';
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [shopFilter, setShopFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [agentFilter, setAgentFilter] = useState<'all' | 'show' | 'hide'>('all');
  const [priceFilter, setPriceFilter] = useState<'all' | 'promo' | 'main'>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data } = useQuery<AdminProductsResponse>({
    queryKey: ['admin-products'],
    queryFn: () => apiRequest('/admin/products'),
  });

  const products = data?.products ?? [];
  const networks = data?.networks ?? [];

  const form = useForm<FormValues>({
    defaultValues: {
      name: '',
      description: '',
      dataSize: '',
      sellingPrice: 0,
      agentPrice: 0,
      resellerPrice: 0,
      buyingPrice: 0,
      promoPrice: null,
      networkId: '',
      showInShop: true,
      showForAgents: true,
      status: true,
      rolePrices: {},
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiRequest('/admin/products', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      setMutationError(null);
      form.reset();
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      setMutationError(err?.message || 'Failed to create product');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormValues & { id: string }) =>
      apiRequest(`/admin/products/${values.id}`, { method: 'PUT', body: JSON.stringify(values) }),
    onSuccess: () => {
      setMutationError(null);
      form.reset();
      setEditingProduct(null);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      setMutationError(err?.message || 'Failed to update product');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/admin/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: string; value: boolean }) =>
      apiRequest(`/admin/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setMutationError(null);
    const rp: Record<string, number> = {};
    product.rolePrices?.forEach((rpItem) => {
      rp[rpItem.role] = rpItem.price;
    });
    form.reset({
      name: product.name,
      description: product.description,
      dataSize: product.dataSize ?? '',
      sellingPrice: product.sellingPrice,
      agentPrice: product.agentPrice ?? 0,
      resellerPrice: product.resellerPrice ?? 0,
      buyingPrice: product.buyingPrice ?? 0,
      promoPrice: product.promoPrice ?? null,
      networkId: product.networkId ?? product.network.id,
      showInShop: product.showInShop ?? true,
      showForAgents: product.showForAgents ?? true,
      status: product.status,
      rolePrices: rp,
    });
    setShowForm(true);
  };

  const startCreate = () => {
    setEditingProduct(null);
    setMutationError(null);
    form.reset({
      name: '',
      description: '',
      dataSize: '',
      sellingPrice: 0,
      agentPrice: 0,
      resellerPrice: 0,
      buyingPrice: 0,
      promoPrice: null,
      networkId: networks[0]?.id ?? '',
      showInShop: true,
      showForAgents: true,
      status: true,
      rolePrices: {},
    });
    setShowForm(true);
  };

  const onSubmit = (values: FormValues) => {
    setMutationError(null);
    // Strip out empty/0 role prices so they don't overwrite existing values
    const cleanedRolePrices: Record<string, number> = {};
    if (values.rolePrices) {
      for (const [role, price] of Object.entries(values.rolePrices)) {
        if (price && price > 0) {
          cleanedRolePrices[role] = price;
        }
      }
    }
    const payload = { ...values, rolePrices: cleanedRolePrices };
    if (editingProduct) {
      updateMutation.mutate({ ...payload, id: editingProduct.id });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filtered = useMemo(() => {
    let list = [...products];

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.description.toLowerCase().includes(s) ||
          p.network.name.toLowerCase().includes(s)
      );
    }

    if (shopFilter !== 'all') {
      list = list.filter((p) => (shopFilter === 'open' ? p.showInShop : !p.showInShop));
    }
    if (agentFilter !== 'all') {
      list = list.filter((p) => (agentFilter === 'show' ? p.showForAgents : !p.showForAgents));
    }
    if (priceFilter !== 'all') {
      list = list.filter((p) =>
        priceFilter === 'promo' ? !!p.promoPrice : !p.promoPrice
      );
    }

    // Sort: MTN first, then Telecel, then AirtelTigo
    list.sort((a, b) => {
      const aNet = NETWORK_ORDER.findIndex((n) => a.network.name.toUpperCase().includes(n.toUpperCase()));
      const bNet = NETWORK_ORDER.findIndex((n) => b.network.name.toUpperCase().includes(n.toUpperCase()));
      if (aNet !== bNet) return aNet - bNet;
      return (a.sellingPrice ?? 0) - (b.sellingPrice ?? 0);
    });

    return list;
  }, [products, search, shopFilter, agentFilter, priceFilter]);

  const activeCount = products.filter((p) => p.status).length;
  const inactiveCount = products.filter((p) => !p.status).length;

  return (
    <AuthGuard requiredRole="ADMIN">
      <DashboardShell
        mode="admin"
        title="Product Management"
        description={`${products.length} total · ${activeCount} active · ${inactiveCount} inactive`}
      >
        {/* Create / Edit Form */}
        {showForm && (
          <GlassCard className="p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1 rounded-full bg-amber-500" />
                <h3 className="text-base font-semibold text-white">
                  {editingProduct ? 'Edit Product' : 'Create Product'}
                </h3>
                {editingProduct && (
                  <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
                    ID #{editingProduct.id.slice(-4)}
                  </span>
                )}
              </div>
              <button
                onClick={() => { setShowForm(false); setEditingProduct(null); setMutationError(null); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {mutationError && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                {mutationError}
              </div>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Row 1: Bundle + Description + Bundle Size */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Bundle</label>
                  <Input placeholder="e.g. MTN 1GB" {...form.register('name')} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Description</label>
                  <Input placeholder="e.g. 1GB data bundle" {...form.register('description')} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Bundle Size</label>
                  <Input placeholder="e.g. 1GB, 500MB" {...form.register('dataSize')} />
                </div>
              </div>

              {/* Row 2: Network + Status */}
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Network</label>
                  <select
                    {...form.register('networkId')}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
                  >
                    {networks.map((net) => (
                      <option key={net.id} value={net.id} className="bg-gray-900">
                        {net.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Selling Price (GHS)</label>
                  <Input type="number" step="0.01" placeholder="0.00" {...form.register('sellingPrice', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Promo Price (GHS)</label>
                  <Input type="number" step="0.01" placeholder="Optional" {...form.register('promoPrice', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Status</label>
                  <select
                    {...form.register('status')}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
                  >
                    <option value="true" className="bg-gray-900">Active</option>
                    <option value="false" className="bg-gray-900">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Pricing Tiers */}
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Buying Price (GHS)</label>
                  <Input type="number" step="0.01" placeholder="Cost price" {...form.register('buyingPrice', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Agent Price (GHS)</label>
                  <Input type="number" step="0.01" placeholder="Agent price" {...form.register('agentPrice', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Reseller Price (GHS)</label>
                  <Input type="number" step="0.01" placeholder="Reseller price" {...form.register('resellerPrice', { valueAsNumber: true })} />
                </div>
              </div>

              {/* Per-Account-Type Pricing */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-1 rounded-full bg-violet-500" />
                  <h4 className="text-sm font-semibold text-white">Per-Account-Type Pricing</h4>
                  <span className="text-xs text-gray-500">Leave blank to use base price</span>
                </div>
                <div className="grid gap-3 md:grid-cols-5">
                  {['USER', 'PREMIUM', 'NORMAL', 'SUPER', 'OTHER'].map((role) => (
                    <div key={role}>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                        {ROLE_LABELS[role] || role}
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="—"
                        {...form.register(`rolePrices.${role}`, { valueAsNumber: true })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('showInShop')}
                    className="rounded border-gray-600 bg-gray-800 h-4 w-4 accent-violet-500"
                  />
                  Show in Shop
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('showForAgents')}
                    className="rounded border-gray-600 bg-gray-800 h-4 w-4 accent-violet-500"
                  />
                  Show for Agents
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('status')}
                    className="rounded border-gray-600 bg-gray-800 h-4 w-4 accent-violet-500"
                  />
                  Active
                </label>
                <div className="ml-auto flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setShowForm(false); setEditingProduct(null); }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : editingProduct
                        ? 'Update Product'
                        : 'Create Product'}
                  </Button>
                </div>
              </div>
            </form>
          </GlassCard>
        )}

        {/* Add Product Button */}
        {!showForm && (
          <div className="mb-5 flex items-center justify-between">
            <Button onClick={startCreate} className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="mb-5 space-y-3">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Filter by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status filter */}
            <div className="flex items-center gap-1 rounded-lg bg-gray-800/60 border border-gray-700/40 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-gray-400">{activeCount}</span>
              <span className="h-2 w-2 rounded-full bg-rose-400 ml-1" />
              <span className="text-xs text-gray-400">{inactiveCount}</span>
            </div>

            {/* Shop filter */}
            <div className="flex items-center gap-1 rounded-lg bg-gray-800/60 border border-gray-700/40 px-1 py-1">
              <span className="px-2 text-xs text-gray-500 uppercase">Shop</span>
              {(['all', 'open', 'closed'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setShopFilter(opt)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    shopFilter === opt
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>

            {/* Agent filter */}
            <div className="flex items-center gap-1 rounded-lg bg-gray-800/60 border border-gray-700/40 px-1 py-1">
              <span className="px-2 text-xs text-gray-500 uppercase">Agents</span>
              {(['all', 'show', 'hide'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAgentFilter(opt)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    agentFilter === opt
                      ? 'bg-violet-500/20 text-violet-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>

            {/* Price filter */}
            <div className="flex items-center gap-1 rounded-lg bg-gray-800/60 border border-gray-700/40 px-1 py-1">
              <span className="px-2 text-xs text-gray-500 uppercase">Price</span>
              {(['all', 'promo', 'main'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPriceFilter(opt)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    priceFilter === opt
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>

            {/* Clear filters */}
            {(search || shopFilter !== 'all' || agentFilter !== 'all' || priceFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setShopFilter('all');
                  setAgentFilter('all');
                  setPriceFilter('all');
                }}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Product List — Cards on mobile, Table on desktop */}
        <GlassCard className="overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700/50 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 w-12">ID</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3 text-amber-400">Promo</th>
                  <th className="px-4 py-3 text-center">Shop</th>
                  <th className="px-4 py-3 text-center">Agent</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filtered.map((product, index) => {
                  const netColor = getNetworkColor(product.network.name);
                  const isInactive = !product.status;
                  return (
                    <tr
                      key={product.id}
                      className={`border-b border-gray-700/30 transition-colors ${
                        isInactive ? 'opacity-50' : 'hover:bg-gray-800/30'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">#{index + 1}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: netColor }}
                          />
                          <span className="font-medium text-white">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{product.description}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white">
                          GHS {formatCurrency(product.sellingPrice)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {product.promoPrice ? (
                          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
                            GHS {formatCurrency(product.promoPrice)}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() =>
                            toggleMutation.mutate({
                              id: product.id,
                              field: 'showInShop',
                              value: !product.showInShop,
                            })
                          }
                          disabled={toggleMutation.isPending}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            product.showInShop ? 'bg-emerald-500' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              product.showInShop ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() =>
                            toggleMutation.mutate({
                              id: product.id,
                              field: 'showForAgents',
                              value: !product.showForAgents,
                            })
                          }
                          disabled={toggleMutation.isPending}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            product.showForAgents ? 'bg-violet-500' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              product.showForAgents ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(product)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:bg-blue-500/20 hover:text-blue-400 transition-colors border border-gray-700/50"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this product?')) deleteMutation.mutate(product.id);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors border border-gray-700/50"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {filtered.map((product, index) => {
              const netColor = getNetworkColor(product.network.name);
              const isInactive = !product.status;
              return (
                <div
                  key={product.id}
                  className={`border-b border-gray-700/30 p-4 ${isInactive ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: netColor }}
                      />
                      <div>
                        <p className="text-sm font-medium text-white">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.description}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">#{index + 1}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">
                      GHS {formatCurrency(product.sellingPrice)}
                    </span>
                    {product.promoPrice && (
                      <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
                        Promo GHS {formatCurrency(product.promoPrice)}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Shop</span>
                      <button
                        onClick={() =>
                          toggleMutation.mutate({
                            id: product.id,
                            field: 'showInShop',
                            value: !product.showInShop,
                          })
                        }
                        disabled={toggleMutation.isPending}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          product.showInShop ? 'bg-emerald-500' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            product.showInShop ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Agent</span>
                      <button
                        onClick={() =>
                          toggleMutation.mutate({
                            id: product.id,
                            field: 'showForAgents',
                            value: !product.showForAgents,
                          })
                        }
                        disabled={toggleMutation.isPending}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          product.showForAgents ? 'bg-violet-500' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            product.showForAgents ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => startEdit(product)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-800 py-2 text-xs text-gray-300 hover:bg-blue-500/20 hover:text-blue-400 transition-colors border border-gray-700/50"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this product?')) deleteMutation.mutate(product.id);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-800 py-2 text-xs text-gray-300 hover:bg-rose-500/20 hover:text-rose-400 transition-colors border border-gray-700/50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-600" />
              <p className="mt-3 text-sm text-gray-500">No products found</p>
            </div>
          )}
        </GlassCard>
      </DashboardShell>
    </AuthGuard>
  );
}

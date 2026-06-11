'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Storefront, Order, Withdrawal, Product } from '@/lib/types';
import { Store, Eye, BarChart3, Users, TrendingUp, Copy, Check, Wallet, ArrowUpRight, Package, Clock, AlertCircle, Plus, Minus, Trash2 } from 'lucide-react';

export default function StorefrontPage() {
  const queryClient = useQueryClient();
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'products' | 'orders' | 'wallet' | 'withdrawals'>('settings');
  const [editPrices, setEditPrices] = useState<Record<string, string>>({});

  const { data: storefront } = useQuery({ queryKey: ['storefront'], queryFn: () => apiRequest<Storefront>('/storefront/me') });
  const { data: orders } = useQuery({ queryKey: ['storefront-orders'], queryFn: () => apiRequest<Order[]>('/storefront/orders') });
  const { data: withdrawals } = useQuery({ queryKey: ['withdrawals'], queryFn: () => apiRequest<Withdrawal[]>('/withdrawals') });
  const { data: products } = useQuery({ queryKey: ['storefront-products'], queryFn: () => apiRequest<Product[]>('/storefront/products') });

  const form = useForm<Storefront>({ values: storefront });

  const mutation = useMutation({
    mutationFn: (values: Partial<Storefront>) => apiRequest('/storefront/me', { method: 'PUT', body: JSON.stringify(values) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['storefront'] }),
  });

  const withdrawalMutation = useMutation({
    mutationFn: (values: { amount: number; method: 'MOMO' | 'BANK'; accountNumber: string; accountName: string; bankName?: string }) =>
      apiRequest('/withdrawals', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      alert('Withdrawal request submitted successfully');
    },
  });

  const addProductMutation = useMutation({
    mutationFn: ({ productId, customPrice }: { productId: string; customPrice: number }) =>
      apiRequest('/storefront/products', { method: 'POST', body: JSON.stringify({ productId, customPrice }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['storefront-products'] }),
  });

  const removeProductMutation = useMutation({
    mutationFn: (productId: string) =>
      apiRequest(`/storefront/products/${productId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['storefront-products'] }),
  });

  const copySlug = () => {
    if (storefront?.slug) {
      navigator.clipboard.writeText(`${window.location.origin}/store/${storefront.slug}`);
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 2000);
    }
  };

  return (
    <AuthGuard>
      <DashboardShell title="Storefront" description="Manage your storefront, products, orders, wallet and withdrawals.">
        <div className="space-y-5">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-800">
            {(['settings', 'products', 'orders', 'wallet', 'withdrawals'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-violet-500 text-violet-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white">Storefront Settings</h3>
                <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs text-gray-400">Storefront Slug</label>
                    <div className="flex gap-2">
                      <Input value={storefront?.slug || ''} readOnly className="bg-gray-900/50" />
                      <Button type="button" size="sm" onClick={copySlug} className="gap-2">
                        {copiedSlug ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Your unique storefront URL</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs text-gray-400">Display Name</label>
                    <Input {...form.register('displayName')} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs text-gray-400">Tagline</label>
                    <Input {...form.register('tagline')} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs text-gray-400">Description</label>
                    <Textarea rows={4} {...form.register('description')} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-400">Theme Color</label>
                    <Input {...form.register('themeColor')} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-400">Contact Email</label>
                    <Input {...form.register('contactEmail')} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-400">Contact Phone</label>
                    <Input {...form.register('contactPhone')} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-400">Instagram URL</label>
                    <Input {...form.register('instagramUrl')} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-400">X URL</label>
                    <Input {...form.register('twitterUrl')} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-400">WhatsApp URL</label>
                    <Input {...form.register('whatsappUrl')} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-400">SEO Title</label>
                    <Input {...form.register('seoTitle')} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs text-gray-400">SEO Description</label>
                    <Textarea rows={3} {...form.register('seoDescription')} />
                  </div>
                  <div className="md:col-span-2">
                    <Button className="w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save Changes'}</Button>
                  </div>
                </form>
              </GlassCard>

              <div className="space-y-5">
                <GlassCard className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{storefront?.displayName || 'Your Store'}</h3>
                      <p className="text-sm text-gray-400">{storefront?.tagline}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-400">{storefront?.description}</p>
                  {storefront?.slug && (
                    <Link href={`/store/${storefront.slug}`} className="mt-4 inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300">
                      <Eye className="h-4 w-4" /> Open Public Storefront
                    </Link>
                  )}
                </GlassCard>

                <GlassCard className="p-6">
                  <h3 className="text-base font-semibold text-white">Storefront Insights</h3>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center">
                      <Eye className="mx-auto h-5 w-5 text-sky-400" />
                      <p className="mt-2 text-2xl font-bold text-white">{storefront?.visits ?? 0}</p>
                      <p className="text-xs text-gray-500">Visits</p>
                    </div>
                    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center">
                      <Users className="mx-auto h-5 w-5 text-emerald-400" />
                      <p className="mt-2 text-2xl font-bold text-white">{storefront?.sales ?? 0}</p>
                      <p className="text-xs text-gray-500">Sales</p>
                    </div>
                    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center">
                      <TrendingUp className="mx-auto h-5 w-5 text-violet-400" />
                      <p className="mt-2 text-2xl font-bold text-white">{storefront?.conversionRate ?? 0}%</p>
                      <p className="text-xs text-gray-500">Conversion</p>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Add Products to Storefront</h3>
                  <p className="text-sm text-gray-400 mt-1">Set your own price for each product. Only products you add will appear on your storefront.</p>
                </div>
                {products && (
                  <span className="rounded-full bg-violet-600/20 px-3 py-1 text-xs font-medium text-violet-400">
                    {products.filter((p) => p.isOnStorefront).length} Active
                  </span>
                )}
              </div>

              {products && Array.isArray(products) && products.length > 0 ? (
                (() => {
                  const networkOrder = ['MTN', 'Telecel', 'AirtelTigo'];
                  const grouped = products.reduce<Record<string, Product[]>>((acc, product) => {
                    const netName = product.network.name;
                    if (!acc[netName]) acc[netName] = [];
                    acc[netName].push(product);
                    return acc;
                  }, {});

                  // Sort networks: MTN first, then Telecel, then AirtelTigo
                  const sortedNetworks = Object.keys(grouped).sort((a, b) => {
                    const aIdx = networkOrder.findIndex((n) => a.toLowerCase().includes(n.toLowerCase()));
                    const bIdx = networkOrder.findIndex((n) => b.toLowerCase().includes(n.toLowerCase()));
                    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                    if (aIdx !== -1) return -1;
                    if (bIdx !== -1) return 1;
                    return a.localeCompare(b);
                  });

                  return (
                    <>
                      {sortedNetworks.map((networkName) => {
                        const netProducts = grouped[networkName].sort(
                          (a, b) => a.sellingPrice - b.sellingPrice
                        );
                        const activeCount = netProducts.filter((p) => p.isOnStorefront).length;
                        return (
                          <GlassCard key={networkName} className="p-5">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-base font-semibold text-white">{networkName}</h4>
                              <span className="text-xs text-gray-500">
                                {activeCount} of {netProducts.length} added
                              </span>
                            </div>
                            <div className="space-y-3">
                              {netProducts.map((product) => {
                                const isActive = product.isOnStorefront;
                                const editPrice = editPrices[product.id] ?? String(product.customPrice ?? product.sellingPrice);
                                const customPrice = parseFloat(editPrice);
                                const markup = isNaN(customPrice) ? 0 : customPrice - product.sellingPrice;

                                return (
                                  <div
                                    key={product.id}
                                    className={`flex flex-col gap-3 rounded-xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                                      isActive
                                        ? 'border-violet-500/30 bg-violet-600/5'
                                        : 'border-gray-800 bg-gray-900/30'
                                    }`}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-white">
                                        {product.name} {product.description}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        Base: GHS {formatCurrency(product.sellingPrice)}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <div className="flex flex-col gap-1">
                                        <label className="text-[10px] uppercase tracking-wider text-gray-500">Your Price</label>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-400">GHS</span>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            className="w-24 bg-gray-900"
                                            value={editPrice}
                                            disabled={isActive && addProductMutation.isPending}
                                            onChange={(e) =>
                                              setEditPrices((prev) => ({
                                                ...prev,
                                                [product.id]: e.target.value,
                                              }))
                                            }
                                          />
                                        </div>
                                        {markup > 0 && !isNaN(markup) && (
                                          <span className="text-[10px] text-emerald-400">
                                            +GHS {formatCurrency(markup)} profit
                                          </span>
                                        )}
                                      </div>

                                      {isActive ? (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          className="gap-1 bg-rose-600 hover:bg-rose-700 text-white border-0"
                                          disabled={removeProductMutation.isPending}
                                          onClick={() => removeProductMutation.mutate(product.id)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          Remove
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          className="gap-1 bg-violet-600 hover:bg-violet-500"
                                          disabled={addProductMutation.isPending || !customPrice || customPrice <= 0}
                                          onClick={() =>
                                            addProductMutation.mutate({
                                              productId: product.id,
                                              customPrice,
                                            })
                                          }
                                        >
                                          <Plus className="h-3.5 w-3.5" />
                                          Add
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </GlassCard>
                        );
                      })}
                    </>
                  );
                })()
              ) : (
                <GlassCard className="p-8 text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                  <p className="text-gray-400">No products available yet</p>
                  <p className="text-sm text-gray-500 mt-1">Admin will add products for you to sell</p>
                </GlassCard>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Storefront Orders</h3>
              {orders && orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/30 p-4">
                      <div className="flex-1">
                        <p className="font-medium text-white">{order.product.name}</p>
                        <p className="text-sm text-gray-400">{order.phoneNumber} • {new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-white">{formatCurrency(order.amount)}</p>
                          <Badge value={order.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-8 text-center">
                  <Clock className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                  <p className="text-gray-400">No orders yet</p>
                  <p className="text-sm text-gray-500 mt-1">Orders from your storefront will appear here</p>
                </div>
              )}
            </GlassCard>
          )}

          {/* Wallet Tab */}
          {activeTab === 'wallet' && (
            <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Storefront Wallet</h3>
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-6">
                    <p className="text-sm text-gray-400">Commission Balance</p>
                    <p className="mt-2 text-4xl font-bold text-violet-400">GHS {Number(0).toFixed(2)}</p>
                    <p className="mt-1 text-xs text-gray-500">Earnings from storefront sales</p>
                  </div>
                  <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-6">
                    <p className="text-sm text-gray-400">Pending Commissions</p>
                    <p className="mt-2 text-2xl font-bold text-white">GHS {Number(0).toFixed(2)}</p>
                    <p className="mt-1 text-xs text-gray-500">Waiting for order completion</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h3 className="text-base font-semibold text-white mb-4">Commission Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/30 p-3">
                    <span className="text-sm text-gray-400">Today</span>
                    <span className="font-semibold text-white">GHS 0.00</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/30 p-3">
                    <span className="text-sm text-gray-400">This Week</span>
                    <span className="font-semibold text-white">GHS 0.00</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/30 p-3">
                    <span className="text-sm text-gray-400">This Month</span>
                    <span className="font-semibold text-white">GHS 0.00</span>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Withdrawals Tab */}
          {activeTab === 'withdrawals' && (
            <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Request Withdrawal</h3>
                <form className="space-y-4" onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  withdrawalMutation.mutate({
                    amount: Number(formData.get('amount')),
                    method: formData.get('method') as 'MOMO' | 'BANK',
                    accountNumber: formData.get('accountNumber') as string,
                    accountName: formData.get('accountName') as string,
                    bankName: formData.get('bankName') as string | undefined,
                  });
                }}>
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-400">Amount (GHS)</label>
                    <Input type="number" name="amount" placeholder="0.00" step="0.01" required />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-400">Withdrawal Method</label>
                    <select name="method" className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white outline-none focus:border-violet-500">
                      <option value="MOMO">MTN Mobile Money</option>
                      <option value="BANK">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-400">Account Name</label>
                    <Input name="accountName" placeholder="Full name" required />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-400">Account Number / Phone</label>
                    <Input name="accountNumber" placeholder="0551234567 or account number" required />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-400">Bank Name (if Bank Transfer)</label>
                    <Input name="bankName" placeholder="e.g., GCB Bank" />
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={withdrawalMutation.isPending}>
                    <ArrowUpRight className="h-4 w-4" />
                    {withdrawalMutation.isPending ? 'Processing...' : 'Request Withdrawal'}
                  </Button>
                </form>
              </GlassCard>

              <GlassCard className="p-6">
                <h3 className="text-base font-semibold text-white mb-4">Withdrawal History</h3>
                {withdrawals && withdrawals.length > 0 ? (
                  <div className="space-y-3">
                    {withdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="rounded-lg border border-gray-800 bg-gray-900/30 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">{formatCurrency(withdrawal.amount)}</p>
                            <p className="text-xs text-gray-500">{withdrawal.method}</p>
                          </div>
                          <Badge value={withdrawal.status} />
                        </div>
                        <p className="mt-2 text-xs text-gray-500">{new Date(withdrawal.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <AlertCircle className="mx-auto h-8 w-8 text-gray-600 mb-2" />
                    <p className="text-sm text-gray-400">No withdrawals yet</p>
                  </div>
                )}
              </GlassCard>
            </div>
          )}
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}

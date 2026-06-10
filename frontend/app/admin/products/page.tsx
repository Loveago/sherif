'use client';

import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { DataTableCard } from '@/components/dashboard/data-table-card';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import type { Network, Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

type AdminProductsResponse = { products: Product[]; networks: Network[] };
type FormValues = {
  name: string;
  description: string;
  dataSize: string;
  sellingPrice: number;
  agentPrice: number;
  resellerPrice: number;
  buyingPrice: number;
  networkId: string;
  status: boolean;
};

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({ defaultValues: { status: true } as FormValues });
  const { data } = useQuery({ queryKey: ['admin-products'], queryFn: () => apiRequest<AdminProductsResponse>('/admin/products') });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => apiRequest('/admin/products', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/admin/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return (
    <AuthGuard requiredRole="ADMIN">
      <DashboardShell mode="admin" title="Product Management" description="Create and retire products. Changes flow straight into agent dashboards and public storefronts.">
        <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <GlassCard className="p-6">
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
              <Input placeholder="Product name" {...form.register('name')} />
              <Textarea rows={4} placeholder="Description" {...form.register('description')} />
              <Input placeholder="Data size e.g. 2GB" {...form.register('dataSize')} />
              <div className="grid gap-3 md:grid-cols-2">
                <Input type="number" step="0.01" placeholder="Selling Price" {...form.register('sellingPrice', { valueAsNumber: true })} />
                <Input type="number" step="0.01" placeholder="Agent Price" {...form.register('agentPrice', { valueAsNumber: true })} />
                <Input type="number" step="0.01" placeholder="Reseller Price" {...form.register('resellerPrice', { valueAsNumber: true })} />
                <Input type="number" step="0.01" placeholder="Buying Price" {...form.register('buyingPrice', { valueAsNumber: true })} />
              </div>
              <Select {...form.register('networkId')}>
                <option value="">Select Network</option>
                {(data?.networks ?? []).map((network) => (
                  <option key={network.id} value={network.id} className="bg-slate-950">{network.name}</option>
                ))}
              </Select>
              <Button className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Product'}</Button>
            </form>
          </GlassCard>

          <DataTableCard
            title="Catalog"
            columns={['Product', 'Network', 'Price', 'Buying', 'Action']}
            rows={(data?.products ?? []).map((product) => [
              product.name,
              product.network.name,
              formatCurrency(product.sellingPrice),
              formatCurrency(product.buyingPrice),
              <button key={`${product.id}-delete`} className="text-sm text-rose-300" onClick={() => deleteMutation.mutate(product.id)}>Delete</button>,
            ])}
          />
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}

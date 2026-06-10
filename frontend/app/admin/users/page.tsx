'use client';

import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { DataTableCard } from '@/components/dashboard/data-table-card';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import type { User } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

type CreditFormValues = { userId: string; amount: number; description: string };

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const form = useForm<CreditFormValues>();
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: () => apiRequest<User[]>('/admin/users') });

  const creditMutation = useMutation({
    mutationFn: (values: CreditFormValues) => apiRequest('/admin/wallets/credit', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return (
    <AuthGuard requiredRole="ADMIN">
      <DashboardShell mode="admin" title="User Directory" description="View agents and administrators, inspect balances, storefronts and credit wallets when needed.">
        <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
          <GlassCard className="p-6">
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => creditMutation.mutate(values))}>
              <Input placeholder="User ID" {...form.register('userId')} />
              <Input type="number" step="0.01" placeholder="Amount" {...form.register('amount', { valueAsNumber: true })} />
              <Input placeholder="Adjustment Description" {...form.register('description')} />
              <Button className="w-full" disabled={creditMutation.isPending}>{creditMutation.isPending ? 'Crediting...' : 'Credit Wallet'}</Button>
            </form>
          </GlassCard>

          <DataTableCard
            title="Users"
            columns={['Name', 'Email', 'Role', 'Wallet', 'Storefront']}
            rows={users.map((user) => [
              `${user.firstName} ${user.lastName}`,
              user.email,
              user.role,
              formatCurrency(Number(user.wallet?.availableBalance ?? 0)),
              user.storefront?.slug || '—',
            ])}
          />
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}

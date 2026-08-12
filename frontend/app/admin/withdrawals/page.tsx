'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Withdrawal } from '@/lib/types';
import { CheckCircle, ChevronLeft, ChevronRight, Search, XCircle } from 'lucide-react';

type AdminWithdrawal = Withdrawal & {
  user: { id: string; firstName: string; lastName: string; email: string; phone: string };
};

type WithdrawalResponse = {
  withdrawals: AdminWithdrawal[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: { pendingCount: number; pendingAmount: number };
};

type StatusFilter = '' | 'PENDING' | 'REVIEW' | 'APPROVED' | 'PAID' | 'REJECTED';

export default function AdminWithdrawalsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');

  const query = useQuery({
    queryKey: ['admin-withdrawals-page', status, source, search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);
      if (source) params.set('source', source);
      if (search) params.set('search', search);
      return apiRequest<WithdrawalResponse>(`/admin/withdrawals?${params.toString()}`);
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-withdrawals-page'] });
    queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/admin/withdrawals/${id}/approve`, { method: 'POST' }),
    onSuccess: refresh,
  });
  const paidMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/admin/withdrawals/${id}/paid`, { method: 'POST' }),
    onSuccess: refresh,
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/admin/withdrawals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Rejected by administrator' }),
    }),
    onSuccess: refresh,
  });

  const withdrawals = query.data?.withdrawals ?? [];
  const pagination = query.data?.pagination;
  const summary = query.data?.summary;
  const isMutating = approveMutation.isPending || paidMutation.isPending || rejectMutation.isPending;

  const showingLabel = useMemo(() => {
    if (!pagination || pagination.total === 0) return 'No requests found';
    const first = (pagination.page - 1) * pagination.limit + 1;
    const last = Math.min(pagination.page * pagination.limit, pagination.total);
    return `Showing ${first}-${last} of ${pagination.total}`;
  }, [pagination]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const resetFilters = () => {
    setStatus('PENDING');
    setSource('');
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  const confirmAction = (withdrawal: AdminWithdrawal, action: 'approve' | 'paid' | 'reject') => {
    const destination = `${withdrawal.accountName} — ${withdrawal.accountNumber}`;
    if (action === 'paid') {
      const confirmed = window.confirm(
        `Confirm payout\n\nAmount: ${formatCurrency(Number(withdrawal.amount))}\nRecipient: ${destination}\nMethod: ${withdrawal.method}\nReference: ${withdrawal.reference}\n\nOnly confirm after the transfer is complete.`,
      );
      if (confirmed) paidMutation.mutate(withdrawal.id);
      return;
    }

    if (action === 'approve') {
      if (window.confirm(`Approve ${formatCurrency(Number(withdrawal.amount))} for ${destination}?`)) {
        approveMutation.mutate(withdrawal.id);
      }
      return;
    }

    if (window.confirm(`Reject this withdrawal and return ${formatCurrency(Number(withdrawal.amount))} to the agent wallet?`)) {
      rejectMutation.mutate(withdrawal.id);
    }
  };

  return (
    <AuthGuard requiredRole="ADMIN">
      <DashboardShell mode="admin" title="Withdrawals" description="Review agent payout requests and record completed transfers safely.">
        <div className="grid gap-4 md:grid-cols-2">
          <GlassCard className="p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500">Pending payout requests</p>
            <p className="mt-2 text-3xl font-bold text-amber-300">{summary?.pendingCount ?? 0}</p>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500">Pending payout amount</p>
            <p className="mt-2 text-3xl font-bold text-white">{formatCurrency(Number(summary?.pendingAmount ?? 0))}</p>
          </GlassCard>
        </div>

        <GlassCard className="mt-5 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <form onSubmit={submitSearch} className="flex flex-1 gap-2">
              <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name, email, number, or reference" />
              <Button type="submit" variant="secondary" aria-label="Search withdrawals"><Search className="h-4 w-4" /></Button>
            </form>
            <div className="flex flex-wrap gap-2">
              <select value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); setPage(1); }} className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white">
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="REVIEW">Review</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <select value={source} onChange={(event) => { setSource(event.target.value); setPage(1); }} className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white">
                <option value="">All wallets</option>
                <option value="STOREFRONT_WALLET">Storefront</option>
                <option value="MAIN_WALLET">Main wallet</option>
              </select>
              <Button type="button" variant="outline" onClick={resetFilters}>Reset</Button>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left">
              <thead>
                <tr className="border-b border-gray-800 text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-3">Agent</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Payout details</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="border-b border-gray-800/50 align-top hover:bg-gray-800/30">
                    <td className="px-3 py-4"><p className="font-medium text-white">{withdrawal.user.firstName} {withdrawal.user.lastName}</p><p className="text-xs text-gray-500">{withdrawal.user.email}</p><p className="mt-1 text-xs text-gray-600">{withdrawal.reference}</p></td>
                    <td className="px-3 py-4 font-semibold text-white">{formatCurrency(Number(withdrawal.amount))}</td>
                    <td className="px-3 py-4"><p className="text-sm text-violet-300">{withdrawal.method}</p><p className="text-sm font-medium text-white">{withdrawal.accountName}</p><p className="font-mono text-sm text-gray-300">{withdrawal.accountNumber}</p>{withdrawal.bankName && <p className="text-xs text-gray-500">{withdrawal.bankName}</p>}</td>
                    <td className="px-3 py-4 text-sm text-gray-300">{withdrawal.source === 'STOREFRONT_WALLET' ? 'Storefront' : 'Main wallet'}</td>
                    <td className="px-3 py-4"><Badge value={withdrawal.status} /><p className="mt-1 text-xs text-gray-600">{new Date(withdrawal.createdAt).toLocaleDateString()}</p></td>
                    <td className="px-3 py-4"><div className="flex flex-wrap gap-2 text-xs">
                      {(withdrawal.status === 'PENDING' || withdrawal.status === 'REVIEW') && <button disabled={isMutating} onClick={() => confirmAction(withdrawal, 'approve')} className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-amber-300 disabled:opacity-50"><CheckCircle className="h-3.5 w-3.5" />Approve</button>}
                      {withdrawal.status === 'APPROVED' && <button disabled={isMutating} onClick={() => confirmAction(withdrawal, 'paid')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-emerald-300 disabled:opacity-50"><CheckCircle className="h-3.5 w-3.5" />Mark paid</button>}
                      {(withdrawal.status === 'PENDING' || withdrawal.status === 'REVIEW') && <button disabled={isMutating} onClick={() => confirmAction(withdrawal, 'reject')} className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-rose-300 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" />Reject</button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {withdrawals.length === 0 && <p className="py-12 text-center text-sm text-gray-500">{query.isLoading ? 'Loading withdrawals...' : 'No withdrawal requests match these filters.'}</p>}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>{showingLabel}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={!pagination || pagination.page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <span>Page {pagination?.page ?? 1} of {pagination?.totalPages || 1}</span>
              <Button size="sm" variant="outline" disabled={!pagination || pagination.page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </GlassCard>
      </DashboardShell>
    </AuthGuard>
  );
}

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import type { Wallet, Withdrawal } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, CreditCard, Smartphone } from 'lucide-react';

type FundFormValues = { amount: number; method: 'PAYSTACK' | 'MTN_MOMO' };
type WithdrawFormValues = { amount: number; method: 'MTN Mobile Money' | 'Bank Transfer'; accountName: string; accountNumber: string; bankName?: string };

export default function WalletPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'fund' | 'withdraw'>('fund');
  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: () => apiRequest<Wallet>('/wallet') });
  const { data: withdrawals = [] } = useQuery({ queryKey: ['withdrawals'], queryFn: () => apiRequest<Withdrawal[]>('/withdrawals') });
  const fundForm = useForm<FundFormValues>({ defaultValues: { amount: 100, method: 'PAYSTACK' } });
  const withdrawForm = useForm<WithdrawFormValues>({ defaultValues: { amount: 50, method: 'MTN Mobile Money', accountName: '', accountNumber: '', bankName: '' } });

  const fundMutation = useMutation({
    mutationFn: async (values: FundFormValues) => {
      if (values.method === 'PAYSTACK') {
        const response = await apiRequest<{ authorization_url: string; access_code: string; reference: string }>('/wallet/paystack/initialize', {
          method: 'POST',
          body: JSON.stringify({ amount: values.amount, method: 'PAYSTACK' }),
        });
        
        if (response?.authorization_url) {
          window.location.href = response.authorization_url;
          return response;
        }
        throw new Error('Failed to initialize payment');
      }
      
      return apiRequest('/wallet/fund', { method: 'POST', body: JSON.stringify(values) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (values: WithdrawFormValues) => apiRequest('/wallet/withdraw', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
    },
  });

  return (
    <AuthGuard>
      <DashboardShell title="Wallet" description="Fund your wallet, review statements, and request withdrawals.">
        <div className="grid gap-5 xl:grid-cols-3">
          {/* Balance Card */}
          <GlassCard className="p-6 xl:col-span-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
                <WalletIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Available Balance</p>
                <h2 className="text-2xl font-bold text-white">{formatCurrency(Number(wallet?.availableBalance ?? 0))}</h2>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">Pending: {formatCurrency(Number(wallet?.pendingBalance ?? 0))}</p>

            {/* Tabs */}
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setActiveTab('fund')}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'fund' ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Fund Wallet
              </button>
              <button
                onClick={() => setActiveTab('withdraw')}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'withdraw' ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Withdraw
              </button>
            </div>

            {/* Fund Form */}
            {activeTab === 'fund' && (
              <form className="mt-4 space-y-3" onSubmit={fundForm.handleSubmit((values) => fundMutation.mutate(values))}>
                <div>
                  <label className="mb-1.5 block text-xs text-gray-400">Amount (GHS)</label>
                  <Input type="number" step="0.01" {...fundForm.register('amount', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-gray-400">Payment Method</label>
                  <Select {...fundForm.register('method')}>
                    <option value="PAYSTACK" className="bg-gray-900">Paystack</option>
                    <option value="MTN_MOMO" className="bg-gray-900">MTN Mobile Money</option>
                  </Select>
                </div>
                <Button className="w-full" disabled={fundMutation.isPending}>
                  {fundMutation.isPending ? 'Funding...' : 'Fund Wallet'}
                </Button>
              </form>
            )}

            {/* Withdraw Form */}
            {activeTab === 'withdraw' && (
              <form className="mt-4 space-y-3" onSubmit={withdrawForm.handleSubmit((values) => withdrawMutation.mutate(values))}>
                <div>
                  <label className="mb-1.5 block text-xs text-gray-400">Amount (GHS)</label>
                  <Input type="number" step="0.01" {...withdrawForm.register('amount', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-gray-400">Method</label>
                  <Select {...withdrawForm.register('method')}>
                    <option value="MTN Mobile Money" className="bg-gray-900">MTN Mobile Money</option>
                    <option value="Bank Transfer" className="bg-gray-900">Bank Transfer</option>
                  </Select>
                </div>
                <Input placeholder="Account Name" {...withdrawForm.register('accountName')} />
                <Input placeholder="Account Number" {...withdrawForm.register('accountNumber')} />
                <Input placeholder="Bank Name" {...withdrawForm.register('bankName')} />
                <Button className="w-full" variant="secondary" disabled={withdrawMutation.isPending}>
                  {withdrawMutation.isPending ? 'Submitting...' : 'Request Withdrawal'}
                </Button>
              </form>
            )}
          </GlassCard>

          {/* Transaction History */}
          <div className="xl:col-span-2">
            <GlassCard className="p-5">
              <h3 className="text-base font-semibold text-white">Wallet Ledger</h3>
              <div className="mt-4 space-y-2">
                {(wallet?.transactions ?? []).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        transaction.type === 'CREDIT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {transaction.type === 'CREDIT' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{transaction.description}</p>
                        <p className="text-xs text-gray-500">{transaction.reference}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        transaction.type === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {transaction.type === 'CREDIT' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {(!wallet?.transactions || wallet.transactions.length === 0) && (
                  <p className="py-8 text-center text-sm text-gray-500">No transactions yet</p>
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="mt-5">
          <GlassCard className="p-5">
            <h3 className="text-base font-semibold text-white">Withdrawal History</h3>
            <div className="mt-4 space-y-2">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{withdrawal.method}</p>
                      <p className="text-xs text-gray-500">{withdrawal.accountName} • {withdrawal.accountNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{formatCurrency(withdrawal.amount)}</p>
                    <Badge value={withdrawal.status} />
                  </div>
                </div>
              ))}
              {withdrawals.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-500">No withdrawals yet</p>
              )}
            </div>
          </GlassCard>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}

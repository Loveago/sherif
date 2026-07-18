'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import type { Wallet, Withdrawal, Payment } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, CreditCard, Smartphone, MessageCircle, Copy, CheckCircle, XCircle, Loader2, RefreshCw, Store, Lock, AlertTriangle } from 'lucide-react';

type FundFormValues = { amount: number; method: 'PAYSTACK' | 'MTN_MOMO' };
type WithdrawFormValues = { amount: number; method: 'MTN Mobile Money' | 'Bank Transfer'; accountName: string; accountNumber: string; bankName?: string };
type PublicSettings = { momoNumber: string; momoName: string; momoEnabled: boolean };

export default function WalletPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'fund' | 'withdraw'>('fund');
  const [copied, setCopied] = useState(false);
  const [momoClaimed, setMomoClaimed] = useState(false);

  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: () => apiRequest<Wallet>('/wallet') });
  const { data: withdrawals = [] } = useQuery({ queryKey: ['withdrawals'], queryFn: () => apiRequest<Withdrawal[]>('/withdrawals') });
  const { data: publicSettings } = useQuery({ queryKey: ['public-settings'], queryFn: () => apiRequest<PublicSettings>('/admin/settings/public') });

  const fundForm = useForm<FundFormValues>({ defaultValues: { amount: 100, method: 'PAYSTACK' } });
  const withdrawForm = useForm<WithdrawFormValues>({ defaultValues: { amount: 50, method: 'MTN Mobile Money', accountName: '', accountNumber: '', bankName: '' } });
  const selectedMethod = fundForm.watch('method');

  const [fundError, setFundError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const fundMutation = useMutation({
    mutationFn: async (values: FundFormValues) => {
      setFundError(null);
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

      // MoMo: create pending payment
      return apiRequest('/wallet/fund', { method: 'POST', body: JSON.stringify(values) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      setFundError(error?.message || 'Failed to fund wallet. Please try again.');
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: (paymentId: string) =>
      apiRequest(`/wallet/payments/${paymentId}/verify`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (values: WithdrawFormValues) => apiRequest('/wallet/withdraw', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
    },
    onError: (error: any) => {
      setWithdrawError(error?.message || 'Withdrawal failed. Please try again.');
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
              <>
                {/* Paystack form */}
                {selectedMethod === 'PAYSTACK' && (
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
                    {fundError && (
                      <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                        {fundError}
                      </p>
                    )}
                    <Button type="submit" className="w-full" disabled={fundMutation.isPending}>
                      {fundMutation.isPending ? 'Funding...' : 'Fund Wallet'}
                    </Button>
                  </form>
                )}

                {/* MoMo Manual Instructions */}
                {selectedMethod === 'MTN_MOMO' && (
                  <div className="mt-4 space-y-3">
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

                    {momoClaimed ? (
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                        <CheckCircle className="mx-auto h-8 w-8 text-emerald-400" />
                        <h3 className="mt-2 text-sm font-bold text-white">Request Submitted!</h3>
                        <p className="mt-1 text-xs text-gray-400">
                          Your funding request has been recorded. Please send the money to the MoMo number below and then chat the admin to claim it.
                        </p>
                        <Link href="/chat" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500">
                          <MessageCircle className="h-4 w-4" />
                          Chat Admin to Claim
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-2xl border border-violet-500/20 bg-violet-600/10 p-4 space-y-3">
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-violet-400" />
                            Manual MoMo Transfer
                          </h3>
                          <p className="text-xs text-gray-400 leading-relaxed">
                            1. Send <span className="text-white font-semibold">GHS {fundForm.watch('amount')}</span> to the admin MoMo number below.
                            <br />
                            2. After sending, click <strong>"I've Sent the Money"</strong> below.
                            <br />
                            3. Then <strong>chat the admin</strong> to claim your deposit.
                          </p>

                          {publicSettings?.momoNumber ? (
                            <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-3">
                              <p className="text-[10px] uppercase tracking-wider text-gray-500">MoMo Number</p>
                              <div className="mt-1 flex items-center justify-between">
                                <p className="text-lg font-bold text-white">{publicSettings.momoNumber}</p>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(publicSettings.momoNumber)}
                                  className="flex items-center gap-1 rounded-lg bg-gray-800 px-2 py-1 text-[10px] text-gray-300 transition-colors hover:bg-gray-700"
                                >
                                  {copied ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                  {copied ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                              {publicSettings.momoName && (
                                <p className="mt-0.5 text-xs text-gray-400">Name: <span className="text-white">{publicSettings.momoName}</span></p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-amber-400">MoMo details not set yet. Please contact admin.</p>
                          )}
                        </div>

                        {fundError && (
                          <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                            {fundError}
                          </p>
                        )}

                        <Button
                          type="button"
                          className="w-full"
                          disabled={fundMutation.isPending || !publicSettings?.momoNumber}
                          onClick={fundForm.handleSubmit((values) => {
                            fundMutation.mutate(values, {
                              onSuccess: () => setMomoClaimed(true),
                            });
                          })}
                        >
                          {fundMutation.isPending ? 'Submitting...' : "I've Sent the Money"}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Withdraw Form */}
            {activeTab === 'withdraw' && (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-center">
                  <Lock className="mx-auto h-8 w-8 text-amber-400" />
                  <h3 className="mt-2 text-sm font-bold text-white">Main Wallet Withdrawals Locked</h3>
                  <p className="mt-1 text-xs text-gray-400 leading-relaxed">
                    Withdrawals from the main wallet are currently disabled. Storefront commissions are deposited into your storefront wallet, where withdrawals are available.
                  </p>
                  <Link href="/storefront" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500">
                    <Store className="h-4 w-4" />
                    Go to Storefront Wallet
                  </Link>
                </div>
              </div>
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

        {/* Pending / Failed Deposits – Manual Verify */}
        {wallet?.pendingPayments && wallet.pendingPayments.length > 0 && (
          <div className="mt-5">
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-semibold text-white">Pending Deposits</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                If you were redirected to Paystack and your deposit did not credit automatically,
                click <strong>Verify Payment</strong> below for the affected deposit. We will check with
                Paystack and credit your wallet instantly if the payment was successful.
              </p>
              <div className="space-y-2">
                {wallet.pendingPayments.map((payment: Payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        payment.status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {payment.status === 'PENDING'
                          ? <Loader2 className="h-4 w-4" />
                          : <XCircle className="h-4 w-4" />
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{formatCurrency(payment.amount)}</p>
                          <Badge value={payment.status} />
                        </div>
                        <p className="text-xs text-gray-500">
                          Ref: {payment.reference} &middot; {new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={verifyPaymentMutation.isPending && verifyPaymentMutation.variables === payment.id}
                      onClick={() => verifyPaymentMutation.mutate(payment.id)}
                    >
                      <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${
                        verifyPaymentMutation.isPending && verifyPaymentMutation.variables === payment.id ? 'animate-spin' : ''
                      }`} />
                      {verifyPaymentMutation.isPending && verifyPaymentMutation.variables === payment.id
                        ? 'Verifying...'
                        : 'Verify Payment'}
                    </Button>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}
      </DashboardShell>
    </AuthGuard>
  );
}

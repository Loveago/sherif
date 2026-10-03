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
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Smartphone,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Store,
  Lock,
  AlertTriangle,
  Zap,
  Check,
  Hash,
  ArrowRight,
  History,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

type FundMethod = 'SEND_CLAIM' | 'PAYSTACK';
type PaystackFormValues = { amount: number };
type SendClaimFormValues = {
  transactionReference: string;
  amount?: number;
  network?: string;
  senderPhone?: string;
};

interface SendClaimSettings {
  id: string;
  enabled: boolean;
  network: string;
  momoNumber: string;
  accountName: string;
  instructions?: string | null;
  minimumAmount: number;
  maximumAmount: number;
  claimExpiryHours: number;
}

interface ClaimResult {
  claimId: string;
  amount: number;
  network: string;
  transactionReference: string;
  newBalance: number;
  creditedAt: string;
}

interface UserClaimHistoryItem {
  id: string;
  transactionReference: string;
  claimedAmount: number;
  network: string;
  status: string;
  rejectionReason?: string | null;
  createdAt: string;
  walletTransaction?: {
    id: string;
    reference: string;
    balanceBefore: number;
    balanceAfter: number;
  } | null;
}

export default function WalletPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'fund' | 'withdraw'>('fund');
  const [fundMethod, setFundMethod] = useState<FundMethod>('SEND_CLAIM');
  const [historyTab, setHistoryTab] = useState<'ledger' | 'claims' | 'withdrawals'>('claims');
  const [copied, setCopied] = useState(false);

  // Send & Claim states
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Queries
  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => apiRequest<Wallet>('/wallet'),
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: () => apiRequest<Withdrawal[]>('/withdrawals'),
  });

  const { data: sendClaimSettings } = useQuery({
    queryKey: ['send-claim-settings'],
    queryFn: async () => {
      const res = await apiRequest<{ settings: SendClaimSettings }>('/wallet/send-claim/settings');
      return res?.settings;
    },
  });

  const { data: claimsHistory, refetch: refetchClaimsHistory } = useQuery({
    queryKey: ['user-claims-history'],
    queryFn: () =>
      apiRequest<{ data: UserClaimHistoryItem[]; total: number; page: number; pages: number }>(
        '/wallet/send-claim/history?page=1&pageSize=20',
      ),
  });

  // Forms
  const paystackForm = useForm<PaystackFormValues>({ defaultValues: { amount: 100 } });
  const claimForm = useForm<SendClaimFormValues>({
    defaultValues: {
      transactionReference: '',
      network: 'MTN',
    },
  });

  const [paystackError, setPaystackError] = useState<string | null>(null);

  // Paystack Funding Mutation
  const paystackMutation = useMutation({
    mutationFn: async (values: PaystackFormValues) => {
      setPaystackError(null);
      const response = await apiRequest<{ authorization_url: string; access_code: string; reference: string }>(
        '/wallet/paystack/initialize',
        {
          method: 'POST',
          body: JSON.stringify({ amount: values.amount, method: 'PAYSTACK' }),
        },
      );

      if (response?.authorization_url) {
        window.location.href = response.authorization_url;
        return response;
      }
      throw new Error('Failed to initialize payment gateway');
    },
    onError: (error: any) => {
      setPaystackError(error?.message || 'Failed to initialize payment. Please try again.');
    },
  });

  // Send & Claim Mutation
  const claimMutation = useMutation({
    mutationFn: async (values: SendClaimFormValues) => {
      setClaimError(null);
      setClaimResult(null);
      const res = await apiRequest<{ claim: ClaimResult; message: string }>('/wallet/send-claim', {
        method: 'POST',
        body: JSON.stringify({
          transactionReference: values.transactionReference.trim(),
          amount: values.amount ? Number(values.amount) : undefined,
          network: values.network || 'MTN',
          senderPhone: values.senderPhone?.trim() || undefined,
        }),
      });
      return res.claim;
    },
    onSuccess: (claim) => {
      setClaimResult(claim);
      claimForm.reset({ transactionReference: '', amount: undefined, network: 'MTN' });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      refetchClaimsHistory();
    },
    onError: (error: any) => {
      setClaimError(
        error?.message ||
          "We couldn't verify this transaction yet. Please check your Transaction ID or allow 1-2 minutes for the mobile network confirmation SMS to arrive.",
      );
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getClaimStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return <Badge variant="success">APPROVED</Badge>;
      case 'PENDING':
        return <Badge variant="warning">PENDING</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">REJECTED</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AuthGuard>
      <DashboardShell
        title="Wallet & Top-Ups"
        description="Instant Mobile Money Send & Claim, Paystack gateway, and financial ledger."
      >
        {/* Top Wallet Overview Bar */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Main Balance Card */}
          <GlassCard className="relative overflow-hidden p-6 lg:col-span-1 border border-white/[0.08] bg-gradient-to-br from-slate-900/90 via-[#0d1527]/90 to-slate-900/90 shadow-xl">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Available Balance</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/20">
                <WalletIcon className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="mt-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-white">
                {formatCurrency(Number(wallet?.availableBalance ?? 0))}
              </h2>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <span>Pending Balance:</span>
                <span className="font-semibold text-slate-300">
                  {formatCurrency(Number(wallet?.pendingBalance ?? 0))}
                </span>
              </div>
            </div>

            {/* Quick Mode Toggle */}
            <div className="mt-6 flex rounded-xl bg-white/[0.04] p-1 border border-white/[0.05]">
              <button
                onClick={() => setActiveTab('fund')}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                  activeTab === 'fund'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Top-Up Wallet
              </button>
              <button
                onClick={() => setActiveTab('withdraw')}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                  activeTab === 'withdraw'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Withdrawals
              </button>
            </div>
          </GlassCard>

          {/* Funding Area */}
          <div className="lg:col-span-2">
            {activeTab === 'fund' && (
              <GlassCard className="p-6 border border-white/[0.08] bg-slate-900/60 shadow-xl">
                {/* Funding Method Selector Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4 mb-5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFundMethod('SEND_CLAIM')}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        fundMethod === 'SEND_CLAIM'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <Zap className="h-3.5 w-3.5 text-emerald-400" />
                      Send &amp; Claim (Instant MoMo)
                      <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-300 tracking-wider">
                        Zero Fee
                      </span>
                    </button>

                    <button
                      onClick={() => setFundMethod('PAYSTACK')}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        fundMethod === 'PAYSTACK'
                          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <CreditCard className="h-3.5 w-3.5 text-violet-400" />
                      Paystack Online
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Currency: <strong className="text-white">GHS (Ghana Cedi)</strong>
                  </span>
                </div>

                {/* METHOD 1: Send & Claim */}
                {fundMethod === 'SEND_CLAIM' && (
                  <div className="space-y-5">
                    {/* Send Details Info Box */}
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.06] to-cyan-500/[0.04] p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <Smartphone className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">Manual Transfer &amp; Instant Automated Clearing</h4>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-300 leading-relaxed">
                              {sendClaimSettings?.instructions ||
                                'Transfer Mobile Money to the number below, then paste your Transaction ID to get credited instantly.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Recipient Details */}
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Network</p>
                          <p className="mt-0.5 text-sm font-bold text-white">
                            {sendClaimSettings?.network ?? 'MTN'} MoMo
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Name</p>
                          <p className="mt-0.5 text-sm font-bold text-white truncate">
                            {sendClaimSettings?.accountName ?? 'CheapDataPacks'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">MoMo Number</p>
                            <p className="mt-0.5 font-mono text-sm font-black text-emerald-200">
                              {sendClaimSettings?.momoNumber ?? '0240000000'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => handleCopy(sendClaimSettings?.momoNumber || '')}
                            className="h-8 px-2.5 text-xs text-emerald-300 hover:bg-emerald-500/20"
                          >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? 'Copied' : 'Copy'}
                          </Button>
                        </div>
                      </div>

                      {sendClaimSettings && (
                        <p className="mt-2.5 text-[11px] text-slate-400">
                          Min deposit: <span className="text-white font-medium">{formatCurrency(sendClaimSettings.minimumAmount)}</span> &middot; Max deposit: <span className="text-white font-medium">{formatCurrency(sendClaimSettings.maximumAmount)}</span>
                        </p>
                      )}
                    </div>

                    {/* Success Card when claimed */}
                    {claimResult && (
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20">
                            <CheckCircle className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">Payment Verified &amp; Wallet Credited!</h4>
                            <p className="text-xs text-emerald-300">
                              {formatCurrency(claimResult.amount)} has been added to your available balance.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-emerald-500/20 pt-3 text-xs sm:grid-cols-4">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Credited:</span>
                            <p className="font-mono text-sm font-bold text-emerald-300 mt-0.5">
                              {formatCurrency(claimResult.amount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Network:</span>
                            <p className="font-semibold text-white mt-0.5">{claimResult.network}</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Transaction ID:</span>
                            <p className="font-mono text-xs font-semibold text-slate-300 mt-0.5 truncate">
                              {claimResult.transactionReference}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">New Balance:</span>
                            <p className="font-mono text-sm font-bold text-white mt-0.5">
                              {formatCurrency(claimResult.newBalance)}
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setClaimResult(null)}
                          className="mt-4 text-xs text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
                        >
                          Claim Another Payment <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}

                    {/* Claim Form */}
                    {!claimResult && (
                      <form
                        onSubmit={claimForm.handleSubmit((values) => claimMutation.mutate(values))}
                        className="space-y-4"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                              <Hash className="h-3.5 w-3.5 text-emerald-400" />
                              Transaction ID (From SMS) *
                            </label>
                            <span className="text-[11px] text-slate-500">e.g. 29384819234</span>
                          </div>
                          <Input
                            placeholder="Paste your MoMo Transaction ID or Ref here..."
                            {...claimForm.register('transactionReference', { required: true })}
                            className="text-sm font-mono text-white placeholder-slate-500 bg-slate-950/60 border-slate-700 focus:border-emerald-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-400">
                              Network (Optional)
                            </label>
                            <Select {...claimForm.register('network')} className="text-xs">
                              <option value="MTN">MTN Mobile Money</option>
                              <option value="TELECEL">Telecel Cash</option>
                              <option value="AIRTELTIGO">AirtelTigo Money</option>
                            </Select>
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-400">
                              Amount (Optional GHS)
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g. 50.00"
                              {...claimForm.register('amount', { valueAsNumber: true })}
                              className="text-xs font-mono"
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-400">
                              Sender Phone (Optional)
                            </label>
                            <Input
                              placeholder="024XXXXXXX"
                              {...claimForm.register('senderPhone')}
                              className="text-xs font-mono"
                            />
                          </div>
                        </div>

                        {claimError && (
                          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                            <span>{claimError}</span>
                          </div>
                        )}

                        <Button
                          type="submit"
                          disabled={claimMutation.isPending}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 shadow-lg shadow-emerald-600/20"
                        >
                          {claimMutation.isPending ? (
                            <span className="flex items-center gap-2">
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Verifying Transaction ID &amp; Crediting Wallet...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4" />
                              Verify &amp; Claim Deposit
                            </span>
                          )}
                        </Button>
                      </form>
                    )}
                  </div>
                )}

                {/* METHOD 2: Paystack Gateway */}
                {fundMethod === 'PAYSTACK' && (
                  <form
                    onSubmit={paystackForm.handleSubmit((values) => paystackMutation.mutate(values))}
                    className="space-y-4"
                  >
                    <div className="rounded-2xl border border-violet-500/20 bg-violet-600/[0.04] p-4 text-xs text-slate-300 leading-relaxed">
                      Pay instantly with your Debit Card, Bank Card, or via the automated Paystack MoMo prompt.
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-300">Amount to Top-Up (GHS)</label>
                      <Input
                        type="number"
                        step="0.01"
                        {...paystackForm.register('amount', { valueAsNumber: true, required: true, min: 1 })}
                        className="text-sm font-mono text-white"
                      />
                    </div>

                    {paystackError && (
                      <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                        {paystackError}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={paystackMutation.isPending}
                      className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5"
                    >
                      {paystackMutation.isPending ? 'Redirecting to Gateway...' : 'Continue to Paystack Checkout'}
                    </Button>
                  </form>
                )}
              </GlassCard>
            )}

            {/* Withdrawals Locked View */}
            {activeTab === 'withdraw' && (
              <GlassCard className="p-6 border border-white/[0.08] bg-slate-900/60 shadow-xl text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-base font-bold text-white">Main Wallet Withdrawals Locked</h3>
                <p className="mx-auto mt-2 max-w-md text-xs text-slate-400 leading-relaxed">
                  Direct withdrawals from your purchasing wallet are currently restricted for anti-fraud security.
                  Storefront commissions and affiliate payouts are accrued in your <strong>Storefront Wallet</strong>,
                  where automated MoMo and Bank withdrawals are active.
                </p>
                <Link
                  href="/storefront"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-violet-500 shadow-md"
                >
                  <Store className="h-4 w-4" />
                  Open Storefront Wallet
                </Link>
              </GlassCard>
            )}
          </div>
        </div>

        {/* History / Statement Tabs */}
        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div className="flex gap-2">
              <button
                onClick={() => setHistoryTab('claims')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  historyTab === 'claims'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                My Send &amp; Claim History
                {claimsHistory?.total !== undefined && (
                  <span className="rounded-full bg-emerald-500/30 px-1.5 py-0.2 text-[10px] text-emerald-200">
                    {claimsHistory.total}
                  </span>
                )}
              </button>

              <button
                onClick={() => setHistoryTab('ledger')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  historyTab === 'ledger'
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <History className="h-3.5 w-3.5 text-violet-400" />
                Wallet Ledger
              </button>

              <button
                onClick={() => setHistoryTab('withdrawals')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  historyTab === 'withdrawals'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5 text-amber-400" />
                Withdrawal Requests
              </button>
            </div>
          </div>

          {/* Sub-tab 1: Send & Claim History */}
          {historyTab === 'claims' && (
            <GlassCard className="p-5 border border-white/[0.08]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.06] text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Transaction ID</th>
                      <th className="py-2.5 px-3 font-semibold">Network</th>
                      <th className="py-2.5 px-3 font-semibold">Amount</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold">Wallet Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {claimsHistory?.data?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No claims submitted yet. Use the Send &amp; Claim form above after sending MoMo.
                        </td>
                      </tr>
                    ) : (
                      claimsHistory?.data?.map((claim) => (
                        <tr key={claim.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-emerald-300">
                            {claim.transactionReference}
                          </td>
                          <td className="py-3 px-3 text-slate-300 font-medium">{claim.network}</td>
                          <td className="py-3 px-3 font-mono font-bold text-white">
                            {formatCurrency(claim.claimedAmount)}
                          </td>
                          <td className="py-3 px-3">
                            {getClaimStatusBadge(claim.status)}
                            {claim.rejectionReason && (
                              <p className="mt-0.5 text-[10px] text-rose-400">{claim.rejectionReason}</p>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                            {new Date(claim.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                            {claim.walletTransaction?.reference || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* Sub-tab 2: Wallet Ledger */}
          {historyTab === 'ledger' && (
            <GlassCard className="p-5 border border-white/[0.08]">
              <div className="space-y-2">
                {(wallet?.transactions ?? []).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                          transaction.type === 'CREDIT'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        {transaction.type === 'CREDIT' ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{transaction.description}</p>
                        <p className="font-mono text-xs text-slate-500">{transaction.reference}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold font-mono ${
                          transaction.type === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {transaction.type === 'CREDIT' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs text-slate-500">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {(!wallet?.transactions || wallet.transactions.length === 0) && (
                  <p className="py-8 text-center text-xs text-slate-500">No transactions recorded yet</p>
                )}
              </div>
            </GlassCard>
          )}

          {/* Sub-tab 3: Withdrawals */}
          {historyTab === 'withdrawals' && (
            <GlassCard className="p-5 border border-white/[0.08]">
              <div className="space-y-2">
                {withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{withdrawal.method}</p>
                        <p className="text-xs text-slate-500">
                          {withdrawal.accountName} &middot; {withdrawal.accountNumber}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold font-mono text-white">{formatCurrency(withdrawal.amount)}</p>
                      <Badge value={withdrawal.status} />
                    </div>
                  </div>
                ))}
                {withdrawals.length === 0 && (
                  <p className="py-8 text-center text-xs text-slate-500">No withdrawal history found</p>
                )}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Pending / Failed Deposits – Manual Verify */}
        {wallet?.pendingPayments && wallet.pendingPayments.length > 0 && (
          <div className="mt-6">
            <GlassCard className="p-5 border border-amber-500/20 bg-amber-500/[0.04]">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Pending External Payments</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                If your Paystack checkout did not reflect instantly, click <strong>Verify Payment</strong> below to reconcile directly with Paystack.
              </p>
              <div className="space-y-2">
                {wallet.pendingPayments.map((payment: Payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-slate-950/80 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          payment.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {payment.status === 'PENDING' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">{formatCurrency(payment.amount)}</p>
                          <Badge value={payment.status} />
                        </div>
                        <p className="text-xs text-slate-500 font-mono">Ref: {payment.reference}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={verifyPaymentMutation.isPending && verifyPaymentMutation.variables === payment.id}
                      onClick={() => verifyPaymentMutation.mutate(payment.id)}
                      className="text-xs"
                    >
                      <RefreshCw
                        className={`mr-1.5 h-3.5 w-3.5 ${
                          verifyPaymentMutation.isPending && verifyPaymentMutation.variables === payment.id
                            ? 'animate-spin'
                            : ''
                        }`}
                      />
                      Verify Payment
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

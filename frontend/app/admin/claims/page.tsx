'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  Smartphone,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Sliders,
  Radio,
  FileText,
  DollarSign,
  User,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';

interface ClaimItem {
  id: string;
  transactionReference: string;
  claimedAmount: number;
  network: string;
  senderPhone?: string | null;
  status: string;
  rejectionReason?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  processedAt?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    balance: number;
  };
  incomingTransaction?: {
    id: string;
    status: string;
    amount: number;
    transactionAt: string;
    senderPhone?: string | null;
    rawSms: string;
  } | null;
}

interface IncomingMomoItem {
  id: string;
  transactionReference: string;
  network: string;
  amount: number;
  currency: string;
  senderPhone?: string | null;
  recipientPhone?: string | null;
  transactionAt?: string | null;
  rawSms: string;
  source: string;
  status: string;
  createdAt: string;
  claims: {
    id: string;
    status: string;
    claimedAmount: number;
    userName: string;
    userEmail: string;
  }[];
}

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

export default function AdminClaimsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'claims' | 'incoming' | 'settings'>('claims');

  // Filters for User Claims
  const [claimStatus, setClaimStatus] = useState<string>('');
  const [claimNetwork, setClaimNetwork] = useState<string>('');
  const [claimSearch, setClaimSearch] = useState<string>('');
  const [claimPage, setClaimPage] = useState<number>(1);

  // Filters for Incoming MoMo SMS
  const [smsStatus, setSmsStatus] = useState<string>('');
  const [smsNetwork, setSmsNetwork] = useState<string>('');
  const [smsSearch, setSmsSearch] = useState<string>('');
  const [smsPage, setSmsPage] = useState<number>(1);

  // Modal / Action states
  const [selectedClaim, setSelectedClaim] = useState<ClaimItem | null>(null);
  const [selectedSms, setSelectedSms] = useState<IncomingMomoItem | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [copiedWebhook, setCopiedWebhook] = useState<boolean>(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  // Queries
  const { data: claimsData, isLoading: loadingClaims, refetch: refetchClaims } = useQuery({
    queryKey: ['admin-claims', claimPage, claimStatus, claimNetwork, claimSearch],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(claimPage), pageSize: '20' });
      if (claimStatus) params.set('status', claimStatus);
      if (claimNetwork) params.set('network', claimNetwork);
      if (claimSearch.trim()) params.set('q', claimSearch.trim());
      return apiRequest<{ data: ClaimItem[]; total: number; page: number; pages: number }>(`/admin/claims?${params}`);
    },
  });

  const { data: smsData, isLoading: loadingSms, refetch: refetchSms } = useQuery({
    queryKey: ['admin-incoming-momo', smsPage, smsStatus, smsNetwork, smsSearch],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(smsPage), pageSize: '20' });
      if (smsStatus) params.set('status', smsStatus);
      if (smsNetwork) params.set('network', smsNetwork);
      if (smsSearch.trim()) params.set('q', smsSearch.trim());
      return apiRequest<{ data: IncomingMomoItem[]; total: number; page: number; pages: number }>(`/admin/incoming-momo?${params}`);
    },
  });

  const { data: settingsData, isLoading: loadingSettings } = useQuery({
    queryKey: ['admin-claims-settings'],
    queryFn: () => apiRequest<SendClaimSettings>('/admin/claims/settings'),
  });

  // Settings local edit state
  const [settingsForm, setSettingsForm] = useState<Partial<SendClaimSettings>>({});

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (values: Partial<SendClaimSettings>) =>
      apiRequest('/admin/claims/settings', { method: 'PUT', body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-claims-settings'] });
      setSettingsSuccess('Settings successfully updated');
      setTimeout(() => setSettingsSuccess(null), 3000);
    },
  });

  const approveClaimMutation = useMutation({
    mutationFn: (claimId: string) =>
      apiRequest(`/admin/claims/${claimId}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-claims'] });
      queryClient.invalidateQueries({ queryKey: ['admin-incoming-momo'] });
      setSelectedClaim(null);
    },
  });

  const rejectClaimMutation = useMutation({
    mutationFn: ({ claimId, reason }: { claimId: string; reason: string }) =>
      apiRequest(`/admin/claims/${claimId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-claims'] });
      setShowRejectModal(false);
      setSelectedClaim(null);
      setRejectReason('');
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED':
      case 'AVAILABLE':
        return <Badge variant="success">{status}</Badge>;
      case 'CLAIMED':
        return <Badge variant="secondary">CLAIMED</Badge>;
      case 'PENDING':
        return <Badge variant="warning">PENDING</Badge>;
      case 'REJECTED':
      case 'EXPIRED':
        return <Badge variant="danger">{status}</Badge>;
      case 'UNMATCHED':
      case 'DUPLICATE':
        return <Badge variant="secondary">{status}</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/webhooks/momo/sms`
    : 'https://cheapdatapacks.com/webhooks/momo/sms';

  return (
    <AuthGuard>
      <DashboardShell
        mode="admin"
        title="Send & Claim (MoMo)"
        description="Automated Mobile Money deposit verification, incoming SMS logs, and instant claim clearing."
      >
        {/* Navigation Tabs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('claims')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === 'claims'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Smartphone className="h-4 w-4" />
              User Claims
              {claimsData?.total !== undefined && (
                <span className="ml-1.5 rounded-full bg-emerald-500/30 px-2 py-0.5 text-xs text-emerald-200">
                  {claimsData.total}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('incoming')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === 'incoming'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Incoming MoMo SMS Feed
              {smsData?.total !== undefined && (
                <span className="ml-1.5 rounded-full bg-cyan-500/30 px-2 py-0.5 text-xs text-cyan-200">
                  {smsData.total}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Sliders className="h-4 w-4" />
              Settings &amp; Webhook
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'claims') refetchClaims();
                else if (activeTab === 'incoming') refetchSms();
              }}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* TAB 1: User Claims */}
        {activeTab === 'claims' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <GlassCard className="p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    placeholder="Search Reference, User, Phone..."
                    value={claimSearch}
                    onChange={(e) => {
                      setClaimSearch(e.target.value);
                      setClaimPage(1);
                    }}
                    className="pl-9 text-xs"
                  />
                </div>
                <Select
                  value={claimStatus}
                  onChange={(e) => {
                    setClaimStatus(e.target.value);
                    setClaimPage(1);
                  }}
                  className="text-xs"
                >
                  <option value="">All Statuses</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="PENDING">PENDING</option>
                </Select>
                <Select
                  value={claimNetwork}
                  onChange={(e) => {
                    setClaimNetwork(e.target.value);
                    setClaimPage(1);
                  }}
                  className="text-xs"
                >
                  <option value="">All Networks</option>
                  <option value="MTN">MTN</option>
                  <option value="TELECEL">TELECEL</option>
                  <option value="AIRTELTIGO">AIRTELTIGO</option>
                </Select>
                <div className="flex items-center text-xs text-slate-400">
                  Total claims: <strong className="ml-1 text-white">{claimsData?.total ?? 0}</strong>
                </div>
              </div>
            </GlassCard>

            {/* Claims Table */}
            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400">
                    <tr>
                      <th className="py-3 px-4 font-semibold">User</th>
                      <th className="py-3 px-4 font-semibold">Transaction ID</th>
                      <th className="py-3 px-4 font-semibold">Network</th>
                      <th className="py-3 px-4 font-semibold">Amount</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {loadingClaims ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-400" />
                          <p className="mt-2 text-xs">Loading user claims...</p>
                        </td>
                      </tr>
                    ) : claimsData?.data?.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Smartphone className="mx-auto h-8 w-8 text-slate-600" />
                          <p className="mt-2 font-medium text-white">No claims found</p>
                          <p className="text-[11px] text-slate-500">Try changing your search or status filter.</p>
                        </td>
                      </tr>
                    ) : (
                      claimsData?.data?.map((claim) => (
                        <tr key={claim.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-white">{claim.user.name}</p>
                            <p className="font-mono text-[11px] text-slate-400">{claim.user.email}</p>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-emerald-300">
                            {claim.transactionReference}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-300">{claim.network}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            {formatCurrency(claim.claimedAmount)}
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(claim.status)}
                            {claim.rejectionReason && (
                              <p className="mt-0.5 text-[10px] text-rose-400 truncate max-w-[180px]">
                                {claim.rejectionReason}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {new Date(claim.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {claim.status === 'REJECTED' && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => approveClaimMutation.mutate(claim.id)}
                                  disabled={approveClaimMutation.isPending}
                                  className="text-[11px] text-emerald-300 hover:bg-emerald-500/20"
                                >
                                  Approve
                                </Button>
                              )}
                              {claim.status === 'APPROVED' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedClaim(claim);
                                    setShowRejectModal(true);
                                  }}
                                  className="text-[11px] text-rose-300 hover:bg-rose-500/20 border-rose-500/30"
                                >
                                  Reject
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedClaim(claim)}
                                className="text-[11px]"
                              >
                                View
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {claimsData && claimsData.pages > 1 && (
                <div className="flex items-center justify-between border-t border-white/[0.08] px-4 py-3 text-xs text-slate-400">
                  <p>
                    Page {claimsData.page} of {claimsData.pages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={claimPage <= 1}
                      onClick={() => setClaimPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={claimPage >= claimsData.pages}
                      onClick={() => setClaimPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* TAB 2: Incoming MoMo SMS Feed */}
        {activeTab === 'incoming' && (
          <div className="space-y-4">
            <GlassCard className="p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    placeholder="Search Reference, Sender, SMS text..."
                    value={smsSearch}
                    onChange={(e) => {
                      setSmsSearch(e.target.value);
                      setSmsPage(1);
                    }}
                    className="pl-9 text-xs"
                  />
                </div>
                <Select
                  value={smsStatus}
                  onChange={(e) => {
                    setSmsStatus(e.target.value);
                    setSmsPage(1);
                  }}
                  className="text-xs"
                >
                  <option value="">All Statuses</option>
                  <option value="AVAILABLE">AVAILABLE (Unclaimed)</option>
                  <option value="CLAIMED">CLAIMED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="UNMATCHED">UNMATCHED</option>
                  <option value="DUPLICATE">DUPLICATE</option>
                  <option value="EXPIRED">EXPIRED</option>
                </Select>
                <Select
                  value={smsNetwork}
                  onChange={(e) => {
                    setSmsNetwork(e.target.value);
                    setSmsPage(1);
                  }}
                  className="text-xs"
                >
                  <option value="">All Networks</option>
                  <option value="MTN">MTN</option>
                  <option value="TELECEL">TELECEL</option>
                  <option value="AIRTELTIGO">AIRTELTIGO</option>
                </Select>
                <div className="flex items-center text-xs text-slate-400">
                  Total SMS logged: <strong className="ml-1 text-white">{smsData?.total ?? 0}</strong>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Reference</th>
                      <th className="py-3 px-4 font-semibold">Network</th>
                      <th className="py-3 px-4 font-semibold">Amount</th>
                      <th className="py-3 px-4 font-semibold">Sender Phone</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Claimed By</th>
                      <th className="py-3 px-4 font-semibold">Received At</th>
                      <th className="py-3 px-4 text-right font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {loadingSms ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-cyan-400" />
                          <p className="mt-2 text-xs">Loading SMS feed...</p>
                        </td>
                      </tr>
                    ) : smsData?.data?.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <MessageSquare className="mx-auto h-8 w-8 text-slate-600" />
                          <p className="mt-2 font-medium text-white">No incoming SMS recorded yet</p>
                          <p className="text-[11px] text-slate-500">Configure your SMS forwarder app to send payloads to your webhook URL.</p>
                        </td>
                      </tr>
                    ) : (
                      smsData?.data?.map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-cyan-300">
                            {item.transactionReference}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-300">
                            {item.network}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {item.senderPhone || '—'}
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="py-3 px-4">
                            {item.claims && item.claims.length > 0 ? (
                              <span className="font-semibold text-emerald-300">
                                {item.claims[0].userName}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSms(item)}
                              className="text-[11px]"
                            >
                              View SMS
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {smsData && smsData.pages > 1 && (
                <div className="flex items-center justify-between border-t border-white/[0.08] px-4 py-3 text-xs text-slate-400">
                  <p>
                    Page {smsData.page} of {smsData.pages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={smsPage <= 1}
                      onClick={() => setSmsPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={smsPage >= smsData.pages}
                      onClick={() => setSmsPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* TAB 3: Settings & Webhook */}
        {activeTab === 'settings' && (
          <div className="grid gap-5 xl:grid-cols-3">
            {/* Settings Form */}
            <GlassCard className="p-6 xl:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-violet-400" />
                    Send &amp; Claim Clearing Parameters
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Configure your primary Mobile Money recipient number, merchant name, and deposit limits.
                  </p>
                </div>
                {settingsData?.enabled && (
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300">
                    Live Clearing Active
                  </span>
                )}
              </div>

              {settingsSuccess && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300">
                  <CheckCircle className="h-4 w-4" />
                  {settingsSuccess}
                </div>
              )}

              {loadingSettings ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="mx-auto h-6 w-6 animate-spin text-violet-400" />
                  <p className="mt-2 text-xs">Loading configuration...</p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateSettingsMutation.mutate(settingsForm);
                  }}
                  className="mt-6 space-y-4"
                >
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Enable Send &amp; Claim Top-Ups</p>
                      <p className="text-xs text-slate-400">Allow users to view MoMo credentials and submit claims</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsForm.enabled ?? settingsData?.enabled ?? true}
                      onChange={(e) => setSettingsForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                      className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-400">Primary Network</label>
                      <Select
                        value={settingsForm.network ?? settingsData?.network ?? 'MTN'}
                        onChange={(e) => setSettingsForm((prev) => ({ ...prev, network: e.target.value }))}
                        className="text-xs"
                      >
                        <option value="MTN">MTN Mobile Money</option>
                        <option value="TELECEL">Telecel Cash</option>
                        <option value="AIRTELTIGO">AirtelTigo Money</option>
                      </Select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-400">MoMo Phone Number</label>
                      <Input
                        value={settingsForm.momoNumber ?? settingsData?.momoNumber ?? ''}
                        onChange={(e) => setSettingsForm((prev) => ({ ...prev, momoNumber: e.target.value }))}
                        placeholder="e.g. 0241234567"
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-400">Account / Merchant Name</label>
                      <Input
                        value={settingsForm.accountName ?? settingsData?.accountName ?? ''}
                        onChange={(e) => setSettingsForm((prev) => ({ ...prev, accountName: e.target.value }))}
                        placeholder="e.g. CheapDataPacks"
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-400">Claim Expiry (Hours)</label>
                      <Input
                        type="number"
                        value={settingsForm.claimExpiryHours ?? settingsData?.claimExpiryHours ?? 168}
                        onChange={(e) => setSettingsForm((prev) => ({ ...prev, claimExpiryHours: Number(e.target.value) }))}
                        placeholder="168 (7 days)"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-400">Minimum Deposit (GHS)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={settingsForm.minimumAmount ?? settingsData?.minimumAmount ?? 1}
                        onChange={(e) => setSettingsForm((prev) => ({ ...prev, minimumAmount: Number(e.target.value) }))}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-400">Maximum Deposit (GHS)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={settingsForm.maximumAmount ?? settingsData?.maximumAmount ?? 5000}
                        onChange={(e) => setSettingsForm((prev) => ({ ...prev, maximumAmount: Number(e.target.value) }))}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">Custom User Instructions</label>
                    <textarea
                      rows={3}
                      value={settingsForm.instructions ?? settingsData?.instructions ?? ''}
                      onChange={(e) => setSettingsForm((prev) => ({ ...prev, instructions: e.target.value }))}
                      placeholder="Instructions shown to users when sending money..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-violet-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={updateSettingsMutation.isPending}
                    className="w-full"
                  >
                    {updateSettingsMutation.isPending ? 'Saving Settings...' : 'Save Settings'}
                  </Button>
                </form>
              )}
            </GlassCard>

            {/* Webhook Forwarder Setup Instructions Card */}
            <GlassCard className="p-6 xl:col-span-1 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Radio className="h-5 w-5 text-emerald-400" />
                SMS Forwarder Webhook
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your Android SIM phone using any standard SMS Forwarder app (e.g. <em>SMS Forwarder</em> by Bogdan Cerovac).
              </p>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Webhook URL</label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={webhookUrl}
                    className="text-xs font-mono text-emerald-300 bg-slate-900/80"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(webhookUrl)}
                    className="shrink-0 text-xs"
                  >
                    {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Auth Header</label>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs font-mono text-slate-300">
                  Authorization: Bearer tskconnect_forwarder_secret_2026
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  Auto-Parsing Engine
                </p>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  Incoming SMS receipts from MTN MoMo, Telecel, and AT Money are parsed instantly. Transaction IDs and amounts are verified with anti-replay protection.
                </p>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Claim Details Modal */}
        {selectedClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <GlassCard className="w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-emerald-400" />
                  Claim Details
                </h3>
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Transaction ID:</span>
                  <p className="font-mono font-bold text-emerald-300 mt-0.5">{selectedClaim.transactionReference}</p>
                </div>
                <div>
                  <span className="text-slate-400">Claimed Amount:</span>
                  <p className="font-bold text-white mt-0.5">{formatCurrency(selectedClaim.claimedAmount)}</p>
                </div>
                <div>
                  <span className="text-slate-400">User:</span>
                  <p className="font-semibold text-white mt-0.5">{selectedClaim.user.name}</p>
                  <p className="font-mono text-[10px] text-slate-400">{selectedClaim.user.email}</p>
                </div>
                <div>
                  <span className="text-slate-400">Network:</span>
                  <p className="font-semibold text-white mt-0.5">{selectedClaim.network}</p>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <div className="mt-0.5">{getStatusBadge(selectedClaim.status)}</div>
                </div>
                <div>
                  <span className="text-slate-400">Date:</span>
                  <p className="text-slate-300 mt-0.5">{new Date(selectedClaim.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {selectedClaim.incomingTransaction && (
                <div className="rounded-xl border border-white/[0.06] bg-slate-950/80 p-3 space-y-1">
                  <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">Matched Raw SMS:</span>
                  <p className="text-xs text-slate-300 font-mono leading-relaxed break-words">
                    {selectedClaim.incomingTransaction.rawSms}
                  </p>
                </div>
              )}

              {selectedClaim.rejectionReason && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <strong>Rejection Reason:</strong> {selectedClaim.rejectionReason}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <Button variant="outline" size="sm" onClick={() => setSelectedClaim(null)}>
                  Close
                </Button>
                {selectedClaim.status === 'REJECTED' && (
                  <Button
                    size="sm"
                    onClick={() => approveClaimMutation.mutate(selectedClaim.id)}
                    disabled={approveClaimMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-500"
                  >
                    Force Approve &amp; Credit
                  </Button>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Incoming SMS View Modal */}
        {selectedSms && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <GlassCard className="w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-cyan-400" />
                  Incoming MoMo SMS Payload
                </h3>
                <button
                  onClick={() => setSelectedSms(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Transaction ID:</span>
                  <p className="font-mono font-bold text-cyan-300 mt-0.5">{selectedSms.transactionReference}</p>
                </div>
                <div>
                  <span className="text-slate-400">Parsed Amount:</span>
                  <p className="font-bold text-white mt-0.5">{formatCurrency(selectedSms.amount)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Network:</span>
                  <p className="font-semibold text-white mt-0.5">{selectedSms.network}</p>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <div className="mt-0.5">{getStatusBadge(selectedSms.status)}</div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-slate-950/80 p-3 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Raw SMS Content:</span>
                <p className="text-xs text-slate-200 font-mono leading-relaxed break-words">
                  {selectedSms.rawSms}
                </p>
              </div>

              <div className="flex justify-end pt-2 border-t border-white/[0.08]">
                <Button variant="outline" size="sm" onClick={() => setSelectedSms(null)}>
                  Close
                </Button>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <GlassCard className="w-full max-w-md p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
                Reject Claim
              </h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to mark claim <strong>{selectedClaim.transactionReference}</strong> as rejected?
              </p>
              <textarea
                rows={3}
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => rejectClaimMutation.mutate({ claimId: selectedClaim.id, reason: rejectReason })}
                  disabled={rejectClaimMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-500 text-white"
                >
                  {rejectClaimMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
                </Button>
              </div>
            </GlassCard>
          </div>
        )}
      </DashboardShell>
    </AuthGuard>
  );
}

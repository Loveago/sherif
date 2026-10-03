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
  Terminal,
  Play,
  Zap,
  HelpCircle,
  ExternalLink,
  Code2,
  Sparkles,
  CheckCircle2,
  Key,
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
  forwarderSecret?: string;
  webhookUrl?: string;
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

  // Setup Card Interactive State
  const [activeMethod, setActiveMethod] = useState<'query' | 'bearer' | 'header'>('query');
  const [activeApp, setActiveApp] = useState<'macrodroid' | 'smsforwarder'>('macrodroid');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedFullUrl, setCopiedFullUrl] = useState(false);
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [copiedCustomHeader, setCopiedCustomHeader] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  // In-Browser Live Parser Tester State
  const [testSmsInput, setTestSmsInput] = useState(
    'Payment received for GHS 50.00 from 0241234567. Current Balance: GHS 150.00. Reference: 28391049281. Transaction ID: 28391049281.'
  );
  const [testSmsNetwork, setTestSmsNetwork] = useState('MTN');
  const [testResult, setTestResult] = useState<{ matched: boolean; parsed?: any; message?: string } | null>(null);
  const [testingParser, setTestingParser] = useState(false);

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

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
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

  const forwarderSecret = settingsForm.forwarderSecret ?? settingsData?.forwarderSecret ?? 'tskconnect_forwarder_secret_2026';
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/webhooks/momo/sms`
    : 'https://cheapdatapacks.com/webhooks/momo/sms';

  const fullUrlWithSecret = webhookUrl.includes('?')
    ? `${webhookUrl}&secret=${forwarderSecret}`
    : `${webhookUrl}?secret=${forwarderSecret}`;

  const curlTestCommand = `curl -X POST "${fullUrlWithSecret}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Payment received for GHS 10.00 from 0241234567. Transaction ID: TEST${Date.now()}."}'`;

  const handleTestParser = async () => {
    if (!testSmsInput.trim()) return;
    setTestingParser(true);
    setTestResult(null);
    try {
      const res = await apiRequest<{ matched: boolean; parsed?: any; message?: string }>('/admin/claims/test-parser', {
        method: 'POST',
        body: JSON.stringify({ rawSms: testSmsInput.trim(), network: testSmsNetwork }),
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ matched: false, message: err?.message || 'Failed to test SMS parser' });
    } finally {
      setTestingParser(false);
    }
  };

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
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-12">
              {/* Settings Form - 5 Cols */}
              <GlassCard className="p-6 xl:col-span-5 space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Sliders className="h-5 w-5 text-violet-400" />
                      Send &amp; Claim Configuration
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Configure your primary Mobile Money recipient number and limits.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const currentVal = settingsForm.enabled ?? settingsData?.enabled ?? true;
                      setSettingsForm((prev) => ({ ...prev, enabled: !currentVal }));
                    }}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      (settingsForm.enabled ?? settingsData?.enabled ?? true)
                        ? 'bg-emerald-500'
                        : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        (settingsForm.enabled ?? settingsData?.enabled ?? true)
                          ? 'left-[22px]'
                          : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {settingsSuccess && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300">
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
                    className="space-y-4 text-xs"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block font-semibold text-slate-400">MoMo Network</label>
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
                        <label className="mb-1.5 block font-semibold text-slate-400">Admin MoMo Number</label>
                        <Input
                          value={settingsForm.momoNumber ?? settingsData?.momoNumber ?? ''}
                          onChange={(e) => setSettingsForm((prev) => ({ ...prev, momoNumber: e.target.value }))}
                          placeholder="e.g. 0241234567"
                          className="text-xs font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block font-semibold text-slate-400">Account / Merchant Name</label>
                        <Input
                          value={settingsForm.accountName ?? settingsData?.accountName ?? ''}
                          onChange={(e) => setSettingsForm((prev) => ({ ...prev, accountName: e.target.value }))}
                          placeholder="e.g. CheapDataPacks"
                          className="text-xs"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block font-semibold text-slate-400">Claim Expiry (Hours)</label>
                        <Input
                          type="number"
                          min="1"
                          max="720"
                          value={settingsForm.claimExpiryHours ?? settingsData?.claimExpiryHours ?? 168}
                          onChange={(e) => setSettingsForm((prev) => ({ ...prev, claimExpiryHours: Number(e.target.value) }))}
                          placeholder="168 (7 days)"
                          className="text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block font-semibold text-slate-400">Minimum Deposit (GHS)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.10"
                          value={settingsForm.minimumAmount ?? settingsData?.minimumAmount ?? 1}
                          onChange={(e) => setSettingsForm((prev) => ({ ...prev, minimumAmount: Number(e.target.value) }))}
                          className="text-xs"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block font-semibold text-slate-400">Maximum Deposit (GHS)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="1"
                          value={settingsForm.maximumAmount ?? settingsData?.maximumAmount ?? 5000}
                          onChange={(e) => setSettingsForm((prev) => ({ ...prev, maximumAmount: Number(e.target.value) }))}
                          className="text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-emerald-300 flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5 text-emerald-400" />
                          SMS Forwarder Auth Secret (Bearer Token)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const gen = `sec_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
                            setSettingsForm((prev) => ({ ...prev, forwarderSecret: gen }));
                          }}
                          className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          Generate Random Key
                        </button>
                      </div>
                      <Input
                        type="text"
                        value={settingsForm.forwarderSecret ?? settingsData?.forwarderSecret ?? ''}
                        onChange={(e) => setSettingsForm((prev) => ({ ...prev, forwarderSecret: e.target.value }))}
                        placeholder="e.g. tskconnect_forwarder_secret_2026"
                        className="text-xs font-mono border-emerald-500/30 bg-slate-900/90 text-emerald-300"
                        required
                      />
                      <p className="text-[11px] text-slate-400 leading-tight">
                        Bearer token used to authenticate incoming SMS webhook. Saved directly in database — <strong className="text-emerald-300">no .env editing required</strong>!
                      </p>
                    </div>

                    <div>
                      <label className="mb-1.5 block font-semibold text-slate-400">User-Facing Instructions</label>
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
                      className="w-full mt-2"
                    >
                      {updateSettingsMutation.isPending ? 'Saving Settings...' : 'Save Settings'}
                    </Button>
                  </form>
                )}
              </GlassCard>

              {/* SMS Forwarder Integration Guide & Methods - 7 Cols */}
              <GlassCard className="p-6 xl:col-span-7 space-y-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-emerald-400" />
                    <h4 className="text-base font-bold text-white">
                      SMS Forwarder Integration &amp; Methods
                    </h4>
                  </div>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    Configure your Android phone (with your MoMo SIM) to push incoming transaction SMS to your server in real-time. Choose the configuration method that matches your app:
                  </p>
                </div>

                {/* Method Selector Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-white/[0.08] pb-3 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveMethod('query')}
                    className={`rounded-lg px-3 py-1.5 transition-colors ${
                      activeMethod === 'query'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]'
                    }`}
                  >
                    Method 1: URL Query (Easiest — No Headers)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMethod('bearer')}
                    className={`rounded-lg px-3 py-1.5 transition-colors ${
                      activeMethod === 'bearer'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]'
                    }`}
                  >
                    Method 2: Authorization Header (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMethod('header')}
                    className={`rounded-lg px-3 py-1.5 transition-colors ${
                      activeMethod === 'header'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]'
                    }`}
                  >
                    Method 3: Custom Header (x-forwarder-secret)
                  </button>
                </div>

                {/* Method 1 Content */}
                {activeMethod === 'query' && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                          Recommended: URL Query Parameter
                        </span>
                        <p className="text-[11px] text-emerald-200/80 mt-0.5">
                          Simplest setup! Paste this single URL into your forwarder app. No custom HTTP headers needed.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(fullUrlWithSecret, setCopiedFullUrl)}
                        className="shrink-0 text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                      >
                        {copiedFullUrl ? <Check className="h-3.5 w-3.5 text-emerald-400 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                        {copiedFullUrl ? 'Copied!' : 'Copy Full URL'}
                      </Button>
                    </div>
                    <div className="rounded-lg bg-black/50 p-2.5 font-mono text-xs text-emerald-200 break-all select-all border border-emerald-500/20">
                      {fullUrlWithSecret}
                    </div>
                  </div>
                )}

                {/* Method 2 Content */}
                {activeMethod === 'bearer' && (
                  <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 space-y-3 text-xs">
                    <span className="font-bold text-slate-200 uppercase tracking-wider block">
                      Standard Bearer Authorization Header
                    </span>
                    <div className="space-y-2">
                      <div className="rounded-lg bg-black/50 p-3 border border-white/[0.06]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Webhook URL:</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(webhookUrl, setCopiedWebhook)}
                            className="text-xs font-semibold text-emerald-400 hover:underline"
                          >
                            {copiedWebhook ? 'Copied!' : 'Copy URL'}
                          </button>
                        </div>
                        <span className="font-mono block mt-1 select-all break-all text-slate-200">
                          {webhookUrl}
                        </span>
                      </div>

                      <div className="rounded-lg bg-black/50 p-3 border border-white/[0.06]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Header Name &amp; Value:</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(`Bearer ${forwarderSecret}`, setCopiedHeader)}
                            className="text-xs font-semibold text-emerald-400 hover:underline"
                          >
                            {copiedHeader ? 'Copied!' : 'Copy Value'}
                          </button>
                        </div>
                        <div className="font-mono mt-1 space-y-1">
                          <div><span className="text-slate-500">Header:</span> <span className="font-semibold text-white">Authorization</span></div>
                          <div><span className="text-slate-500">Value:</span> <span className="font-semibold text-emerald-400 select-all">Bearer {forwarderSecret}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Method 3 Content */}
                {activeMethod === 'header' && (
                  <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 space-y-3 text-xs">
                    <span className="font-bold text-slate-200 uppercase tracking-wider block">
                      Custom Header (x-forwarder-secret)
                    </span>
                    <div className="space-y-2">
                      <div className="rounded-lg bg-black/50 p-3 border border-white/[0.06]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Webhook URL:</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(webhookUrl, setCopiedWebhook)}
                            className="text-xs font-semibold text-emerald-400 hover:underline"
                          >
                            {copiedWebhook ? 'Copied!' : 'Copy URL'}
                          </button>
                        </div>
                        <span className="font-mono block mt-1 select-all break-all text-slate-200">
                          {webhookUrl}
                        </span>
                      </div>

                      <div className="rounded-lg bg-black/50 p-3 border border-white/[0.06]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Header Name &amp; Value:</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(forwarderSecret, setCopiedCustomHeader)}
                            className="text-xs font-semibold text-emerald-400 hover:underline"
                          >
                            {copiedCustomHeader ? 'Copied!' : 'Copy Secret'}
                          </button>
                        </div>
                        <div className="font-mono mt-1 space-y-1">
                          <div><span className="text-slate-500">Header:</span> <span className="font-semibold text-white">x-forwarder-secret</span></div>
                          <div><span className="text-slate-500">Value:</span> <span className="font-semibold text-emerald-400 select-all">{forwarderSecret}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Android App JSON Payload Template */}
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Code2 className="h-4 w-4 text-violet-400" />
                      App JSON Payload Template
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveApp('macrodroid')}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors ${
                          activeApp === 'macrodroid'
                            ? 'bg-violet-600 text-white'
                            : 'text-slate-400 hover:bg-white/[0.05]'
                        }`}
                      >
                        MacroDroid
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveApp('smsforwarder')}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors ${
                          activeApp === 'smsforwarder'
                            ? 'bg-violet-600 text-white'
                            : 'text-slate-400 hover:bg-white/[0.05]'
                        }`}
                      >
                        SMS Forwarder
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <pre className="rounded-lg bg-black/60 p-3 font-mono text-xs text-emerald-300 border border-white/[0.06]">
                      {activeApp === 'macrodroid'
                        ? `{\n  "message": "{sms_message}",\n  "from": "{sms_number}"\n}`
                        : `{\n  "message": "[msg]",\n  "from": "[from]"\n}`}
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        const text =
                          activeApp === 'macrodroid'
                            ? `{\n  "message": "{sms_message}",\n  "from": "{sms_number}"\n}`
                            : `{\n  "message": "[msg]",\n  "from": "[from]"\n}`;
                        copyToClipboard(text, setCopiedTemplate);
                      }}
                      className="absolute top-2.5 right-2.5 text-xs font-semibold text-emerald-400 hover:underline"
                    >
                      {copiedTemplate ? 'Copied!' : 'Copy Template'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    HTTP Method: <strong className="text-white">POST</strong> · Content-Type: <strong className="text-white">application/json</strong>
                  </p>
                </div>

                {/* Step-by-Step Android Setup Instructions */}
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-cyan-400" />
                    Step-by-Step Android Setup Procedures
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-black/40 p-3 border border-white/[0.06] space-y-1">
                      <p className="font-bold text-white flex items-center gap-1">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] text-white">1</span>
                        Install Forwarder App
                      </p>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Install <strong>MacroDroid</strong> (Google Play) or <strong>SMS Forwarder</strong> (by Bogdan Cerovac / GitHub) on the Android phone with your MoMo SIM card.
                      </p>
                    </div>

                    <div className="rounded-lg bg-black/40 p-3 border border-white/[0.06] space-y-1">
                      <p className="font-bold text-white flex items-center gap-1">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] text-white">2</span>
                        Configure SMS Trigger
                      </p>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Add a Trigger for <strong>SMS Received</strong> from sender: <code>170</code> or <code>MobileMoney</code> (MTN), <code>TelecelCash</code>, or <code>ATMoney</code>.
                      </p>
                    </div>

                    <div className="rounded-lg bg-black/40 p-3 border border-white/[0.06] space-y-1">
                      <p className="font-bold text-white flex items-center gap-1">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] text-white">3</span>
                        HTTP Request Action
                      </p>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Action: <strong>HTTP Request / Webhook</strong> -&gt; <code>POST</code> -&gt; Paste the full Webhook URL from Method 1 with body JSON template.
                      </p>
                    </div>

                    <div className="rounded-lg bg-black/40 p-3 border border-white/[0.06] space-y-1">
                      <p className="font-bold text-white flex items-center gap-1">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] text-white">4</span>
                        Disable Battery Optimization
                      </p>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Go to Android Settings &gt; Apps &gt; Battery &gt; Set to <strong>Unrestricted</strong> so Android doesn&apos;t sleep the forwarder app.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Instant Terminal Verification (cURL) */}
                <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Terminal Verification (cURL Test Command)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(curlTestCommand, setCopiedCurl)}
                      className="text-xs font-semibold text-emerald-400 hover:underline"
                    >
                      {copiedCurl ? 'Copied!' : 'Copy Command'}
                    </button>
                  </div>
                  <pre className="rounded-lg bg-black/70 p-3 font-mono text-[11px] text-emerald-300 overflow-x-auto select-all border border-emerald-500/20">
                    {curlTestCommand}
                  </pre>
                  <p className="text-[11px] text-slate-400">
                    Run this command in any terminal to test your live endpoint. A successful test returns <code className="text-emerald-300">&#123;&quot;received&quot;: true&#125;</code>.
                  </p>
                </div>
              </GlassCard>
            </div>

            {/* In-Browser Live SMS Parser Simulator Card */}
            <GlassCard className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-cyan-400" />
                  <div>
                    <h4 className="text-base font-bold text-white">
                      In-Browser SMS Parser Simulator
                    </h4>
                    <p className="text-xs text-slate-400">
                      Test any incoming MoMo receipt message to verify amount, reference, and carrier detection in real-time.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">Sample Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTestSmsNetwork('MTN');
                      setTestSmsInput('Payment received for GHS 50.00 from 0241234567. Current Balance: GHS 150.00. Reference: 28391049281. Transaction ID: 28391049281.');
                    }}
                    className="rounded-lg bg-yellow-500/15 border border-yellow-500/30 px-2.5 py-1 text-[11px] font-semibold text-yellow-300 hover:bg-yellow-500/25 transition-colors"
                  >
                    MTN MoMo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTestSmsNetwork('TELECEL');
                      setTestSmsInput('You have received GHS 25.00 from 0201234567. Current balance: GHS 100.00. Financial Transaction Id: 9482019482.');
                    }}
                    className="rounded-lg bg-red-500/15 border border-red-500/30 px-2.5 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/25 transition-colors"
                  >
                    Telecel Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTestSmsNetwork('AIRTELTIGO');
                      setTestSmsInput('Cash In received for GHS 30.00 from 0561234567. Trans ID: AT94820192.');
                    }}
                    className="rounded-lg bg-blue-500/15 border border-blue-500/30 px-2.5 py-1 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/25 transition-colors"
                  >
                    AirtelTigo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 space-y-3">
                  <label className="text-xs font-semibold text-slate-300">Raw SMS Text</label>
                  <textarea
                    rows={3}
                    value={testSmsInput}
                    onChange={(e) => setTestSmsInput(e.target.value)}
                    placeholder="Paste sample MoMo SMS here..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-xs text-white font-mono placeholder-slate-500 outline-none focus:border-cyan-500"
                  />
                  <div className="flex items-center gap-3">
                    <Select
                      value={testSmsNetwork}
                      onChange={(e) => setTestSmsNetwork(e.target.value)}
                      className="w-40 text-xs"
                    >
                      <option value="MTN">MTN</option>
                      <option value="TELECEL">TELECEL</option>
                      <option value="AIRTELTIGO">AIRTELTIGO</option>
                    </Select>
                    <Button
                      type="button"
                      onClick={handleTestParser}
                      disabled={testingParser}
                      className="bg-cyan-600 hover:bg-cyan-500 text-xs"
                    >
                      {testingParser ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
                      Test SMS Parser
                    </Button>
                  </div>
                </div>

                <div className="md:col-span-4 rounded-xl border border-white/[0.08] bg-black/40 p-4">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                    Parser Output
                  </span>
                  {testResult ? (
                    testResult.matched && testResult.parsed ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Matched Successfully</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-white/[0.06]">
                          <div>
                            <span className="text-slate-500">Amount:</span>
                            <p className="font-bold text-white">GHS {testResult.parsed.amount}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Reference:</span>
                            <p className="font-mono font-bold text-cyan-300">{testResult.parsed.transactionReference}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Network:</span>
                            <p className="font-semibold text-white">{testResult.parsed.network}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Confidence:</span>
                            <p className="font-semibold text-emerald-400">{testResult.parsed.confidence}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-rose-400 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <XCircle className="h-4 w-4" />
                          <span>No Match</span>
                        </div>
                        <p className="text-[11px] text-rose-300/80">
                          {testResult.message || 'Could not parse amount or transaction ID from this SMS.'}
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      Click &quot;Test SMS Parser&quot; to view live parsed extraction.
                    </div>
                  )}
                </div>
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

'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import type { User } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { UserDetailedView } from './detailed-view';
import {
  Users,
  Wallet,
  DollarSign,
  PlusCircle,
  MinusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  User as UserIcon,
  Eye,
} from 'lucide-react';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [mode, setMode] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin-users', search],
    queryFn: () => apiRequest<User[]>(`/admin/users?search=${encodeURIComponent(search)}`),
  });

  const selectedUser = useMemo(() => {
    return users.find((u) => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  const currentBalance = Number(selectedUser?.wallet?.availableBalance ?? 0);
  const parsedAmount = parseFloat(amount) || 0;
  const isDebit = mode === 'DEBIT';
  const isOverdraft = isDebit && parsedAmount > currentBalance;
  const projectedBalance = isDebit ? currentBalance - parsedAmount : currentBalance + parsedAmount;

  // Aggregate statistics
  const totalBalance = useMemo(() => {
    return users.reduce((acc, u) => acc + Number(u.wallet?.availableBalance ?? 0), 0);
  }, [users]);

  const agentCount = useMemo(() => users.filter((u) => u.role === 'AGENT').length, [users]);

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error('Please select a user');
      if (parsedAmount <= 0) throw new Error('Amount must be greater than 0');
      if (!description.trim()) throw new Error('Description is required');
      if (isOverdraft) throw new Error('Debit amount exceeds user balance');

      return apiRequest(`/admin/users/${selectedUserId}/wallet`, {
        method: 'POST',
        body: JSON.stringify({
          amount: parsedAmount,
          type: isDebit ? 'DEBIT' : 'CREDIT',
          reason: description.trim(),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setStatusMsg({
        type: 'success',
        text: `Successfully ${isDebit ? 'debited' : 'credited'} GHS ${parsedAmount.toFixed(2)} for ${selectedUser?.firstName} ${selectedUser?.lastName}!`,
      });
      setAmount('');
      setDescription('');
      setTimeout(() => setStatusMsg(null), 4000);
    },
    onError: (err: any) => {
      setStatusMsg({ type: 'error', text: err?.message || 'Transaction failed' });
    },
  });

  const handleSelectUser = (user: User, action: 'CREDIT' | 'DEBIT') => {
    setSelectedUserId(user.id);
    setMode(action);
    setStatusMsg(null);
  };

  const quickAmounts = [10, 20, 50, 100, 200, 500];
  const quickReasonsCredit = [
    'Manual Momo deposit',
    'Agent commission bonus',
    'Customer balance top-up',
    'Billing correction',
  ];
  const quickReasonsDebit = [
    'Manual withdrawal processed',
    'Reversal of incorrect credit',
    'Administrative fee deduction',
    'Order cancellation chargeback',
  ];

  return (
    <AuthGuard requiredRole="ADMIN">
      <DashboardShell
        mode="admin"
        title="User & Wallet Directory"
        description="Inspect balances, storefronts, and manually credit or debit user wallets."
      >
        {/* Stat Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <GlassCard className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Registered Users</p>
              <p className="text-xl font-bold text-white">{users.length} <span className="text-xs font-normal text-gray-400">({agentCount} agents)</span></p>
            </div>
          </GlassCard>

          <GlassCard className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total User Float / Balances</p>
              <p className="text-xl font-bold text-emerald-400">GHS {formatCurrency(totalBalance)}</p>
            </div>
          </GlassCard>

          <GlassCard className="p-4 flex items-center gap-4 sm:col-span-2 lg:col-span-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-600/20 text-cyan-400">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Manual Adjustments</p>
              <p className="text-sm font-semibold text-white">Instant Credit & Debit</p>
            </div>
          </GlassCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          {/* Left Column: Manual Wallet Action Form */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                  Manual Wallet Adjustment
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Credit or debit any user's wallet directly</p>
              </div>
              <span className="text-xs text-gray-400 font-mono">
                {selectedUser ? selectedUser.email : 'No user selected'}
              </span>
            </div>

            {/* Alert Message */}
            {statusMsg && (
              <div className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-xs ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-300 border border-red-500/20'
              }`}>
                {statusMsg.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {/* User Selector Dropdown */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Target User <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setStatusMsg(null);
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                <option value="">-- Choose a user to adjust --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.email}) — Bal: GHS {formatCurrency(Number(u.wallet?.availableBalance ?? 0))}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected User Overview Card */}
            {selectedUser && (
              <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </p>
                      <p className="text-xs text-gray-400">{selectedUser.phone || selectedUser.email}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                    selectedUser.role === 'ADMIN'
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      : 'bg-violet-500/10 text-violet-300 border-violet-500/20'
                  }`}>
                    {selectedUser.role}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Current Balance:</span>
                  <span className="font-mono text-base font-bold text-white">
                    GHS {formatCurrency(currentBalance)}
                  </span>
                </div>

                {parsedAmount > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Projected Balance:</span>
                    <span className={`font-mono text-sm font-bold ${
                      isOverdraft ? 'text-red-400' : isDebit ? 'text-amber-300' : 'text-emerald-400'
                    }`}>
                      GHS {formatCurrency(projectedBalance)}
                    </span>
                  </div>
                )}

                {isOverdraft && (
                  <p className="mt-2 text-[11px] text-red-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Debit amount exceeds user balance. Transaction will be declined.
                  </p>
                )}
              </div>
            )}

            {/* Action Segmented Toggle */}
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-900/80 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMode('CREDIT');
                  setStatusMsg(null);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  !isDebit
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <PlusCircle className="h-4 w-4" />
                Credit (Add Funds)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('DEBIT');
                  setStatusMsg(null);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isDebit
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <MinusCircle className="h-4 w-4" />
                Debit (Deduct Funds)
              </button>
            </div>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Adjustment Amount (GHS) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">GHS</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setStatusMsg(null);
                  }}
                  className="pl-12 font-mono text-white"
                />
              </div>

              {/* Quick Amount Chips */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {quickAmounts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(String(q))}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-300 hover:border-violet-500/50 hover:text-white transition"
                  >
                    +{q}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason / Description Input */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Reason / Audit Note <span className="text-rose-400">*</span>
              </label>
              <Input
                placeholder="e.g., Manual deposit via MoMo, commission correction..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              {/* Quick Reason Chips */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(isDebit ? quickReasonsDebit : quickReasonsCredit).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setDescription(r)}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-gray-400 hover:border-violet-500/50 hover:text-gray-200 transition"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              className={`w-full py-2.5 font-semibold text-white shadow-lg transition ${
                isDebit
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/30'
              }`}
              disabled={adjustMutation.isPending || !selectedUserId || parsedAmount <= 0 || !description.trim() || isOverdraft}
              onClick={() => adjustMutation.mutate()}
            >
              {adjustMutation.isPending
                ? 'Processing...'
                : isDebit
                  ? `Debit GHS ${parsedAmount > 0 ? parsedAmount.toFixed(2) : '0.00'}`
                  : `Credit GHS ${parsedAmount > 0 ? parsedAmount.toFixed(2) : '0.00'}`}
            </Button>
          </GlassCard>

          {/* Right Column: User Directory Table with Quick Action Buttons */}
          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
              <div>
                <h3 className="text-base font-semibold text-white">Users Directory ({users.length})</h3>
                <p className="text-xs text-gray-400 mt-0.5">Click Credit or Debit on any user to adjust their wallet</p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search user, email, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-xs py-1.5"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-sm text-gray-400">Loading user directory...</div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">No users found matching "{search}"</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider text-[10px]">
                      <th className="pb-3 font-semibold">User</th>
                      <th className="pb-3 font-semibold">Role</th>
                      <th className="pb-3 font-semibold">Wallet Balance</th>
                      <th className="pb-3 font-semibold text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((user) => {
                      const bal = Number(user.wallet?.availableBalance ?? 0);
                      const isCurrentSelected = user.id === selectedUserId;

                      return (
                        <tr
                          key={user.id}
                          className={`hover:bg-white/[0.02] transition ${
                            isCurrentSelected ? 'bg-violet-600/10' : ''
                          }`}
                        >
                          <td className="py-3 pr-3">
                            <div className="font-medium text-white">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-[11px] text-gray-400">{user.email}</div>
                            {user.phone && <div className="text-[10px] text-gray-500">{user.phone}</div>}
                          </td>
                          <td className="py-3 pr-3">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border ${
                              user.role === 'ADMIN'
                                ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                                : 'bg-violet-500/10 text-violet-300 border-violet-500/20'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 pr-3">
                            <span className="font-mono text-xs font-bold text-white">
                              GHS {formatCurrency(bal)}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleSelectUser(user, 'CREDIT')}
                                className="h-7 px-2 text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15 flex items-center gap-1"
                                title="Credit wallet"
                              >
                                <ArrowDownLeft className="h-3 w-3" />
                                Credit
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleSelectUser(user, 'DEBIT')}
                                className="h-7 px-2 text-[11px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/15 flex items-center gap-1"
                                title="Debit wallet"
                              >
                                <ArrowUpRight className="h-3 w-3" />
                                Debit
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setInspectUserId(user.id)}
                                className="h-7 px-2 text-[11px] text-gray-300 hover:text-white"
                                title="Inspect user details"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>

        {/* User Details Modal */}
        {inspectUserId && (
          <UserDetailedView userId={inspectUserId} onClose={() => setInspectUserId(null)} />
        )}
      </DashboardShell>
    </AuthGuard>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  Edit2,
  Trash2,
  DollarSign,
  User,
  Mail,
  Phone,
  PlusCircle,
  MinusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  AlertCircle,
} from 'lucide-react';

interface UserAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  wallet?: { availableBalance: number } | null;
}

export default function AdminUserManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletSuccess, setWalletSuccess] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'AGENT' as 'AGENT' | 'ADMIN',
  });
  const [walletData, setWalletData] = useState({
    amount: '',
    type: 'ADD' as 'ADD' | 'REDUCE',
    reason: '',
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => apiRequest<UserAccount[]>(`/admin/users?search=${search}`),
  });

  const updateUserMutation = useMutation({
    mutationFn: (data: typeof editFormData) =>
      apiRequest(`/admin/users/${selectedUser?.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowEditModal(false);
      setSelectedUser(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/admin/users/${selectedUser?.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
    },
  });

  const updateWalletMutation = useMutation({
    mutationFn: (data: typeof walletData) =>
      apiRequest(`/admin/users/${selectedUser?.id}/wallet`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setWalletSuccess(`Wallet successfully ${walletData.type === 'ADD' ? 'credited' : 'debited'}!`);
      setTimeout(() => {
        setShowWalletModal(false);
        setWalletData({ amount: '', type: 'ADD', reason: '' });
        setSelectedUser(null);
        setWalletSuccess(null);
        setWalletError(null);
      }, 1000);
    },
    onError: (err: any) => {
      setWalletError(err?.message || 'Failed to update wallet');
    },
  });

  const handleEditClick = (user: UserAccount) => {
    setSelectedUser(user);
    setEditFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: (user.role as 'AGENT' | 'ADMIN') ?? 'AGENT',
    });
    setShowEditModal(true);
  };

  const handleWalletClick = (user: UserAccount, mode: 'ADD' | 'REDUCE' = 'ADD') => {
    setSelectedUser(user);
    setWalletData({ amount: '', type: mode, reason: '' });
    setWalletError(null);
    setWalletSuccess(null);
    setShowWalletModal(true);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.firstName.toLowerCase().includes(search.toLowerCase()) ||
      user.lastName.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AuthGuard>
      <DashboardShell
        title="User Management"
        description="Manage user accounts, edit details, and control wallet balances."
        mode="admin"
      >
        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Users List */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Users ({filteredUsers.length})</h3>

          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-900/30 p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/20">
                      <User className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-3 text-sm text-gray-400 mt-2">
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{user.phone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-emerald-400" />
                      <span className="font-semibold text-white">GHS {formatCurrency(Number(user.wallet?.availableBalance ?? 0))}</span>
                    </div>
                  </div>

                  <div className="mt-2">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${
                      user.role === 'ADMIN'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                    }`}>
                      {user.role === 'ADMIN' ? 'Administrator' : 'Agent'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleWalletClick(user, 'ADD')}
                    className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 flex items-center gap-1 px-2.5"
                    title="Credit wallet"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="text-xs">Credit</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleWalletClick(user, 'REDUCE')}
                    className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 flex items-center gap-1 px-2.5"
                    title="Debit wallet"
                  >
                    <MinusCircle className="h-3.5 w-3.5" />
                    <span className="text-xs">Debit</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEditClick(user)}
                    title="Edit user"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(user);
                      if (confirm(`Delete user ${user.firstName} ${user.lastName}?`)) {
                        deleteUserMutation.mutate();
                      }
                    }}
                    disabled={deleteUserMutation.isPending}
                    className="text-rose-400 hover:text-rose-300"
                    title="Delete user"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <p className="text-center text-gray-500 py-8">No users found</p>
            )}
          </div>
        </GlassCard>

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <GlassCard className="w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Edit User Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                  <Input
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                  <Input
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <Input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <Input
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as 'AGENT' | 'ADMIN' })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
                  >
                    <option value="AGENT" className="bg-gray-900">Agent</option>
                    <option value="ADMIN" className="bg-gray-900">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => updateUserMutation.mutate(editFormData)}
                    disabled={updateUserMutation.isPending}
                  >
                    {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Wallet Management Modal */}
        {showWalletModal && selectedUser && (() => {
          const currentBal = Number(selectedUser.wallet?.availableBalance ?? 0);
          const numAmount = parseFloat(walletData.amount) || 0;
          const isDebit = walletData.type === 'REDUCE';
          const isOverdraft = isDebit && numAmount > currentBal;
          const projectedBal = isDebit ? currentBal - numAmount : currentBal + numAmount;
          const quickAmounts = [10, 20, 50, 100, 200, 500];
          const quickReasonsCredit = [
            'Manual Momo deposit',
            'Performance bonus',
            'Balance adjustment',
            'Customer service refund',
          ];
          const quickReasonsDebit = [
            'Manual withdrawal',
            'Reversal of incorrect credit',
            'Administrative deduction',
            'Dispute resolution',
          ];

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <GlassCard className="w-full max-w-lg p-6 shadow-2xl border-white/15">
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-emerald-400" />
                      Adjust User Wallet
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedUser.firstName} {selectedUser.lastName} • <span className="text-gray-300">{selectedUser.email}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowWalletModal(false)}
                    className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-white/10"
                  >
                    ✕
                  </button>
                </div>

                {/* Status Banners */}
                {walletError && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{walletError}</span>
                  </div>
                )}
                {walletSuccess && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>{walletSuccess}</span>
                  </div>
                )}

                {/* Segmented Action Buttons */}
                <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-900/80 p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setWalletData({ ...walletData, type: 'ADD' });
                      setWalletError(null);
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
                      setWalletData({ ...walletData, type: 'REDUCE' });
                      setWalletError(null);
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

                {/* Balance Metrics Card */}
                <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Current Balance:</span>
                    <span className="font-mono text-sm font-semibold text-white">GHS {formatCurrency(currentBal)}</span>
                  </div>
                  {numAmount > 0 && (
                    <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2 mt-2">
                      <span className="text-gray-400">Projected Balance:</span>
                      <span className={`font-mono text-sm font-bold ${isOverdraft ? 'text-red-400' : isDebit ? 'text-amber-300' : 'text-emerald-400'}`}>
                        GHS {formatCurrency(projectedBal)}
                      </span>
                    </div>
                  )}
                  {isOverdraft && (
                    <p className="mt-2 text-[11px] text-red-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      Debit amount exceeds user available balance (GHS {formatCurrency(currentBal)}).
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Amount input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Amount (GHS)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">GHS</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={walletData.amount}
                        onChange={(e) => {
                          setWalletData({ ...walletData, amount: e.target.value });
                          setWalletError(null);
                        }}
                        step="0.01"
                        min="0"
                        className="pl-12 font-mono text-white"
                      />
                    </div>
                    {/* Quick amount chips */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {quickAmounts.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setWalletData({ ...walletData, amount: String(q) })}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-300 hover:border-violet-500/50 hover:text-white"
                        >
                          +{q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reason input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Reason / Note <span className="text-rose-400">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Manual payment top-up, System adjustment..."
                      value={walletData.reason}
                      onChange={(e) => setWalletData({ ...walletData, reason: e.target.value })}
                    />
                    {/* Quick reason suggestions */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(isDebit ? quickReasonsDebit : quickReasonsCredit).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setWalletData({ ...walletData, reason: r })}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-gray-400 hover:border-violet-500/50 hover:text-gray-200"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Modal action buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setShowWalletModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className={`flex-1 ${
                        isDebit
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                      onClick={() => {
                        if (walletData.amount && walletData.reason && !isOverdraft) {
                          updateWalletMutation.mutate(walletData);
                        }
                      }}
                      disabled={updateWalletMutation.isPending || !walletData.amount || !walletData.reason || isOverdraft}
                    >
                      {updateWalletMutation.isPending
                        ? 'Processing...'
                        : isDebit
                          ? `Debit GHS ${numAmount > 0 ? numAmount.toFixed(2) : '0.00'}`
                          : `Credit GHS ${numAmount > 0 ? numAmount.toFixed(2) : '0.00'}`}
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </div>
          );
        })()}
      </DashboardShell>
    </AuthGuard>
  );
}

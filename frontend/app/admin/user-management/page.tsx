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
import { Edit2, Trash2, DollarSign, User, Mail, Phone } from 'lucide-react';

interface UserAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  wallet: { availableBalance: number };
}

export default function AdminUserManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
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
      setShowWalletModal(false);
      setWalletData({ amount: '', type: 'ADD', reason: '' });
      setSelectedUser(null);
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

  const handleWalletClick = (user: UserAccount) => {
    setSelectedUser(user);
    setWalletData({ amount: '', type: 'ADD', reason: '' });
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
                      <DollarSign className="h-3 w-3" />
                      <span>GHS {formatCurrency(user.wallet.availableBalance)}</span>
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
                    onClick={() => handleWalletClick(user)}
                    title="Manage wallet"
                  >
                    <DollarSign className="h-4 w-4" />
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
        {showWalletModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <GlassCard className="w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Manage Wallet</h3>
              <p className="text-sm text-gray-400 mb-4">
                Current Balance: GHS {formatCurrency(selectedUser.wallet.availableBalance)}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Action</label>
                  <select
                    value={walletData.type}
                    onChange={(e) => setWalletData({ ...walletData, type: e.target.value as 'ADD' | 'REDUCE' })}
                    className="w-full rounded-xl border border-gray-700/50 bg-slate-900/50 px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 hover:border-gray-600/50 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  >
                    <option value="ADD">Add Funds</option>
                    <option value="REDUCE">Reduce Balance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount (GHS)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={walletData.amount}
                    onChange={(e) => setWalletData({ ...walletData, amount: e.target.value })}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
                  <Input
                    placeholder="e.g., Manual adjustment, Refund, etc."
                    value={walletData.reason}
                    onChange={(e) => setWalletData({ ...walletData, reason: e.target.value })}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowWalletModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (walletData.amount && walletData.reason) {
                        updateWalletMutation.mutate(walletData);
                      }
                    }}
                    disabled={updateWalletMutation.isPending || !walletData.amount}
                  >
                    {updateWalletMutation.isPending ? 'Processing...' : 'Update Wallet'}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </DashboardShell>
    </AuthGuard>
  );
}

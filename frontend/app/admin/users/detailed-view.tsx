'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiRequest } from '@/lib/api';
import type { User } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface UserDetailedViewProps {
  userId: string;
  onClose: () => void;
}

export function UserDetailedView({ userId, onClose }: UserDetailedViewProps) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'AGENT',
  });

  const [walletMode, setWalletMode] = useState<'CREDIT' | 'DEBIT' | null>(null);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletReason, setWalletReason] = useState('');
  const [walletMsg, setWalletMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const adjustWalletMutation = useMutation({
    mutationFn: async () => {
      const numAmount = parseFloat(walletAmount);
      if (!numAmount || numAmount <= 0) throw new Error('Invalid amount');
      if (!walletReason.trim()) throw new Error('Reason required');
      return apiRequest(`/admin/users/${userId}/wallet`, {
        method: 'POST',
        body: JSON.stringify({
          amount: numAmount,
          type: walletMode,
          reason: walletReason.trim(),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setWalletMsg({ type: 'success', text: `Wallet ${walletMode === 'CREDIT' ? 'credited' : 'debited'} successfully!` });
      setWalletAmount('');
      setWalletReason('');
      setTimeout(() => {
        setWalletMode(null);
        setWalletMsg(null);
      }, 1500);
    },
    onError: (err: any) => {
      setWalletMsg({ type: 'error', text: err?.message || 'Adjustment failed' });
    },
  });

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => apiRequest<User>(`/admin/users/${userId}`),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/admin/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditMode(false);
    },
  });

  const suspendMutation = useMutation({
    mutationFn: () => apiRequest(`/admin/users/${userId}/suspend`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const unsuspendMutation = useMutation({
    mutationFn: () => apiRequest(`/admin/users/${userId}/unsuspend`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  if (isLoading) return <div className="text-center py-8">Loading...</div>;
  if (!user) return <div className="text-center py-8">User not found</div>;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{user.firstName} {user.lastName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {editMode ? (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate(formData);
          }}>
            <Input placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
            <Input placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
            <Input placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <Input placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <Select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
              <option value="AGENT">Agent</option>
              <option value="ADMIN">Admin</option>
              <option value="USER">User</option>
              <option value="PREMIUM">Premium</option>
            </Select>
            <div className="flex gap-2">
              <Button onClick={() => updateMutation.mutate(formData)} disabled={updateMutation.isPending}>Save</Button>
              <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Email</p>
                <p className="font-semibold">{user.email}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Phone</p>
                <p className="font-semibold">{user.phone}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Role</p>
                <p className="font-semibold">{user.role}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Status</p>
                <p className="font-semibold">{user.deletedAt ? 'Suspended' : 'Active'}</p>
              </div>
            </div>

            {/* Wallet Section */}
            <div className="rounded-xl border border-white/10 bg-slate-800/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Available Wallet Balance</p>
                  <p className="text-2xl font-bold text-white font-mono mt-0.5">
                    GHS {formatCurrency(Number(user.wallet?.availableBalance ?? 0))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setWalletMode('CREDIT');
                      setWalletMsg(null);
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  >
                    + Credit Wallet
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setWalletMode('DEBIT');
                      setWalletMsg(null);
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                  >
                    - Debit Wallet
                  </Button>
                </div>
              </div>

              {/* Status Message */}
              {walletMsg && (
                <div className={`mt-3 rounded-lg p-2.5 text-xs ${
                  walletMsg.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                    : 'bg-red-500/15 text-red-300 border border-red-500/20'
                }`}>
                  {walletMsg.text}
                </div>
              )}

              {/* Inline Wallet Adjustment Form */}
              {walletMode && (
                <div className="mt-4 pt-3 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      {walletMode === 'CREDIT' ? 'Credit User Funds' : 'Debit User Funds'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setWalletMode(null)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Amount (GHS)"
                      value={walletAmount}
                      onChange={(e) => setWalletAmount(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <Input
                      placeholder="Reason for adjustment"
                      value={walletReason}
                      onChange={(e) => setWalletReason(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => adjustWalletMutation.mutate()}
                    disabled={adjustWalletMutation.isPending || !walletAmount || !walletReason}
                    className={`w-full text-xs ${
                      walletMode === 'CREDIT'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {adjustWalletMutation.isPending
                      ? 'Processing...'
                      : `Confirm ${walletMode === 'CREDIT' ? 'Credit' : 'Debit'}`}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap pt-2">
              <Button onClick={() => setEditMode(true)}>Edit User</Button>
              {user.deletedAt ? (
                <Button onClick={() => unsuspendMutation.mutate()} disabled={unsuspendMutation.isPending}>Unsuspend</Button>
              ) : (
                <Button variant="secondary" onClick={() => suspendMutation.mutate()} disabled={suspendMutation.isPending}>Suspend</Button>
              )}
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

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

            {user.wallet && (
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-2">Wallet Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(user.wallet.availableBalance)}</p>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
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

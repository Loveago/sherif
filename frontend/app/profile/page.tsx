'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { User } from '@/lib/types';
import { User as UserIcon, Mail, Phone, Building2, Lock, Save } from 'lucide-react';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user: authUser, setAuth } = useAuthStore();
  const token = authUser ? localStorage.getItem('datahub_token') : null;

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiRequest<User>('/me'),
  });

  const profileForm = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      companyName: '',
    },
  });

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        companyName: user.companyName || '',
      });
    }
  }, [user, profileForm]);

  const updateMutation = useMutation({
    mutationFn: (data: { firstName?: string; lastName?: string; email?: string; phone?: string; companyName?: string | null }) =>
      apiRequest('/me', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (data: User) => {
      if (token && data) {
        setAuth(token, data);
      }
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiRequest('/me/change-password', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      passwordForm.reset();
    },
  });

  const onProfileSubmit = profileForm.handleSubmit((values) => {
    updateMutation.mutate(values);
  });

  const onPasswordSubmit = passwordForm.handleSubmit((values) => {
    if (values.newPassword !== values.confirmPassword) {
      passwordForm.setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }
    passwordMutation.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  });

  return (
    <AuthGuard>
      <DashboardShell title="Profile" description="Manage your personal information and account security.">
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Profile Information */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-6 w-1 rounded-full bg-violet-500" />
              <h3 className="text-base font-semibold text-white">Profile Information</h3>
            </div>

            <form onSubmit={onProfileSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">First Name</label>
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input placeholder="First name" {...profileForm.register('firstName')} className="pl-10" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Last Name</label>
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input placeholder="Last name" {...profileForm.register('lastName')} className="pl-10" />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input type="email" placeholder="Email address" {...profileForm.register('email')} className="pl-10" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Phone Number</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input placeholder="Phone number" {...profileForm.register('phone')} className="pl-10" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Company Name</label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input placeholder="Company name (optional)" {...profileForm.register('companyName')} className="pl-10" />
                </div>
              </div>

              {updateMutation.isError && (
                <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  {(updateMutation.error as Error)?.message || 'Update failed'}
                </p>
              )}
              {updateMutation.isSuccess && (
                <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  Profile updated successfully
                </p>
              )}

              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </GlassCard>

          {/* Change Password */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-6 w-1 rounded-full bg-amber-500" />
              <h3 className="text-base font-semibold text-white">Change Password</h3>
            </div>

            <form onSubmit={onPasswordSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Current Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input type="password" placeholder="Enter current password" {...passwordForm.register('currentPassword')} className="pl-10" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">New Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input type="password" placeholder="Enter new password" {...passwordForm.register('newPassword')} className="pl-10" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Confirm New Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input type="password" placeholder="Confirm new password" {...passwordForm.register('confirmPassword')} className="pl-10" />
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-rose-400">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {passwordMutation.isError && (
                <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  {(passwordMutation.error as Error)?.message || 'Password change failed'}
                </p>
              )}
              {passwordMutation.isSuccess && (
                <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  Password changed successfully
                </p>
              )}

              <Button
                type="submit"
                disabled={passwordMutation.isPending}
                className="flex items-center gap-2"
              >
                <Lock className="h-4 w-4" />
                {passwordMutation.isPending ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </GlassCard>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}

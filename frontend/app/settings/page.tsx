'use client';

import { useAuthStore } from '@/store/auth-store';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { User, Shield, Bell, Key } from 'lucide-react';

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <AuthGuard>
      <DashboardShell title="Settings" description="Manage your profile details, security and notification preferences.">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
                <User className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Personal Information</h3>
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between rounded-lg bg-gray-900/50 px-4 py-2.5">
                <span className="text-sm text-gray-400">Name</span>
                <span className="text-sm text-white">{user?.firstName} {user?.lastName}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-gray-900/50 px-4 py-2.5">
                <span className="text-sm text-gray-400">Email</span>
                <span className="text-sm text-white">{user?.email}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-gray-900/50 px-4 py-2.5">
                <span className="text-sm text-gray-400">Phone</span>
                <span className="text-sm text-white">{user?.phone}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-gray-900/50 px-4 py-2.5">
                <span className="text-sm text-gray-400">Company</span>
                <span className="text-sm text-white">{user?.companyName || '—'}</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Security</h3>
            </div>
            <div className="mt-6 space-y-3">
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <p className="text-sm font-medium text-white">Password</p>
                <p className="mt-1 text-xs text-gray-400">Last changed 30 days ago</p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <p className="text-sm font-medium text-white">Two-Factor Auth</p>
                <p className="mt-1 text-xs text-gray-400">Not enabled</p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <p className="text-sm font-medium text-white">Active Sessions</p>
                <p className="mt-1 text-xs text-gray-400">1 device</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600/20 text-sky-400">
                <Bell className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <span className="text-sm text-white">Email Notifications</span>
                <span className="text-xs text-emerald-400">Enabled</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <span className="text-sm text-white">In-App Notifications</span>
                <span className="text-xs text-emerald-400">Enabled</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <span className="text-sm text-white">Order Updates</span>
                <span className="text-xs text-emerald-400">Enabled</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { apiRequest } from '@/lib/api';

type AdminSettings = {
  platformFees: { withdrawalFee: number; serviceFee: number };
  commissionRules: { type: string; value: string | number }[];
  paymentSettings: { paystackEnabled: boolean; momoEnabled: boolean };
  branding: { appName: string; theme: string };
  providerStrategy: { mode: string; activeProviderReference: string };
};

export default function AdminSettingsPage() {
  const { data } = useQuery({ queryKey: ['admin-settings'], queryFn: () => apiRequest<AdminSettings>('/admin/settings') });

  return (
    <AuthGuard requiredRole="ADMIN">
      <DashboardShell mode="admin" title="System Settings" description="Review configured fees, commission logic, payment toggles and provider failover strategy.">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <GlassCard className="p-6">
            <p className="text-sm text-slate-400">Platform Fees</p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>Withdrawal Fee: GHS {data?.platformFees.withdrawalFee}</p>
              <p>Service Fee: GHS {data?.platformFees.serviceFee}</p>
            </div>
          </GlassCard>
          <GlassCard className="p-6">
            <p className="text-sm text-slate-400">Payment Settings</p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>Paystack Enabled: {data?.paymentSettings.paystackEnabled ? 'Yes' : 'No'}</p>
              <p>MoMo Enabled: {data?.paymentSettings.momoEnabled ? 'Yes' : 'No'}</p>
            </div>
          </GlassCard>
          <GlassCard className="p-6">
            <p className="text-sm text-slate-400">Branding</p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>App Name: {data?.branding.appName}</p>
              <p>Theme: {data?.branding.theme}</p>
            </div>
          </GlassCard>
          <GlassCard className="p-6 md:col-span-2 xl:col-span-3">
            <p className="text-sm text-slate-400">Commission Rules</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(data?.commissionRules ?? []).map((rule) => (
                <div key={rule.type} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                  <p className="font-medium text-white">{rule.type}</p>
                  <p className="mt-2">{String(rule.value)}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}

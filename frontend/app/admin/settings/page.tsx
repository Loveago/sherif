'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import { Smartphone, CheckCircle, MessageCircle, CreditCard } from 'lucide-react';

type AdminSettings = {
  platformFees: { withdrawalFee: number; serviceFee: number };
  commissionRules: { type: string; value: string | number }[];
  paymentSettings: { paystackEnabled: boolean; momoEnabled: boolean };
  branding: { appName: string; theme: string };
  providerStrategy: { mode: string; activeProviderReference: string };
  momoSettings: { momoNumber: string; momoName: string; momoEnabled: boolean };
  whatsappNumber: string;
  afaRegistrationFee: number;
};

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data } = useQuery({ queryKey: ['admin-settings'], queryFn: () => apiRequest<AdminSettings>('/admin/settings') });

  const momoForm = useForm({
    defaultValues: {
      momoNumber: data?.momoSettings?.momoNumber ?? '',
      momoName: data?.momoSettings?.momoName ?? '',
      momoEnabled: data?.momoSettings?.momoEnabled ?? true,
    },
    values: {
      momoNumber: data?.momoSettings?.momoNumber ?? '',
      momoName: data?.momoSettings?.momoName ?? '',
      momoEnabled: data?.momoSettings?.momoEnabled ?? true,
    },
  });

  const whatsappForm = useForm({
    defaultValues: {
      whatsappNumber: data?.whatsappNumber ?? '',
    },
    values: {
      whatsappNumber: data?.whatsappNumber ?? '',
    },
  });

  const afaFeeForm = useForm({
    defaultValues: {
      afaRegistrationFee: data?.afaRegistrationFee ?? 20,
    },
    values: {
      afaRegistrationFee: data?.afaRegistrationFee ?? 20,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: Record<string, string>) =>
      apiRequest('/admin/settings', { method: 'PUT', body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['public-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const onSaveMoMo = momoForm.handleSubmit((values) => {
    updateMutation.mutate({
      momoNumber: values.momoNumber,
      momoName: values.momoName,
      momoEnabled: String(values.momoEnabled),
    });
  });

  const onSaveWhatsApp = whatsappForm.handleSubmit((values) => {
    updateMutation.mutate({
      whatsappNumber: values.whatsappNumber,
    });
  });

  const onSaveAfaFee = afaFeeForm.handleSubmit((values) => {
    updateMutation.mutate({
      afaRegistrationFee: String(values.afaRegistrationFee),
    });
  });

  return (
    <AuthGuard requiredRole="ADMIN">
      <DashboardShell mode="admin" title="System Settings" description="Configure fees, MoMo details, payment toggles and provider strategy.">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {/* MoMo Settings */}
          <GlassCard className="p-6 md:col-span-2 xl:col-span-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-violet-400" />
              <p className="text-sm font-semibold text-white">MoMo Wallet Settings</p>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              These details are shown to agents when they choose MTN Mobile Money to fund their wallet.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs text-gray-400">MoMo Number</label>
                <Input
                  placeholder="e.g. 0244123456"
                  {...momoForm.register('momoNumber')}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-gray-400">Account Name</label>
                <Input
                  placeholder="e.g. John Doe"
                  {...momoForm.register('momoName')}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={onSaveMoMo}
                  disabled={updateMutation.isPending}
                  className="w-full"
                >
                  {updateMutation.isPending ? 'Saving...' : saved ? (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" /> Saved
                    </span>
                  ) : 'Save MoMo Details'}
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* WhatsApp Settings */}
          <GlassCard className="p-6 md:col-span-2 xl:col-span-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-400" />
              <p className="text-sm font-semibold text-white">WhatsApp Support</p>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This number is shown as a floating chat bubble on the agent dashboard. Agents can click it to open WhatsApp and chat with you.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs text-gray-400">WhatsApp Number</label>
                <Input
                  placeholder="e.g. 0244123456"
                  {...whatsappForm.register('whatsappNumber')}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={onSaveWhatsApp}
                  disabled={updateMutation.isPending}
                  className="w-full"
                >
                  {updateMutation.isPending ? 'Saving...' : saved ? (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" /> Saved
                    </span>
                  ) : 'Save WhatsApp Number'}
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* AFA Registration Fee Settings */}
          <GlassCard className="p-6 md:col-span-2 xl:col-span-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-violet-400" />
              <p className="text-sm font-semibold text-white">AFA Registration Fee</p>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This is the amount users must pay via Paystack before their AFA registration is submitted for review.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs text-gray-400">Fee Amount (GHS)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 20"
                  {...afaFeeForm.register('afaRegistrationFee', { valueAsNumber: true })}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={onSaveAfaFee}
                  disabled={updateMutation.isPending}
                  className="w-full"
                >
                  {updateMutation.isPending ? 'Saving...' : saved ? (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" /> Saved
                    </span>
                  ) : 'Save AFA Fee'}
                </Button>
              </div>
            </div>
          </GlassCard>

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

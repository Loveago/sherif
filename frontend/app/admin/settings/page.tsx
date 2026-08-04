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
import { Smartphone, CheckCircle, MessageCircle, CreditCard, Key } from 'lucide-react';

type ProviderCredentialSummary = {
  configured: boolean;
  apiKeyMasked: string;
  baseUrl: string;
  source: 'database' | 'environment' | 'none';
};

type AdminSettings = {
  platformFees: { withdrawalFee: number; serviceFee: number };
  commissionRules: { type: string; value: string | number }[];
  paymentSettings: { paystackEnabled: boolean; momoEnabled: boolean };
  branding: { appName: string; theme: string };
  providerStrategy: { mode: string; activeProviderReference: string };
  momoSettings: { momoNumber: string; momoName: string; momoEnabled: boolean };
  whatsappNumber: string;
  afaRegistrationFee: number;
  paystackPublicKey: string;
  paystackSecretKey: string;
  providerCredentials: {
    shank: ProviderCredentialSummary;
    codecraft: ProviderCredentialSummary;
  };
  catalog: {
    productsEnabled: boolean;
    mtnEnabled: boolean;
    telecelEnabled: boolean;
    airteltigoEnabled: boolean;
  };
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

  const catalogForm = useForm({
    defaultValues: {
      productsEnabled: data?.catalog?.productsEnabled ?? true,
      mtnEnabled: data?.catalog?.mtnEnabled ?? true,
      telecelEnabled: data?.catalog?.telecelEnabled ?? true,
      airteltigoEnabled: data?.catalog?.airteltigoEnabled ?? true,
    },
    values: {
      productsEnabled: data?.catalog?.productsEnabled ?? true,
      mtnEnabled: data?.catalog?.mtnEnabled ?? true,
      telecelEnabled: data?.catalog?.telecelEnabled ?? true,
      airteltigoEnabled: data?.catalog?.airteltigoEnabled ?? true,
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

  const paystackForm = useForm({
    defaultValues: {
      paystackPublicKey: data?.paystackPublicKey ?? '',
      paystackSecretKey: data?.paystackSecretKey ?? '',
    },
    values: {
      paystackPublicKey: data?.paystackPublicKey ?? '',
      paystackSecretKey: data?.paystackSecretKey ?? '',
    },
  });

  const shankForm = useForm({
    defaultValues: { apiKey: '', baseUrl: '' },
    values: {
      apiKey: '',
      baseUrl: data?.providerCredentials?.shank.baseUrl ?? '',
    },
  });

  const codecraftForm = useForm({
    defaultValues: { apiKey: '', baseUrl: '' },
    values: {
      apiKey: '',
      baseUrl: data?.providerCredentials?.codecraft.baseUrl ?? '',
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

  const providerMutation = useMutation({
    mutationFn: ({ provider, values }: { provider: 'shank' | 'codecraft'; values: { apiKey: string; baseUrl: string } }) =>
      apiRequest('/admin/settings/providers/' + provider, {
        method: 'PUT',
        body: JSON.stringify(values),
      }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      if (variables.provider === 'shank') shankForm.resetField('apiKey');
      if (variables.provider === 'codecraft') codecraftForm.resetField('apiKey');
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

  const onSavePaystack = paystackForm.handleSubmit((values) => {
    updateMutation.mutate({
      paystackPublicKey: values.paystackPublicKey,
      paystackSecretKey: values.paystackSecretKey,
    });
  });

  const onSaveCatalog = catalogForm.handleSubmit((values) => {
    updateMutation.mutate({
      productsEnabled: String(values.productsEnabled),
      productsMtnEnabled: String(values.mtnEnabled),
      productsTelecelEnabled: String(values.telecelEnabled),
      productsAirteltigoEnabled: String(values.airteltigoEnabled),
    });
  });

  const onSaveShank = shankForm.handleSubmit((values) => {
    providerMutation.mutate({ provider: 'shank', values });
  });

  const onSaveCodecraft = codecraftForm.handleSubmit((values) => {
    providerMutation.mutate({ provider: 'codecraft', values });
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

          {/* Catalog Visibility */}
          <GlassCard className="p-6 md:col-span-2 xl:col-span-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white">Catalog Visibility</p>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Turn the entire catalog on or off, and control which networks are visible to agents and storefront visitors.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs text-gray-400">Catalog Enabled</label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border border-white/20 bg-black/40"
                    {...catalogForm.register('productsEnabled')}
                  />
                  <span>Show all products</span>
                </label>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-gray-400">MTN</label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border border-white/20 bg-black/40"
                    {...catalogForm.register('mtnEnabled')}
                  />
                  <span>Enable MTN products</span>
                </label>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-gray-400">Telecel</label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border border-white/20 bg-black/40"
                    {...catalogForm.register('telecelEnabled')}
                  />
                  <span>Enable Telecel products</span>
                </label>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-gray-400">AirtelTigo / AT</label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border border-white/20 bg-black/40"
                    {...catalogForm.register('airteltigoEnabled')}
                  />
                  <span>Enable AirtelTigo (AT) products</span>
                </label>
              </div>
            </div>
            <div className="mt-4 flex items-end">
              <Button
                onClick={onSaveCatalog}
                disabled={updateMutation.isPending}
                className="w-full md:w-auto"
              >
                {updateMutation.isPending ? 'Saving...' : saved ? (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" /> Saved
                  </span>
                ) : 'Save Catalog Settings'}
              </Button>
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

          {/* Paystack API Keys */}
          <GlassCard className="p-6 md:col-span-2 xl:col-span-3">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-400" />
              <p className="text-sm font-semibold text-white">Paystack API Keys</p>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Update your Paystack public and secret keys here. Changes take effect immediately for all new payments.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs text-gray-400">Public Key</label>
                <Input
                  placeholder="pk_test_..."
                  {...paystackForm.register('paystackPublicKey')}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-gray-400">Secret Key</label>
                <Input
                  type="password"
                  placeholder="sk_test_..."
                  {...paystackForm.register('paystackSecretKey')}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={onSavePaystack}
                  disabled={updateMutation.isPending}
                  className="w-full"
                >
                  {updateMutation.isPending ? 'Saving...' : saved ? (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" /> Saved
                    </span>
                  ) : 'Save Paystack Keys'}
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Data Provider API Keys */}
          <GlassCard className="p-6 md:col-span-2 xl:col-span-3">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-cyan-400" />
              <p className="text-sm font-semibold text-white">Data Provider API Credentials</p>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Configure Shank and CodeCraft without editing environment files. Saved API keys are encrypted and take effect immediately. Leave an API key blank to keep the current key.
            </p>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">Shank</p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] ${data?.providerCredentials?.shank.configured ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                    {data?.providerCredentials?.shank.configured ? `Configured via ${data.providerCredentials.shank.source}` : 'Not configured'}
                  </span>
                </div>
                {data?.providerCredentials?.shank.apiKeyMasked && (
                  <p className="mt-2 font-mono text-xs text-slate-400">Current key: {data.providerCredentials.shank.apiKeyMasked}</p>
                )}
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-400">New API Key</label>
                    <Input type="password" autoComplete="new-password" placeholder="Leave blank to keep current key" {...shankForm.register('apiKey')} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-400">API Base URL</label>
                    <Input type="url" placeholder="https://agent.skanka5.com/api/v1" {...shankForm.register('baseUrl', { required: true })} />
                  </div>
                  <Button onClick={onSaveShank} disabled={providerMutation.isPending} className="w-full">
                    {providerMutation.isPending && providerMutation.variables?.provider === 'shank' ? 'Saving...' : saved ? 'Saved' : 'Save Shank Credentials'}
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">CodeCraft</p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] ${data?.providerCredentials?.codecraft.configured ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                    {data?.providerCredentials?.codecraft.configured ? `Configured via ${data.providerCredentials.codecraft.source}` : 'Not configured'}
                  </span>
                </div>
                {data?.providerCredentials?.codecraft.apiKeyMasked && (
                  <p className="mt-2 font-mono text-xs text-slate-400">Current key: {data.providerCredentials.codecraft.apiKeyMasked}</p>
                )}
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-400">New API Key</label>
                    <Input type="password" autoComplete="new-password" placeholder="Leave blank to keep current key" {...codecraftForm.register('apiKey')} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-400">API Base URL</label>
                    <Input type="url" placeholder="https://api.codecraftnetwork.com/api" {...codecraftForm.register('baseUrl', { required: true })} />
                  </div>
                  <Button onClick={onSaveCodecraft} disabled={providerMutation.isPending} className="w-full">
                    {providerMutation.isPending && providerMutation.variables?.provider === 'codecraft' ? 'Saving...' : saved ? 'Saved' : 'Save CodeCraft Credentials'}
                  </Button>
                </div>
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

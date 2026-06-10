'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import { Copy, Check, Link2, TrendingUp, Calendar } from 'lucide-react';

interface ReferralCode {
  id: string;
  code: string;
  status: string;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  createdAt: string;
}

interface ReferralStats {
  total: number;
  active: number;
  totalUses: number;
}

type FormValues = { maxUses?: number; expiresAt?: string };

export default function ReferralsPage() {
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const form = useForm<FormValues>();

  const { data: response } = useQuery({
    queryKey: ['referral-codes'],
    queryFn: () => apiRequest<{ codes: ReferralCode[]; stats: ReferralStats }>('/referral-codes'),
  });

  const generateMutation = useMutation({
    mutationFn: (values: FormValues) => apiRequest('/referral-codes/generate', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['referral-codes'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/referral-codes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['referral-codes'] }),
  });

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const codes = response?.codes ?? [];
  const stats = response?.stats ?? { total: 0, active: 0, totalUses: 0 };

  return (
    <AuthGuard>
      <DashboardShell title="Referral Codes" description="Generate and manage referral codes to earn commissions from new users.">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Codes</p>
                  <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
                  <Link2 className="h-6 w-6" />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Codes</p>
                  <p className="mt-2 text-3xl font-bold text-white">{stats.active}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400">
                  <Check className="h-6 w-6" />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Uses</p>
                  <p className="mt-2 text-3xl font-bold text-white">{stats.totalUses}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600/20 text-sky-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </GlassCard>
          </div>

          <GlassCard className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Generate New Code</h3>
            <form
              onSubmit={form.handleSubmit((values) => generateMutation.mutate(values))}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Max Uses (Optional)</label>
                  <Input
                    type="number"
                    placeholder="Unlimited if empty"
                    {...form.register('maxUses', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Expires At (Optional)</label>
                  <Input type="datetime-local" {...form.register('expiresAt')} />
                </div>
              </div>
              <Button type="submit" disabled={generateMutation.isPending} className="w-full">
                {generateMutation.isPending ? 'Generating...' : 'Generate Code'}
              </Button>
            </form>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Your Codes</h3>
            {codes.length === 0 ? (
              <p className="text-center text-gray-400">No referral codes yet. Generate one to get started!</p>
            ) : (
              <div className="space-y-3">
                {codes.map((code) => (
                  <div key={code.id} className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <code className="font-mono text-lg font-semibold text-violet-400">{code.code}</code>
                        <button
                          onClick={() => copyToClipboard(code.code, code.id)}
                          className="text-gray-400 hover:text-white transition"
                        >
                          {copiedId === code.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-400">
                        <span>Uses: {code.currentUses}/{code.maxUses || '∞'}</span>
                        {code.expiresAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(code.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={code.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {code.status}
                      </Badge>
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: code.id,
                            data: { status: code.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
                          })
                        }
                        disabled={updateMutation.isPending}
                        className="text-sm text-blue-400 hover:text-blue-300 transition"
                      >
                        {code.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}

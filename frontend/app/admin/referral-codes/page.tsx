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
import { Copy, Check, Ticket, Calendar, Ban, Plus, User } from 'lucide-react';

interface ReferralCode {
  id: string;
  code: string;
  status: string;
  currentUses: number;
  maxUses: number | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: { id: string; firstName: string; lastName: string; email: string } | null;
  usedBy: { id: string; firstName: string; lastName: string; email: string } | null;
}

type FormValues = { code: string; maxUses?: number; expiresAt?: string; createdById?: string };

export default function AdminReferralCodesPage() {
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<FormValues>({ code: '', maxUses: undefined, expiresAt: '', createdById: '' });

  const { data: codes = [] } = useQuery({
    queryKey: ['admin-referral-codes'],
    queryFn: () => apiRequest<ReferralCode[]>('/admin/referral-codes'),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormValues) =>
      apiRequest('/admin/referral-codes', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-referral-codes'] });
      setShowCreateForm(false);
      setFormData({ code: '', maxUses: undefined, expiresAt: '', createdById: '' });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/admin/referral-codes/${id}/revoke`, { method: 'PUT' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-referral-codes'] }),
  });

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData((prev) => ({ ...prev, code: result }));
  };

  const activeCodes = codes.filter((c) => c.status === 'ACTIVE');
  const usedCodes = codes.filter((c) => c.currentUses > 0);

  return (
    <AuthGuard allowedRoles={['ADMIN']}>
      <DashboardShell title="Referral Codes" description="Create and manage referral codes for agents and customers." mode="admin">
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <GlassCard className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{codes.length}</p>
                  <p className="text-xs text-gray-400">Total Codes</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{activeCodes.length}</p>
                  <p className="text-xs text-gray-400">Active Codes</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{usedCodes.length}</p>
                  <p className="text-xs text-gray-400">Codes Used</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Create Form Toggle */}
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateForm((v) => !v)} className="gap-2">
              <Plus className="h-4 w-4" />
              {showCreateForm ? 'Cancel' : 'Create Referral Code'}
            </Button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <GlassCard className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">New Referral Code</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Code</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. WELCOME2026"
                      value={formData.code}
                      onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
                      className="flex-1"
                    />
                    <Button type="button" variant="secondary" onClick={generateRandomCode} className="shrink-0">
                      Random
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Max Uses (Optional)</label>
                  <Input
                    type="number"
                    placeholder="Unlimited"
                    value={formData.maxUses ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, maxUses: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Expires At (Optional)</label>
                  <Input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData((p) => ({ ...p, expiresAt: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Created By User ID (Optional)</label>
                  <Input
                    placeholder="Leave blank to assign to admin"
                    value={formData.createdById}
                    onChange={(e) => setFormData((p) => ({ ...p, createdById: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                <Button
                  onClick={() => createMutation.mutate(formData)}
                  disabled={!formData.code || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Code'}
                </Button>
              </div>
              {createMutation.error && (
                <p className="mt-3 text-sm text-rose-300">{(createMutation.error as Error).message}</p>
              )}
            </GlassCard>
          )}

          {/* Table */}
          <GlassCard className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">All Referral Codes</h3>
            {codes.length === 0 ? (
              <p className="text-center text-gray-400">No referral codes yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500">
                      <th className="pb-3 pr-4">Code</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Uses</th>
                      <th className="pb-3 pr-4">Created By</th>
                      <th className="pb-3 pr-4">Used By</th>
                      <th className="pb-3 pr-4">Expires</th>
                      <th className="pb-3 pr-4">Created</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {codes.map((code) => (
                      <tr key={code.id} className="text-gray-300">
                        <td className="py-3 pr-4 font-mono text-white">{code.code}</td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={code.status === 'ACTIVE' ? 'success' : code.status === 'INACTIVE' ? 'destructive' : 'default'}
                          >
                            {code.status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {code.currentUses}
                          {code.maxUses !== null && code.maxUses !== undefined ? ` / ${code.maxUses}` : ''}
                        </td>
                        <td className="py-3 pr-4">
                          {code.createdBy ? `${code.createdBy.firstName} ${code.createdBy.lastName}` : '—'}
                        </td>
                        <td className="py-3 pr-4">
                          {code.usedBy ? `${code.usedBy.firstName} ${code.usedBy.lastName}` : '—'}
                        </td>
                        <td className="py-3 pr-4">
                          {code.expiresAt ? (
                            <span className="flex items-center gap-1 text-xs">
                              <Calendar className="h-3 w-3" />
                              {new Date(code.expiresAt).toLocaleDateString()}
                            </span>
                          ) : (
                            'Never'
                          )}
                        </td>
                        <td className="py-3 pr-4 text-xs text-gray-500">
                          {new Date(code.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(code.code, code.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                              title="Copy code"
                            >
                              {copiedId === code.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                            </button>
                            {code.status === 'ACTIVE' && (
                              <button
                                onClick={() => revokeMutation.mutate(code.id)}
                                disabled={revokeMutation.isPending}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 transition-colors hover:bg-rose-500/20"
                                title="Revoke code"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}

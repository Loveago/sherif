'use client';

import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import type { Complaint } from '@/lib/types';
import { MessageSquare, Send } from 'lucide-react';

type FormValues = { title: string; description: string; evidenceUrl?: string };

export default function ComplaintsPage() {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>();
  const { data: complaints = [] } = useQuery({ queryKey: ['complaints'], queryFn: () => apiRequest<Complaint[]>('/complaints') });
  const mutation = useMutation({
    mutationFn: (values: FormValues) => apiRequest('/complaints', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
  });

  return (
    <AuthGuard>
      <DashboardShell title="Complaints" description="Create complaints, attach evidence links and track resolution progress.">
        <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Submit Complaint</h3>
            </div>
            <form className="mt-6 space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
              <div>
                <label className="mb-1.5 block text-xs text-gray-400">Title</label>
                <Input {...form.register('title')} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-gray-400">Description</label>
                <Textarea rows={5} {...form.register('description')} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-gray-400">Evidence URL</label>
                <Input {...form.register('evidenceUrl')} />
              </div>
              <Button className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Submitting...' : 'Submit Complaint'}
              </Button>
            </form>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="text-base font-semibold text-white">Complaint History</h3>
            <div className="mt-4 space-y-2">
              {complaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="rounded-xl border border-gray-800 bg-gray-900/50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{complaint.title}</p>
                    <Badge value={complaint.status} />
                  </div>
                  <p className="mt-2 text-sm text-gray-400">{complaint.description}</p>
                  <p className="mt-2 text-xs text-gray-500">{new Date(complaint.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
              {complaints.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-500">No complaints yet</p>
              )}
            </div>
          </GlassCard>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}

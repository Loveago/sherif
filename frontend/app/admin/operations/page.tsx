'use client';

import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { DataTableCard } from '@/components/dashboard/data-table-card';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import type { Announcement, Complaint, Notification, Withdrawal } from '@/lib/types';

type Refund = { id: string; amount: number; status: string; reason: string; order: { receiptNumber: string; product: { name: string } }; user: { email: string } };
type Provider = { id: string; name: string; code: string; status: string; priority: number };
type Payment = { id: string; amount: number; status: string; method: string; reference: string; user: { email: string } };
type AdminComplaint = Complaint & { user: { email: string } };
type AdminWithdrawal = Withdrawal & { user: { email: string } };
type AnnouncementForm = { title: string; content: string; pinned: boolean; targetRole?: 'AGENT' | 'ADMIN' };

export default function AdminOperationsPage() {
  const queryClient = useQueryClient();
  const announcementForm = useForm<AnnouncementForm>({ defaultValues: { pinned: false } as AnnouncementForm });
  const refundsQuery = useQuery({ queryKey: ['admin-refunds'], queryFn: () => apiRequest<Refund[]>('/admin/refunds') });
  const complaintsQuery = useQuery({ queryKey: ['admin-complaints'], queryFn: () => apiRequest<AdminComplaint[]>('/admin/complaints') });
  const withdrawalsQuery = useQuery({ queryKey: ['admin-withdrawals'], queryFn: () => apiRequest<AdminWithdrawal[]>('/admin/withdrawals') });
  const providersQuery = useQuery({ queryKey: ['admin-providers'], queryFn: () => apiRequest<Provider[]>('/admin/providers') });
  const paymentsQuery = useQuery({ queryKey: ['admin-payments'], queryFn: () => apiRequest<Payment[]>('/admin/payments') });
  const announcementsQuery = useQuery({ queryKey: ['admin-announcements'], queryFn: () => apiRequest<Announcement[]>('/admin/announcements') });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
    queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
    queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
    queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
    queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
  };

  const approveRefund = useMutation({ mutationFn: (id: string) => apiRequest(`/admin/refunds/${id}/approve`, { method: 'POST' }), onSuccess: refresh });
  const resolveComplaint = useMutation({ mutationFn: (id: string) => apiRequest(`/admin/complaints/${id}/resolve`, { method: 'POST' }), onSuccess: refresh });
  const approveWithdrawal = useMutation({ mutationFn: (id: string) => apiRequest(`/admin/withdrawals/${id}/approve`, { method: 'POST' }), onSuccess: refresh });
  const markWithdrawalPaid = useMutation({ mutationFn: (id: string) => apiRequest(`/admin/withdrawals/${id}/paid`, { method: 'POST' }), onSuccess: refresh });
  const activateProvider = useMutation({ mutationFn: (id: string) => apiRequest(`/admin/providers/${id}/activate`, { method: 'POST' }), onSuccess: refresh });
  const createAnnouncement = useMutation({
    mutationFn: (values: AnnouncementForm) => apiRequest('/admin/announcements', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      announcementForm.reset();
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  return (
    <AuthGuard requiredRole="ADMIN">
      <DashboardShell mode="admin" title="Operations Hub" description="Handle refunds, complaints, withdrawals, provider activation, announcements and payment monitoring.">
        <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <GlassCard className="p-6">
            <form className="space-y-4" onSubmit={announcementForm.handleSubmit((values) => createAnnouncement.mutate(values))}>
              <Input placeholder="Announcement title" {...announcementForm.register('title')} />
              <Textarea rows={5} placeholder="Announcement content" {...announcementForm.register('content')} />
              <Select {...announcementForm.register('targetRole')}>
                <option value="" className="bg-slate-950">All Roles</option>
                <option value="AGENT" className="bg-slate-950">Agents</option>
                <option value="ADMIN" className="bg-slate-950">Admins</option>
              </Select>
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input type="checkbox" {...announcementForm.register('pinned')} /> Pin announcement
              </label>
              <Button className="w-full" disabled={createAnnouncement.isPending}>{createAnnouncement.isPending ? 'Publishing...' : 'Publish Announcement'}</Button>
            </form>
          </GlassCard>

          <DataTableCard
            title="Refund Queue"
            columns={['Order', 'User', 'Amount', 'Status', 'Action']}
            rows={(refundsQuery.data ?? []).map((refund) => [
              `${refund.order.product.name} • ${refund.order.receiptNumber}`,
              refund.user.email,
              String(refund.amount),
              refund.status,
              <button key={`${refund.id}-approve`} className="text-sm text-emerald-300" onClick={() => approveRefund.mutate(refund.id)}>Approve</button>,
            ])}
          />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <DataTableCard
            title="Complaint Queue"
            columns={['Title', 'User', 'Status', 'Action']}
            rows={(complaintsQuery.data ?? []).map((complaint) => [
              complaint.title,
              complaint.user.email,
              complaint.status,
              <button key={`${complaint.id}-resolve`} className="text-sm text-emerald-300" onClick={() => resolveComplaint.mutate(complaint.id)}>Resolve</button>,
            ])}
          />
          <DataTableCard
            title="Withdrawals"
            columns={['Reference', 'User', 'Amount', 'Status', 'Actions']}
            rows={(withdrawalsQuery.data ?? []).map((withdrawal) => [
              withdrawal.reference,
              withdrawal.user.email,
              String(withdrawal.amount),
              withdrawal.status,
              <div key={`${withdrawal.id}-actions`} className="flex gap-3 text-sm">
                <button className="text-amber-300" onClick={() => approveWithdrawal.mutate(withdrawal.id)}>Approve</button>
                <button className="text-emerald-300" onClick={() => markWithdrawalPaid.mutate(withdrawal.id)}>Paid</button>
              </div>,
            ])}
          />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <DataTableCard
            title="Providers"
            columns={['Name', 'Code', 'Priority', 'Status', 'Action']}
            rows={(providersQuery.data ?? []).map((provider) => [
              provider.name,
              provider.code,
              String(provider.priority),
              provider.status,
              <button key={`${provider.id}-activate`} className="text-sm text-violet-300" onClick={() => activateProvider.mutate(provider.id)}>Activate</button>,
            ])}
          />
          <DataTableCard
            title="Payments"
            columns={['Reference', 'User', 'Method', 'Amount', 'Status']}
            rows={(paymentsQuery.data ?? []).map((payment) => [
              payment.reference,
              payment.user.email,
              payment.method,
              String(payment.amount),
              payment.status,
            ])}
          />
        </div>

        <div className="mt-5">
          <DataTableCard
            title="Announcements"
            columns={['Title', 'Pinned', 'Target Role', 'Created']}
            rows={(announcementsQuery.data ?? []).map((announcement) => [
              announcement.title,
              announcement.pinned ? 'Yes' : 'No',
              announcement.targetRole || 'All',
              new Date(announcement.createdAt).toLocaleDateString(),
            ])}
          />
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}

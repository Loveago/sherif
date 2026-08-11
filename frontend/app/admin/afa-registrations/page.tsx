'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import {
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  User,
  Phone,
  MapPin,
  Briefcase,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';

interface AFARegistration {
  id: string;
  fullName: string;
  phone: string;
  location: string;
  occupation: string;
  idType: string;
  idNumber: string;
  status: string;
  notes: string;
  createdAt: string;
  approvedAt?: string | null;
  paymentStatus: string;
  amountPaid: number | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface AFAStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

const safeDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
};

const safeAmount = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '0.00';
  return Number(value).toFixed(2);
};

const getStatusVariant = (status: string) => {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'REJECTED') return 'danger' as const;
  return 'warning' as const;
};

export default function AdminAFARegistrationsPage() {
  const queryClient = useQueryClient();
  const [selectedRegistration, setSelectedRegistration] = useState<AFARegistration | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-afa-registrations'],
    queryFn: () => apiRequest<{ registrations: AFARegistration[]; stats: AFAStats }>('/admin/afa-registrations'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/admin/afa-registrations/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-afa-registrations'] });
      setSelectedRegistration(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/admin/afa-registrations/${id}/reject`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-afa-registrations'] });
      setSelectedRegistration(null);
    },
  });

  const registrations = data?.registrations ?? [];
  const stats = data?.stats ?? { total: 0, pending: 0, approved: 0, rejected: 0 };

  const statusIcons: Record<string, React.ReactNode> = {
    PENDING: <Clock className="h-5 w-5 text-amber-400" />,
    APPROVED: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
    REJECTED: <XCircle className="h-5 w-5 text-rose-400" />,
  };

  return (
    <AuthGuard requiredRole="ADMIN">
      <DashboardShell mode="admin" title="AFA Registrations" description="Manage AFA registration applications.">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Loading registrations...</div>
        ) : isError ? (
          <GlassCard className="p-8">
            <div className="flex flex-col items-center text-center">
              <AlertTriangle className="h-12 w-12 text-rose-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Could not load registrations</h3>
              <p className="text-sm text-gray-400 mb-6 max-w-md">
                {error instanceof Error ? error.message : 'An unexpected error occurred while loading AFA registrations.'}
              </p>
              <Button onClick={() => refetch()}>Try Again</Button>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total</p>
                    <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
                  </div>
                  <FileText className="h-12 w-12 text-violet-600/30" />
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Pending</p>
                    <p className="mt-2 text-3xl font-bold text-amber-400">{stats.pending}</p>
                  </div>
                  <Clock className="h-12 w-12 text-amber-600/30" />
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Approved</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-400">{stats.approved}</p>
                  </div>
                  <CheckCircle2 className="h-12 w-12 text-emerald-600/30" />
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Rejected</p>
                    <p className="mt-2 text-3xl font-bold text-rose-400">{stats.rejected}</p>
                  </div>
                  <XCircle className="h-12 w-12 text-rose-600/30" />
                </div>
              </GlassCard>
            </div>

            {/* Registrations List */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">All Registrations</h3>

              {registrations.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No paid AFA registrations yet.</p>
              ) : (
                <div className="space-y-4">
                  {registrations.map((registration) => {
                    const submittedBy = registration.user
                      ? `${registration.user.firstName ?? ''} ${registration.user.lastName ?? ''}`.trim() || 'Unknown user'
                      : 'Unknown user';
                    const submittedEmail = registration.user?.email ?? '—';

                    return (
                      <div
                        key={registration.id}
                        onClick={() => setSelectedRegistration(registration)}
                        className="cursor-pointer rounded-lg border border-gray-700/50 bg-gray-900/30 p-4 hover:bg-gray-800/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-white">{registration.fullName}</h4>
                              <Badge variant={getStatusVariant(registration.status)}>{registration.status}</Badge>
                            </div>
                            <div className="grid gap-2 md:grid-cols-3 text-sm text-gray-400">
                              <p className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-gray-500" />
                                {registration.phone}
                              </p>
                              <p className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-gray-500" />
                                {registration.location}
                              </p>
                              <p className="flex items-center gap-1.5">
                                <CreditCard className="h-3.5 w-3.5 text-gray-500" />
                                GHS {safeAmount(registration.amountPaid)}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Submitted by {submittedBy} ({submittedEmail}) on {safeDate(registration.createdAt) || 'unknown date'}
                            </p>
                          </div>
                          <div className="ml-4">{statusIcons[registration.status] ?? <Clock className="h-5 w-5 text-gray-500" />}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {/* Detail Modal */}
            {selectedRegistration && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <GlassCard className="w-full max-w-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Registration Details</h3>
                    <button
                      onClick={() => setSelectedRegistration(null)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-violet-400" />
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white font-medium">{selectedRegistration.fullName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-violet-400" />
                      <span className="text-gray-400">Phone:</span>
                      <span className="text-white">{selectedRegistration.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-violet-400" />
                      <span className="text-gray-400">Location:</span>
                      <span className="text-white">{selectedRegistration.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-violet-400" />
                      <span className="text-gray-400">Occupation:</span>
                      <span className="text-white">{selectedRegistration.occupation || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-violet-400" />
                      <span className="text-gray-400">ID:</span>
                      <span className="text-white">
                        {selectedRegistration.idType === 'GHANA_CARD'
                          ? `Ghana Card - ${selectedRegistration.idNumber}`
                          : `${selectedRegistration.idType} - ${selectedRegistration.idNumber}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-violet-400" />
                      <span className="text-gray-400">Amount Paid:</span>
                      <span className="text-white font-medium">GHS {safeAmount(selectedRegistration.amountPaid)}</span>
                    </div>
                    {selectedRegistration.notes && (
                      <div className="rounded-lg border border-gray-700/50 bg-gray-900/50 p-3">
                        <p className="text-gray-400 text-xs mb-1">Notes</p>
                        <p className="text-white">{selectedRegistration.notes}</p>
                      </div>
                    )}
                  </div>

                  {selectedRegistration.status === 'PENDING' && (
                    <div className="flex gap-3 mt-6">
                      <Button
                        onClick={() => approveMutation.mutate(selectedRegistration.id)}
                        disabled={approveMutation.isPending}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => rejectMutation.mutate(selectedRegistration.id)}
                        disabled={rejectMutation.isPending}
                        variant="secondary"
                        className="flex-1 bg-rose-600 hover:bg-rose-500 text-white"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </GlassCard>
              </div>
            )}
          </div>
        )}
      </DashboardShell>
    </AuthGuard>
  );
}

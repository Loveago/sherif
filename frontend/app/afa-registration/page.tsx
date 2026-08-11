'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import { CheckCircle2, Clock, XCircle, FileText, CreditCard } from 'lucide-react';

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
  approvedAt: string | null;
  paymentStatus: string;
  amountPaid: number;
}

export default function AFARegistrationPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    location: '',
    occupation: '',
    idNumber: '',
    notes: '',
  });

  const { data: feeData } = useQuery({
    queryKey: ['afa-fee'],
    queryFn: () => apiRequest<{ fee: number }>('/admin/settings/afa-fee'),
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['afa-registrations'],
    queryFn: () => apiRequest<AFARegistration[]>('/afa-registrations'),
  });

  const submitMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      apiRequest<{ authorization_url: string; reference: string }>('/afa-registrations/paystack/initialize', {
        method: 'POST',
        body: JSON.stringify({ ...data, idType: 'GHANA_CARD' }),
      }),
    onSuccess: (data) => {
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    },
  });

  const pendingCount = registrations.filter((r) => r.status === 'PENDING').length;
  const approvedCount = registrations.filter((r) => r.status === 'APPROVED').length;
  const fee = feeData?.fee ?? 20;

  const statusIcons: Record<string, React.ReactNode> = {
    PENDING: <Clock className="h-5 w-5 text-amber-400" />,
    APPROVED: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
    REJECTED: <XCircle className="h-5 w-5 text-rose-400" />,
  };

  return (
    <AuthGuard>
      <DashboardShell title="AFA Registration" description="Register for AFA (Agent Financial Account) services.">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Registrations</p>
                <p className="mt-2 text-3xl font-bold text-white">{registrations.length}</p>
              </div>
              <FileText className="h-12 w-12 text-violet-600/30" />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending</p>
                <p className="mt-2 text-3xl font-bold text-amber-400">{pendingCount}</p>
              </div>
              <Clock className="h-12 w-12 text-amber-600/30" />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Approved</p>
                <p className="mt-2 text-3xl font-bold text-emerald-400">{approvedCount}</p>
              </div>
              <CheckCircle2 className="h-12 w-12 text-emerald-600/30" />
            </div>
          </GlassCard>
        </div>

        {/* Registration Form */}
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="mb-6">
            New AFA Registration
          </Button>
        )}

        {showForm && (
          <GlassCard className="p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Register for AFA</h3>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <Input
                    placeholder="Your full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <Input
                    placeholder="055 123 4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                <Input
                  placeholder="Your business location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Occupation</label>
                  <Input
                    placeholder="Your occupation"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Ghana Card Number</label>
                  <Input
                    placeholder="GHA-000000000-0"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                <p className="text-xs text-emerald-300">
                  Only the Ghana Card (National ID) is accepted for AFA registration.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Additional Notes</label>
                <Textarea
                  placeholder="Tell us more about your business..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="h-24"
                />
              </div>

              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-violet-400" />
                  <p className="text-sm font-medium text-violet-300">Registration Fee</p>
                </div>
                <p className="text-2xl font-bold text-white">GHS {fee.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">Payable via Paystack before submission</p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    if (formData.fullName && formData.phone && formData.location && formData.idNumber) {
                      submitMutation.mutate(formData);
                    }
                  }}
                  disabled={submitMutation.isPending || !formData.fullName || !formData.phone || !formData.location || !formData.idNumber}
                  className="flex-1"
                >
                  {submitMutation.isPending ? 'Processing...' : `Pay GHS ${fee.toFixed(2)} & Submit`}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Registrations List */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Your Registrations</h3>

          {registrations.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No registrations yet. Submit one to get started!</p>
          ) : (
            <div className="space-y-4">
              {registrations.map((registration) => (
                <div
                  key={registration.id}
                  className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-900/30 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-white">{registration.fullName}</h4>
                      <Badge
                        variant={
                          registration.status === 'APPROVED'
                            ? 'success'
                            : registration.status === 'REJECTED'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {registration.status}
                      </Badge>
                      <Badge
                        variant={
                          registration.paymentStatus === 'SUCCESSFUL'
                            ? 'success'
                            : registration.paymentStatus === 'FAILED'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {registration.paymentStatus === 'SUCCESSFUL' ? 'Paid' : registration.paymentStatus === 'FAILED' ? 'Payment Failed' : 'Unpaid'}
                      </Badge>
                    </div>
                    {registration.amountPaid > 0 && (
                      <p className="text-xs text-gray-500 mt-1">Amount Paid: GHS {registration.amountPaid}</p>
                    )}
                    <div className="grid gap-2 md:grid-cols-2 text-sm text-gray-400">
                      <p>Phone: {registration.phone}</p>
                      <p>Location: {registration.location}</p>
                      <p>Occupation: {registration.occupation}</p>
                      <p>Ghana Card: {registration.idNumber}</p>
                    </div>
                    {registration.notes && (
                      <p className="text-xs text-gray-500 mt-2">Notes: {registration.notes}</p>
                    )}
                  </div>

                  <div className="text-right ml-4">
                    <div className="flex justify-end mb-2">{statusIcons[registration.status]}</div>
                    <p className="text-xs text-gray-500">
                      {new Date(registration.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </DashboardShell>
    </AuthGuard>
  );
}

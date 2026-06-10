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
import { CheckCircle2, Clock, XCircle, FileText } from 'lucide-react';

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
}

export default function AFARegistrationPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    location: '',
    occupation: '',
    idType: '',
    idNumber: '',
    notes: '',
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['afa-registrations'],
    queryFn: () => apiRequest<AFARegistration[]>('/afa-registrations'),
  });

  const submitMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      apiRequest('/afa-registrations', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['afa-registrations'] });
      setFormData({
        fullName: '',
        phone: '',
        location: '',
        occupation: '',
        idType: '',
        idNumber: '',
        notes: '',
      });
      setShowForm(false);
    },
  });

  const pendingCount = registrations.filter((r) => r.status === 'PENDING').length;
  const approvedCount = registrations.filter((r) => r.status === 'APPROVED').length;

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
                  <label className="block text-sm font-medium text-gray-300 mb-2">ID Type</label>
                  <select
                    value={formData.idType}
                    onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                    className="w-full rounded-xl border border-gray-700/50 bg-slate-900/50 px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 hover:border-gray-600/50 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:bg-slate-900/80"
                  >
                    <option value="">Select ID type</option>
                    <option value="GHANA_CARD">Ghana Card</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVERS_LICENSE">Driver's License</option>
                    <option value="VOTERS_ID">Voter's ID</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">ID Number</label>
                <Input
                  placeholder="Your ID number"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                />
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

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    if (formData.fullName && formData.phone && formData.location) {
                      submitMutation.mutate(formData);
                    }
                  }}
                  disabled={submitMutation.isPending || !formData.fullName || !formData.phone || !formData.location}
                  className="flex-1"
                >
                  {submitMutation.isPending ? 'Submitting...' : 'Submit Registration'}
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
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 text-sm text-gray-400">
                      <p>Phone: {registration.phone}</p>
                      <p>Location: {registration.location}</p>
                      <p>Occupation: {registration.occupation}</p>
                      <p>ID: {registration.idType} - {registration.idNumber}</p>
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

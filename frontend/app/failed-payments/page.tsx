'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, RotateCcw, Trash2, Package } from 'lucide-react';

interface FailedPayment {
  id: string;
  receiptNumber: string;
  product: string;
  network: string;
  phoneNumber: string;
  amount: number;
  status: string;
  failureReason: string;
  createdAt: string;
  retryCount: number;
}

export default function FailedPaymentsPage() {
  const queryClient = useQueryClient();
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  const { data: failedPayments = [] } = useQuery({
    queryKey: ['failed-payments'],
    queryFn: () => apiRequest<FailedPayment[]>('/failed-payments'),
  });

  const retryMutation = useMutation({
    mutationFn: (paymentId: string) =>
      apiRequest(`/failed-payments/${paymentId}/retry`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failed-payments'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelectedPayment(null);
    },
  });

  if (failedPayments.length === 0) {
    return (
      <AuthGuard>
        <DashboardShell title="Failed Payments" description="Manage and retry failed payment orders.">
          <GlassCard className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Failed Payments</h3>
            <p className="text-gray-400">All your payments have been processed successfully!</p>
          </GlassCard>
        </DashboardShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <DashboardShell title="Failed Payments" description={`${failedPayments.length} payment(s) failed and need attention.`}>
        <div className="space-y-4">
          {failedPayments.map((payment) => (
            <GlassCard key={payment.id} className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600/20">
                        <AlertCircle className="h-5 w-5 text-rose-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{payment.product}</p>
                        <p className="text-xs text-gray-500">{payment.receiptNumber}</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 mt-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                        <p className="text-sm font-medium text-white">{payment.phoneNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Amount</p>
                        <p className="text-sm font-medium text-white">GHS {formatCurrency(payment.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Network</p>
                        <Badge variant="default">{payment.network}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Failed Date</p>
                        <p className="text-sm font-medium text-white">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {payment.failureReason && (
                      <div className="mt-4 rounded-lg bg-rose-600/10 border border-rose-600/20 p-3">
                        <p className="text-xs font-medium text-rose-400 mb-1">Failure Reason</p>
                        <p className="text-xs text-rose-300">{payment.failureReason}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => retryMutation.mutate(payment.id)}
                      disabled={retryMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Retry
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Info Box */}
        <GlassCard className="p-6 mt-6 bg-amber-600/10 border-amber-600/20">
          <h3 className="text-lg font-semibold text-amber-400 mb-2">What to Do?</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p>
              <span className="font-medium text-amber-300">1. Check Your Balance:</span> Ensure you have sufficient wallet balance to cover the payment.
            </p>
            <p>
              <span className="font-medium text-amber-300">2. Verify Details:</span> Confirm the phone number and product details are correct.
            </p>
            <p>
              <span className="font-medium text-amber-300">3. Retry Payment:</span> Click the "Retry" button to attempt the payment again.
            </p>
            <p>
              <span className="font-medium text-amber-300">4. Contact Support:</span> If the issue persists, reach out to our support team.
            </p>
          </div>
        </GlassCard>
      </DashboardShell>
    </AuthGuard>
  );
}

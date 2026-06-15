'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, FileText } from 'lucide-react';

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  const verifyMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ status: string; registration: any }>(
        `/afa-registrations/paystack/verify?reference=${encodeURIComponent(reference || '')}`
      ),
    onSuccess: () => {
      setStatus('success');
      setMessage('Your AFA registration payment was successful and is now under review.');
      setTimeout(() => {
        router.push('/afa-registration');
      }, 3000);
    },
    onError: (error: any) => {
      setStatus('error');
      setMessage(error?.message || 'Payment verification failed. Please contact support if your account was debited.');
    },
  });

  useEffect(() => {
    if (reference) {
      verifyMutation.mutate();
    } else {
      setStatus('error');
      setMessage('No payment reference found. Please try again.');
    }
  }, [reference]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <GlassCard className="w-full max-w-md p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Verifying Payment</h2>
            <p className="text-gray-400 text-sm">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Payment Successful!</h2>
            <p className="text-gray-400 text-sm mb-6">{message}</p>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => router.push('/afa-registration')}>
                <FileText className="mr-2 h-4 w-4" />
                Go to AFA Registration
              </Button>
            </div>
            <p className="mt-4 text-xs text-gray-500">Redirecting automatically in a few seconds...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10">
              <XCircle className="h-8 w-8 text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Payment Failed</h2>
            <p className="text-gray-400 text-sm mb-6">{message}</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => router.push('/afa-registration')}>
                Back to AFA Registration
              </Button>
            </div>
          </>
        )}
      </GlassCard>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <GlassCard className="w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Loading...</h2>
        <p className="text-gray-400 text-sm">Please wait while we set things up.</p>
      </GlassCard>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentCallbackContent />
    </Suspense>
  );
}

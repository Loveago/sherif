'use client';

import { Suspense, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

type VerificationResponse = {
  orderId: string;
  status: string;
  phoneNumber: string;
  amount: number;
};

function StorefrontPaymentCallbackContent() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment and validating your order...');

  const verifyMutation = useMutation({
    mutationFn: () =>
      apiRequest<VerificationResponse>(
        `/store/${slug}/paystack/verify?reference=${encodeURIComponent(reference || '')}`,
      ),
    onSuccess: (result) => {
      setStatus('success');
      setMessage(`Payment verified. Your order ID is ${result.orderId}.`);
    },
    onError: (error: Error) => {
      setStatus('error');
      setMessage(error.message || 'We could not verify your payment. Please contact support.');
    },
  });

  useEffect(() => {
    if (!slug || !reference) {
      setStatus('error');
      setMessage('Missing payment reference. Please retry from the storefront.');
      return;
    }

    verifyMutation.mutate();
  }, [slug, reference]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030712] px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(56,189,248,0.2),transparent_38%),radial-gradient(circle_at_78%_24%,rgba(244,114,182,0.2),transparent_34%)]" />
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950/85 p-7 backdrop-blur-xl">
        {status === 'loading' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
            </div>
            <h1 className="text-2xl font-bold text-white">Verifying Payment</h1>
            <p className="mt-2 text-sm text-slate-300">{message}</p>
          </div>
        )}

        {status === 'success' && verifyMutation.data && (
          <div>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-300" />
            </div>
            <h1 className="text-center text-2xl font-bold text-white">Order Confirmed</h1>
            <p className="mt-2 text-center text-sm text-slate-300">{message}</p>

            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-200">Track with this ID</p>
              <p className="mt-1 text-xl font-black text-white">{verifyMutation.data.orderId}</p>
              <p className="mt-2 text-xs text-slate-300">
                Status: {verifyMutation.data.status} • Number: {verifyMutation.data.phoneNumber}
              </p>
            </div>

            <div className="mt-5">
              <Button variant="secondary" className="w-full" onClick={() => router.push(`/store/${slug}`)}>
                Back to Store
              </Button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10">
              <XCircle className="h-8 w-8 text-rose-300" />
            </div>
            <h1 className="text-2xl font-bold text-white">Verification Failed</h1>
            <p className="mt-2 text-sm text-slate-300">{message}</p>
            <p className="mt-5 text-xs text-slate-500">Please retry from the storefront or contact support.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#030712] text-sm text-slate-300">Loading payment status...</div>
  );
}

export default function StorefrontPaymentCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StorefrontPaymentCallbackContent />
    </Suspense>
  );
}

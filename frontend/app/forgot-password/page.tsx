'use client';

import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type FormValues = { email: string };

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<FormValues>();

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md">
        <GlassCard className="p-8">
          <div className="inline-flex rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-violet-300">
            Account Recovery
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-white">Reset Password</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            Enter your email and we will send you a reset link.
          </p>

          {submitted ? (
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              If this email exists in our system, a reset link has been sent.
            </div>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={form.handleSubmit(() => setSubmitted(true))}
            >
              <Input type="email" placeholder="Email address" {...form.register('email')} />
              <Button className="w-full" type="submit">Send Reset Link</Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-slate-400">
            <Link href="/login" className="text-violet-300">Back to Sign In</Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

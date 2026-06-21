'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type { User } from '@/lib/types';
import { useAuthStore } from '@/store/auth-store';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Zap, ArrowRight, Mail, Lock } from 'lucide-react';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiRequest<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: ({ token, user }) => {
      setAuth(token, user);
      router.push(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    },
  });

  return (
    <div className="relative">
      {/* Ambient glow behind card */}
      <div
        className="absolute -inset-4 rounded-[2rem] blur-2xl"
        style={{ backgroundColor: 'var(--color-primary-soft)' }}
      />
      <GlassCard className="relative w-full max-w-md p-5 sm:p-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] eyebrow-pill">
            <Zap className="h-3 w-3" />
            Welcome back
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-white">Sign in to CheapDataPacks</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Enter your credentials to access your agent dashboard.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-300">
              <Mail className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
              Email
            </label>
            <Input placeholder="agent@cheappacksgh.com" {...register('email')} />
            {errors.email ? <p className="mt-2 text-xs text-rose-300">{errors.email.message}</p> : null}
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
                <Lock className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                Password
              </label>
              <Link href="/forgot-password" className="text-xs transition-colors link-brand">
                Forgot Password?
              </Link>
            </div>
            <Input type="password" placeholder="••••••••" {...register('password')} />
            {errors.password ? <p className="mt-2 text-xs text-rose-300">{errors.password.message}</p> : null}
          </div>

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Signing in...' : (
              <>
                Sign In <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          {mutation.error ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
              <p className="text-sm text-rose-300">{mutation.error.message}</p>
            </div>
          ) : null}
        </form>

        <div className="mt-8 border-t border-[#1a2444] pt-6 text-center text-sm text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold transition-colors link-brand">
            Create one
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}

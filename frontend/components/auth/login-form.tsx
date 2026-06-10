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
    <GlassCard className="w-full max-w-md p-8">
      <div className="mb-8">
        <div className="inline-flex rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-violet-200">
          Welcome back
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white">Sign in to DATAHUB</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">Enter your credentials to access your agent dashboard.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <div>
          <label className="mb-2 block text-sm text-slate-300">Email</label>
          <Input placeholder="agent@datahubgh.com" {...register('email')} />
          {errors.email ? <p className="mt-2 text-xs text-rose-300">{errors.email.message}</p> : null}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm text-slate-300">Password</label>
            <Link href="/forgot-password" className="text-xs text-slate-500 hover:text-violet-300">Forgot Password?</Link>
          </div>
          <Input type="password" placeholder="••••••••" {...register('password')} />
          {errors.password ? <p className="mt-2 text-xs text-rose-300">{errors.password.message}</p> : null}
        </div>
        <Button type="submit" className="w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Signing in...' : 'Sign In'}</Button>
        {mutation.error ? <p className="text-sm text-rose-300">{mutation.error.message}</p> : null}
      </form>

      <div className="mt-8 border-t border-[#1a2444] pt-6 text-center text-sm text-slate-400">
        Don&apos;t have an account? <Link href="/register" className="text-violet-300 hover:text-white">Create one</Link>
      </div>
    </GlassCard>
  );
}

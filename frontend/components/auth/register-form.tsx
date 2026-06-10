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
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  companyName: z.string().optional(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiRequest<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: ({ token, user }) => {
      setAuth(token, user);
      router.push('/dashboard');
    },
  });

  return (
    <GlassCard className="w-full max-w-2xl p-8">
      <div className="mb-8">
        <div className="inline-flex rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-violet-200">
          Create your account
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white">Launch your agent storefront</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">Every account is an agent account with wallet, storefront, commissions and bulk data tools.</p>
      </div>

      <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <div>
          <label className="mb-2 block text-sm text-slate-300">First Name</label>
          <Input {...register('firstName')} />
          {errors.firstName ? <p className="mt-2 text-xs text-rose-300">{errors.firstName.message}</p> : null}
        </div>
        <div>
          <label className="mb-2 block text-sm text-slate-300">Last Name</label>
          <Input {...register('lastName')} />
          {errors.lastName ? <p className="mt-2 text-xs text-rose-300">{errors.lastName.message}</p> : null}
        </div>
        <div>
          <label className="mb-2 block text-sm text-slate-300">Email</label>
          <Input {...register('email')} />
          {errors.email ? <p className="mt-2 text-xs text-rose-300">{errors.email.message}</p> : null}
        </div>
        <div>
          <label className="mb-2 block text-sm text-slate-300">Phone</label>
          <Input {...register('phone')} />
          {errors.phone ? <p className="mt-2 text-xs text-rose-300">{errors.phone.message}</p> : null}
        </div>
        <div>
          <label className="mb-2 block text-sm text-slate-300">Company Name</label>
          <Input {...register('companyName')} />
        </div>
        <div>
          <label className="mb-2 block text-sm text-slate-300">Password</label>
          <Input type="password" {...register('password')} />
          {errors.password ? <p className="mt-2 text-xs text-rose-300">{errors.password.message}</p> : null}
        </div>
        <div className="md:col-span-2">
          <Button type="submit" className="w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Creating account...' : 'Create Agent Account'}</Button>
          {mutation.error ? <p className="mt-3 text-sm text-rose-300">{mutation.error.message}</p> : null}
        </div>
      </form>

      <div className="mt-8 border-t border-[#1a2444] pt-6 text-center text-sm text-slate-400">
        Already have an account? <Link href="/login" className="text-violet-300 hover:text-white">Sign in</Link>
      </div>
    </GlassCard>
  );
}

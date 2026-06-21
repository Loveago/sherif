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
import { Sparkles, ArrowRight, User as UserIcon, Mail, Phone, Building2, Lock, Ticket } from 'lucide-react';

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  companyName: z.string().optional(),
  password: z.string().min(8),
  referralCode: z.string().min(1, 'Referral code is required'),
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
    <div className="relative">
      {/* Ambient glow behind card */}
      <div
        className="absolute -inset-4 rounded-[2rem] blur-2xl"
        style={{ backgroundColor: 'var(--color-primary-soft)' }}
      />
      <GlassCard className="relative w-full max-w-2xl p-5 sm:p-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] eyebrow-pill">
            <Sparkles className="h-3 w-3" />
            Create your account
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-white">Launch your agent storefront</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Every account is an agent account with wallet, storefront, commissions and bulk data tools.
          </p>
        </div>

        <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-300">
              <UserIcon className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
              First Name
            </label>
            <Input placeholder="Kwame" {...register('firstName')} />
            {errors.firstName ? <p className="mt-2 text-xs text-rose-300">{errors.firstName.message}</p> : null}
          </div>
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-300">
              <UserIcon className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
              Last Name
            </label>
            <Input placeholder="Asante" {...register('lastName')} />
            {errors.lastName ? <p className="mt-2 text-xs text-rose-300">{errors.lastName.message}</p> : null}
          </div>
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-300">
              <Mail className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
              Email
            </label>
            <Input placeholder="agent@cheappacksgh.com" {...register('email')} />
            {errors.email ? <p className="mt-2 text-xs text-rose-300">{errors.email.message}</p> : null}
          </div>
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-300">
              <Phone className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
              Phone
            </label>
            <Input placeholder="+233 20 000 0000" {...register('phone')} />
            {errors.phone ? <p className="mt-2 text-xs text-rose-300">{errors.phone.message}</p> : null}
          </div>
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-300">
              <Building2 className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
              Company Name <span className="text-xs text-gray-500">(optional)</span>
            </label>
            <Input placeholder="Your Business Ltd." {...register('companyName')} />
          </div>
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-300">
              <Lock className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
              Password
            </label>
            <Input type="password" placeholder="Min. 8 characters" {...register('password')} />
            {errors.password ? <p className="mt-2 text-xs text-rose-300">{errors.password.message}</p> : null}
          </div>
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-300">
              <Ticket className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
              Referral Code <span className="text-xs text-rose-400">(required)</span>
            </label>
            <Input placeholder="e.g. ABC123XY" {...register('referralCode')} />
            {errors.referralCode ? <p className="mt-2 text-xs text-rose-300">{errors.referralCode.message}</p> : null}
          </div>
          <div className="md:col-span-2">
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Creating account...' : (
                <>
                  Create Agent Account <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            {mutation.error ? (
              <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
                <p className="text-sm text-rose-300">{mutation.error.message}</p>
              </div>
            ) : null}
          </div>
        </form>

        <div className="mt-8 border-t border-[#1a2444] pt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold transition-colors link-brand">
            Sign in
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}

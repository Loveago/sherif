'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export function AuthGuard({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: 'AGENT' | 'ADMIN';
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    if (requiredRole && user.role !== requiredRole) {
      router.replace(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    }
  }, [requiredRole, router, user]);

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Loading secure workspace...</div>;
  }

  if (requiredRole && user.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}

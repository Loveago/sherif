'use client';

import { useEffect, useState } from 'react';
import { SpinnerGradient } from './spinners';

interface PageLoaderProps {
  isLoading: boolean;
  message?: string;
}

export function PageLoader({ isLoading, message = 'Loading...' }: PageLoaderProps) {
  const [show, setShow] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
        isLoading ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="animate-scale-in rounded-lg bg-white p-8 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <SpinnerGradient />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-1 w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
      <div
        className="h-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-300"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}

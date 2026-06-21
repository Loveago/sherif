'use client';

import { ReactNode } from 'react';
import { SpinnerGradient, SpinnerRing } from './spinners';
import { SkeletonCard, SkeletonTable, SkeletonGrid } from './skeleton';

interface LoadingStateProps {
  isLoading: boolean;
  error?: Error | null;
  children: ReactNode;
  skeleton?: 'card' | 'table' | 'grid' | 'none';
  spinnerType?: 'gradient' | 'ring';
}

export function LoadingState({
  isLoading,
  error,
  children,
  skeleton = 'card',
  spinnerType = 'gradient',
}: LoadingStateProps) {
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
        <h3 className="font-semibold text-red-900 dark:text-red-100">Error loading content</h3>
        <p className="mt-2 text-sm text-red-700 dark:text-red-200">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        {skeleton === 'card' && <SkeletonCard />}
        {skeleton === 'table' && <SkeletonTable />}
        {skeleton === 'grid' && <SkeletonGrid />}
        {skeleton === 'none' && (
          <div className="flex justify-center py-12">
            {spinnerType === 'gradient' ? <SpinnerGradient /> : <SpinnerRing />}
          </div>
        )}
      </div>
    );
  }

  return <div className="animate-fade-in">{children}</div>;
}

interface LoadingButtonProps {
  isLoading: boolean;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

export function LoadingButton({
  isLoading,
  children,
  disabled = false,
  className = '',
  onClick,
}: LoadingButtonProps) {
  return (
    <button
      disabled={isLoading || disabled}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${className}`}
    >
      {isLoading && <SpinnerRing />}
      <span className={isLoading ? 'opacity-0' : 'opacity-100'}>{children}</span>
    </button>
  );
}

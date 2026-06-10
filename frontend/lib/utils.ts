import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
  }).format(value);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-GH', {
    maximumFractionDigits: 0,
  }).format(value);

export const getStatusColor = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized.includes('success') || normalized.includes('paid') || normalized.includes('resolved')) {
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  }

  if (normalized.includes('pending') || normalized.includes('review') || normalized.includes('processing')) {
    return 'text-amber-300 bg-amber-500/10 border-amber-500/20';
  }

  if (normalized.includes('failed') || normalized.includes('rejected')) {
    return 'text-rose-300 bg-rose-500/10 border-rose-500/20';
  }

  return 'text-slate-300 bg-slate-500/10 border-slate-500/20';
};

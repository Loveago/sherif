'use client';

import { ThemeSwitcher } from '@/components/theme-switcher';
import { SpinnerDot, SpinnerRing, SpinnerGradient } from '@/components/loaders/spinners';
import { SkeletonCard, SkeletonTable, SkeletonGrid } from '@/components/loaders/skeleton';

export default function DemoPage() {
  return (
    <div style={{ backgroundColor: 'var(--bg-0)', color: 'var(--text)' }} className="min-h-screen transition-colors duration-500">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold" style={{ color: 'var(--color-primary)' }}>
              Colorful Themes Demo
            </h1>
            <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
              Click a color to switch themes
            </p>
          </div>
          <ThemeSwitcher />
        </div>

        {/* Spinners Section */}
        <section style={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--stroke)' }} className="mb-12 rounded-lg border p-8">
          <h2 className="mb-6 text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            Loading Spinners
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center gap-4">
              <SpinnerDot />
              <p className="text-sm text-slate-600 dark:text-slate-400">Dot Spinner</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <SpinnerRing />
              <p className="text-sm text-slate-600 dark:text-slate-400">Ring Spinner</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <SpinnerGradient />
              <p className="text-sm text-slate-600 dark:text-slate-400">Gradient Spinner</p>
            </div>
          </div>
        </section>

        {/* Animations Section */}
        <section className="mb-12 rounded-lg border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Entry Animations</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="animate-fade-in rounded-lg bg-white p-6 text-center dark:bg-slate-800">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Fade In</p>
            </div>
            <div className="animate-scale-in rounded-lg bg-white p-6 text-center dark:bg-slate-800">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Scale In</p>
            </div>
            <div className="animate-bounce-in rounded-lg bg-white p-6 text-center dark:bg-slate-800">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Bounce In</p>
            </div>
            <div className="animate-slide-in-left rounded-lg bg-white p-6 text-center dark:bg-slate-800">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Slide Left</p>
            </div>
          </div>
        </section>

        {/* Skeleton Loaders Section */}
        <section className="mb-12 rounded-lg border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Skeleton Loaders</h2>

          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Card Skeleton</h3>
            <SkeletonCard />
          </div>

          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Table Skeleton</h3>
            <SkeletonTable />
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Grid Skeleton</h3>
            <SkeletonGrid />
          </div>
        </section>

        {/* Pulse Ring Animation */}
        <section className="mb-12 rounded-lg border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Pulse Ring Animation</h2>
          <div className="flex justify-center">
            <div className="h-16 w-16 animate-pulse-ring rounded-full bg-violet-500" />
          </div>
        </section>

        {/* Color Palette */}
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Color Palette</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-violet-500 p-6 text-white">
              <p className="font-semibold">Violet</p>
              <p className="text-sm opacity-75">#7c3aed</p>
            </div>
            <div className="rounded-lg bg-blue-500 p-6 text-white">
              <p className="font-semibold">Blue</p>
              <p className="text-sm opacity-75">#0284c7</p>
            </div>
            <div className="rounded-lg bg-emerald-500 p-6 text-white">
              <p className="font-semibold">Emerald</p>
              <p className="text-sm opacity-75">#059669</p>
            </div>
            <div className="rounded-lg bg-rose-500 p-6 text-white">
              <p className="font-semibold">Rose</p>
              <p className="text-sm opacity-75">#f43f5e</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

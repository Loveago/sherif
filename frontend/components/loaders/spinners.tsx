export function SpinnerDot() {
  return (
    <div className="flex items-center justify-center gap-1">
      <div className="h-2 w-2 animate-bounce rounded-full" style={{ backgroundColor: 'var(--color-primary)', animationDelay: '0s' }} />
      <div className="h-2 w-2 animate-bounce rounded-full" style={{ backgroundColor: 'var(--color-primary)', animationDelay: '0.2s' }} />
      <div className="h-2 w-2 animate-bounce rounded-full" style={{ backgroundColor: 'var(--color-primary)', animationDelay: '0.4s' }} />
    </div>
  );
}

export function SpinnerRing() {
  return (
    <div className="relative h-8 w-8">
      <div
        className="absolute inset-0 animate-spin rounded-full border-2"
        style={{
          borderColor: 'var(--stroke)',
          borderTopColor: 'var(--color-primary)',
        }}
      />
    </div>
  );
}

export function SpinnerGradient() {
  return (
    <div className="relative h-10 w-10">
      <div
        className="absolute inset-0 animate-spin rounded-full border-3 border-transparent"
        style={{
          borderTopColor: 'var(--color-primary)',
          borderRightColor: 'var(--color-accent)',
        }}
      />
    </div>
  );
}

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="rounded-lg bg-white p-8 dark:bg-slate-900">
        <SpinnerGradient />
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

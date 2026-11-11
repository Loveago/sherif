export default function StorefrontDashboardLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 w-52 rounded-lg bg-slate-200 dark:bg-white/10" />
        <div className="h-4 w-80 rounded-lg bg-slate-200/70 dark:bg-white/5" />
      </div>

      {/* Store status banner skeleton */}
      <div className="h-20 rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4" />

      {/* Grid cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-36 rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5"
          >
            <div className="h-4 w-24 rounded bg-slate-200 dark:bg-white/10" />
            <div className="mt-4 h-8 w-32 rounded bg-slate-200 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

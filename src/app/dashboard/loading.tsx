export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-slate-200 dark:bg-white/10" />
        <div className="h-4 w-72 rounded-lg bg-slate-200/70 dark:bg-white/5" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4"
          >
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/10" />
            <div className="mt-4 h-7 w-28 rounded bg-slate-200 dark:bg-white/10" />
          </div>
        ))}
      </div>

      {/* Content table/card skeleton */}
      <div className="h-80 rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6">
        <div className="h-5 w-36 rounded bg-slate-200 dark:bg-white/10" />
        <div className="mt-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-full rounded-xl bg-slate-100 dark:bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function MetricCard({
  label,
  value,
  change,
  tone = 'violet',
}: {
  label: string;
  value: string;
  change: string;
  tone?: 'violet' | 'emerald' | 'amber' | 'sky' | 'rose';
}) {
  const isPositive = change.startsWith('+') || change.startsWith('↑');
  const isNegative = change.startsWith('-') || change.startsWith('↓');

  const toneMap = {
    violet: 'text-violet-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    sky: 'text-sky-400',
    rose: 'text-rose-400',
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0f172a] p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <h3 className="mt-2 text-3xl font-bold text-white">{value}</h3>
      <div className="mt-3 flex items-center gap-1">
        {isPositive && <ArrowUpRight className="h-3 w-3 text-emerald-400" />}
        {isNegative && <ArrowDownRight className="h-3 w-3 text-rose-400" />}
        <p className={isNegative ? 'text-xs text-rose-400' : 'text-xs text-emerald-400'}>
          {change}
        </p>
        <span className="text-xs text-gray-500">from last month</span>
      </div>
    </div>
  );
}

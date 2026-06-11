'use client';

import {
  ShoppingBag, CheckCircle2, Clock, XCircle,
  TrendingUp, TrendingDown,
} from 'lucide-react';

interface StatItem {
  label: string;
  value: string;
  change: string;
  icon: 'orders' | 'success' | 'pending' | 'failed';
}

const iconMap = {
  orders: { Icon: ShoppingBag, orbClass: 'icon-orb-violet', textClass: 'text-violet-400' },
  success: { Icon: CheckCircle2, orbClass: 'icon-orb-emerald', textClass: 'text-emerald-400' },
  pending: { Icon: Clock, orbClass: 'icon-orb-amber', textClass: 'text-amber-400' },
  failed: { Icon: XCircle, orbClass: 'icon-orb-rose', textClass: 'text-rose-400' },
};

export function OverviewStats({ stats }: { stats: StatItem[] }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 animate-slide-up animate-slide-up-delay-1"
    >
      {stats.map((stat, idx) => {
        const { Icon, orbClass, textClass } = iconMap[stat.icon];
        const isPositive = stat.change.startsWith('+');
        const isNegative = stat.change.startsWith('-');

        return (
          <div
            key={stat.label}
            className="stat-card rounded-2xl border border-gray-800/60 bg-[#111827]/80 p-3.5 sm:p-4"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="flex items-center gap-2.5">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${orbClass}`}>
                <Icon className={`h-4 w-4 ${textClass}`} />
              </div>
              <p className="text-[11px] font-medium text-gray-400 leading-tight">{stat.label}</p>
            </div>
            <h3 className="mt-2.5 text-xl font-extrabold text-white sm:text-2xl">{stat.value}</h3>
            <div className="mt-1.5 flex items-center gap-1">
              {isPositive && <TrendingUp className="h-3 w-3 text-emerald-400" />}
              {isNegative && <TrendingDown className="h-3 w-3 text-rose-400" />}
              <p className={`text-[11px] font-semibold ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                {stat.change}
              </p>
              <span className="text-[10px] text-gray-500">from last month</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

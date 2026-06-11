'use client';

import {
  DollarSign, Users, Clock, TrendingUp,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

interface AdminStat {
  label: string;
  value: string;
  change: string;
  icon: 'revenue' | 'users' | 'pending' | 'success';
}

const iconMap = {
  revenue: { Icon: DollarSign, orbClass: 'icon-orb-violet', textClass: 'text-violet-400' },
  users: { Icon: Users, orbClass: 'icon-orb-sky', textClass: 'text-sky-400' },
  pending: { Icon: Clock, orbClass: 'icon-orb-amber', textClass: 'text-amber-400' },
  success: { Icon: TrendingUp, orbClass: 'icon-orb-emerald', textClass: 'text-emerald-400' },
};

export function AdminOverviewStats({ stats }: { stats: AdminStat[] }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {stats.map((stat, idx) => {
        const { Icon, orbClass, textClass } = iconMap[stat.icon];
        const isPositive = stat.change.startsWith('+') || stat.change.toLowerCase().includes('live') || stat.change.toLowerCase().includes('efficiency');
        const isNegative = stat.change.startsWith('-') || stat.change.toLowerCase().includes('needs');

        return (
          <div
            key={stat.label}
            className="stat-card rounded-2xl border border-gray-800/60 bg-[#111827]/80 p-3.5 sm:p-4"
          >
            <div className="flex items-center gap-2.5">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${orbClass}`}>
                <Icon className={`h-4 w-4 ${textClass}`} />
              </div>
              <p className="text-[11px] font-medium text-gray-400 leading-tight">{stat.label}</p>
            </div>
            <h3 className="mt-2.5 text-xl font-extrabold text-white sm:text-2xl">{stat.value}</h3>
            <div className="mt-1.5 flex items-center gap-1">
              {isPositive && <ArrowUpRight className="h-3 w-3 text-emerald-400" />}
              {isNegative && <ArrowDownRight className="h-3 w-3 text-rose-400" />}
              <p className={`text-[11px] font-semibold ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                {stat.change}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

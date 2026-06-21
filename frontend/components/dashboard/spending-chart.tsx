'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

export function SpendingChart({
  data,
  dataKey,
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = data?.length ? data : [{ label: '-', [dataKey]: 0 }];

  return (
    <div className="rounded-2xl border border-gray-800/60 bg-[#111827]/60 p-5 animate-slide-up animate-slide-up-delay-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          <h3 className="text-sm font-bold text-white">Spending Overview</h3>
        </div>
        <select defaultValue="This Month" className="rounded-lg border border-gray-700/60 bg-gray-900/80 px-2.5 py-1 text-[11px] text-gray-300 outline-none">
          <option>This Month</option>
          <option>Last Month</option>
          <option>This Year</option>
        </select>
      </div>
      <div className="mt-5 h-[200px] sm:h-[220px]">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <defs>
                <linearGradient id="spendingFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(55, 65, 81, 0.2)" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10 }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: 12,
                  fontSize: 12,
                  color: '#fff',
                  boxShadow: '0 8px 32px -8px rgba(0,0,0,0.5)',
                }}
                itemStyle={{ color: 'var(--color-primary)' }}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: 'var(--color-primary)', stroke: '#111827', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: 'var(--color-accent)', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-500">
            Loading chart...
          </div>
        )}
      </div>
    </div>
  );
}

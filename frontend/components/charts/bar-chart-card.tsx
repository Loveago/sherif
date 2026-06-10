'use client';

import { ResponsiveContainer, BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { GlassCard } from '@/components/ui/glass-card';

export function BarChartCard({
  title,
  value,
  data,
  dataKey,
}: {
  title: string;
  value: string;
  data: Array<Record<string, string | number>>;
  dataKey: string;
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <h3 className="mt-1 text-2xl font-bold text-white">{value}</h3>
        </div>
      </div>
      <div className="mt-4 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(55, 65, 81, 0.3)" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Bar dataKey={dataKey} fill="#7c3aed" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

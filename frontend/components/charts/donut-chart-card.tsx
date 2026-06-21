'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { GlassCard } from '@/components/ui/glass-card';

export function DonutChartCard({
  title,
  data,
}: {
  title: string;
  data: Array<{ label: string; count: number }>;
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <GlassCard className="p-5">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <div className="mt-4 flex items-center gap-6">
        <div className="h-[180px] w-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="count"
                stroke="none"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      index === 0
                        ? 'var(--color-primary)'
                        : index === 1
                        ? 'var(--color-accent)'
                        : 'rgba(148, 163, 184, 0.8)'
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3">
          {data.map((item, index) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      index === 0
                        ? 'var(--color-primary)'
                        : index === 1
                        ? 'var(--color-accent)'
                        : 'rgba(148, 163, 184, 0.8)',
                  }}
                />
                <span className="text-sm text-gray-300">{item.label}</span>
              </div>
              <span className="text-sm font-medium text-white">
                {total > 0 ? Math.round((item.count / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

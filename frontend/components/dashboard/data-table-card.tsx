import { GlassCard } from '@/components/ui/glass-card';

export function DataTableCard({
  title,
  action,
  columns,
  rows,
}: {
  title: string;
  action?: React.ReactNode;
  columns: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <GlassCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {action}
      </div>
      <div className="soft-scrollbar overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-gray-800 text-[11px] uppercase tracking-wider text-gray-500">
              {columns.map((column) => (
                <th key={column} className="px-5 py-3 font-medium">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-gray-800/50 transition hover:bg-gray-800/30 last:border-b-0">
                {row.map((cell, cellIndex) => (
                  <td key={`${index}-${cellIndex}`} className="px-5 py-3 text-sm text-gray-300">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

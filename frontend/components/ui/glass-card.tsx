import { cn } from '@/lib/utils';

export function GlassCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('rounded-2xl border border-gray-800 bg-[#0f172a]', className)}>
      {children}
    </div>
  );
}

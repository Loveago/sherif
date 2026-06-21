import { cn } from '@/lib/utils';

export function GlassCard({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(
      'rounded-2xl border border-gray-700/50 bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl',
      'glass-brand transition-all duration-300',
      className
    )}>
      {children}
    </div>
  );
}
